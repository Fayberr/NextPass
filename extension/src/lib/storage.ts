/**
 * Encrypted offline item cache (IndexedDB via idb). Stores the server's `ItemRecord`s
 * verbatim - they are already end-to-end encrypted (opaque ciphertext blobs), so at-rest
 * they stay encrypted. Decryption happens only in memory after unlock.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ItemRecord } from '@pm/shared';

interface PmCache extends DBSchema {
  items: {
    key: string;
    value: ItemRecord;
  };
}

let dbp: Promise<IDBPDatabase<PmCache>> | null = null;

function db(): Promise<IDBPDatabase<PmCache>> {
  if (!dbp) {
    dbp = openDB<PmCache>('pm-cache', 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('items')) {
          d.createObjectStore('items', { keyPath: 'id' });
        }
      },
    });
  }
  return dbp;
}

export async function cacheGetAll(): Promise<ItemRecord[]> {
  return (await db()).getAll('items');
}

/** Upsert records; hard-remove tombstoned (deletedAt) ones from the local cache. */
export async function cacheUpsert(records: ItemRecord[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('items', 'readwrite');
  for (const r of records) {
    if (r.deletedAt) await tx.store.delete(r.id);
    else await tx.store.put(r);
  }
  await tx.done;
}

/** Hard-remove a single record from the local cache (after a server delete). */
export async function cacheDelete(id: string): Promise<void> {
  await (await db()).delete('items', id);
}

export async function cacheClear(): Promise<void> {
  const d = await db();
  await d.clear('items');
}
