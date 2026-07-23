# extension/ - Chrome / Opera GX MV3 extension

**Phase 1 MVP (built):** master-password unlock, register/login, encrypted vault list, item
detail with copy/reveal, add-login form, cursor-based sync, offline IndexedDB cache, and basic
autofill. Consumes `@pm/shared` for all crypto + API - the vault key is derived and held only in
the background service worker's memory and never crosses into the popup or content script.

**Later:** Phase 2 (passkey main-world shim + virtual FIDO2 authenticator), Phase 3 (full
autofill heuristics: MutationObserver, multi-step session memory, iframe handling, TOTP/cards).

## Architecture

```
src/
├── manifest.config.ts      # MV3 manifest (crxjs defineManifest)
├── background/index.ts      # service worker: message router → SessionManager
├── lib/
│   ├── session.ts           # SessionManager - owns the in-memory vault key + all crypto ops
│   ├── config.ts            # account meta in chrome.storage.local (no plaintext keys)
│   ├── storage.ts           # encrypted item cache in IndexedDB (idb)
│   └── messages.ts          # typed popup/content ↔ background protocol
├── popup/                   # React + Tailwind UI (Unlock, VaultList, ItemDetail, AddLogin)
└── content/autofill.ts      # field detection + fill on focus
```

Security model: UI surfaces talk to the background only via messages; the vault key never
crosses that boundary. When Chrome tears down the worker the key is lost → the vault auto-locks.

## Dev / load

```bash
npm run build --workspace @pm/extension       # → extension/dist/ (loadable unpacked)
npm run dev   --workspace @pm/extension        # Vite dev server + HMR
```

Load `extension/dist/` via `chrome://extensions` → Developer mode → *Load unpacked*.

Point it at a running server: the default server URL is `http://localhost:8787` (set on the
register/login screen). Start the server with `npm run dev:server`. If you deploy the server to
another origin, add it to `host_permissions` in `src/manifest.config.ts`.
