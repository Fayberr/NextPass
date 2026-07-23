/**
 * Isolated-world content script for the WebAuthn shim. Its job is to answer the background's
 * approval prompt: the chrome.webAuthenticationProxy events don't include the page origin, and the
 * background can't render UI, so the background asks this content script (which lives in the page)
 * for location.origin and shows an in-page Allow/Deny card.
 */

import type { WaPromptPasskey, WaPromptRequest, WaPromptResponse } from '../lib/messages.js';

interface ApproveResult {
  approved: boolean;
  credentialId?: string;
}

/** Escape untrusted text (RP-supplied names) before inserting into innerHTML. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Minimal, dependency-free approval card in a closed shadow root. Resolves allow/deny (+ choice). */
function approve(op: 'create' | 'get', rpId: string, userName?: string, passkeys: WaPromptPasskey[] = []): Promise<ApproveResult> {
  return new Promise((resolve) => {
    const site = rpId || location.hostname;
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    const shadow = host.attachShadow({ mode: 'closed' });

    // Title + body differ per operation, per the requested phrasing.
    const title =
      op === 'create'
        ? `Create a passkey for <span class="rp">${esc(userName || site)}</span> on <span class="rp">${esc(site)}</span>?`
        : `Sign in to <span class="rp">${esc(site)}</span> with a passkey`;

    // For sign-in, offer the matching passkeys as choosable rows; for create, a single Allow button.
    let actions: string;
    if (op === 'get' && passkeys.length > 0) {
      const rows = passkeys
        .map(
          (p, i) => `
        <button class="pk" data-i="${i}">
          <span class="pk-ic">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b9aef2" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="8" r="5"/><path d="m14.5 11.5 5 5-2 2-1.5-1.5"/>
            </svg>
          </span>
          <span class="pk-l">${esc(p.label)}</span>
        </button>`,
        )
        .join('');
      actions = `<div class="list">${rows}</div><div class="row"><button class="deny" id="d">Not now</button></div>`;
    } else if (op === 'get') {
      actions = `<p class="empty">No saved passkey for this site.</p><div class="row"><button class="deny" id="d">Close</button></div>`;
    } else {
      actions = `<div class="row"><button class="deny" id="d">Not now</button><button class="allow" id="a">Create passkey</button></div>`;
    }

    shadow.innerHTML = `
      <style>
        @keyframes pm-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes pm-glow{0%,100%{box-shadow:0 0 0 0 rgba(109,92,224,.5)}50%{box-shadow:0 0 0 7px rgba(109,92,224,0)}}
        .card{width:320px;background:#1a1622;color:#e9e7ef;
          border:1px solid rgba(109,92,224,.35);border-radius:14px;padding:16px;
          box-shadow:0 12px 36px rgba(0,0,0,.5),0 0 22px rgba(109,92,224,.22);
          animation:pm-in .2s ease-out}
        .h{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .dot{width:34px;height:34px;border-radius:10px;flex:none;background:#6d5ce0;
          display:flex;align-items:center;justify-content:center;animation:pm-glow 2.4s ease-out infinite}
        .t{font-size:14px;font-weight:600}
        .b{font-size:13px;color:rgba(233,231,239,.82);line-height:1.5;margin:0 0 14px}
        .rp{color:#b9aef2;font-weight:600}
        .empty{font-size:12.5px;color:rgba(233,231,239,.6);margin:0 0 12px}
        .list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
        .pk{display:flex;align-items:center;gap:9px;width:100%;text-align:left;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:10px;
          padding:9px 11px;font-size:13px;font-weight:500;color:#e9e7ef;cursor:pointer}
        .pk:hover{background:rgba(109,92,224,.18);border-color:rgba(109,92,224,.5)}
        .pk-ic{flex:none;display:flex}
        .pk-l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .row{display:flex;gap:8px}
        .row button{flex:1;border:0;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:600;cursor:pointer}
        .allow{background:#6d5ce0;color:#fff}
        .deny{background:rgba(255,255,255,.07);color:rgba(233,231,239,.82)}
      </style>
      <div class="card" role="dialog" aria-modal="true">
        <div class="h">
          <div class="dot">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div class="t">NextPass</div>
        </div>
        <p class="b">${title}</p>
        ${actions}
      </div>`;
    document.documentElement.appendChild(host);
    const done = (res: ApproveResult) => {
      host.remove();
      resolve(res);
    };
    shadow.getElementById('a')?.addEventListener('click', () => done({ approved: true }));
    shadow.getElementById('d')?.addEventListener('click', () => done({ approved: false }));
    shadow.querySelectorAll<HTMLButtonElement>('.pk').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pk = passkeys[Number(btn.dataset.i)];
        done({ approved: true, credentialId: pk?.credentialId });
      });
    });
  });
}

chrome.runtime.onMessage.addListener((msg: WaPromptRequest, _sender, sendResponse) => {
  if (msg?.kind !== 'wa_prompt') return; // not ours
  approve(msg.op, msg.rpId, msg.userName, msg.passkeys ?? []).then(({ approved, credentialId }) => {
    const res: WaPromptResponse = { approved, origin: location.origin, credentialId };
    sendResponse(res);
  });
  return true; // async response
});
