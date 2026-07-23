/**
 * Item-level crypto: per-item keys wrapped by the vault key (Bitwarden-style), so a leaked
 * automation token only ever exposes items explicitly flagged "exposed to automation" - nothing
 * else. Item fields (username, password, TOTP secret, card number, …) live as structured JSON
 * inside the AES-GCM-encrypted blob; the server only sees `type` + ciphertext.
 */

import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  fromB64,
  fromUtf8,
  importRsaPublicKey,
  randomBytes,
  rsaWrap,
  toB64,
  utf8,
} from './crypto.js';
import { AUTOMATION_PUBKEY_SPKI_B64 } from './keys.js';
import type { ItemType, ItemUpsert } from './types.js';

export interface EncryptItemOptions {
  /** When true, additionally wrap the item key with the automation public key. */
  exposeToAutomation?: boolean;
  tags?: string[];
  favorite?: boolean;
  folderId?: string | null;
}

/** Encrypt a plaintext item into an upsert payload ready for POST/PUT /api/items. */
export async function encryptItem(
  vaultKey: Uint8Array,
  type: ItemType,
  fields: unknown,
  opts: EncryptItemOptions = {},
): Promise<ItemUpsert> {
  const itemKey = randomBytes(32);
  const encryptedBlob = await aesGcmEncrypt(itemKey, utf8(JSON.stringify(fields)));
  const itemKeyWrappedByVaultKey = await aesGcmEncrypt(vaultKey, itemKey);

  let itemKeyWrappedByAutomationPubkey: string | null = null;
  if (opts.exposeToAutomation) {
    const autoPub = await importRsaPublicKey(AUTOMATION_PUBKEY_SPKI_B64);
    itemKeyWrappedByAutomationPubkey = toB64(await rsaWrap(autoPub, itemKey));
  }

  return {
    type,
    encryptedBlob: toB64(encryptedBlob),
    itemKeyWrappedByVaultKey: toB64(itemKeyWrappedByVaultKey),
    itemKeyWrappedByAutomationPubkey,
    tags: opts.tags ?? [],
    favorite: opts.favorite ?? false,
    folderId: opts.folderId ?? null,
  };
}

/** Decrypt an item's blob given the vault key. Returns the parsed field object. */
export async function decryptItem<T = unknown>(
  vaultKey: Uint8Array,
  item: { encryptedBlob: string; itemKeyWrappedByVaultKey: string },
): Promise<T> {
  const itemKey = await aesGcmDecrypt(vaultKey, fromB64(item.itemKeyWrappedByVaultKey));
  const plaintext = await aesGcmDecrypt(itemKey, fromB64(item.encryptedBlob));
  return JSON.parse(fromUtf8(plaintext)) as T;
}
