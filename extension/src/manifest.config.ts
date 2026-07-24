import { defineManifest } from '@crxjs/vite-plugin';

/**
 * MV3 manifest. Chromium-only (Chrome + Opera GX share the engine).
 *
 * host_permissions lists the API origins so the background service worker's fetch()
 * bypasses CORS. Add your deployed server origin here when it goes live on the Pi.
 * The content script runs on all pages for autofill field detection.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'NextPass',
  version: '0.20.2',
  description:
    'NextPass - The next Generation Password Manager. Self-hosted, zero-knowledge password manager with one-click autofill, per-type auto-save/autofill toggles and ignored-website lists, password generator, passkey (WebAuthn) support, opt-in compromised-password checks (HIBP k-anonymity), Google sign-in with optional Google-only unlock on remembered devices, Windows Hello unlock on desktop, deduplicated connected-device management with remote revoke and bulk sign-out, browser CSV / Kaspersky password import from Settings (plus direct Chrome/Edge/Brave/Opera/Opera GX/Chromium import on desktop), a default-browser picker and functional system-wide quick search on desktop, idle auto-lock and lock-on-system-lock, clipboard auto-clear, Dark/Light/System themes, a grouped always-expanded card grid on desktop, and encrypted vault storage.',
  action: {
    default_popup: 'index.html',
    default_title: 'NextPass',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/autofill.ts'],
      run_at: 'document_idle',
      all_frames: true,
    },
    // WebAuthn shim: the inject script replaces navigator.credentials in the page's own JS
    // context (world: MAIN); the bridge relays to the background from the isolated world.
    // Both at document_start so the override is in place before any RP script runs.
    {
      matches: ['<all_urls>'],
      js: ['src/content/webauthn-inject.ts'],
      run_at: 'document_start',
      all_frames: true,
      world: 'MAIN',
    },
    {
      matches: ['<all_urls>'],
      js: ['src/content/webauthn-bridge.ts'],
      run_at: 'document_start',
      all_frames: true,
    },
  ],
  // Argon2id (hash-wasm) runs as WebAssembly in the service worker; MV3's default CSP
  // (script-src 'self') blocks WASM, so we opt in with the MV3-approved 'wasm-unsafe-eval'
  // keyword (allows WebAssembly only - NOT arbitrary eval/remote script).
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
  permissions: ['storage', 'activeTab', 'scripting', 'tabs', 'alarms', 'webAuthenticationProxy', 'favicon', 'identity'],
  host_permissions: [
    'https://password-manager.fayber.dev/*',
    'https://api.pwnedpasswords.com/*', // opt-in HIBP k-anonymity breach check

    'http://192.168.178.2:8787/*',
    'http://localhost:8787/*',
    'http://127.0.0.1:8787/*',
  ],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
});
