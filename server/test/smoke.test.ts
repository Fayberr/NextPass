import { describe, it, expect, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  createRegistration,
  deriveAuthKeyHash,
  encryptItem,
  decryptItem,
  unlockWithMasterPassword,
  type AuthResponse,
  type ItemRecord,
  type SyncPullResponse,
} from '@pm/shared';

describe('server end-to-end (Phase 0)', () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildApp({ dbPath: ':memory:' });
  });

  it('health check responds', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', phase: 0 });
  });

  it('register → prelogin → login → item CRUD → sync', async () => {
    // --- register (client-side crypto builds the payload) ---
    const reg = await createRegistration('Mom@Example.com', 'correct horse battery', {
      platform: 'test-runner',
    });
    const regRes = await app.inject({ method: 'POST', url: '/api/register', payload: reg.payload });
    expect(regRes.statusCode).toBe(201);
    const auth = regRes.json<AuthResponse>();
    expect(auth.deviceToken).toBeTruthy();

    // duplicate registration rejected (identifier normalized to lowercase)
    const dup = await app.inject({ method: 'POST', url: '/api/register', payload: reg.payload });
    expect(dup.statusCode).toBe(409);

    // --- prelogin returns the salt/kdf so a fresh device can derive the auth hash ---
    const pre = await app.inject({
      method: 'POST',
      url: '/api/prelogin',
      payload: { identifier: 'mom@example.com' },
    });
    expect(pre.statusCode).toBe(200);
    const { masterPwSalt, kdfParams } = pre.json();
    expect(masterPwSalt).toBe(reg.payload.masterPwSalt);

    // --- login from a "new device" ---
    const authKeyHash = await deriveAuthKeyHash('correct horse battery', masterPwSalt, kdfParams);
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: { identifier: 'mom@example.com', authKeyHash, device: { platform: 'second-device' } },
    });
    expect(loginRes.statusCode).toBe(200);
    const login = loginRes.json<AuthResponse>();
    const bearer = { authorization: `Bearer ${login.deviceToken}` };

    // wrong password → 401
    const badHash = await deriveAuthKeyHash('nope', masterPwSalt, kdfParams);
    const bad = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: { identifier: 'mom@example.com', authKeyHash: badHash, device: { platform: 'x' } },
    });
    expect(bad.statusCode).toBe(401);

    // unauthenticated request → 401
    const noAuth = await app.inject({ method: 'GET', url: '/api/items' });
    expect(noAuth.statusCode).toBe(401);

    // --- unlock the vault client-side, encrypt an item, POST it ---
    const vaultKey = await unlockWithMasterPassword(
      'correct horse battery',
      masterPwSalt,
      kdfParams,
      login.vault.wrappedKeyByMasterPw,
    );
    const fields = { username: 'mom', email: 'mom@example.com', password: 's3cret', uris: ['https://bank.example'] };
    const upsert = await encryptItem(vaultKey, 'login', fields, { exposeToAutomation: true });

    const createRes = await app.inject({ method: 'POST', url: '/api/items', headers: bearer, payload: upsert });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json<ItemRecord>();
    expect(created.itemKeyWrappedByAutomationPubkey).not.toBeNull();

    // server stored only ciphertext — verify by decrypting back to the original fields
    expect(await decryptItem(vaultKey, created)).toEqual(fields);

    // --- list + fetch ---
    const list = await app.inject({ method: 'GET', url: '/api/items', headers: bearer });
    expect(list.json().items).toHaveLength(1);

    // --- update (PUT) ---
    const updated = await encryptItem(vaultKey, 'login', { ...fields, password: 'rotated' });
    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/items/${created.id}`,
      headers: bearer,
      payload: updated,
    });
    expect(putRes.statusCode).toBe(200);
    expect(putRes.json<ItemRecord>().version).toBe(2);

    // --- sync pull (delta since 0) ---
    const sync = await app.inject({ method: 'GET', url: '/api/sync?since=0', headers: bearer });
    const pull = sync.json<SyncPullResponse>();
    expect(pull.items.length).toBe(1);
    expect(pull.cursor).toBeGreaterThan(0);

    // pull since current cursor → empty delta
    const sync2 = await app.inject({ method: 'GET', url: `/api/sync?since=${pull.cursor}`, headers: bearer });
    expect(sync2.json<SyncPullResponse>().items).toHaveLength(0);

    // --- soft-delete ---
    const del = await app.inject({ method: 'DELETE', url: `/api/items/${created.id}`, headers: bearer });
    expect(del.statusCode).toBe(204);
    const listAfter = await app.inject({ method: 'GET', url: '/api/items', headers: bearer });
    expect(listAfter.json().items).toHaveLength(0);

    // deleted item still surfaces in a sync delta (as a tombstone) for offline clients
    const syncDel = await app.inject({ method: 'GET', url: `/api/sync?since=${pull.cursor}`, headers: bearer });
    const delItems = syncDel.json<SyncPullResponse>().items;
    expect(delItems).toHaveLength(1);
    expect(delItems[0]!.deletedAt).not.toBeNull();

    // --- devices: both the register + login devices are listed ---
    const devices = await app.inject({ method: 'GET', url: '/api/devices', headers: bearer });
    const list2 = devices.json().devices as Array<{ current: boolean }>;
    expect(list2.length).toBe(2);
    expect(list2.some((d) => d.current)).toBe(true);
  });
});
