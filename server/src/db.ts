import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type DB = Database.Database;

export function openDb(dbPath: string): DB {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const migration = readFileSync(resolve(__dirname, 'migrations/001_init.sql'), 'utf8');
  db.exec(migration);

  try {
    db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN google_email TEXT');
  } catch {}
  try {
    // Stable per-install id (see shared DeviceRegistration.installId) so re-authenticating from
    // the same extension/app install reuses its existing row instead of piling up duplicates.
    // NULL for rows paired before this column existed - those just never get deduped.
    db.exec('ALTER TABLE devices ADD COLUMN install_id TEXT');
  } catch {}
  db.exec('CREATE INDEX IF NOT EXISTS idx_devices_user_install ON devices(user_id, install_id)');

  return db;
}

/** Atomically bump and return the global monotonic sync counter. */
export function nextCursor(db: DB): number {
  const row = db
    .prepare("UPDATE meta SET value = value + 1 WHERE key = 'sync_counter' RETURNING value")
    .get() as { value: number };
  return row.value;
}
