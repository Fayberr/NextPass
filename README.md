# NextPass - The Next Generation Password Manager 🔒

Self-hosted, zero-knowledge password manager with automatic WebAuthn Passkey interception, one-click autofill, TOTP codes, bank cards, identities, secrets, and encrypted vault backup/import. Built from scratch - **not** a Vaultwarden fork.

## Monorepo Layout

| Workspace | Stack | Description / Status |
|---|---|---|
| `shared/` | TS crypto + API types | **Phase 0 & 1 (Built)** - WebCrypto, Argon2id (WASM), BIP39 12-word recovery, AES-256-GCM, RSA-OAEP-4096 |
| `server/` | Node.js + Fastify + SQLite | **Phase 0 (Built)** - Fastify REST API, SQLite (`pm.db`), systemd service (`password-manager-server.service`) |
| `extension/` | Manifest V3 (Chrome / Edge / Opera GX) | **Phase 1 & 2 (Built)** - React 18, Vite 5, Tailwind CSS, WebAuthn Proxy Shim, Purge Vault, Backup Import/Export |
| `desktop/` | Electron | Phase 5 (Scaffold / Planned) |
| `android/` | Kotlin (Native) | Phase 6 (Planned) |

## Zero-Knowledge Security Model

The server only ever stores ciphertext and wrapped keys. No unencrypted credential material ever leaves the client.

- **Master-Password KDF:** Argon2id (m=64MB, t=3, p=1) → `masterKey` → HKDF-split into `encKey` + `authKey`.
- **Vault Key (AES-256):** Wrapped 3 ways:
  - `wrapped_key_by_master_pw`: Master Password unwrap
  - `wrapped_key_by_admin`: Optional admin unwrap (backed by RSA-4096 keypair)
  - `wrapped_key_by_recovery`: 12-word BIP39 mnemonic unwrap
- **Per-Item Keys (AES-256):** Each item is encrypted with its own item key, wrapped under the Vault Key.
- **Symmetric Encryption:** AES-256-GCM (`IV ‖ Ciphertext ‖ Tag`).

## Features

- 🔑 **WebAuthn Passkey Interception**: Authoritative browser-level passkey provider (`chrome.webAuthenticationProxy`). Intercepts creation & assertion ceremonies.
- ⚡ **One-Click Smart Autofill**: Detects login, card, and identity fields across static and SPA forms.
- 🔐 **Zero-Knowledge Backup Import & Export**: Export and import encrypted or unencrypted `.json` backups with duplicate detection.
- ☣️ **Vault Purge & Wiping**: Authenticated vault purge with optional automated backup export.
- 🛡️ **Recovery Phrase**: 12-word BIP39 phrase export and unlock recovery flow.

## Local Development & Server Setup

```bash
# Install dependencies
npm install

# Build all workspaces
npm run build

# Start backend server locally (default: http://127.0.0.1:8787)
npm run dev:server

# Build extension
npm run build:ext
```

### Server Configuration
Server configuration is controlled via environment variables (see `server/src/config.ts`):
- `PM_PORT`: Server HTTP port (default: `8787`)
- `PM_HOST`: Host interface binding (default: `127.0.0.1`, set `0.0.0.0` for LAN)
- `PM_DB_PATH`: SQLite database file path (default: `server/pm.db`)

### Deployment
- **Server**: Deployable as a systemd service (`password-manager-server.service`) behind Nginx, Caddy, or a reverse proxy.
- **Extension**: Built via `npm run build:ext` (`extension/dist`) and loaded into Chromium-based browsers via "Load unpacked".
