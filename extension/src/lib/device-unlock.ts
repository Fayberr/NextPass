/**
 * Device-remember ("Enable Google auth only login") key management.
 *
 * A non-extractable AES-256-GCM `CryptoKey` is generated per-device and persisted only in this
 * extension's own IndexedDB (`chrome-extension://<id>` origin - not reachable from web pages,
 * never synced anywhere). It wraps a copy of the vault key (the ciphertext, `wrappedKeyByDevice`,
 * lives in `AccountMeta` / `chrome.storage.local`, see config.ts). Because the key is
 * non-extractable, `subtle.exportKey()` on it always throws - raw key bytes never exist in a form
 * any JS code (including this extension's own, if ever compromised) could read out or exfiltrate
 * over the network. Only `encrypt`/`decrypt` *operations* against it are possible, and only from
 * code running in this browser profile's extension context.
 *
 * This is defense-in-depth, not a hardware security boundary: there is no TPM/Secure Enclave
 * involved, so an attacker with genuine code-execution inside this browser profile could still
 * misuse the key in place (call decrypt through it) even though they can't extract it. See the
 * security analysis in ~/brain/projects/password-manager.md for the full threat-model writeup.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { aesGcmEncryptWithKey, aesGcmDecryptWithKey, fromB64, toB64 } from '@pm/shared';

interface DeviceKeyDB extends DBSchema {
  keys: {
    key: string;
    value: { id: string; key: CryptoKey; createdAt: number };
  };
}

const ENTRY_ID = 'device';

let dbp: Promise<IDBPDatabase<DeviceKeyDB>> | null = null;
function db(): Promise<IDBPDatabase<DeviceKeyDB>> {
  if (!dbp) {
    dbp = openDB<DeviceKeyDB>('pm-devicekey', 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('keys')) d.createObjectStore('keys', { keyPath: 'id' });
      },
    });
  }
  return dbp;
}

async function getDeviceKey(): Promise<CryptoKey | null> {
  const rec = await (await db()).get('keys', ENTRY_ID);
  return rec?.key ?? null;
}

async function generateDeviceKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  await (await db()).put('keys', { id: ENTRY_ID, key, createdAt: Date.now() });
  return key;
}

/** Wipe the device-local key. Irreversible - the corresponding `wrappedKeyByDevice` blob becomes
 *  permanently undecryptable the instant this runs, even before AccountMeta is patched. */
export async function deleteDeviceKey(): Promise<void> {
  await (await db()).delete('keys', ENTRY_ID);
}

/** Auto-expiry: bounds how long "Google auth only" can be used before a real master-password
 *  unlock is required again, even if the user never manually forgets the device. */
export const DEVICE_UNLOCK_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Wrap the currently-unlocked vault key for this device. Always starts from a fresh device key
 *  (deletes any prior one first) so a previously-forgotten/expired key can never be silently
 *  reused for a new wrap. */
export async function wrapVaultKeyForDevice(
  vaultKey: Uint8Array,
): Promise<{ wrapped: string; expiresAt: number }> {
  await deleteDeviceKey();
  const key = await generateDeviceKey();
  const wrapped = await aesGcmEncryptWithKey(key, vaultKey);
  return { wrapped: toB64(wrapped), expiresAt: Date.now() + DEVICE_UNLOCK_TTL_MS };
}

export async function unwrapVaultKeyForDevice(wrappedB64: string): Promise<Uint8Array> {
  const key = await getDeviceKey();
  if (!key) throw new Error('No device-remember key on this device.');
  return aesGcmDecryptWithKey(key, fromB64(wrappedB64));
}

// ---------------------------------------------------------------------------
// Rate limiting - defense in depth against repeated device-unlock attempts (e.g. someone with
// access to an unlocked browser profile trying several Google accounts to find one that matches).
// ---------------------------------------------------------------------------

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPTS_KEY = 'pm.deviceUnlockAttempts';

export async function recordDeviceUnlockFailure(): Promise<number> {
  const got = await chrome.storage.local.get(ATTEMPTS_KEY);
  const n = ((got[ATTEMPTS_KEY] as number | undefined) ?? 0) + 1;
  await chrome.storage.local.set({ [ATTEMPTS_KEY]: n });
  return n;
}

export async function clearDeviceUnlockFailures(): Promise<void> {
  await chrome.storage.local.remove(ATTEMPTS_KEY);
}

export async function deviceUnlockLocked(): Promise<boolean> {
  const got = await chrome.storage.local.get(ATTEMPTS_KEY);
  return ((got[ATTEMPTS_KEY] as number | undefined) ?? 0) >= MAX_FAILED_ATTEMPTS;
}
