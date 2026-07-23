import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  ApiClient,
  createRegistration,
  deriveAuthKeyHash,
  encryptItem,
  decryptItem,
  unlockWithMasterPassword,
} from '@pm/shared';

/** Exercises the shared ApiClient against a really-listening server (validates client + wire). */
describe('ApiClient <-> server', () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    app = buildApp({ dbPath: ':memory:' });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const addr = app.server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, and round-trips an encrypted item via the client', async () => {
    const api = new ApiClient(baseUrl);
    expect((await api.health()).status).toBe('ok');

    const reg = await createRegistration('friend@example.com', 'pw-correct', { platform: 'vitest' });
    const auth = await api.register(reg.payload);
    api.setToken(auth.deviceToken);

    const vaultKey = await unlockWithMasterPassword(
      'pw-correct',
      reg.payload.masterPwSalt,
      reg.payload.kdfParams,
      auth.vault.wrappedKeyByMasterPw,
    );

    const fields = {
      name: 'Bank',
      username: 'friend',
      email: 'friend@example.com',
      password: 'hunter2',
      uris: ['https://bank.example'],
      matchMode: 'host' as const,
    };
    const created = await api.createItem(await encryptItem(vaultKey, 'login', fields));
    expect((await api.listItems()).items).toHaveLength(1);
    expect(await decryptItem(vaultKey, created)).toEqual(fields);

    // fresh client logs in on a "new device" via prelogin -> login
    const api2 = new ApiClient(baseUrl);
    const pre = await api2.prelogin('friend@example.com');
    const authKeyHash = await deriveAuthKeyHash('pw-correct', pre.masterPwSalt, pre.kdfParams);
    const login = await api2.login({ identifier: 'friend@example.com', authKeyHash, device: { platform: 'dev2' } });
    api2.setToken(login.deviceToken);

    const pulled = await api2.syncPull(0);
    expect(pulled.items).toHaveLength(1);
    const vk2 = await unlockWithMasterPassword('pw-correct', pre.masterPwSalt, pre.kdfParams, login.vault.wrappedKeyByMasterPw);
    expect(await decryptItem(vk2, pulled.items[0]!)).toEqual(fields);
  }, 15000);
});
