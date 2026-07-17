/**
 * SessionManager — lives in the background service worker. Owns the in-memory vault key and
 * mediates every crypto operation. UI surfaces talk to it only via messages; the vault key
 * never leaves this module.
 */

import {
  ApiClient,
  createRegistration,
  decryptItem,
  deriveAuthKeyHash,
  encryptItem,
  itemMatchesUrl,
  unlockWithMasterPassword,
  type ItemRecord,
  type LoginFields,
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
import type { AutofillMatch, ItemSummary, VaultState } from './messages.js';

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
