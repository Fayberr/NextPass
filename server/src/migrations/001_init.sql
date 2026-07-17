-- Phase 0 schema. Mirrors the "Data model (rough)" section of the design doc.
-- The server is zero-knowledge: every *_blob / wrapped_* / encrypted_* column is opaque
-- ciphertext produced client-side. `updated_at` is a monotonic server counter used as the
-- sync cursor (see meta.sync_counter).

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
-- Global monotonic counter; every item write bumps it and stamps the row's updated_at.
INSERT OR IGNORE INTO meta (key, value) VALUES ('sync_counter', 0);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  identifier     TEXT NOT NULL UNIQUE,      -- email or username (lower-cased)
  is_admin       INTEGER NOT NULL DEFAULT 0,
  master_pw_salt BLOB NOT NULL,
  kdf_params     TEXT NOT NULL,             -- JSON KdfParams
  auth_key_hash  BLOB NOT NULL,             -- SHA-256(authKey), for login verification
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vaults (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  wrapped_key_by_master_pw BLOB NOT NULL,
  wrapped_key_by_admin     BLOB,            -- NULL for the admin's own vault
  wrapped_key_by_recovery  BLOB NOT NULL,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id                                    TEXT PRIMARY KEY,
  vault_id                              TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  type                                  TEXT NOT NULL,
  encrypted_blob                        BLOB NOT NULL,
  item_key_wrapped_by_vault_key         BLOB NOT NULL,
  item_key_wrapped_by_automation_pubkey BLOB,             -- NULL unless exposed to automation
  tags                                  TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  favorite                              INTEGER NOT NULL DEFAULT 0,
  folder_id                             TEXT,
  version                               INTEGER NOT NULL DEFAULT 1,
  updated_at                            INTEGER NOT NULL,   -- = sync cursor value at write time
  deleted_at                            INTEGER              -- soft-delete; purge after retention
);
CREATE INDEX IF NOT EXISTS idx_items_vault_updated ON items(vault_id, updated_at);

CREATE TABLE IF NOT EXISTS devices (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
  token_hash       BLOB NOT NULL,          -- SHA-256(bearer token); raw token shown once
  last_sync_cursor INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  last_seen_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token_hash);
