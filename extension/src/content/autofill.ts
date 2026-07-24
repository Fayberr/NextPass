/**
 * Autofill content script (Phase 1+). Detects username/password fields, offers matching vault
 * credentials via an inline picker anchored to the focused field, and prompts to save/update a
 * login after a form submit. The full heuristic suite (MutationObserver, multi-step session
 * memory, iframe handling) is Phase 3 per the spec.
 */

import type { AutofillMatch, AutofillIdentityMatch, AutofillCardMatch, Msg, MsgResult } from '../lib/messages.js';
import { computeAutofillPolicy, type AutofillPolicy } from '../lib/settings.js';
import { generatePassword, passwordStrength, type LoginFields } from '@pm/shared';

/**
 * What this page is allowed to do per user settings (per-type auto-save/autofill toggles and the
 * ignored-websites list). Defaults to fully enabled until the real settings arrive at attach();
 * the background/session layer enforces the same rules, so a race can't leak matches anyway.
 */
let policy: AutofillPolicy = { logins: true, identities: true, cards: true };

const PW_SELECTOR = 'input[type="password"]';
const USER_HINTS = /user|login|email|account|benutzer|namen?/i;

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** Query matching inputs in the document, descending into any open shadow roots. */
function queryInputsRecursive(
  scope: ParentNode = document,
  selector: string = 'input:not([type="hidden"])',
): HTMLInputElement[] {
  const results: HTMLInputElement[] = [];
  try {
    const list = Array.from(scope.querySelectorAll<HTMLInputElement>(selector));
    results.push(...list);
    const elements = Array.from(scope.querySelectorAll<HTMLElement>('*'));
    for (const el of elements) {
      if (el.shadowRoot) {
        results.push(...queryInputsRecursive(el.shadowRoot, selector));
      }
    }
  } catch {}
  return results;
}

/**
 * Whether a password field looks like a genuine new-password/signup field (safe to auto-open the
 * generator for), rather than an ordinary login field.
 */
function isLikelyNewPasswordField(pw: HTMLInputElement): boolean {
  const ac = pw.getAttribute('autocomplete') ?? '';
  if (/new-password/.test(ac)) return true;
  const scope = pw.closest('form') ?? document;
  const pwFields = queryInputsRecursive(scope, PW_SELECTOR).filter(isVisible);
  return pwFields.length > 1;
}

// Locale-aware word lists for telling account creation apart from ordinary sign in.
const REGISTER_KEYWORDS = new Set([
  // English
  'register', 'signup', 'join',
  // German
  'registrieren', 'erstellen',
  // Spanish
  'registrarse', 'crear',
  // French
  'inscription', 'inscrire', 'créer', 'creer',
]);

/**
 * Best-effort "is this a brand-new-account registration form, not an ordinary login form" check.
 */
function isLikelyRegisterForm(pw: HTMLInputElement): boolean {
  if (isLikelyNewPasswordField(pw)) return true;
  const scope = pw.closest('form') ?? document;
  const controls = Array.from(
    scope.querySelectorAll<HTMLElement>('button, input[type="submit"], input[type="button"], [role="button"]'),
  ).filter(isVisible);
  return controls.some((el) => normalizeWords(controlLabel(el)).some((w) => REGISTER_KEYWORDS.has(w)));
}

/** Find the username field associated with a given password field (positional heuristic). */
function findUsernameField(pw: HTMLInputElement): HTMLInputElement | null {
  const inputs = queryInputsRecursive(document, 'input:not([type="hidden"])').filter(isVisible);
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

async function identityQuery(): Promise<AutofillIdentityMatch[]> {
  const res = await sendMsg({ kind: 'autofill_identity_query' });
  return res?.ok && res.kind === 'identity_autofill' ? res.matches : [];
}

async function cardQuery(): Promise<AutofillCardMatch[]> {
  const res = await sendMsg({ kind: 'autofill_card_query' });
  return res?.ok && res.kind === 'card_autofill' ? res.matches : [];
}

/**
 * Whether there's an unlocked vault to autofill/generate against. Without this, a locked vault
 * looks identical to "no saved logins" (autofillQuery returns [] either way) - which used to make
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
// Last-known saved-login matches per password field (populated on focus) - lets the badge decide,
// at click time, whether to open the accounts picker (saved logins exist) or the generator
// (no saved logins - likely a new/registration field), without re-querying synchronously.
const fieldMatches = new WeakMap<HTMLInputElement, AutofillMatch[]>();
// Password fields we've already attempted a silent auto-fill for (Kaspersky-style: fill the best
// match in automatically, no picker interaction required - the icon is only needed to switch
// accounts). Attempted-but-locked fields are deliberately left unmarked so a later scan/focus can
// retry once the vault is unlocked; everything else (already has a value, matched, or confirmed
// empty with no matches) is marked so we never re-query/re-fill on every DOM mutation.
const autoFillAttempted = new WeakSet<HTMLInputElement>();

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

/** Same anchor algorithm as the generator card (positionGen): right of the field if there's room,
 *  else below it, right-aligned - so the lock prompt appears exactly where the generator would. */
function anchorCardNextTo(field: HTMLInputElement, width: number): { left: number; top: number } {
  const r = field.getBoundingClientRect();
  const spaceRight = window.innerWidth - r.right;
  if (spaceRight >= width + 12) return { left: r.right + 8, top: r.top };
  return {
    left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)),
    top: r.bottom + 6,
  };
}

function openLockPrompt(pw: HTMLInputElement, anchor: HTMLInputElement = pw): void {
  closePicker();
  closeGen();
  closeLockPrompt();
  closeIdentityPicker();
  closeCardPicker();
  const W = 300; // same card width as the generator
  const { left, top } = anchorCardNextTo(anchor, W);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:${Math.round(left)}px;top:${Math.round(
    top,
  )}px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      @keyframes pm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
      .card{width:${W}px;background:#1a1622;color:#e9e7ef;border:1px solid rgba(109,92,224,.35);
        border-radius:14px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 22px rgba(109,92,224,.22);
        animation:pm-in .16s ease-out}
      .hd{display:flex;align-items:center;gap:8px;margin-bottom:11px;font-size:13px;font-weight:600}
      .hd svg{color:#8b78ea}
      .msg{font-size:12px;color:rgba(233,231,239,.7);margin:0 2px 14px}
      .use{width:100%;border:0;border-radius:10px;padding:10px;font-size:13px;font-weight:600;
        cursor:pointer;background:#6d5ce0;color:#fff}
      .use:hover{filter:brightness(1.08)}
    </style>
    <div class="card" role="dialog" aria-label="NextPass locked">
      <div class="hd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        NextPass
      </div>
      <div class="msg">Vault is locked. Unlock it to see saved logins or generate a password here.</div>
      <button class="use" id="unlock">Unlock</button>
    </div>`;
  document.documentElement.appendChild(host);
  lockHost = host;
  lockField = pw;
  shadow.querySelector<HTMLButtonElement>('#unlock')!.addEventListener('mousedown', (e) => {
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

/**
 * Silently fill the best (first) saved match into a field pair, without opening the picker -
 * Kaspersky/Bitwarden-style "just click login". Only ever touches fields that are still empty (an
 * already-typed value, ours or the site's, is never clobbered), and never fires on a likely
 * new-password/signup field (that's the generator's job, not the saved-login autofill's). Runs at
 * most once per password field per page life; `knownMatches` lets a caller that already queried
 * (e.g. focusin) skip a redundant round-trip.
 */
async function attemptAutoFill(pw: HTMLInputElement, knownMatches?: AutofillMatch[]): Promise<void> {
  if (autoFillAttempted.has(pw)) return;
  if (pw.value || isLikelyNewPasswordField(pw)) {
    autoFillAttempted.add(pw);
    return;
  }
  const userField = findUsernameField(pw);
  if (userField && userField.value) {
    autoFillAttempted.add(pw);
    return;
  }
  let matches = knownMatches;
  if (!matches) {
    if (!(await vaultReady())) return; // locked/unset - leave unmarked, retry on next scan/focus
    matches = await query();
  }
  autoFillAttempted.add(pw);
  fieldMatches.set(pw, matches);
  if (matches.length > 0) fillWith(pw, matches[0]!);
}

function openPicker(pw: HTMLInputElement, matches: AutofillMatch[], anchor: HTMLInputElement = pw): void {
  closePicker();
  closeGen();
  closeLockPrompt();
  closeIdentityPicker();
  closeCardPicker();
  const W = 300; // same card width/anchor algorithm as the generator, so it appears in the same place
  const { left, top } = anchorCardNextTo(anchor, W);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:${Math.round(left)}px;top:${Math.round(
    top,
  )}px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
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
      @keyframes pm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
      .card{width:${W}px;background:#1a1622;color:#e9e7ef;border:1px solid rgba(109,92,224,.35);
        border-radius:14px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 22px rgba(109,92,224,.22);
        animation:pm-in .16s ease-out}
      .hd{display:flex;align-items:center;gap:8px;margin-bottom:11px;font-size:13px;font-weight:600}
      .hd svg{color:#8b78ea}
      .list{max-height:250px;overflow-y:auto;margin:0 -6px;padding:0 6px}
      .row{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:none;border:0;
        border-radius:9px;padding:8px;cursor:pointer;color:#e9e7ef}
      .row:hover{background:rgba(109,92,224,.18)}
      .ic{flex:none;display:flex}
      .txt{min-width:0;display:flex;flex-direction:column}
      .nm{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sub{font-size:11px;color:rgba(233,231,239,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    </style>
    <div class="card" role="dialog" aria-label="NextPass accounts">
      <div class="hd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        NextPass
      </div>
      <div class="list">${rows}</div>
    </div>`;
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
  // The password field this badge actually operates on. Equal to the badge's own field for a
  // password-field badge; for a username/email companion badge (added so BOTH fields show the icon,
  // Kaspersky-style) it points at the associated password field, since that's what vault reads/writes
  // and lock/picker/generator state all key off - the badge is just a second entry point to the same
  // card, anchored at wherever it was clicked.
  pwField: HTMLInputElement;
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
  if (el === identityPickerHost || el === cardPickerHost) return true;
  for (const { host } of badges.values()) if (el === host) return true;
  for (const { host } of identityBadges.values()) if (el === host) return true;
  for (const { host } of cardBadges.values()) if (el === host) return true;
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
 * vertical centre from the right edge inward with `elementsFromPoint` - that reflects the ACTUAL
 * visual stacking (an overlay eye button sits above the input at that point), independent of DOM
 * structure - and take the leftmost overlapping control's edge. Returns 0 when the edge is clear.
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

/** Structural subset of Badge/IdentityBadge - both badge kinds share the same fixed-position host
 *  element and cached right-inset, so this one positioning routine serves both. */
function positionBadge(field: HTMLInputElement, badge: { host: HTMLDivElement; inset: number }): void {
  if (!badgeShouldShow(field)) {
    badge.host.style.display = 'none';
    return;
  }
  const r = field.getBoundingClientRect();
  badge.host.style.display = '';
  badge.host.style.left = `${Math.round(r.right - 30 - badge.inset)}px`;
  badge.host.style.top = `${Math.round(r.top + r.height / 2 - 12)}px`;
}

/**
 * Create the persistent badge for a field if it doesn't have one yet. `pwField` is the password
 * field this badge's card should actually operate on/anchor state to - defaults to `field` itself
 * (a password-field badge); pass the password field explicitly when adding a companion badge to a
 * username/email field so both icons drive the same underlying lock/picker/generator state.
 */
function ensureBadge(field: HTMLInputElement, pwField: HTMLInputElement = field): void {
  const existing = badges.get(field);
  if (existing) {
    existing.pwField = pwField; // keep pointing at the right password field if remapped by a rescan
    return;
  }
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
    <button class="key" title="NextPass" tabindex="-1" aria-label="Open NextPass">${KEY_SVG}</button>`;
  document.documentElement.appendChild(host);
  const btn = shadow.querySelector<HTMLButtonElement>('.key')!;
  const badge: Badge = { host, btn, inset: computeRightInset(field), pwField };
  badges.set(field, badge);
  positionBadge(field, badge);
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // keep focus on the field
    void (async () => {
      const pw = badge.pwField;
      // Locked/not-set-up vault looks identical to "no saved logins" from autofillQuery's point of
      // view - check real vault state first so a locked vault never gets offered a fresh generated
      // password instead of "please unlock".
      if (!(await vaultReady())) {
        if (lockHost && lockField === pw) closeLockPrompt();
        else openLockPrompt(pw, field);
        return;
      }
      // If this field has saved logins, the badge is a toggle for the accounts picker (not the
      // generator) - clicking it should never offer to overwrite a saved password with a new
      // random one. Only fields with no saved match (new/registration fields) use it to toggle
      // the generator. Re-query fresh rather than trusting the cache: the cache may be stale from
      // an earlier focus while the vault was still locked (e.g. user just unlocked via the popup
      // without refocusing the field), and a stale empty result would wrongly fall through to the
      // generator here.
      //
      // Exception: on a registration/signup form (isLikelyRegisterForm), always prefer the
      // generator even if the site already has saved matches elsewhere (e.g. from a separate login
      // form on the same domain) - the user is creating a new credential here, not signing in with
      // an old one, so the picker is the wrong offer regardless of what's saved for this site.
      const matches = await query();
      fieldMatches.set(pw, matches);
      if (matches.length > 0 && !isLikelyRegisterForm(pw)) {
        if (pickerHost && pickerField === pw) closePicker();
        else openPicker(pw, matches, field);
        return;
      }
      if (genHost && genField === pw) {
        noAutoOpen.add(pw); // don't let a re-focus immediately reopen what the user just closed
        closeGen();
      } else {
        openGenerator(pw, field);
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
 * field's right-inset (its overlapping site controls) - do that on layout changes (scan/resize) but
 * NOT on plain scroll, where the field and its controls move together so the cached inset holds.
 */
function refreshBadges(recompute = false): void {
  for (const [field, badge] of badges) {
    if (recompute) badge.inset = computeRightInset(field);
    positionBadge(field, badge);
    // Compare against badge.pwField (not `field`) so a username-companion badge lights up together
    // with its password badge whenever either one's card is open.
    badge.btn.classList.toggle(
      'active',
      (!!genHost && genField === badge.pwField) ||
        (!!pickerHost && pickerField === badge.pwField) ||
        (!!lockHost && lockField === badge.pwField),
    );
  }
}

/**
 * Sweep the DOM: add badges for newly-detected password fields (plus a companion badge on each
 * one's associated username/email field, so both fields show the icon like Kaspersky/Bitwarden),
 * drop badges for vanished fields, and opportunistically silent-autofill any freshly-detected,
 * still-empty login field.
 */
function scanFields(): void {
  const present = new Set<HTMLInputElement>();
  if (policy.logins) {
    for (const el of document.querySelectorAll<HTMLInputElement>(PW_SELECTOR)) {
      if (!isVisible(el)) continue;
      present.add(el);
      ensureBadge(el);
      void attemptAutoFill(el);
      const userField = findUsernameField(el);
      if (userField && isVisible(userField)) {
        present.add(userField);
        ensureBadge(userField, el);
      }
    }
  }
  for (const field of [...badges.keys()]) {
    if (!present.has(field)) removeBadge(field);
  }
  refreshBadges(true); // DOM changed → re-measure insets (a site control may have appeared/moved)
  const claimed = policy.cards ? scanCardFields() : new Set<HTMLInputElement>();
  if (policy.identities) scanIdentityFields(claimed);
}

// --- identity autofill (name/address/phone-style checkout & registration fields) -----------------
//
// Separate from the login badge system above: identities aren't password-shaped (no pwField, no
// generator, no save-prompt) - clicking any recognized field's badge opens a small picker of saved
// identities, and choosing one fills EVERY recognized identity field in the same form scope at once
// (the standard "fill address" UX). Deliberately scoped to forms with NO visible password field -
// that's what actually distinguishes a checkout/contact/shipping form from a login/register form in
// practice, and keeps this from ever fighting the login badge for the same input (e.g. an email
// field on a register form stays login-only; the same field on a pure checkout form gets identity
// autofill instead).

type IdentityKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'address1'
  | 'address2'
  | 'city'
  | 'state'
  | 'postalCode'
  | 'country';

const IDENTITY_AC_MAP: Record<string, IdentityKey> = {
  'given-name': 'firstName',
  'family-name': 'lastName',
  email: 'email',
  tel: 'phone',
  'tel-national': 'phone',
  'address-line1': 'address1',
  'address-line2': 'address2',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code': 'postalCode',
  country: 'country',
  'country-name': 'country',
};

// Fallback for the (common) case where a site sets no autocomplete attribute at all - matched
// against name/id/placeholder/aria-label, same technique as USER_HINTS above. Order matters:
// address1 must be checked before the generic "address" isn't a separate case here since line1/2
// both require a digit or explicit "line"/"street", avoiding a bare "address" label picking line1.
const IDENTITY_NAME_HINTS: [RegExp, IdentityKey][] = [
  [/first.?name|fname|given.?name|vorname/i, 'firstName'],
  [/last.?name|lname|surname|family.?name|nachname/i, 'lastName'],
  [/e.?mail/i, 'email'],
  [/phone|tel(ephone)?|mobile|telefon/i, 'phone'],
  [/address.?(line)?.?2|apt|suite|unit|adresszusatz/i, 'address2'],
  [/address.?(line)?.?1?|street|strasse|straße/i, 'address1'],
  [/city|town|ort\b|stadt/i, 'city'],
  [/state|province|region|bundesland/i, 'state'],
  [/zip|postal|postcode|plz/i, 'postalCode'],
  [/country|land\b/i, 'country'],
];

function identityFieldKey(el: HTMLInputElement): IdentityKey | null {
  const ac = (el.getAttribute('autocomplete') ?? '').toLowerCase().trim();
  const lastTok = ac.split(/\s+/).pop() ?? ''; // "shipping given-name" → "given-name"
  const mapped = IDENTITY_AC_MAP[lastTok];
  if (mapped) return mapped;
  if (el.type === 'email') return 'email';
  if (el.type === 'tel') return 'phone';
  if (el.type !== 'text' && el.type !== 'search') return null;
  const hay = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') ?? ''}`;
  for (const [re, key] of IDENTITY_NAME_HINTS) if (re.test(hay)) return key;
  return null;
}

interface IdentityBadge {
  host: HTMLDivElement;
  btn: HTMLButtonElement;
  inset: number;
  scopeFields: Map<IdentityKey, HTMLInputElement>; // every recognized field in this field's scope
}
const identityBadges = new Map<HTMLInputElement, IdentityBadge>();

function ensureIdentityBadge(field: HTMLInputElement, scopeFields: Map<IdentityKey, HTMLInputElement>): void {
  const existing = identityBadges.get(field);
  if (existing) {
    existing.scopeFields = scopeFields;
    return;
  }
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
    <button class="key" title="Fill from saved identity" tabindex="-1" aria-label="Fill from saved identity">${KEY_SVG}</button>`;
  document.documentElement.appendChild(host);
  const btn = shadow.querySelector<HTMLButtonElement>('.key')!;
  const badge: IdentityBadge = { host, btn, inset: computeRightInset(field), scopeFields };
  identityBadges.set(field, badge);
  positionBadge(field, badge);
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // keep focus on the field
    void (async () => {
      if (!(await vaultReady())) {
        if (lockHost && lockField === field) closeLockPrompt();
        else openLockPrompt(field, field);
        return;
      }
      if (identityPickerHost && identityPickerField === field) {
        closeIdentityPicker();
        return;
      }
      const matches = await identityQuery();
      if (matches.length === 0) return; // nothing saved yet - no picker to show
      openIdentityPicker(field, matches, badge.scopeFields);
    })();
  });
}

function removeIdentityBadge(field: HTMLInputElement): void {
  const badge = identityBadges.get(field);
  if (!badge) return;
  badge.host.remove();
  identityBadges.delete(field);
}

function refreshIdentityBadges(recompute = false): void {
  for (const [field, badge] of identityBadges) {
    if (recompute) badge.inset = computeRightInset(field);
    positionBadge(field, badge);
    badge.btn.classList.toggle('active', identityPickerHost !== null && identityPickerField === field);
  }
}

/** Sweep visible text/email/tel inputs, grouped by form scope; only scopes with NO visible password
 *  field (i.e. not a login/register form) are eligible, and only scopes with at least one recognized
 *  field get badges - see the section comment above for why. `claimed` is the set of fields already
 *  taken by scanCardFields() (e.g. a "Name on Card" field), which must be skipped here so a single
 *  input never gets both a card badge and an identity badge. */
function scanIdentityFields(claimed: Set<HTMLInputElement> = new Set()): void {
  const present = new Set<HTMLInputElement>();
  const scopes = new Set<ParentNode>();
  for (const form of document.querySelectorAll('form')) scopes.add(form);
  scopes.add(document); // form-less widgets too

  for (const scope of scopes) {
    const pwInScope = Array.from(scope.querySelectorAll<HTMLInputElement>(PW_SELECTOR)).some(isVisible);
    if (pwInScope) continue;
    const scopeFields = new Map<IdentityKey, HTMLInputElement>();
    const inputs = Array.from(
      scope.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([type="password"])'),
    ).filter(isVisible);
    for (const el of inputs) {
      // document-scope pass shouldn't re-claim fields that already belong to a real <form> scope.
      if (scope === document && el.closest('form')) continue;
      if (claimed.has(el)) continue;
      const key = identityFieldKey(el);
      if (key && !scopeFields.has(key)) scopeFields.set(key, el);
    }
    if (scopeFields.size === 0) continue;
    for (const el of scopeFields.values()) {
      present.add(el);
      ensureIdentityBadge(el, scopeFields);
    }
  }
  for (const field of [...identityBadges.keys()]) {
    if (!present.has(field)) removeIdentityBadge(field);
  }
  refreshIdentityBadges(true);
}

let identityPickerHost: HTMLDivElement | null = null;
let identityPickerField: HTMLInputElement | null = null;

function closeIdentityPicker(): void {
  identityPickerHost?.remove();
  identityPickerHost = null;
  identityPickerField = null;
  refreshIdentityBadges();
}

function fillIdentityGroup(scopeFields: Map<IdentityKey, HTMLInputElement>, m: AutofillIdentityMatch): void {
  for (const [key, el] of scopeFields) {
    const value = m[key];
    if (value) setValue(el, value);
  }
}

function openIdentityPicker(
  field: HTMLInputElement,
  matches: AutofillIdentityMatch[],
  scopeFields: Map<IdentityKey, HTMLInputElement>,
): void {
  closeIdentityPicker();
  closePicker();
  closeGen();
  closeLockPrompt();
  closeCardPicker();
  const W = 300;
  const { left, top } = anchorCardNextTo(field, W);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:${Math.round(left)}px;top:${Math.round(
    top,
  )}px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
  const shadow = host.attachShadow({ mode: 'closed' });
  const rows = matches
    .map(
      (m, i) => `
      <button class="row" data-i="${i}">
        <span class="ic">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b9aef2" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </span>
        <span class="txt"><span class="nm">${esc(m.name)}</span>${
          m.email ? `<span class="sub">${esc(m.email)}</span>` : ''
        }</span>
      </button>`,
    )
    .join('');
  shadow.innerHTML = `
    <style>
      @keyframes pm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
      .card{width:${W}px;background:#1a1622;color:#e9e7ef;border:1px solid rgba(109,92,224,.35);
        border-radius:14px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 22px rgba(109,92,224,.22);
        animation:pm-in .16s ease-out}
      .hd{display:flex;align-items:center;gap:8px;margin-bottom:11px;font-size:13px;font-weight:600}
      .hd svg{color:#8b78ea}
      .list{max-height:250px;overflow-y:auto;margin:0 -6px;padding:0 6px}
      .row{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:none;border:0;
        border-radius:9px;padding:8px;cursor:pointer;color:#e9e7ef}
      .row:hover{background:rgba(109,92,224,.18)}
      .ic{flex:none;display:flex}
      .txt{min-width:0;display:flex;flex-direction:column}
      .nm{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sub{font-size:11px;color:rgba(233,231,239,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    </style>
    <div class="card" role="dialog" aria-label="NextPass identities">
      <div class="hd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Fill from saved identity
      </div>
      <div class="list">${rows}</div>
    </div>`;
  document.documentElement.appendChild(host);
  identityPickerHost = host;
  identityPickerField = field;
  refreshIdentityBadges();
  shadow.querySelectorAll<HTMLButtonElement>('.row').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      fillIdentityGroup(scopeFields, matches[Number(btn.dataset.i)]!);
      closeIdentityPicker();
    });
  });
}

// --- card autofill (checkout forms: card number/expiry/CVV/cardholder name) ----------------------
//
// Same shape as the identity system above: a form scope with no visible password field, grouped
// recognized fields, badge-click opens a picker of saved cards, picking one fills every recognized
// field in the scope at once. Card fields are classified BEFORE identity fields in scanFields() and
// claimed fields are excluded from identity classification (see scanIdentityFields's `claimed`
// param) - otherwise a "Name on Card" field could get misread as an identity first/last name field.

type CardKey = 'cardholder' | 'number' | 'expMonth' | 'expYear' | 'expCombined' | 'cvv';

const CARD_AC_MAP: Record<string, CardKey> = {
  'cc-name': 'cardholder',
  'cc-number': 'number',
  'cc-exp-month': 'expMonth',
  'cc-exp-year': 'expYear',
  'cc-exp': 'expCombined',
  'cc-csc': 'cvv',
};

// Order matters: expMonth/expYear must be checked before the generic "expir..." combined-field
// pattern, since a label like "Expiry Month" contains both "exp" and "month".
const CARD_NAME_HINTS: [RegExp, CardKey][] = [
  [/exp.*month|month.*exp|ablaufmonat/i, 'expMonth'],
  [/exp.*year|year.*exp|ablaufjahr/i, 'expYear'],
  [/(mm\s*\/?\s*yy|expir|g.ltig|valid.?thru|ablauf)/i, 'expCombined'],
  [/cvv|cvc|security.?code|card.?code|sicherheitscode|prüfziffer/i, 'cvv'],
  [/card.?number|cc.?number|kartennummer|kreditkartennummer/i, 'number'],
  [/card.?holder|name.*on.*card|karteninhaber/i, 'cardholder'],
];

function cardFieldKey(el: HTMLInputElement): CardKey | null {
  const ac = (el.getAttribute('autocomplete') ?? '').toLowerCase().trim();
  const lastTok = ac.split(/\s+/).pop() ?? '';
  const mapped = CARD_AC_MAP[lastTok];
  if (mapped) return mapped;
  if (el.type !== 'text' && el.type !== 'tel' && el.type !== 'search') return null;
  const hay = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') ?? ''}`;
  for (const [re, key] of CARD_NAME_HINTS) if (re.test(hay)) return key;
  return null;
}

interface CardBadge {
  host: HTMLDivElement;
  btn: HTMLButtonElement;
  inset: number;
  scopeFields: Map<CardKey, HTMLInputElement>;
}
const cardBadges = new Map<HTMLInputElement, CardBadge>();

function ensureCardBadge(field: HTMLInputElement, scopeFields: Map<CardKey, HTMLInputElement>): void {
  const existing = cardBadges.get(field);
  if (existing) {
    existing.scopeFields = scopeFields;
    return;
  }
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
    <button class="key" title="Fill from saved card" tabindex="-1" aria-label="Fill from saved card">${KEY_SVG}</button>`;
  document.documentElement.appendChild(host);
  const btn = shadow.querySelector<HTMLButtonElement>('.key')!;
  const badge: CardBadge = { host, btn, inset: computeRightInset(field), scopeFields };
  cardBadges.set(field, badge);
  positionBadge(field, badge);
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // keep focus on the field
    void (async () => {
      if (!(await vaultReady())) {
        if (lockHost && lockField === field) closeLockPrompt();
        else openLockPrompt(field, field);
        return;
      }
      if (cardPickerHost && cardPickerField === field) {
        closeCardPicker();
        return;
      }
      const matches = await cardQuery();
      if (matches.length === 0) return; // nothing saved yet - no picker to show
      openCardPicker(field, matches, badge.scopeFields);
    })();
  });
}

function removeCardBadge(field: HTMLInputElement): void {
  const badge = cardBadges.get(field);
  if (!badge) return;
  badge.host.remove();
  cardBadges.delete(field);
}

function refreshCardBadges(recompute = false): void {
  for (const [field, badge] of cardBadges) {
    if (recompute) badge.inset = computeRightInset(field);
    positionBadge(field, badge);
    badge.btn.classList.toggle('active', cardPickerHost !== null && cardPickerField === field);
  }
}

/** Sweep visible text/tel inputs for card-shaped fields, grouped by form scope (same NO-visible-
 *  password-field scoping rule as scanIdentityFields - a checkout form isn't a login form). Returns
 *  the claimed fields so scanIdentityFields can skip them (a "Name on Card" field must not also get
 *  an identity first/last-name badge). */
function scanCardFields(): Set<HTMLInputElement> {
  const present = new Set<HTMLInputElement>();
  const scopes = new Set<ParentNode>();
  for (const form of document.querySelectorAll('form')) scopes.add(form);
  scopes.add(document); // form-less widgets too

  for (const scope of scopes) {
    const pwInScope = Array.from(scope.querySelectorAll<HTMLInputElement>(PW_SELECTOR)).some(isVisible);
    if (pwInScope) continue;
    const scopeFields = new Map<CardKey, HTMLInputElement>();
    const inputs = Array.from(
      scope.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([type="password"])'),
    ).filter(isVisible);
    for (const el of inputs) {
      if (scope === document && el.closest('form')) continue;
      const key = cardFieldKey(el);
      if (key && !scopeFields.has(key)) scopeFields.set(key, el);
    }
    if (scopeFields.size === 0) continue;
    for (const el of scopeFields.values()) {
      present.add(el);
      ensureCardBadge(el, scopeFields);
    }
  }
  for (const field of [...cardBadges.keys()]) {
    if (!present.has(field)) removeCardBadge(field);
  }
  refreshCardBadges(true);
  return present;
}

let cardPickerHost: HTMLDivElement | null = null;
let cardPickerField: HTMLInputElement | null = null;

function closeCardPicker(): void {
  cardPickerHost?.remove();
  cardPickerHost = null;
  cardPickerField = null;
  refreshCardBadges();
}

/** Fills every recognized field in the scope, formatting a combined MM/YY field from the separate
 *  stored expMonth/expYear when present. Never overwrites a field that already has a value. */
function fillCardGroup(scopeFields: Map<CardKey, HTMLInputElement>, m: AutofillCardMatch): void {
  for (const [key, el] of scopeFields) {
    if (el.value) continue;
    if (key === 'expCombined') {
      if (m.expMonth && m.expYear) {
        const mm = m.expMonth.padStart(2, '0');
        const yy = m.expYear.length >= 2 ? m.expYear.slice(-2) : m.expYear;
        setValue(el, `${mm}/${yy}`);
      }
      continue;
    }
    const value = m[key];
    if (value) setValue(el, value);
  }
}

function openCardPicker(
  field: HTMLInputElement,
  matches: AutofillCardMatch[],
  scopeFields: Map<CardKey, HTMLInputElement>,
): void {
  closeCardPicker();
  closeIdentityPicker();
  closePicker();
  closeGen();
  closeLockPrompt();
  const W = 300;
  const { left, top } = anchorCardNextTo(field, W);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:${Math.round(left)}px;top:${Math.round(
    top,
  )}px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
  const shadow = host.attachShadow({ mode: 'closed' });
  const rows = matches
    .map(
      (m, i) => `
      <button class="row" data-i="${i}">
        <span class="ic">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b9aef2" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </span>
        <span class="txt"><span class="nm">${esc(m.name)}</span>${
          m.number ? `<span class="sub">•••• ${esc(m.number.slice(-4))}</span>` : ''
        }</span>
      </button>`,
    )
    .join('');
  shadow.innerHTML = `
    <style>
      @keyframes pm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
      .card{width:${W}px;background:#1a1622;color:#e9e7ef;border:1px solid rgba(109,92,224,.35);
        border-radius:14px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 22px rgba(109,92,224,.22);
        animation:pm-in .16s ease-out}
      .hd{display:flex;align-items:center;gap:8px;margin-bottom:11px;font-size:13px;font-weight:600}
      .hd svg{color:#8b78ea}
      .list{max-height:250px;overflow-y:auto;margin:0 -6px;padding:0 6px}
      .row{display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:none;border:0;
        border-radius:9px;padding:8px;cursor:pointer;color:#e9e7ef}
      .row:hover{background:rgba(109,92,224,.18)}
      .ic{flex:none;display:flex}
      .txt{min-width:0;display:flex;flex-direction:column}
      .nm{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .sub{font-size:11px;color:rgba(233,231,239,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    </style>
    <div class="card" role="dialog" aria-label="NextPass cards">
      <div class="hd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        Fill from saved card
      </div>
      <div class="list">${rows}</div>
    </div>`;
  document.documentElement.appendChild(host);
  cardPickerHost = host;
  cardPickerField = field;
  refreshCardBadges();
  shadow.querySelectorAll<HTMLButtonElement>('.row').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      fillCardGroup(scopeFields, matches[Number(btn.dataset.i)]!);
      closeCardPicker();
    });
  });
}

let genHost: HTMLDivElement | null = null;
let genField: HTMLInputElement | null = null;
// The field the generator card is visually anchored to - normally genField itself, but when opened
// from a username-field badge (badge.pwField points at the real password field) it's the username
// field, so the card pops out next to whichever icon was actually clicked.
let genAnchor: HTMLInputElement | null = null;
const genOpts = { length: 20, uppercase: true, lowercase: true, digits: true, symbols: true };
// Fields the user has explicitly closed the generator on - suppresses auto-open on the next focus
// (so re-clicking into the field doesn't reopen a card they just dismissed).
const noAutoOpen = new WeakSet<HTMLInputElement>();

function closeGen(): void {
  genHost?.remove();
  genHost = null;
  genField = null;
  genAnchor = null;
  refreshBadges(); // clear the active state on whichever badge owned the card
}

function positionGen(): void {
  if (!genHost || !genField) return;
  const { left, top } = anchorCardNextTo(genAnchor ?? genField, 300);
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

function openGenerator(pw: HTMLInputElement, anchor: HTMLInputElement = pw): void {
  closePicker();
  closeLockPrompt();
  closeGen();
  closeIdentityPicker();
  closeCardPicker();
  genField = pw;
  genAnchor = anchor;
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
      /* Custom checkbox - appearance:none so it ignores the OS light theme. */
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
  // close it), so letting the field blur is harmless - and it lets the length slider drag natively.

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
    closeGen(); // the badge stays - it's persistent for the field
  });
}

// --- save-on-submit ------------------------------------------------------------------------------

let saveHost: HTMLDivElement | null = null;
let lastSaved = ''; // signature guard so we don't re-prompt for the same credentials

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Many modern sign-up/login forms (React/Vue/etc.) have no real <form> element at all - the
// "Register"/"Sign in" control is a plain <button type="button"> whose onClick fires an XHR/fetch
// directly, so no native 'submit' event is ever dispatched (confirmed on demoqa.com/register: zero
// <form> tags in the rendered markup). We fall back to a click-based heuristic for those cases -
// the same technique Bitwarden's own client uses (see PR bitwarden/clients#10909): normalize the
// control's accessible label into individual Unicode words and match against a submit-word list,
// rather than a single locale-specific regex, so non-English sites (a real case for us - German
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
 * ordinary <button>Text</button> markup - the single most common case. Only treat `.value` as the
 * label source for actual <input> controls (e.g. input[type=submit] value="Register").
 */
function controlLabel(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  if (el instanceof HTMLInputElement) return el.value.trim();
  return (el.textContent ?? '').trim();
}

/** Split into lowercase Unicode "letter run" words - locale-agnostic, mirrors Bitwarden's approach. */
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
  if (!policy.logins) return; // auto-save disabled (per-type toggle or ignored site)
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
        <div class="t">NextPass</div>
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

async function attach(): Promise<void> {
  // Load the user's autofill policy (per-type toggles + ignored websites) before the first sweep,
  // and keep it live: settings edits in the popup apply to already-open tabs on the next re-scan.
  const settingsRes = await sendMsg({ kind: 'get_settings' });
  if (settingsRes?.ok && settingsRes.kind === 'settings') {
    policy = computeAutofillPolicy(settingsRes.settings, location.href);
  }
  try {
    chrome.storage?.onChanged?.addListener((changes, area) => {
      const next = changes['pm.settings']?.newValue;
      if (area === 'local' && next) {
        policy = computeAutofillPolicy(next, location.href);
        scanFields();
      }
    });
  } catch {} // storage API unavailable (shouldn't happen in the extension)

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

  // On focus of a password field OR its username/email companion (both carry a badge): silently
  // auto-fill the best saved match if there is one (Kaspersky-style - no picker interaction needed,
  // the icon is just there to switch accounts), auto-open the generator for a likely new-password
  // field, or prompt to unlock a locked vault. The picker/generator/lock-prompt only ever pop open
  // from here for the locked-vault and new-password cases; the account picker itself is now
  // click-to-open-only (via the badge), never focus-triggered, since auto-fill already covers the
  // common case.
  document.addEventListener(
    'focusin',
    async (e) => {
      const t = e.target as HTMLElement | null;
      if (!(t instanceof HTMLInputElement) || !isVisible(t)) return;
      if (policy.logins && t.matches(PW_SELECTOR)) ensureBadge(t); // in case this field only became detectable at focus time
      const badge = badges.get(t);
      if (!badge) return; // not a field we've badged (password field or its username companion)
      const pw = badge.pwField;
      const [ready, matches] = await Promise.all([vaultReady(), query()]);
      if (document.activeElement !== t) return;
      fieldMatches.set(pw, matches); // let the badge know whether this field has saved logins
      refreshBadges();
      if (!ready) {
        if (!noAutoOpen.has(pw)) openLockPrompt(pw, t); // locked: never guess "new field" instead
      } else if (matches.length > 0) {
        void attemptAutoFill(pw, matches);
      } else if (t === pw && !t.value && isLikelyRegisterForm(t) && !noAutoOpen.has(pw) && !genHost) {
        openGenerator(t, t); // likely a new-password / registration field
      }
    },
    true,
  );
  document.addEventListener(
    'focusout',
    () =>
      setTimeout(() => {
        closePicker();
        closeIdentityPicker();
        closeCardPicker();
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
        closeIdentityPicker();
        closeCardPicker();
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
      refreshIdentityBadges(false);
      refreshCardBadges(false);
      positionGen();
      closePicker();
      closeIdentityPicker();
      closeCardPicker();
      closeLockPrompt(); // not repositioned live like the generator - just drop it, same as the picker
    },
    true,
  );
  window.addEventListener(
    'resize',
    () => {
      refreshBadges(true); // resize can reflow the field's controls → re-measure the inset
      refreshIdentityBadges(true);
      refreshCardBadges(true);
      positionGen();
      closePicker();
      closeIdentityPicker();
      closeCardPicker();
      closeLockPrompt();
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
  // run alongside the listener above - maybePromptSave's signature guard skips duplicate prompts if
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
  document.addEventListener('DOMContentLoaded', () => void attach());
} else {
  void attach();
}
