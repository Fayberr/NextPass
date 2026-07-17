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
      'position:fixed;inset:0;z-index:2147483647;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    const shadow = host.attachShadow({ mode: 'closed' });
    const verb = op === 'create' ? 'create a passkey' : 'sign in with a passkey';
    shadow.innerHTML = `
      <style>
        @keyframes pm-fade{from{opacity:0}to{opacity:1}}
        @keyframes pm-pop{from{opacity:0;transform:translateY(12px) scale(.94)}to{opacity:1;transform:none}}
        @keyframes pm-glow{0%,100%{box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 0 1px rgba(139,92,246,.5),0 0 34px rgba(139,92,246,.35)}
          50%{box-shadow:0 24px 70px rgba(0,0,0,.6),0 0 0 1px rgba(139,92,246,.9),0 0 54px rgba(139,92,246,.7)}}
        @keyframes pm-ring{0%{transform:scale(1);opacity:.55}70%{transform:scale(1.7);opacity:0}100%{opacity:0}}
        .back{position:fixed;inset:0;background:rgba(8,6,14,.55);backdrop-filter:blur(3px);
          display:flex;align-items:center;justify-content:center;animation:pm-fade .18s ease-out}
        .card{position:relative;width:360px;max-width:calc(100vw - 32px);
          background:linear-gradient(180deg,#1c1630,#141020);color:#f3f0fb;
          border-radius:20px;padding:22px;animation:pm-pop .28s cubic-bezier(.2,.9,.3,1.3),pm-glow 2.4s ease-in-out infinite .3s}
        .h{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .dot{position:relative;width:46px;height:46px;border-radius:14px;flex:none;
          background:linear-gradient(135deg,#a78bfa,#6366f1);display:flex;align-items:center;justify-content:center;
          box-shadow:0 6px 18px rgba(99,102,241,.55)}
        .dot::after{content:"";position:absolute;inset:0;border-radius:14px;border:2px solid rgba(167,139,250,.8);
          animation:pm-ring 1.8s ease-out infinite}
        .ttl{font-size:16px;font-weight:700;letter-spacing:.2px}
        .sub{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:#a78bfa;margin-top:1px}
        .b{font-size:14px;color:rgba(243,240,251,.82);line-height:1.55;margin:0 0 18px}
        .rp{color:#c4b5fd;font-weight:700}
        .row{display:flex;gap:10px}
        button{flex:1;border:0;border-radius:12px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;transition:filter .15s,transform .05s}
        button:hover{filter:brightness(1.12)}
        button:active{transform:translateY(1px)}
        .allow{background:linear-gradient(135deg,#a78bfa,#6366f1);color:#fff;box-shadow:0 6px 18px rgba(99,102,241,.5)}
        .deny{background:rgba(255,255,255,.07);color:rgba(243,240,251,.85)}
      </style>
      <div class="back" id="back">
        <div class="card" role="dialog" aria-modal="true">
          <div class="h">
            <div class="dot">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div>
              <div class="ttl">Password Manager</div>
              <div class="sub">Passkey request</div>
            </div>
          </div>
          <p class="b">Allow <span class="rp">${rpId || location.hostname}</span> to ${verb}${
            userName ? ` for <span class="rp">${userName}</span>` : ''
          }?</p>
          <div class="row">
            <button class="deny" id="d">Not now</button>
            <button class="allow" id="a">Allow</button>
          </div>
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
