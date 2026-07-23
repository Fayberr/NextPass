/**
 * Portable low-level crypto primitives for the password manager.
 *
 * Runs unchanged in Node 20+ and in browsers: everything goes through the standard WebCrypto
 * SubtleCrypto API (`globalThis.crypto.subtle`), except Argon2id which is not in WebCrypto and
 * is provided by `hash-wasm` (WASM - also runs both sides).
 *
 * Conventions:
 *   - Symmetric:  AES-256-GCM. Wrapped output layout = `iv(12) ‖ ciphertext ‖ tag(16)`.
 *   - Asymmetric: RSA-OAEP-3072 with SHA-256.
 *   - All wrapped blobs are handled as `Uint8Array`; base64 helpers are provided for storage.
 */

import { argon2id } from 'hash-wasm';

const subtle = globalThis.crypto.subtle;

// ---------------------------------------------------------------------------
// byte helpers
// ---------------------------------------------------------------------------

export function randomBytes(len: number): Uint8Array {
  const b = new Uint8Array(len);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function fromUtf8(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

export function toB64(b: Uint8Array): string {
  let s = '';
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s);
}

export function fromB64(s: string): Uint8Array {
  let clean = s.trim().replace(/-/g, '+').replace(/_/g, '/');
  const rem = clean.length % 4;
  if (rem === 2) clean += '==';
  else if (rem === 3) clean += '=';
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Constant-time comparison for two equal-length byte arrays. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle.digest('SHA-256', data));
}

// ---------------------------------------------------------------------------
// KDF: Argon2id master-password derivation
// ---------------------------------------------------------------------------

export interface KdfParams {
  alg: 'argon2id';
  /** memory cost in KiB (65536 = 64 MiB) */
  m: number;
  /** iterations (time cost) */
  t: number;
  /** parallelism */
  p: number;
  /** params schema version, for future migrations */
  v: number;
}

export const DEFAULT_KDF_PARAMS: KdfParams = { alg: 'argon2id', m: 65536, t: 3, p: 1, v: 1 };

/** Derive the 32-byte master key from the master password + per-user salt. */
export async function deriveMasterKey(
  password: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_KDF_PARAMS,
): Promise<Uint8Array> {
  const hash = await argon2id({
    password,
    salt,
    parallelism: params.p,
    iterations: params.t,
    memorySize: params.m,
    hashLength: 32,
    outputType: 'binary',
  });
  return new Uint8Array(hash);
}

/**
 * Split the master key into an encryption key (wraps the vault key) and an auth key
 * (proves identity to the server) using HKDF-SHA256. These are cryptographically independent:
 * `authKey` reveals nothing about `encKey`.
 */
export async function splitMasterKey(
  masterKey: Uint8Array,
  salt: Uint8Array,
): Promise<{ encKey: Uint8Array; authKey: Uint8Array }> {
  const base = await subtle.importKey('raw', masterKey, 'HKDF', false, ['deriveBits']);
  const derive = (info: string) =>
    subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: utf8(info) },
      base,
      256,
    );
  const [enc, auth] = await Promise.all([derive('pm:enc:v1'), derive('pm:auth:v1')]);
  return { encKey: new Uint8Array(enc), authKey: new Uint8Array(auth) };
}

/** HKDF-SHA256 expand of arbitrary key material to a 32-byte symmetric key. */
export async function hkdf32(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: string,
): Promise<Uint8Array> {
  const base = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: utf8(info) },
    base,
    256,
  );
  return new Uint8Array(bits);
}

// ---------------------------------------------------------------------------
// Symmetric: AES-256-GCM wrap / unwrap  ( iv ‖ ciphertext ‖ tag )
// ---------------------------------------------------------------------------

const IV_LEN = 12;

export async function aesGcmEncrypt(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = randomBytes(IV_LEN);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

export async function aesGcmDecrypt(
  keyBytes: Uint8Array,
  blob: Uint8Array,
): Promise<Uint8Array> {
  const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const iv = blob.subarray(0, IV_LEN);
  const ct = blob.subarray(IV_LEN);
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(pt);
}

/**
 * Same wrap/unwrap as above, but operating directly on an already-imported `CryptoKey` instead
 * of raw bytes. Needed for non-extractable keys (e.g. the device-remember key in
 * `device-unlock.ts`), which by design can never be turned back into a `Uint8Array` - the whole
 * point of `extractable: false` is that raw key material never re-enters JS-reachable memory.
 */
export async function aesGcmEncryptWithKey(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const iv = randomBytes(IV_LEN);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

export async function aesGcmDecryptWithKey(key: CryptoKey, blob: Uint8Array): Promise<Uint8Array> {
  const iv = blob.subarray(0, IV_LEN);
  const ct = blob.subarray(IV_LEN);
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(pt);
}

// ---------------------------------------------------------------------------
// Asymmetric: RSA-OAEP-3072 / SHA-256 wrap / unwrap
// ---------------------------------------------------------------------------

const RSA_ALG = { name: 'RSA-OAEP', hash: 'SHA-256' } as const;

export async function importRsaPublicKey(spkiB64: string): Promise<CryptoKey> {
  return subtle.importKey('spki', fromB64(spkiB64), RSA_ALG, false, ['encrypt']);
}

export async function importRsaPrivateKey(pkcs8: ArrayBuffer): Promise<CryptoKey> {
  return subtle.importKey('pkcs8', pkcs8, RSA_ALG, false, ['decrypt']);
}

/** Wrap raw key bytes (≤ ~318 bytes for RSA-3072/OAEP-SHA256) with an RSA public key. */
export async function rsaWrap(pub: CryptoKey, keyBytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle.encrypt(RSA_ALG, pub, keyBytes));
}

export async function rsaUnwrap(priv: CryptoKey, blob: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle.decrypt(RSA_ALG, priv, blob));
}
