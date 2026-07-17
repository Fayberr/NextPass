/**
 * SessionManager — lives in the background service worker. Owns the in-memory vault key and
 * mediates every crypto operation. UI surfaces talk to it only via messages; the vault key
 * never leaves this module.
 */

import {
  ApiClient,
  b64url,
  createPasskey,
  createRegistration,
  decryptItem,
  deriveAuthKeyHash,
  encryptItem,
  fromB64url,
  itemMatchesUrl,
  signAssertion,
  toB64,
  unlockWithMasterPassword,
  type ItemRecord,
  type LoginFields,
  type PasskeyFields,
} from '@pm/shared';
import {
  clearAccount,
  getAccount,
  patchAccount,
  saveAccount,
  DEFAULT_SERVER_URL,
  type AccountMeta,
} from './config.js';
import { cacheClear, cacheGetAll, cacheUpsert } from './storage.js';
import type {
  AutofillMatch,
  ItemSummary,
  PasskeyCreateReq,
  PasskeyCreateRes,
  PasskeyGetReq,
  PasskeyGetRes,
  VaultState,
} from './messages.js';

const PLATFORM = 'extension';

/** Decrypted item held only in memory. `fields` shape depends on `type`. */
interface DecryptedItem {
  record: ItemRecord;
  fields: Record<string, unknown>;
}

export class SessionManager {
  private vaultKey: Uint8Array | null = null;
  private decrypted = new Map<string, DecryptedItem>(); // id -> decrypted (memoized by version)
  private lastError: string | null = null;

  // --- state ---

  async getState(): Promise<VaultState> {
    const acct = await getAccount();
    const items = this.vaultKey ? await cacheGetAll() : [];
    return {
      configured: acct !== null,
      unlocked: this.vaultKey !== null,
      serverUrl: acct?.serverUrl ?? DEFAULT_SERVER_URL,
      identifier: acct?.identifier ?? null,
      itemCount: items.length,
      online: navigator.onLine,
      lastError: this.lastError,
    };
  }

  private api(acct: AccountMeta): ApiClient {
    return new ApiClient(acct.serverUrl, acct.deviceToken);
  }

  // --- account lifecycle ---

  /** Register a brand-new account on the server. Returns the one-time recovery phrase. */
  async register(serverUrl: string, identifier: string, password: string): Promise<string> {
    this.lastError = null;
    const { payload, recoveryMnemonic } = await createRegistration(identifier, password, {
      platform: PLATFORM,
    });
    const api = new ApiClient(serverUrl);
    const auth = await api.register(payload);

    await saveAccount({
      serverUrl,
      identifier,
      userId: auth.userId,
      vaultId: auth.vault.vaultId,
      deviceToken: auth.deviceToken,
      masterPwSalt: payload.masterPwSalt,
      kdfParams: payload.kdfParams,
      wrappedKeyByMasterPw: auth.vault.wrappedKeyByMasterPw,
      wrappedKeyByRecovery: auth.vault.wrappedKeyByRecovery,
      syncCursor: 0,
    });

    this.vaultKey = await unlockWithMasterPassword(
      password,
      payload.masterPwSalt,
      payload.kdfParams,
      auth.vault.wrappedKeyByMasterPw,
    );
    await cacheClear();
    return recoveryMnemonic;
  }

  /** Log in to an existing account from this (new) device. */
  async login(serverUrl: string, identifier: string, password: string): Promise<void> {
    this.lastError = null;
    const api = new ApiClient(serverUrl);
    const pre = await api.prelogin(identifier);
    const authKeyHash = await deriveAuthKeyHash(password, pre.masterPwSalt, pre.kdfParams);
    const auth = await api.login({ identifier, authKeyHash, device: { platform: PLATFORM } });

    await saveAccount({
      serverUrl,
      identifier,
      userId: auth.userId,
      vaultId: auth.vault.vaultId,
      deviceToken: auth.deviceToken,
      masterPwSalt: pre.masterPwSalt,
      kdfParams: pre.kdfParams,
      wrappedKeyByMasterPw: auth.vault.wrappedKeyByMasterPw,
      wrappedKeyByRecovery: auth.vault.wrappedKeyByRecovery,
      syncCursor: 0,
    });

    this.vaultKey = await unlockWithMasterPassword(
      password,
      pre.masterPwSalt,
      pre.kdfParams,
      auth.vault.wrappedKeyByMasterPw,
    );
    await cacheClear();
    await this.sync().catch(() => undefined);
  }

  /** Offline-capable unlock using the locally-stored wrapped vault key. */
  async unlock(password: string): Promise<void> {
    const acct = await getAccount();
    if (!acct) throw new Error('No account on this device — register or log in first.');
    this.vaultKey = await unlockWithMasterPassword(
      password,
      acct.masterPwSalt,
      acct.kdfParams,
      acct.wrappedKeyByMasterPw,
    );
    this.lastError = null;
    // Best-effort background refresh; unlock still succeeds fully offline.
    void this.sync().catch(() => undefined);
  }

  lock(): void {
    this.vaultKey = null;
    this.decrypted.clear();
  }

  async forget(): Promise<void> {
    this.lock();
    await cacheClear();
    await clearAccount();
  }

  // --- sync ---

  async sync(): Promise<number> {
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const api = this.api(acct);
    const res = await api.syncPull(acct.syncCursor);
    if (res.items.length) await cacheUpsert(res.items);
    await patchAccount({ syncCursor: res.cursor });
    // Invalidate memoized decryptions for changed items.
    for (const r of res.items) this.decrypted.delete(r.id);
    return res.items.length;
  }

  // --- items ---

  private requireKey(): Uint8Array {
    if (!this.vaultKey) throw new Error('Vault is locked.');
    return this.vaultKey;
  }

  private async decryptRecord(record: ItemRecord): Promise<DecryptedItem> {
    const memo = this.decrypted.get(record.id);
    if (memo && memo.record.version === record.version) return memo;
    const fields = await decryptItem<Record<string, unknown>>(this.requireKey(), record);
    const d = { record, fields };
    this.decrypted.set(record.id, d);
    return d;
  }

  async listItems(): Promise<ItemSummary[]> {
    this.requireKey();
    const records = await cacheGetAll();
    const out: ItemSummary[] = [];
    for (const r of records) {
      if (r.deletedAt) continue;
      const { fields } = await this.decryptRecord(r);
      out.push({
        id: r.id,
        type: r.type,
        name: (fields.name as string) ?? '(no name)',
        username: (fields.username as string) ?? (fields.email as string) ?? null,
        uris: (fields.uris as string[]) ?? [],
        favorite: r.favorite,
      });
    }
    out.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
    return out;
  }

  async getItem(id: string): Promise<{ type: string; fields: unknown }> {
    this.requireKey();
    const records = await cacheGetAll();
    const rec = records.find((r) => r.id === id);
    if (!rec) throw new Error('Item not found.');
    const { fields } = await this.decryptRecord(rec);
    return { type: rec.type, fields };
  }

  async createLogin(fields: LoginFields): Promise<void> {
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const upsert = await encryptItem(key, 'login', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  // --- passkeys (Phase 2 WebAuthn shim) ---

  /** Decrypt every non-deleted passkey item into {record, fields}. */
  private async passkeyItems(): Promise<{ record: ItemRecord; fields: PasskeyFields }[]> {
    this.requireKey();
    const out: { record: ItemRecord; fields: PasskeyFields }[] = [];
    for (const r of await cacheGetAll()) {
      if (r.deletedAt || r.type !== 'passkey') continue;
      const { fields } = await this.decryptRecord(r);
      out.push({ record: r, fields: fields as unknown as PasskeyFields });
    }
    return out;
  }

  /** navigator.credentials.create() — mint a passkey, store it as a vault item, return the attestation. */
  async passkeyCreate(req: PasskeyCreateReq): Promise<PasskeyCreateRes> {
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');

    const result = await createPasskey({
      rpId: req.rpId,
      origin: req.origin,
      challenge: fromB64url(req.challenge),
      userHandle: fromB64url(req.userHandle),
      userName: req.userName,
      userDisplayName: req.userDisplayName,
    });

    const label = req.userName ? `${req.rpId} — ${req.userName}` : req.rpId;
    const fields: PasskeyFields = {
      name: label,
      rpId: req.rpId,
      rpName: req.rpName,
      userHandle: toB64(result.passkey.userHandle),
      userName: req.userName,
      userDisplayName: req.userDisplayName,
      credentialId: b64url(result.passkey.credentialId),
      privateKey: toB64(result.passkey.privateKeyPkcs8),
      signCount: result.passkey.signCount,
      createdAt: Date.now(),
    };
    const upsert = await encryptItem(key, 'passkey', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);

    return {
      credentialId: b64url(result.response.credentialId),
      clientDataJSON: b64url(result.response.clientDataJSON),
      attestationObject: b64url(result.response.attestationObject),
      transports: ['internal', 'hybrid'],
    };
  }

  /** navigator.credentials.get() — find a matching passkey, sign the assertion, bump the counter. */
  async passkeyGet(req: PasskeyGetReq): Promise<PasskeyGetRes> {
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');

    const candidates = (await this.passkeyItems()).filter((p) => p.fields.rpId === req.rpId);
    if (candidates.length === 0) throw new Error(`No passkey for ${req.rpId}.`);

    // Honor allowCredentials if the RP restricts to specific credential IDs.
    const allow = new Set(req.allowCredentials);
    const chosen =
      allow.size > 0
        ? candidates.find((p) => allow.has(p.fields.credentialId)) ?? null
        : candidates[0];
    if (!chosen) throw new Error(`No matching passkey for ${req.rpId}.`);

    const assertion = await signAssertion(
      { rpId: req.rpId, origin: req.origin, challenge: fromB64url(req.challenge) },
      {
        credentialId: fromB64url(chosen.fields.credentialId),
        privateKeyPkcs8: fromB64url(chosen.fields.privateKey),
        userHandle: fromB64url(chosen.fields.userHandle),
        signCount: chosen.fields.signCount,
      },
    );

    // Persist the incremented signature counter (clone-detection hygiene).
    const updated: PasskeyFields = { ...chosen.fields, signCount: assertion.newSignCount };
    const upsert = await encryptItem(key, 'passkey', updated);
    const rec = await this.api(acct).updateItem(chosen.record.id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);

    return {
      credentialId: b64url(assertion.credentialId),
      clientDataJSON: b64url(assertion.clientDataJSON),
      authenticatorData: b64url(assertion.authenticatorData),
      signature: b64url(assertion.signature),
      userHandle: b64url(assertion.userHandle),
    };
  }

  // --- autofill ---

  async autofillQuery(url: string): Promise<AutofillMatch[]> {
    if (!this.vaultKey) return [];
    const records = await cacheGetAll();
    const matches: AutofillMatch[] = [];
    for (const r of records) {
      if (r.deletedAt || r.type !== 'login') continue;
      const { fields } = await this.decryptRecord(r);
      const uris = (fields.uris as string[]) ?? [];
      const mode = (fields.matchMode as 'host' | 'base_domain' | 'exact' | 'never') ?? 'host';
      if (!itemMatchesUrl(uris, mode, url)) continue;
      matches.push({
        id: r.id,
        name: (fields.name as string) ?? '(no name)',
        username: (fields.username as string) ?? null,
        email: (fields.email as string) ?? null,
        password: (fields.password as string) ?? null,
      });
    }
    return matches;
  }

  setError(e: unknown): void {
    this.lastError = e instanceof Error ? e.message : String(e);
  }
}
