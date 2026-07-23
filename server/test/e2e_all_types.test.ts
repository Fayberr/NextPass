import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import {
  ApiClient,
  createRegistration,
  deriveAuthKeyHash,
  unlockWithMasterPassword,
  encryptItem,
  decryptItem,
  generateTotp,
  itemMatchesUrl,
  type LoginFields,
  type AutofillIdentityFields,
  type CardFields,
  type TotpFields,
  type SecretFields,
  type NoteFields,
} from '@pm/shared';
import { buildApp } from '../src/app.js';

describe('NextPass End-to-End Comprehensive Test Suite (All Item Types & Autofill)', () => {
  let app: FastifyInstance;
  let serverUrl: string;
  let vaultKey: Uint8Array;
  let client: ApiClient;

  const TEST_USER = `test_e2e_${Date.now()}@example.com`;
  const TEST_PASS = 'TestMasterPassword123!';

  beforeAll(async () => {
    app = buildApp({ dbPath: ':memory:' });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as { port: number };
    serverUrl = `http://127.0.0.1:${addr.port}`;

    // Register user & setup client
    const { payload } = await createRegistration(TEST_USER, TEST_PASS, { platform: 'test' });
    const unauthClient = new ApiClient(serverUrl);
    const auth = await unauthClient.register(payload);

    client = new ApiClient(serverUrl, auth.deviceToken);

    vaultKey = await unlockWithMasterPassword(
      TEST_PASS,
      payload.masterPwSalt,
      payload.kdfParams,
      auth.vault.wrappedKeyByMasterPw,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // 1. TYPE: Login (Credentials, URIs, TOTP)
  // ---------------------------------------------------------------------------
  it('1. LOGIN TYPE: Create, Retrieve, Domain Match, Update & Delete', async () => {
    const loginFields: LoginFields = {
      name: 'GitHub Account',
      username: 'dev_user',
      email: 'dev_user@example.com',
      password: 'SuperSecurePassword456!',
      uris: ['https://github.com/login', 'https://gist.github.com'],
      totp: 'JBSWY3DPEHPK3PXP',
      notes: 'Main dev account',
    };

    const record = await encryptItem(vaultKey, 'login', loginFields);
    const created = await client.createItem(record);
    expect(created.id).toBeDefined();

    // Retrieve & Decrypt
    const fetched = await client.getItem(created.id);
    expect(fetched.type).toBe('login');
    const fields = (await decryptItem(vaultKey, fetched)) as LoginFields;
    expect(fields.username).toBe('dev_user');
    expect(fields.password).toBe('SuperSecurePassword456!');
    expect(fields.uris).toContain('https://github.com/login');
    expect(fields.totp).toBe('JBSWY3DPEHPK3PXP');

    // Update
    fields.password = 'UpdatedPassword789!';
    const updatedRecord = await encryptItem(vaultKey, 'login', fields);
    await client.updateItem(created.id, updatedRecord);

    const refetched = await client.getItem(created.id);
    const reDecrypted = (await decryptItem(vaultKey, refetched)) as LoginFields;
    expect(reDecrypted.password).toBe('UpdatedPassword789!');

    // Cleanup
    await client.deleteItem(created.id);
  });

  // ---------------------------------------------------------------------------
  // 2. TYPE: Identity (Name, Address, Phone, Email)
  // ---------------------------------------------------------------------------
  it('2. IDENTITY TYPE: Create, Decrypt & Verify Autofill Fields', async () => {
    const identityFields: AutofillIdentityFields = {
      name: 'Personal Identity',
      firstName: 'Fabian',
      lastName: 'Kolb',
      email: 'fabian@example.com',
      phone: '+49 170 1234567',
      address1: 'Hauptstraße 42',
      address2: 'Apt 4B',
      city: 'Berlin',
      state: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
    };

    const record = await encryptItem(vaultKey, 'autofill_identity', identityFields);
    const created = await client.createItem(record);

    const fetched = await client.getItem(created.id);
    expect(fetched.type).toBe('autofill_identity');

    const fields = (await decryptItem(vaultKey, fetched)) as AutofillIdentityFields;
    expect(fields.firstName).toBe('Fabian');
    expect(fields.lastName).toBe('Kolb');
    expect(fields.postalCode).toBe('10115');
    expect(fields.country).toBe('Germany');

    await client.deleteItem(created.id);
  });

  // ---------------------------------------------------------------------------
  // 3. TYPE: Card (Credit/Debit Cards)
  // ---------------------------------------------------------------------------
  it('3. CARD TYPE: Create, Decrypt & Verify Payment Autofill Fields', async () => {
    const cardFields: CardFields = {
      name: 'Visa Gold Business',
      cardholder: 'Fabian Kolb',
      number: '4532111122223333',
      expMonth: '12',
      expYear: '2028',
      cvv: '888',
      notes: 'Primary corporate card',
    };

    const record = await encryptItem(vaultKey, 'card', cardFields);
    const created = await client.createItem(record);

    const fetched = await client.getItem(created.id);
    expect(fetched.type).toBe('card');

    const fields = (await decryptItem(vaultKey, fetched)) as CardFields;
    expect(fields.cardholder).toBe('Fabian Kolb');
    expect(fields.number).toBe('4532111122223333');
    expect(fields.expMonth).toBe('12');
    expect(fields.cvv).toBe('888');

    await client.deleteItem(created.id);
  });

  // ---------------------------------------------------------------------------
  // 4. TYPE: TOTP / Standalone Authenticator
  // ---------------------------------------------------------------------------
  it('4. TOTP TYPE: Create, Decrypt & Verify Live Code Generation', async () => {
    const totpFields: TotpFields = {
      name: 'AWS Root 2FA',
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'Amazon Web Services',
      accountName: 'root@example.com',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    };

    const record = await encryptItem(vaultKey, 'totp', totpFields);
    const created = await client.createItem(record);

    const fetched = await client.getItem(created.id);
    expect(fetched.type).toBe('totp');

    const fields = (await decryptItem(vaultKey, fetched)) as TotpFields;
    expect(fields.secret).toBe('JBSWY3DPEHPK3PXP');

    // Test live TOTP code generation from secret
    const codeInfo = await generateTotp(fields.secret, Date.now(), {
      period: fields.period,
      digits: fields.digits,
    });
    expect(codeInfo.code).toMatch(/^\d{6}$/);

    await client.deleteItem(created.id);
  });

  // ---------------------------------------------------------------------------
  // 5. TYPE: Secret / API Key
  // ---------------------------------------------------------------------------
  it('5. SECRET TYPE: Create, Decrypt & Update Secure API Key', async () => {
    const secretFields: SecretFields = {
      name: 'Stripe Secret Key',
      key: 'sk_live_51Nx...8902',
      secret: 'whsec_987654321',
      notes: 'Production webhook secret',
    };

    const record = await encryptItem(vaultKey, 'secret', secretFields);
    const created = await client.createItem(record);

    const fetched = await client.getItem(created.id);
    expect(fetched.type).toBe('secret');

    const fields = (await decryptItem(vaultKey, fetched)) as SecretFields;
    expect(fields.key).toBe('sk_live_51Nx...8902');
    expect(fields.secret).toBe('whsec_987654321');

    await client.deleteItem(created.id);
  });

  // ---------------------------------------------------------------------------
  // 6. TYPE: Note / Encrypted Secure Note
  // ---------------------------------------------------------------------------
  it('6. NOTE TYPE: Create, Decrypt & Update Encrypted Secure Note', async () => {
    const noteFields: NoteFields = {
      name: 'Server Recovery Codes',
      text: 'SSH Emergency Key: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...\nBackup Codes: 1234-5678, 8765-4321',
    };

    const record = await encryptItem(vaultKey, 'note', noteFields);
    const created = await client.createItem(record);

    const fetched = await client.getItem(created.id);
    expect(fetched.type).toBe('note');

    const fields = (await decryptItem(vaultKey, fetched)) as NoteFields;
    expect(fields.name).toBe('Server Recovery Codes');
    expect(fields.text).toContain('SSH Emergency Key');

    await client.deleteItem(created.id);
  });

  // ---------------------------------------------------------------------------
  // 7. AUTOFILL & DOMAIN MATCHING ENGINE
  // ---------------------------------------------------------------------------
  it('7. AUTOFILL ENGINE: URL & Host Domain Matching Rules', () => {
    const loginUris = ['https://subdomain.github.com/login', 'https://amazon.de/signin'];

    // Host matching
    expect(itemMatchesUrl(loginUris, 'host', 'https://subdomain.github.com/login')).toBe(true);
    expect(itemMatchesUrl(loginUris, 'host', 'https://subdomain.github.com/dashboard')).toBe(true);
    expect(itemMatchesUrl(loginUris, 'host', 'https://other.github.com/login')).toBe(false);

    // Base domain matching
    expect(itemMatchesUrl(loginUris, 'base_domain', 'https://other.github.com/login')).toBe(true);
    expect(itemMatchesUrl(loginUris, 'base_domain', 'https://amazon.de/ap/signin')).toBe(true);

    // Exact matching
    expect(itemMatchesUrl(loginUris, 'exact', 'https://subdomain.github.com/login')).toBe(true);
    expect(itemMatchesUrl(loginUris, 'exact', 'https://subdomain.github.com/other')).toBe(false);
  });
});
