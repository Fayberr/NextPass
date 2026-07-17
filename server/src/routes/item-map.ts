import { z } from 'zod';
import type { ItemRecord } from '@pm/shared';

/** Raw SQLite row shape for the items table. */
export interface ItemRow {
  id: string;
  vault_id: string;
  type: string;
  encrypted_blob: Buffer;
  item_key_wrapped_by_vault_key: Buffer;
  item_key_wrapped_by_automation_pubkey: Buffer | null;
  tags: string;
  favorite: number;
  folder_id: string | null;
  version: number;
  updated_at: number;
  deleted_at: number | null;
}

export function rowToItem(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    type: row.type as ItemRecord['type'],
    encryptedBlob: row.encrypted_blob.toString('base64'),
    itemKeyWrappedByVaultKey: row.item_key_wrapped_by_vault_key.toString('base64'),
    itemKeyWrappedByAutomationPubkey: row.item_key_wrapped_by_automation_pubkey
      ? row.item_key_wrapped_by_automation_pubkey.toString('base64')
      : null,
    tags: JSON.parse(row.tags) as string[],
    favorite: row.favorite === 1,
    folderId: row.folder_id,
    version: row.version,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export const itemUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['login', 'card', 'secret', 'autofill_identity', 'passkey', 'totp']),
  encryptedBlob: z.string().min(1),
  itemKeyWrappedByVaultKey: z.string().min(1),
  itemKeyWrappedByAutomationPubkey: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  favorite: z.boolean().optional(),
  folderId: z.string().nullish(),
  updatedAt: z.number().int().nonnegative().optional(),
  deletedAt: z.number().int().nonnegative().nullish(),
});

export type ItemUpsertInput = z.infer<typeof itemUpsertSchema>;
