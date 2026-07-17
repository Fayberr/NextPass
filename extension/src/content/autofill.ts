/**
 * Basic autofill content script (Phase 1). Detects username/password fields with a small
 * heuristic stack (autocomplete attr → name/id/type regex → positional), asks the background
 * for credentials matching the current URL, and fills on user focus. The full heuristic suite
 * (MutationObserver, multi-step session memory, iframe handling) is Phase 3 per the spec.
 */

import type { AutofillMatch, Msg, MsgResult } from '../lib/messages.js';

const PW_SELECTOR = 'input[type="password"]';
const USER_HINTS = /user|login|email|account|benutzer|namen?/i;

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** Find the username field associated with a given password field (positional heuristic). */
function findUsernameField(pw: HTMLInputElement): HTMLInputElement | null {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
  ).filter(isVisible);
  const pwIdx = inputs.indexOf(pw);

  // Prefer explicit signals first.
  for (const el of inputs) {
    const ac = el.getAttribute('autocomplete') ?? '';
    if (/username|email/.test(ac)) return el;
  }
  // Then the visible text/email input immediately before the password.
  for (let i = pwIdx - 1; i >= 0; i--) {
    const el = inputs[i];
    if (!el) continue;
    if (el.type === 'text' || el.type === 'email') {
      const hay = `${el.name} ${el.id} ${el.placeholder} ${el.getAttribute('aria-label') ?? ''}`;
      if (USER_HINTS.test(hay) || el.type === 'email') return el;
    }
  }
  // Fallback: first text/email input before the password.
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

async function query(): Promise<AutofillMatch[]> {
  try {
    const msg: Msg = { kind: 'autofill_query', url: location.href };
    const res = (await chrome.runtime.sendMessage(msg)) as MsgResult;
    return res.ok && res.kind === 'autofill' ? res.matches : [];
  } catch {
    return []; // background asleep / vault locked
  }
}

let filledOnce = false;

async function tryFill(pw: HTMLInputElement): Promise<void> {
  if (filledOnce) return;
  const matches = await query();
  if (matches.length === 0) return;
  const m = matches[0]!; // basic: pick the first match (picker UI is a later phase)
  const identifier = m.username ?? m.email;

  const userField = findUsernameField(pw);
  if (userField && identifier) setValue(userField, identifier);
  if (m.password) setValue(pw, m.password);
  filledOnce = true;
}

function attach(): void {
  document.addEventListener(
    'focusin',
    (e) => {
      const t = e.target as HTMLElement | null;
      if (t instanceof HTMLInputElement && t.matches(PW_SELECTOR) && isVisible(t)) {
        void tryFill(t);
      }
    },
    true,
  );

  // If a password field is already present and focused on load, offer immediately.
  const pw = document.querySelector<HTMLInputElement>(PW_SELECTOR);
  if (pw && document.activeElement === pw) void tryFill(pw);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attach);
} else {
  attach();
}
