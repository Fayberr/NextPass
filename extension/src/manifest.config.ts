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
  name: 'Password Manager',
  version: '0.1.0',
  description: 'Self-hosted, zero-knowledge password manager (Phase 1 MVP).',
  action: {
    default_popup: 'index.html',
    default_title: 'Password Manager',
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
  ],
  permissions: ['storage', 'activeTab', 'scripting', 'tabs'],
  host_permissions: [
    'http://localhost:8787/*',
    'http://127.0.0.1:8787/*',
    'http://192.168.178.2:8787/*',
    'https://vault.fayber.dev/*',
  ],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
});
