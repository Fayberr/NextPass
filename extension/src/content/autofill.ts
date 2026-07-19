/**
 * Autofill content script (Phase 1+). Detects username/password fields, offers matching vault
 * credentials via an inline picker anchored to the focused field, and prompts to save/update a
 * login after a form submit. The full heuristic suite (MutationObserver, multi-step session
 * memory, iframe handling) is Phase 3 per the spec.
 */

import type { AutofillMatch, Msg, MsgResult } from '../lib/messages.js';
import { generatePassword, passwordStrength, type LoginFields } from '@pm/shared';

const PW_SELECTOR = 'input[type="password"]';
const USER_HINTS = /user|login|email|account|benutzer|namen?/i;

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/**
 * Whether a password field looks like a genuine new-password/signup field (safe to auto-open the
 * generator for), rather than an ordinary login field. Many real sites (e.g. demoqa.com) never set
 * `autocomplete` at all, so "not marked current-password" is NOT good enough evidence on its own
 * (that previously caused the generator to pop open on plain login pages) — require POSITIVE proof:
 * either an explicit `autocomplete="new-password"`, or a second visible password field in the same
 * scope (a confirm/repeat-password sibling, which login forms never have).
 */
function isLikelyNewPasswordField(pw: HTMLInputElement): boolean {
  const ac = pw.getAttribute('autocomplete') ?? '';
  if (/new-password/.test(ac)) return true;
  const scope = pw.closest('form') ?? document;
  const pwFields = Array.from(scope.querySelectorAll<HTMLInputElement>(PW_SELECTOR)).filter(isVisible);
  return pwFields.length > 1;
}

/** Find the username field associated with a given password field (positional heuristic). */
function findUsernameField(pw: HTMLInputElement): HTMLInputElement | null {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
  ).filter(isVisible);
  const pwIdx = inputs.indexOf(pw);

  for (const el of inputs) {
    const ac = el.getAttribute('autocomplete') ?? '';
    if (/username|email/.test(ac)) return el;
  }
  for (let i = pwIdx - 1; i >= 0; i--) {
    const el = inputs[i];
    if (!el) continue;
    if (el.type === 'text' || el.type === 'email') {
      const hay = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') ?? ''}`;
      if (USER_HINTS.test(hay) || el.type === 'email') return el;
    }
  }
  for (let i = pwIdx - 1; i >= 0; i--) {
    const el = inputs[i];
    if (el && (el.type === 'text' || el.type === 'email')) return el;
  }
  return null;
}

function setValue(el: HTMLInputElement, value: string): void {
  const proto = Object.getPrototypeOf(el) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter ? setter.call(el, value) : (el.value = value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function sendMsg(msg: Msg): Promise<MsgResult | null> {
  try {
    return (await chrome.runtime.sendMessage(msg)) as MsgResult;
  } catch {
    return null; // background asleep / vault locked
  }
}

async function query(): Promise<AutofillMatch[]> {
  const res = await sendMsg({ kind: 'autofill_query', url: location.href });
  return res?.ok && res.kind === 'autofill' ? res.matches : [];
}

/**
 * Whether there's an unlocked vault to autofill/generate against. Without this, a locked vault
 * looks identical to "no saved logins" (autofillQuery returns [] either way) — which used to make
 * the picker/generator silently misfire as if this were a brand-new field. Checked before deciding
 * what the badge/focus should show.
 */
async function vaultReady(): Promise<boolean> {
  const res = await sendMsg({ kind: 'get_state' });
  return !!(res?.ok && res.kind === 'state' && res.state.configured && res.state.unlocked);
}

// --- inline picker -------------------------------------------------------------------------------

let pickerHost: HTMLDivElement | null = null;
let pickerField: HTMLInputElement | null = null;
// Last-known saved-login matches per password field (populated on focus) — lets the badge decide,
// at click time, whether to open the accounts picker (saved logins exist) or the generator
// (no saved logins — likely a new/registration field), without re-querying synchronously.
const fieldMatches = new WeakMap<HTMLInputElement, AutofillMatch[]>();

function closePicker(): void {
  pickerHost?.remove();
  pickerHost = null;
  pickerField = null;
}

// --- "vault locked" prompt ------------------------------------------------------------------------
// Shown instead of the picker/generator whenever the vault isn't set up or is locked, so a locked
// vault never gets misread as "no saved logins" (which used to fall through into offering to
// generate a brand-new password on an ordinary login page).

let lockHost: HTMLDivElement | null = null;
let lockField: HTMLInputElement | null = null;

function closeLockPrompt(): void {
  lockHost?.remove();
  lockHost = null;
  lockField = null;
}

function openLockPrompt(pw: HTMLInputElement): void {
  closePicker();
  closeGen();
  closeLockPrompt();
  const r = pw.getBoundingClientRect();
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:${Math.round(r.left)}px;top:${Math.round(
    r.bottom + 4,
  )}px;width:${Math.max(240, Math.round(r.width))}px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      @keyframes pm-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
      .box{background:#1a1622;border:1px solid rgba(109,92,224,.4);border-radius:12px;padding:10px;
        box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 16px rgba(109,92,224,.2);animation:pm-in .14s ease-out}
      .msg{font-size:12px;color:#e9e7ef;padding:2px 4px 8px}
      .btn{display:block;width:100%;border:0;border-radius:9px;padding:9px;cursor:pointer;
        background:#6d5ce0;color:#fff;font-size:13px;font-weight:600}
      .btn:hover{background:#7a68f0}
    </style>
    <div class="box">
      <div class="msg">Password Manager is locked</div>
      <button class="btn">Unlock to autofill / generate</button>
    </div>`;
  document.documentElement.appendChild(host);
  lockHost = host;
  lockField = pw;
  shadow.querySelector<HTMLButtonElement>('.btn')!.addEventListener('mousedown', (e) => {
    e.preventDefault();
    void sendMsg({ kind: 'open_unlock_ui' });
    closeLockPrompt();
  });
}

function fillWith(pw: HTMLInputElement, m: AutofillMatch): void {
  const identifier = m.username ?? m.email;
  const userField = findUsernameField(pw);
  if (userField && identifier) setValue(userField, identifier);
  if (m.password) setValue(pw, m.password);
  closePicker();
}

function openPicker(pw: HTMLInputElement, matches: AutofillMatch[]): void {
  closePicker();
  const r = pw.getBoundingClientRect();
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:${Math.round(r.left)}px;top:${Math.round(
    r.bottom + 4,
  )}px;width:${Math.max(240, Math.round(r.width))}px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
  const shadow = host.attachShadow({ mode: 'closed' });
  const rows = matches
    .map(
      (m, i) => `
      <button class="row" data-i="${i}">
        <span class="ic">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b9aef2" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </span>
        <span class="txt"><span class="nm">${esc(m.name)}</span>${
          m.username || m.email ? `<span class="sub">${esc(m.username || m.email || '')}</span>` : ''
        }</span>
      </button>`,
    )
    .join('');
  shadow.innerHTML = `
    <style>
      @keyframes pm-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
      .box{background:#1a1622;border:1px solid rgba(109,92,224,.4);border-radius:12px;padding:5px;
        box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 16px rgba(109,92,224,.2);animation:pm-in .14s ease-out;
        max-height:230px;overflow-y:auto}
      .hd{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:rgba(233,231,239,.4);padding:5px 8px 3px}
      .row{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:none;border:0;
        border-radius:9px;padding:8px;cursor:pointer;color:#e9e7ef}
      .row:hover{background:rgba(109,92,224,.18)}
      .ic{flex:none;display:flex}
      .txt{min-width:0;display:flex;flex-direction:column}
      .nm{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sub{font-size:11px;color:rgba(233,231,239,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    </style>
    <div class="box"><div class="hd">Password Manager</div>${rows}</div>`;
  document.documentElement.appendChild(host);
  pickerHost = host;
  pickerField = pw;
  shadow.querySelectorAll<HTMLButtonElement>('.row').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // keep focus on the field
      fillWith(pw, matches[Number(btn.dataset.i)]!);
    });
  });
}

// --- inline generate badge + generator card (Kaspersky-style) ------------------------------------

// The key badge is shown PERSISTENTLY in every detected password field (not just the focused one),
// like Kaspersky/Bitwarden. We keep one floating host per field and reposition them on scroll/resize;
// a MutationObserver keeps the set in sync as fields appear/disappear (SPA navigation, dynamic forms).
interface Badge {
  host: HTMLDivElement;
  btn: HTMLButtonElement;
  inset: number; // px to shift left so we clear the site's own in-field controls (eye/clear/etc.)
}
const badges = new Map<HTMLInputElement, Badge>();

const KEY_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6 6 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>`;

/** True when the field is laid out AND currently within the viewport (so its badge is worth showing). */
function badgeShouldShow(field: HTMLInputElement): boolean {
  if (!isVisible(field)) return false;
  const r = field.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}

/** Is `el` one of our own injected overlay hosts (badge / picker / generator / save-card)? */
function isOurNode(el: Element): boolean {
  if (el === genHost || el === pickerHost || el === saveHost || el === lockHost) return true;
  for (const { host } of badges.values()) if (el === host) return true;
  return false;
}

/** Looks like an interactive in-field affordance (a site's show/hide, clear, search icon, etc.). */
function isControlLike(el: Element): boolean {
  const tag = el.tagName.toUpperCase();
  if (tag === 'BUTTON' || tag === 'A' || tag === 'IMG' || tag === 'SVG' || tag === 'I') return true;
  if (el.getAttribute('role') === 'button') return true;
  try {
    if (getComputedStyle(el).cursor === 'pointer') return true;
  } catch {
    /* cross-origin / detached */
  }
  return false;
}

/**
 * Measure how much of the field's right edge is already occupied by the site's own controls, so we
 * can slot our badge just to their left instead of covering them. We probe points along the field's
 * vertical centre from the right edge inward with `elementsFromPoint` — that reflects the ACTUAL
 * visual stacking (an overlay eye button sits above the input at that point), independent of DOM
 * structure — and take the leftmost overlapping control's edge. Returns 0 when the edge is clear.
 */
function computeRightInset(field: HTMLInputElement): number {
  const r = field.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return 0;
  const cy = r.top + r.height / 2;
  const zoneLeft = r.right - Math.min(r.width, r.height * 3.2); // only inspect the right portion
  let leftMost = r.right;
  for (let x = r.right - 4; x >= zoneLeft; x -= 5) {
    if (x < 0 || x > window.innerWidth) continue;
    const stack = document.elementsFromPoint(x, cy);
    const fieldIdx = stack.indexOf(field);
    const above = fieldIdx === -1 ? stack.length : fieldIdx; // elements painted on top of the field
    for (let i = 0; i < above; i++) {
      const el = stack[i]!;
      if (isOurNode(el) || field.contains(el) || el.contains(field)) continue;
      if (!isControlLike(el)) continue;
      const cr = el.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0 || cr.width > r.height * 3) continue; // skip big overlays
      if (cr.left >= r.left && cr.left < leftMost) leftMost = cr.left;
    }
  }
  const occupied = r.right - leftMost;
  return occupied > 2 ? Math.round(occupied) + 4 : 0; // small gap so we sit just left of their control
}

function positionBadge(field: HTMLInputElement, badge: Badge): void {
  if (!badgeShouldShow(field)) {
    badge.host.style.display = 'none';
    return;
  }
  const r = field.getBoundingClientRect();
  badge.host.style.display = '';
  badge.host.style.left = `${Math.round(r.right - 30 - badge.inset)}px`;
  badge.host.style.top = `${Math.round(r.top + r.height / 2 - 12)}px`;
}

/** Create the persistent badge for a field if it doesn't have one yet. */
function ensureBadge(field: HTMLInputElement): void {
  if (badges.has(field)) return;
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;z-index:2147483646;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .key{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;
        border-radius:7px;cursor:pointer;background:rgba(109,92,224,.14);color:#8b78ea;transition:.15s}
      .key:hover{background:#6d5ce0;color:#fff;box-shadow:0 0 12px rgba(109,92,224,.5)}
      .key.active{background:#6d5ce0;color:#fff;box-shadow:0 0 12px rgba(109,92,224,.5)}
    </style>
    <button class="key" title="Password generator" tabindex="-1" aria-label="Toggle password generator">${KEY_SVG}</button>`;
  document.documentElement.appendChild(host);
  const btn = shadow.querySelector<HTMLButtonElement>('.key')!;
  const badge: Badge = { host, btn, inset: computeRightInset(field) };
  badges.set(field, badge);
  positionBadge(field, badge);
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // keep focus on the field
    void (async () => {
      // Locked/not-set-up vault looks identical to "no saved logins" from autofillQuery's point of
      // view — check real vault state first so a locked vault never gets offered a fresh generated
      // password instead of "please unlock".
      if (!(await vaultReady())) {
        if (lockHost && lockField === field) closeLockPrompt();
        else openLockPrompt(field);
        return;
      }
      // If this field has saved logins, the badge is a toggle for the accounts picker (not the
      // generator) — clicking it should never offer to overwrite a saved password with a new
      // random one. Only fields with no saved match (new/registration fields) use it to toggle
      // the generator.
      const matches = fieldMatches.get(field) ?? [];
      if (matches.length > 0) {
        if (pickerHost && pickerField === field) closePicker();
        else openPicker(field, matches);
        return;
      }
      if (genHost && genField === field) {
        noAutoOpen.add(field); // don't let a re-focus immediately reopen what the user just closed
        closeGen();
      } else {
        openGenerator(field);
      }
    })();
  });
}

function removeBadge(field: HTMLInputElement): void {
  const badge = badges.get(field);
  if (!badge) return;
  badge.host.remove();
  badges.delete(field);
}

function closeAllBadges(): void {
  for (const { host } of badges.values()) host.remove();
  badges.clear();
}

/**
 * Reposition every badge and reflect which one owns the open card. `recompute` re-measures each
 * field's right-inset (its overlapping site controls) — do that on layout changes (scan/resize) but
 * NOT on plain scroll, where the field and its controls move together so the cached inset holds.
 */
function refreshBadges(recompute = false): void {
  for (const [field, badge] of badges) {
    if (recompute) badge.inset = computeRightInset(field);
    positionBadge(field, badge);
    badge.btn.classList.toggle(
      'active',
      (!!genHost && genField === field) ||
        (!!pickerHost && pickerField === field) ||
        (!!lockHost && lockField === field),
    );
  }
}

/** Sweep the DOM: add badges for newly-detected password fields, drop badges for vanished ones. */
function scanFields(): void {
  const present = new Set<HTMLInputElement>();
  for (const el of document.querySelectorAll<HTMLInputElement>(PW_SELECTOR)) {
    if (!isVisible(el)) continue;
    present.add(el);
    ensureBadge(el);
  }
  for (const field of [...badges.keys()]) {
    if (!present.has(field)) removeBadge(field);
  }
  refreshBadges(true); // DOM changed → re-measure insets (a site control may have appeared/moved)
}

let genHost: HTMLDivElement | null = null;
let genField: HTMLInputElement | null = null;
const genOpts = { length: 20, uppercase: true, lowercase: true, digits: true, symbols: true };
// Fields the user has explicitly closed the generator on — suppresses auto-open on the next focus
// (so re-clicking into the field doesn't reopen a card they just dismissed).
const noAutoOpen = new WeakSet<HTMLInputElement>();

function closeGen(): void {
  genHost?.remove();
  genHost = null;
  genField = null;
  refreshBadges(); // clear the active state on whichever badge owned the card
}

function positionGen(): void {
  if (!genHost || !genField) return;
  const r = genField.getBoundingClientRect();
  const W = 300;
  const spaceRight = window.innerWidth - r.right;
  let left: number;
  let top: number;
  if (spaceRight >= W + 12) {
    left = r.right + 8; // to the right of the field
    top = r.top;
  } else {
    left = Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8)); // below, right-aligned
    top = r.bottom + 6;
  }
  genHost.style.left = `${Math.round(left)}px`;
  genHost.style.top = `${Math.round(top)}px`;
}

/** Fill any confirm/repeat password fields (empty, not the current-password) with the same value. */
function fillConfirm(pw: HTMLInputElement, value: string): void {
  const scope = pw.closest('form') ?? document;
  for (const other of Array.from(scope.querySelectorAll<HTMLInputElement>(PW_SELECTOR))) {
    if (other === pw || !isVisible(other) || other.value) continue;
    if (/current-password/.test(other.getAttribute('autocomplete') ?? '')) continue;
    setValue(other, value);
  }
}

function openGenerator(pw: HTMLInputElement): void {
  closePicker();
  closeGen();
  genField = pw;
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      @keyframes pm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
      .card{width:300px;background:#1a1622;color:#e9e7ef;border:1px solid rgba(109,92,224,.35);
        border-radius:14px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 22px rgba(109,92,224,.22);
        animation:pm-in .16s ease-out}
      .hd{display:flex;align-items:center;gap:8px;margin-bottom:11px;font-size:13px;font-weight:600}
      .hd svg{color:#8b78ea}
      .pwrow{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 10px}
      .pw{flex:1;min-width:0;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:14px;
        letter-spacing:.02em;word-break:break-all;line-height:1.35}
      .ib{flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;
        border-radius:8px;cursor:pointer;background:rgba(255,255,255,.06);color:#c9c4dd;transition:.14s}
      .ib:hover{background:#6d5ce0;color:#fff}
      .ib.copied{background:#1f8a5b;color:#fff}
      .str{margin:9px 2px 12px;font-size:11.5px;color:rgba(233,231,239,.55)}
      .str b{font-weight:600}
      /* Collapsible options (Kaspersky-style, collapsed by default). */
      .opt{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;
        background:rgba(255,255,255,.04);color:rgba(233,231,239,.8);border-radius:10px;padding:9px 11px;
        font-size:12px;font-weight:500;cursor:pointer;margin-bottom:11px}
      .opt:hover{background:rgba(255,255,255,.07)}
      .opt .chev{transition:transform .18s;color:rgba(233,231,239,.5)}
      .opt.open .chev{transform:rotate(180deg)}
      .opts{display:none;margin:-3px 2px 12px}
      .opts.open{display:block}
      .lenrow{display:flex;align-items:center;gap:9px;margin:2px 0 12px;font-size:11.5px;color:rgba(233,231,239,.7)}
      .len{width:22px;text-align:right;font-variant-numeric:tabular-nums;color:#e9e7ef}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
      .grid label{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;color:rgba(233,231,239,.82)}
      /* Custom checkbox — appearance:none so it ignores the OS light theme. */
      .cb{-webkit-appearance:none;appearance:none;width:17px;height:17px;flex:none;display:inline-grid;
        place-content:center;border-radius:5px;border:1.5px solid rgba(255,255,255,.25);
        background:rgba(255,255,255,.05);cursor:pointer;transition:background .15s,border-color .15s}
      .cb:hover{border-color:rgba(139,120,234,.7)}
      .cb:checked{background:linear-gradient(135deg,#8b78ea,#6d5ce0);border-color:transparent}
      .cb::after{content:"";width:11px;height:11px;opacity:0;transition:opacity .12s;
        background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center/contain no-repeat}
      .cb:checked::after{opacity:1}
      /* Custom range slider. */
      .rng{-webkit-appearance:none;appearance:none;flex:1;height:6px;border-radius:999px;
        background:rgba(255,255,255,.14);cursor:pointer}
      .rng::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;
        background:#fff;border:3px solid #6d5ce0;box-shadow:0 1px 4px rgba(0,0,0,.5)}
      .rng::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:#fff;
        border:3px solid #6d5ce0;box-shadow:0 1px 4px rgba(0,0,0,.5)}
      .use{width:100%;border:0;border-radius:10px;padding:10px;font-size:13px;font-weight:600;
        cursor:pointer;background:#6d5ce0;color:#fff}
      .use:hover{filter:brightness(1.08)}
    </style>
    <div class="card" role="dialog" aria-label="Password generator">
      <div class="hd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6 6 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
        Password Generator
      </div>
      <div class="pwrow">
        <span class="pw" id="pw"></span>
        <button class="ib" id="copy" title="Copy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="ib" id="regen" title="Regenerate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
        </button>
      </div>
      <div class="str">Strength: <b id="str"></b></div>
      <button class="opt" id="optbtn" type="button" aria-expanded="false">
        <span>Options</span>
        <svg class="chev" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="opts" id="opts">
        <div class="lenrow"><span>Length</span><input class="rng" type="range" min="8" max="40" id="len" value="${genOpts.length}"><span class="len" id="lenv">${genOpts.length}</span></div>
        <div class="grid">
          <label><input class="cb" type="checkbox" id="upper" ${genOpts.uppercase ? 'checked' : ''}>A-Z</label>
          <label><input class="cb" type="checkbox" id="lower" ${genOpts.lowercase ? 'checked' : ''}>a-z</label>
          <label><input class="cb" type="checkbox" id="dig" ${genOpts.digits ? 'checked' : ''}>0-9</label>
          <label><input class="cb" type="checkbox" id="sym" ${genOpts.symbols ? 'checked' : ''}>Symbols</label>
        </div>
      </div>
      <button class="use" id="use">Use password</button>
    </div>`;
  document.documentElement.appendChild(host);
  genHost = host;
  noAutoOpen.delete(pw);
  ensureBadge(pw); // guarantee the owning field has a badge, then light it up
  refreshBadges();
  positionGen();

  let current = '';
  const pwEl = shadow.getElementById('pw')!;
  const strEl = shadow.getElementById('str')!;
  const copyBtn = shadow.getElementById('copy') as HTMLButtonElement;

  function regen(): void {
    current = generatePassword({
      length: genOpts.length,
      uppercase: genOpts.uppercase,
      lowercase: genOpts.lowercase,
      digits: genOpts.digits,
      symbols: genOpts.symbols,
    });
    pwEl.textContent = current;
    const s = passwordStrength(current); // 0–4
    const label = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][s] ?? 'Strong';
    const color = s <= 1 ? '#f87171' : s === 2 ? '#fbbf24' : '#34d399';
    strEl.textContent = label;
    (strEl as HTMLElement).style.color = color;
  }
  regen();

  // NB: we deliberately do NOT block mousedown here. The card is sticky (only the badge/Escape/Use
  // close it), so letting the field blur is harmless — and it lets the length slider drag natively.

  shadow.getElementById('regen')!.addEventListener('click', regen);
  copyBtn.addEventListener('click', () => {
    void navigator.clipboard.writeText(current);
    copyBtn.classList.add('copied');
    setTimeout(() => copyBtn.classList.remove('copied'), 1100);
  });

  // Collapsible "Options" section (collapsed by default).
  const optBtn = shadow.getElementById('optbtn')!;
  const opts = shadow.getElementById('opts')!;
  optBtn.addEventListener('click', () => {
    const open = opts.classList.toggle('open');
    optBtn.classList.toggle('open', open);
    optBtn.setAttribute('aria-expanded', String(open));
  });

  const lenEl = shadow.getElementById('len') as HTMLInputElement;
  const lenv = shadow.getElementById('lenv')!;
  lenEl.addEventListener('input', () => {
    genOpts.length = Number(lenEl.value);
    lenv.textContent = lenEl.value;
    regen();
  });
  const bindToggle = (id: string, key: 'uppercase' | 'lowercase' | 'digits' | 'symbols'): void => {
    (shadow.getElementById(id) as HTMLInputElement).addEventListener('change', (e) => {
      genOpts[key] = (e.target as HTMLInputElement).checked;
      regen();
    });
  };
  bindToggle('upper', 'uppercase');
  bindToggle('lower', 'lowercase');
  bindToggle('dig', 'digits');
  bindToggle('sym', 'symbols');
  shadow.getElementById('use')!.addEventListener('click', () => {
    setValue(pw, current);
    fillConfirm(pw, current);
    closeGen(); // the badge stays — it's persistent for the field
  });
}

// --- save-on-submit ------------------------------------------------------------------------------

let saveHost: HTMLDivElement | null = null;
let lastSaved = ''; // signature guard so we don't re-prompt for the same credentials

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Many modern sign-up/login forms (React/Vue/etc.) have no real <form> element at all — the
// "Register"/"Sign in" control is a plain <button type="button"> whose onClick fires an XHR/fetch
// directly, so no native 'submit' event is ever dispatched (confirmed on demoqa.com/register: zero
// <form> tags in the rendered markup). We fall back to a click-based heuristic for those cases —
// the same technique Bitwarden's own client uses (see PR bitwarden/clients#10909): normalize the
// control's accessible label into individual Unicode words and match against a submit-word list,
// rather than a single locale-specific regex, so non-English sites (a real case for us — German
// speakers are among the userbase) are recognised too.
const SUBMIT_KEYWORDS = new Set([
  // English
  'login', 'log', 'in', 'sign', 'signin', 'signup', 'register', 'create', 'account', 'continue',
  'submit', 'confirm', 'proceed', 'join', 'next', 'go',
  // German
  'anmelden', 'einloggen', 'registrieren', 'konto', 'erstellen', 'weiter', 'fortfahren',
  'bestätigen', 'bestaetigen', 'senden', 'absenden', 'fertig', 'anmeldung',
  // Spanish
  'iniciar', 'sesión', 'sesion', 'registrarse', 'continuar', 'confirmar', 'enviar', 'crear',
  'cuenta', 'entrar',
  // French
  'connexion', 'connecter', 'inscription', 'inscrire', 'continuer', 'confirmer', 'envoyer',
  'créer', 'creer', 'compte', 'valider',
]);

/**
 * Best-effort accessible label for a button-like element (used to spot submit-style controls).
 * NB: `.value` on a plain <button> is always "" (not null/undefined) even with no `value`
 * attribute set, so a naive `el.value ?? el.textContent` never falls through to textContent for
 * ordinary <button>Text</button> markup — the single most common case. Only treat `.value` as the
 * label source for actual <input> controls (e.g. input[type=submit] value="Register").
 */
function controlLabel(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  if (el instanceof HTMLInputElement) return el.value.trim();
  return (el.textContent ?? '').trim();
}

/** Split into lowercase Unicode "letter run" words — locale-agnostic, mirrors Bitwarden's approach. */
function normalizeWords(s: string): string[] {
  return s.toLowerCase().match(/[\p{L}]+/gu) ?? [];
}

/** Does this control's label look like a submit/continue/register-style action, in any supported language? */
function looksLikeSubmitControl(el: Element): boolean {
  return normalizeWords(controlLabel(el)).some((w) => SUBMIT_KEYWORDS.has(w));
}

/** A password field, visible and non-empty, searched first within `scope` then the whole document
 *  (covers both classic forms and form-less SPA widgets where there's no shared container at all). */
function findFilledPassword(scope: ParentNode): HTMLInputElement | null {
  const inScope = Array.from(scope.querySelectorAll<HTMLInputElement>(PW_SELECTOR)).find(
    (p) => isVisible(p) && p.value,
  );
  if (inScope) return inScope;
  if (scope === document) return null;
  return (
    Array.from(document.querySelectorAll<HTMLInputElement>(PW_SELECTOR)).find(
      (p) => isVisible(p) && p.value,
    ) ?? null
  );
}

async function maybePromptSave(identifier: string, password: string): Promise<void> {
  const sig = `${identifier} ${password}`;
  if (!password || sig === lastSaved) return;
  const matches = await query();
  const existing = matches.find((m) => (m.username ?? m.email) === identifier);
  if (existing && existing.password === password) return; // already stored, unchanged
  lastSaved = sig;
  showSaveCard(identifier, password, existing ?? null);
}

function showSaveCard(identifier: string, password: string, existing: AutofillMatch | null): void {
  saveHost?.remove();
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
  const shadow = host.attachShadow({ mode: 'closed' });
  const site = location.hostname.replace(/^www\./, '');
  const updating = !!existing;
  shadow.innerHTML = `
    <style>
      @keyframes pm-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      .card{width:310px;background:#1a1622;color:#e9e7ef;border:1px solid rgba(109,92,224,.35);
        border-radius:14px;padding:15px;box-shadow:0 12px 36px rgba(0,0,0,.5),0 0 20px rgba(109,92,224,.2);
        animation:pm-in .2s ease-out}
      .h{display:flex;align-items:center;gap:10px;margin-bottom:9px}
      .dot{width:32px;height:32px;border-radius:9px;flex:none;background:#6d5ce0;display:flex;align-items:center;justify-content:center}
      .t{font-size:14px;font-weight:600}
      .b{font-size:12.5px;color:rgba(233,231,239,.8);line-height:1.5;margin:0 0 13px}
      .rp{color:#b9aef2;font-weight:600}
      .row{display:flex;gap:8px}
      button{flex:1;border:0;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:600;cursor:pointer}
      .ok{background:#6d5ce0;color:#fff}
      .no{background:rgba(255,255,255,.07);color:rgba(233,231,239,.82)}
    </style>
    <div class="card" role="dialog">
      <div class="h">
        <div class="dot"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg></div>
        <div class="t">Password Manager</div>
      </div>
      <p class="b">${updating ? 'Update the saved password for' : 'Save this login for'} <span class="rp">${esc(
        site,
      )}</span>${identifier ? ` (<span class="rp">${esc(identifier)}</span>)` : ''}?</p>
      <div class="row">
        <button class="no" id="no">Not now</button>
        <button class="ok" id="ok">${updating ? 'Update' : 'Save'}</button>
      </div>
    </div>`;
  document.documentElement.appendChild(host);
  saveHost = host;
  const close = () => {
    host.remove();
    if (saveHost === host) saveHost = null;
  };
  shadow.getElementById('no')!.addEventListener('click', close);
  shadow.getElementById('ok')!.addEventListener('click', () => {
    void doSave(identifier, password, existing);
    close();
  });
  setTimeout(() => {
    if (saveHost === host) close();
  }, 12_000);
}

async function doSave(identifier: string, password: string, existing: AutofillMatch | null): Promise<void> {
  if (existing) {
    // Fetch current fields, swap the password, update in place.
    const res = await sendMsg({ kind: 'get_item', id: existing.id });
    if (!res?.ok || res.kind !== 'item') return;
    const fields = { ...(res.fields as LoginFields), password };
    await sendMsg({ kind: 'update_login', id: existing.id, fields });
    return;
  }
  const isEmail = looksLikeEmail(identifier);
  const fields: LoginFields = {
    name: location.hostname.replace(/^www\./, ''),
    username: !isEmail && identifier ? identifier : undefined,
    email: isEmail ? identifier : undefined,
    password,
    uris: [location.origin],
    matchMode: 'host',
  };
  await sendMsg({ kind: 'create_login', fields });
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// --- wiring --------------------------------------------------------------------------------------

function attach(): void {
  // Persistent badges: sweep now, then keep in sync with DOM changes so every detected password
  // field always carries the key icon (not just the focused one).
  scanFields();
  let scanQueued = false;
  const queueScan = (): void => {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scanFields();
    });
  };
  new MutationObserver(queueScan).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['type', 'style', 'class', 'hidden'],
  });

  // On focus of a password field: offer saved logins (existing site) or auto-open the generator
  // (empty new-password field, e.g. a signup form). The badge itself is already persistent.
  document.addEventListener(
    'focusin',
    async (e) => {
      const t = e.target as HTMLElement | null;
      if (!(t instanceof HTMLInputElement) || !t.matches(PW_SELECTOR) || !isVisible(t)) return;
      ensureBadge(t); // in case this field only became detectable at focus time
      const [ready, matches] = await Promise.all([vaultReady(), query()]);
      if (document.activeElement !== t) return;
      fieldMatches.set(t, matches); // let the badge know whether this field has saved logins
      refreshBadges();
      if (!ready) {
        if (!noAutoOpen.has(t)) openLockPrompt(t); // locked: never guess "new field" instead
      } else if (matches.length > 0) {
        openPicker(t, matches);
      } else if (!t.value && isLikelyNewPasswordField(t) && !noAutoOpen.has(t) && !genHost) {
        openGenerator(t); // likely a new-password / registration field
      }
    },
    true,
  );
  document.addEventListener(
    'focusout',
    () =>
      setTimeout(() => {
        closePicker();
        // The generator card is sticky (closed only via the badge / Escape / Use), so we never tear
        // it down on blur. Badges are persistent and are NOT removed on blur either.
      }, 150),
    true,
  );
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') {
        closePicker();
        if (genField) noAutoOpen.add(genField);
        closeGen();
        if (lockField) noAutoOpen.add(lockField);
        closeLockPrompt();
      }
      if (e.key === 'Enter') {
        // Fallback for forms/widgets submitted purely by pressing Enter in a field, with no
        // submit-labelled button click at all (the native 'submit' listener already covers real
        // <form> Enter-submits; this catches the form-less/JS-driven case, same idea as the
        // click-based fallback above but for the keyboard path).
        const t = e.target as HTMLElement | null;
        if (t instanceof HTMLInputElement && t.type !== 'checkbox' && t.type !== 'radio') {
          const scope = t.closest('form') ?? document;
          const pw = findFilledPassword(scope);
          if (pw) {
            const password = pw.value;
            const userField = findUsernameField(pw);
            const identifier = userField?.value?.trim() ?? '';
            setTimeout(() => void maybePromptSave(identifier, password), 400);
          }
        }
      }
    },
    true,
  );
  window.addEventListener(
    'scroll',
    () => {
      refreshBadges(false); // scroll: field + its controls move together, cached inset still valid
      positionGen();
      closePicker();
    },
    true,
  );
  window.addEventListener(
    'resize',
    () => {
      refreshBadges(true); // resize can reflow the field's controls → re-measure the inset
      positionGen();
      closePicker();
    },
    true,
  );
  // If the user starts typing their own password, get out of the way (keep the badge to reopen).
  document.addEventListener(
    'input',
    (e) => {
      if (e.target === genField && genField?.value) closeGen();
    },
    true,
  );

  // Save/update prompt on form submit (classic <form> sites).
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target as HTMLElement | null;
      const scope = form instanceof HTMLFormElement ? form : document;
      const pw = scope.querySelector<HTMLInputElement>(PW_SELECTOR);
      if (!pw?.value) return;
      const userField = findUsernameField(pw);
      void maybePromptSave(userField?.value?.trim() ?? '', pw.value);
    },
    true,
  );

  // Fallback for form-less SPA sign-up/login widgets: a click on a submit-labelled button/control
  // near a filled password field, even though no native 'submit' event will ever fire. Harmless to
  // run alongside the listener above — maybePromptSave's signature guard skips duplicate prompts if
  // both happen to fire for the same credentials.
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>('button, [role="button"], input[type="submit"]');
      if (!el) return;
      const isSubmitType =
        (el as HTMLInputElement | HTMLButtonElement).type === 'submit';
      if (!isSubmitType && !looksLikeSubmitControl(el)) return;
      const scope = el.closest('form') ?? document;
      const pw = findFilledPassword(scope);
      if (!pw) return;
      const password = pw.value;
      const userField = findUsernameField(pw);
      const identifier = userField?.value?.trim() ?? '';
      // Small delay: let the site's own click handling (validation/XHR) settle before our card
      // appears, so it doesn't visually collide with the page's own submit feedback.
      setTimeout(() => void maybePromptSave(identifier, password), 400);
    },
    true,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attach);
} else {
  attach();
}
