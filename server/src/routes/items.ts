import type { FastifyInstance } from 'fastify';
import type { DB } from '../db.js';
import { nextCursor } from '../db.js';
import { newId } from '../auth.js';
import { itemUpsertSchema, rowToItem, type ItemRow } from './item-map.js';
import type { ItemRecord } from '@pm/shared';

const b64 = (s: string) => Buffer.from(s, 'base64');

/** Item CRUD, scoped to the caller's vault. Encrypted blobs are opaque to the server. */
export async function itemRoutes(app: FastifyInstance, { db }: { db: DB }): Promise<void> {
  const listItems = db.prepare(
    'SELECT * FROM items WHERE vault_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC',
  );
  const getItem = db.prepare('SELECT * FROM items WHERE id = ? AND vault_id = ?');
  const insertItem = db.prepare(
    `INSERT INTO items (id, vault_id, type, encrypted_blob, item_key_wrapped_by_vault_key,
        item_key_wrapped_by_automation_pubkey, tags, favorite, folder_id, version, updated_at, deleted_at)
     VALUES (@id, @vault_id, @type, @blob, @ikv, @ika, @tags, @favorite, @folder_id, 1, @cursor, NULL)`,
  );
  const updateItem = db.prepare(
    `UPDATE items SET type=@type, encrypted_blob=@blob, item_key_wrapped_by_vault_key=@ikv,
        item_key_wrapped_by_automation_pubkey=@ika, tags=@tags, favorite=@favorite,
        folder_id=@folder_id, version=version+1, updated_at=@cursor, deleted_at=@deleted_at
      WHERE id=@id AND vault_id=@vault_id`,
  );

  // --- GET /api/items ------------------------------------------------------
  app.get('/api/items', async (request, reply) => {
    const rows = listItems.all(request.auth!.vaultId) as ItemRow[];
    return reply.send({ items: rows.map(rowToItem) satisfies ItemRecord[] });
  });

  // --- GET /api/items/:id --------------------------------------------------
  app.get('/api/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = getItem.get(id, request.auth!.vaultId) as ItemRow | undefined;
    if (!row) return reply.code(404).send({ error: 'not found' });
    return reply.send(rowToItem(row));
  });

  // --- POST /api/items -----------------------------------------------------
  app.post('/api/items', async (request, reply) => {
    const parsed = itemUpsertSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const b = parsed.data;
    const vaultId = request.auth!.vaultId;
    const id = b.id ?? newId();
    const cursor = nextCursor(db);

    insertItem.run({
      id,
      vault_id: vaultId,
      type: b.type,
      blob: b64(b.encryptedBlob),
      ikv: b64(b.itemKeyWrappedByVaultKey),
      ika: b.itemKeyWrappedByAutomationPubkey ? b64(b.itemKeyWrappedByAutomationPubkey) : null,
      tags: JSON.stringify(b.tags ?? []),
      favorite: b.favorite ? 1 : 0,
      folder_id: b.folderId ?? null,
      cursor,
    });
    const row = getItem.get(id, vaultId) as ItemRow;
    return reply.code(201).send(rowToItem(row));
  });

  // --- PUT /api/items/:id --------------------------------------------------
  app.put('/api/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = itemUpsertSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const b = parsed.data;
    const vaultId = request.auth!.vaultId;
    if (!getItem.get(id, vaultId)) return reply.code(404).send({ error: 'not found' });
    const cursor = nextCursor(db);

    updateItem.run({
      id,
      vault_id: vaultId,
      type: b.type,
      blob: b64(b.encryptedBlob),
      ikv: b64(b.itemKeyWrappedByVaultKey),
      ika: b.itemKeyWrappedByAutomationPubkey ? b64(b.itemKeyWrappedByAutomationPubkey) : null,
      tags: JSON.stringify(b.tags ?? []),
      favorite: b.favorite ? 1 : 0,
      folder_id: b.folderId ?? null,
      deleted_at: b.deletedAt ?? null,
      cursor,
    });
    const row = getItem.get(id, vaultId) as ItemRow;
    return reply.send(rowToItem(row));
  });

  // --- DELETE /api/items/:id (soft-delete) ---------------------------------
  const softDelete = db.prepare(
    'UPDATE items SET deleted_at=@cursor, updated_at=@cursor, version=version+1 WHERE id=@id AND vault_id=@vault_id',
  );
  app.delete('/api/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const vaultId = request.auth!.vaultId;
    if (!getItem.get(id, vaultId)) return reply.code(404).send({ error: 'not found' });
    const cursor = nextCursor(db);
    softDelete.run({ id, vault_id: vaultId, cursor });
    return reply.code(204).send();
  });
}
