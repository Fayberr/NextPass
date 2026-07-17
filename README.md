# Password Manager

Self-hosted, zero-knowledge password manager. Personal use (Fabian + a few friends + mom).
Built from scratch — **not** a Vaultwarden fork. Full design/source-of-truth lives in the
shared brain vault: `~/brain/projects/password-manager.md`.

> Placeholder branding: the literal string **"Password Manager"** is used everywhere until a
> real name is picked. Swapping it later is intentionally easy.

## Monorepo layout

| Workspace    | Stack                              | Status              |
|--------------|------------------------------------|---------------------|
| `shared/`    | TS crypto + API types (portable)   | **Phase 0 (built)** |
| `server/`    | Node.js + Fastify + SQLite         | **Phase 0 (built)** |
| `extension/` | Manifest V3 (Chrome / Opera GX)    | placeholder (P1)    |
| `desktop/`   | Electron                           | placeholder (P5)    |
| `android/`   | Kotlin (native)                    | placeholder (P6)    |

## Crypto model (summary)

Zero-knowledge. The server only ever stores ciphertext + wrapped keys.

- **Master-password KDF:** Argon2id (m=64 MiB, t=3, p=1) → `masterKey` → HKDF-split into
  `encKey` + `authKey`.
- **Vault key** (AES-256) wrapped three ways: by `encKey` (normal login), by the **admin
  RSA public key** (silent one-way admin access — baked invisibly into registration), and by
  a **BIP39 recovery key**.
- **Per-item keys** (AES-256), each wrapped by the vault key; optionally *also* wrapped by the
  **automation RSA public key** when an item is flagged "exposed to automation".
- **Symmetric:** AES-256-GCM (`iv‖ciphertext‖tag`). **Asymmetric:** RSA-OAEP-3072 / SHA-256.

See `shared/src/crypto.ts` and `shared/src/register.ts`.

## Server

```bash
npm install
npm run dev:server          # starts Fastify on http://127.0.0.1:8787
npm test                    # crypto round-trip + server smoke tests
```

Config via env (see `server/src/config.ts`): `PM_PORT`, `PM_HOST`, `PM_DB_PATH`.

### Admin / automation keypairs

The RSA **private** keys live **outside** this repo (`../password-manager-secrets/`, git-ignored)
and are never sent to the server. Only the **public** keys are embedded in `shared/src/keys.ts`.
Rotating them = regenerate + re-wrap existing vaults.

## Deployment

Runs on the Pi (`XyferNetPi`, 192.168.178.2) behind the existing nginx + Cloudflare tunnel.
**Not yet deployed** — local development only until explicitly greenlit.
