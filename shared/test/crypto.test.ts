import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  createRegistration,
  decryptItem,
  deriveAuthKeyHash,
  encryptItem,
  fromB64,
  importRsaPrivateKey,
  randomBytes,
  rsaUnwrap,
  timingSafeEqual,
  toB64,
  unlockWithMasterPassword,
  unlockWithRecovery,
} from '../src/index.js';

const SECRETS = resolve(__dirname, '../../../password-manager-secrets');

function loadPrivateKey(name: 'admin' | 'automation'): ArrayBuffer {
  const pem = readFileSync(resolve(SECRETS, `${name}-private.pem`), 'utf8');
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bytes = fromB64(b64);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('AES-256-GCM', () => {
  it('round-trips and rejects tampering', async () => {
    const key = randomBytes(32);
    const msg = new TextEncoder().encode('supercharge your secrets');
    const blob = await aesGcmEncrypt(key, msg);
    expect(new TextDecoder().decode(await aesGcmDecrypt(key, blob))).toBe(
      'supercharge your secrets',
    );
    blob[blob.length - 1] ^= 0xff; // flip a tag bit
    await expect(aesGcmDecrypt(key, blob)).rejects.toBeDefined();
  });
});

describe('timingSafeEqual', () => {
  it('compares correctly', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });
});

describe('registration + unlock paths', () => {
  it('wraps the vault key for master-password, admin, and recovery — all unwrap to the same key', async () => {
    const { payload, recoveryMnemonic } = await createRegistration('mom@example.com', 'hunter2', {
      platform: 'test',
    });

    // Normal user gets the admin backdoor wrap.
    expect(payload.wrappedKeyByAdmin).not.toBeNull();
    expect(recoveryMnemonic.split(' ')).toHaveLength(12);

    // 1) master password unlock
    const vk1 = await unlockWithMasterPassword(
      'hunter2',
      payload.masterPwSalt,
      payload.kdfParams,
      payload.wrappedKeyByMasterPw,
    );

    // 2) recovery phrase unlock
    const vk2 = await unlockWithRecovery(recoveryMnemonic, payload.wrappedKeyByRecovery);

    // 3) admin private key unlock (the silent backdoor)
    const adminPriv = await importRsaPrivateKey(loadPrivateKey('admin'));
    const vk3 = await rsaUnwrap(adminPriv, fromB64(payload.wrappedKeyByAdmin!));

    expect(timingSafeEqual(vk1, vk2)).toBe(true);
    expect(timingSafeEqual(vk1, vk3)).toBe(true);
  });

  it("admin's own account has no admin backdoor wrap", async () => {
    const { payload } = await createRegistration('fabian', 'masterpw', { isAdmin: true });
    expect(payload.wrappedKeyByAdmin).toBeNull();
  });

  it('wrong master password does not unlock', async () => {
    const { payload } = await createRegistration('u', 'correct-horse');
    await expect(
      unlockWithMasterPassword(
        'wrong-horse',
        payload.masterPwSalt,
        payload.kdfParams,
        payload.wrappedKeyByMasterPw,
      ),
    ).rejects.toBeDefined();
  });

  it('login auth hash matches the stored registration hash', async () => {
    const { payload } = await createRegistration('u', 'pw123');
    const loginHash = await deriveAuthKeyHash('pw123', payload.masterPwSalt, payload.kdfParams);
    expect(loginHash).toBe(payload.authKeyHash);
    const wrongHash = await deriveAuthKeyHash('nope', payload.masterPwSalt, payload.kdfParams);
    expect(wrongHash).not.toBe(payload.authKeyHash);
  });
});

describe('item encryption + automation exposure', () => {
  it('encrypts/decrypts item fields and exposes only flagged items to automation', async () => {
    const { payload } = await createRegistration('u', 'pw');
    const vaultKey = await unlockWithMasterPassword(
      'pw',
      payload.masterPwSalt,
      payload.kdfParams,
      payload.wrappedKeyByMasterPw,
    );

    const login = { username: 'neo', email: 'neo@zion.io', password: 'trinity', uris: ['https://zion.io'] };
    const exposed = await encryptItem(vaultKey, 'login', login, { exposeToAutomation: true });
    const normal = await encryptItem(vaultKey, 'secret', { name: 'wifi', value: 'p@ss' });

    expect(exposed.itemKeyWrappedByAutomationPubkey).not.toBeNull();
    expect(normal.itemKeyWrappedByAutomationPubkey).toBeNull();

    // vault-key holder decrypts both
    expect(await decryptItem(vaultKey, exposed as any)).toEqual(login);

    // automation private key can unwrap ONLY the exposed item's key
    const autoPriv = await importRsaPrivateKey(loadPrivateKey('automation'));
    const itemKey = await rsaUnwrap(autoPriv, fromB64(exposed.itemKeyWrappedByAutomationPubkey!));
    const pt = await aesGcmDecrypt(itemKey, fromB64(exposed.encryptedBlob));
    expect(JSON.parse(new TextDecoder().decode(pt))).toEqual(login);
  });
});
