/**
 * Isolated-world bridge for the WebAuthn shim. Sits between the main-world inject script (which
 * can't touch chrome.*) and the background service worker (which owns the vault key).
 *
 * Flow: page calls navigator.credentials.* -> inject posts a request here -> we show an in-page
 * approval prompt -> we forward to the background -> we post the reply back to the page.
 *
 * "fallback: true" tells the inject script to defer to the real platform authenticator (used when
 * the vault is locked, has no matching passkey, or the user dismisses without deciding).
 */

import type { Msg, MsgResult, PasskeyCreateReq, PasskeyGetReq } from '../lib/messages.js';

const TAG = '__pm_webauthn__';

function send(msg: Msg): Promise<MsgResult> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res: MsgResult) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message ?? 'Extension unavailable' });
      } else {
        resolve(res);
      }
    });
  });
}

/** Minimal, dependency-free approval card. Resolves true (allow) / false (deny/dismiss). */
function approve(op: 'create' | 'get', rpId: string, userName?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    const shadow = host.attachShadow({ mode: 'closed' });
    const verb = op === 'create' ? 'create a passkey' : 'sign in with a passkey';
    shadow.innerHTML = `
      <style>
        .card{width:320px;background:#161221;color:#eae7f2;border:1px solid rgba(255,255,255,.1);
          border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.5)}
        .h{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .dot{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#6366f1);
          display:flex;align-items:center;justify-content:center}
        .t{font-size:14px;font-weight:600}
        .b{font-size:12px;color:rgba(234,231,242,.6);line-height:1.5;margin:0 0 14px}
        .rp{color:#c4b5fd;font-weight:600}
        .row{display:flex;gap:8px}
        button{flex:1;border:0;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer}
        .allow{background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff}
        .deny{background:rgba(255,255,255,.06);color:rgba(234,231,242,.8)}
      </style>
      <div class="card">
        <div class="h">
          <div class="dot">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div class="t">Password Manager</div>
        </div>
        <p class="b">Allow <span class="rp">${rpId}</span> to ${verb}${
          userName ? ` for <span class="rp">${userName}</span>` : ''
        }?</p>
        <div class="row">
          <button class="deny" id="d">Not now</button>
          <button class="allow" id="a">Allow</button>
        </div>
      </div>`;
    document.documentElement.appendChild(host);
    const done = (v: boolean) => {
      host.remove();
      resolve(v);
    };
    shadow.getElementById('a')!.addEventListener('click', () => done(true));
    shadow.getElementById('d')!.addEventListener('click', () => done(false));
  });
}

function reply(id: string, payload: unknown) {
  window.postMessage({ [TAG]: 'response', id, payload }, location.origin);
}

window.addEventListener('message', async (ev) => {
  if (ev.source !== window) return;
  const d = ev.data;
  if (!d || d[TAG] !== 'request') return;

  const { id, op, req } = d as { id: string; op: 'create' | 'get'; req: PasskeyCreateReq & PasskeyGetReq };

  // Is the vault usable? If not, quietly fall back to the platform authenticator.
  const state = await send({ kind: 'get_state' });
  if (!state.ok || state.kind !== 'state' || !state.state.unlocked) {
    reply(id, { ok: false, error: 'Vault locked', fallback: true });
    return;
  }

  // For get(): if we hold no passkey for this RP, fall back rather than block the login.
  if (op === 'get') {
    const allowed = await approve('get', req.rpId, undefined);
    if (!allowed) return reply(id, { ok: false, error: 'User declined', fallback: true });
    const res = await send({ kind: 'passkey_get', req: req as PasskeyGetReq });
    if (res.ok && res.kind === 'passkey_asserted') return reply(id, { ok: true, res: res.res });
    // No matching passkey -> let the real authenticator try.
    return reply(id, { ok: false, error: res.ok ? 'Unexpected' : res.error, fallback: true });
  }

  // create()
  const allowed = await approve('create', req.rpId, req.userName);
  if (!allowed) return reply(id, { ok: false, error: 'User declined', fallback: true });
  const res = await send({ kind: 'passkey_create', req: req as PasskeyCreateReq });
  if (res.ok && res.kind === 'passkey_created') return reply(id, { ok: true, res: res.res });
  return reply(id, { ok: false, error: res.ok ? 'Unexpected' : res.error, fallback: false });
});
