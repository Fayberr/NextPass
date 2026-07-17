import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DB } from '../db.js';
import { nextCursor } from '../db.js';
import { newId } from '../auth.js';
import { itemUpsertSchema, rowToItem, type ItemRow } from './item-map.js';
import type { SyncPullResponse, SyncPushResponse } from '@pm/shared';

const b64 = (s: string) => Buffer.from(s, 'base64');

/**
 * Phase 0 sync STUB. Cursor-based pull + last-write-wins push, sufficient for the design's
 * "simple cursor-based pull + push, LWW per item by updated_at" model. Deltas include
 * soft-deleted rows so clients can tombstone locally. The full offline client is Phase 4.
 */
export async function syncRoutes(app: FastifyInstance, { db }: { db: DB }): Promise<void> {
  const changedSince = db.prepare(
    'SELECT * FROM items WHERE vault_id = ? AND updated_at > ? ORDER BY updated_at ASC',
  );
  const getItem = db.prepare('SELECT * FROM items WHERE id = ? AND vault_id = ?');
  const currentCursor = db.prepare("SELECT value FROM meta WHERE key = 'sync_counter'");
  const setDeviceCursor = db.prepare('UPDATE devices SET last_sync_cursor = ? WHERE id = ?');

  const insertItem = db.prepare(
    `INSERT INTO items (id, vault_id, type, encrypted_blob, item_key_wrapped_by_vault_key,
        item_key_wrapped_by_automation_pubkey, tags, favorite, folder_id, version, updated_at, deleted_at)
     VALUES (@id, @vault_id, @type, @blob, @ikv, @ika, @tags, @favorite, @folder_id, 1, @cursor, @deleted_at)`,
  );
  const updateItem = db.prepare(
    `UPDATE items SET type=@type, encrypted_blob=@blob, item_key_wrapped_by_vault_key=@ikv,
        item_key_wrapped_by_automation_pubkey=@ika, tags=@tags, favorite=@favorite,
        folder_id=@folder_id, version=version+1, updated_at=@cursor, deleted_at=@deleted_at
      WHERE id=@id AND vault_id=@vault_id`,
  );

  // --- GET /api/sync?since=<cursor> ---------------------------------------
  app.get('/api/sync', async (request, reply) => {
    const since = z.coerce.number().int().nonnegative().catch(0).parse(
      (request.query as { since?: string }).since,
    );
    const rows = changedSince.all(request.auth!.vaultId, since) as ItemRow[];
    const cursor = (currentCursor.get() as { value: number }).value;
    setDeviceCursor.run(cursor, request.auth!.deviceId);
    const res: SyncPullResponse = { items: rows.map(rowToItem), cursor };
    return reply.send(res);
  });

  // --- POST /api/sync (batch push, last-write-wins) ------------------------
  const pushSchema = z.object({ items: z.array(itemUpsertSchema).max(1000) });

  app.post('/api/sync', async (request, reply) => {
    const parsed = pushSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const vaultId = request.auth!.vaultId;

    let applied = 0;
    let skipped = 0;

    const tx = db.transaction((items: typeof parsed.data.items) => {
      for (const b of items) {
        const existing = b.id
          ? (getItem.get(b.id, vaultId) as ItemRow | undefined)
          : undefined;

        // Last-write-wins: skip if the client's version is not newer than what we hold.
        if (existing && b.updatedAt !== undefined && b.updatedAt <= existing.updated_at) {
          skipped++;
          continue;
        }
        const cursor = nextCursor(db);
        const common = {
          type: b.type,
          blob: b64(b.encryptedBlob),
          ikv: b64(b.itemKeyWrappedByVaultKey),
          ika: b.itemKeyWrappedByAutomationPubkey ? b64(b.itemKeyWrappedByAutomationPubkey) : null,
          tags: JSON.stringify(b.tags ?? []),
          favorite: b.favorite ? 1 : 0,
          folder_id: b.folderId ?? null,
          deleted_at: b.deletedAt ?? null,
          cursor,
        };
        if (existing) {
          updateItem.run({ id: b.id, vault_id: vaultId, ...common });
        } else {
          insertItem.run({ id: b.id ?? newId(), vault_id: vaultId, ...common });
        }
        applied++;
      }
    });
    tx(parsed.data.items);

    const cursor = (currentCursor.get() as { value: number }).value;
    const res: SyncPushResponse = { applied, skipped, cursor };
    return reply.send(res);
  });
}
