/**
 * Isolated-world content script for the WebAuthn shim. Its job is to answer the background's
 * approval prompt: the chrome.webAuthenticationProxy events don't include the page origin, and the
 * background can't render UI, so the background asks this content script (which lives in the page)
 * for location.origin and shows an in-page Allow/Deny card.
 */

import type { WaPromptRequest, WaPromptResponse } from '../lib/messages.js';

/** Minimal, dependency-free approval card in a closed shadow root. Resolves allow/deny. */
function approve(op: 'create' | 'get', rpId: string, userName?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;top:16px;right:16px;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    const shadow = host.attachShadow({ mode: 'closed' });
    const verb = op === 'create' ? 'create a passkey' : 'sign in with a passkey';
    shadow.innerHTML = `
      <style>
        @keyframes pm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        .card{width:320px;background:#1a1622;color:#e9e7ef;
          border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:16px;
          box-shadow:0 10px 34px rgba(0,0,0,.45);animation:pm-in .18s ease-out}
        .h{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .dot{width:34px;height:34px;border-radius:10px;flex:none;background:#6d5ce0;
          display:flex;align-items:center;justify-content:center}
        .t{font-size:14px;font-weight:600}
        .b{font-size:13px;color:rgba(233,231,239,.72);line-height:1.5;margin:0 0 14px}
        .rp{color:#b9aef2;font-weight:600}
        .row{display:flex;gap:8px}
        button{flex:1;border:0;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:600;cursor:pointer}
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
          <div class="t">Password Manager</div>
        </div>
        <p class="b">Allow <span class="rp">${rpId || location.hostname}</span> to ${verb}${
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

chrome.runtime.onMessage.addListener((msg: WaPromptRequest, _sender, sendResponse) => {
  if (msg?.kind !== 'wa_prompt') return; // not ours
  approve(msg.op, msg.rpId, msg.userName).then((approved) => {
    const res: WaPromptResponse = { approved, origin: location.origin };
    sendResponse(res);
  });
  return true; // async response
});
