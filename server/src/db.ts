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

  return db;
}

/** Atomically bump and return the global monotonic sync counter. */
export function nextCursor(db: DB): number {
  const row = db
    .prepare("UPDATE meta SET value = value + 1 WHERE key = 'sync_counter' RETURNING value")
    .get() as { value: number };
  return row.value;
}
