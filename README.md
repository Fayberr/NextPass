# NextPass - The Next Generation Password Manager 🔒

Self-hosted, zero-knowledge password manager with automatic WebAuthn Passkey interception, one-click autofill, Google Account Sign-In, TOTP 2FA codes, payment cards, identities, API secrets, secure notes, and encrypted vault backup/import. Built from scratch - **not** a Vaultwarden fork.

## Monorepo Layout

| Workspace | Stack | Description / Status |
|---|---|---|
| `shared/` | TS crypto + API types | **Built (100% Tested)** - WebCrypto, Argon2id (WASM), BIP39 12-word recovery, AES-256-GCM, WebAuthn FIDO2, TOTP (RFC 6238) |
| `server/` | Node.js + Fastify + SQLite | **Built (100% Tested)** - Fastify REST API, SQLite (`pm.db`), Google OAuth endpoints, Vault CRUD & Sync, systemd service |
| `extension/` | Manifest V3 (Chrome / Edge / Opera GX) | **Built (`v0.14.4`)** - React 18, Vite 5, Tailwind CSS, Google Auth Onboarding Flow, Shadow DOM Autofill Engine, WebAuthn Proxy |
| `desktop/` | Electron | Phase 5 (Planned) |
| `android/` | Kotlin (Native) | Phase 6 (Planned) |

## Features (v0.14.4)

- 🔑 **WebAuthn Passkey Interception**: Authoritative browser-level passkey provider (`chrome.webAuthenticationProxy`). Intercepts creation & assertion ceremonies.
- 🌐 **Google Account Sign-In & Onboarding**: Fast Google account pairing & single-click unlock workflow with dedicated master password entry.
- ⚡ **Universal Smart Autofill (Shadow DOM & SPA)**: Inline field detection and autofill for logins, identities, and credit cards across standard HTML forms, Web Components, and single-page apps.
- ⏱️ **TOTP Authenticator & Code Generator**: RFC 6238 compliant live 6-digit TOTP code generation for standalone 2FA items and login credentials.
- 📦 **6 Vault Item Types**: Full support for Logins, Identities, Credit Cards, Authenticators (TOTP), Secrets/API Keys, and Encrypted Secure Notes.
- 🔔 **Smart Prompts Engine**: Automatic **"Save to NextPass?"** banner on new account registration forms and **"Update Password?"** banner on password changes.
- 🔐 **Zero-Knowledge Backup Import & Export**: Export and import encrypted or unencrypted `.json` backups with duplicate detection.
- 🛡️ **Recovery Phrase**: 12-word BIP39 phrase export and unlock recovery flow.

## Zero-Knowledge Security Model

The server only ever stores ciphertext and wrapped keys. No unencrypted credential material ever leaves the client.

- **Master-Password KDF:** Argon2id (m=64MB, t=3, p=1) → `masterKey` → HKDF-split into `encKey` + `authKey`.
- **Vault Key (AES-256):** Wrapped 2 ways:
  - `wrapped_key_by_master_pw`: Master Password unwrap
  - `wrapped_key_by_recovery`: 12-word BIP39 mnemonic unwrap
- **Per-Item Keys (AES-256):** Each item is encrypted with its own item key, wrapped under the Vault Key.
- **Symmetric Encryption:** AES-256-GCM (`IV ‖ Ciphertext ‖ Tag`).

## Local Development & Testing

```bash
# Install dependencies
npm install

# Build all workspaces
npm run build

# Run comprehensive test suites across shared and server
npm test

# Start backend server locally (default: http://127.0.0.1:8787)
npm run dev:server

# Build extension (dist/)
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
