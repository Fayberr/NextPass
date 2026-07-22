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
  auditVault,
  signAssertion,
  type AuditInput,
  type AuditReport,
  toB64,
  unlockWithMasterPassword,
  type ItemRecord,
  type LoginFields,
  type PasskeyFields,
  type TotpFields,
  type SecretFields,
  type CardFields,
  type AutofillIdentityFields,
  type NoteFields,
} from '@pm/shared';
import {
  clearAccount,
  getAccount,
  patchAccount,
  saveAccount,
  DEFAULT_SERVER_URL,
  type AccountMeta,
} from './config.js';
import { cacheClear, cacheDelete, cacheGetAll, cacheUpsert } from './storage.js';
import type {
  AutofillMatch,
  AutofillIdentityMatch,
  AutofillCardMatch,
  ItemSummary,
  PasskeyCreateReq,
  PasskeyCreateRes,
  PasskeyGetReq,
  PasskeyGetRes,
  VaultState,
} from './messages.js';

const PLATFORM = 'extension';

const PENDING_RECOVERY_KEY = 'pendingRecovery';
const VAULT_KEY_KEY = 'vaultKey';

/**
 * The unlocked vault key is mirrored into chrome.storage.session so it survives service-worker
 * teardown (MV3 recycles the idle worker after ~30s, which would otherwise silently re-lock the
 * vault mid-passkey-ceremony). storage.session is in-memory only, never written to disk, and
 * auto-cleared when the browser closes — the same lifetime as holding it in worker memory, just
 * durable across worker restarts. It is NOT readable by content scripts (trusted contexts only).
 */
async function getStoredKey(): Promise<Uint8Array | null> {
  const v = await chrome.storage.session.get(VAULT_KEY_KEY);
  const s = v[VAULT_KEY_KEY] as string | undefined;
  return s ? fromB64url(s) : null;
}
async function setStoredKey(key: Uint8Array | null): Promise<void> {
  if (key === null) await chrome.storage.session.remove(VAULT_KEY_KEY);
  else await chrome.storage.session.set({ [VAULT_KEY_KEY]: b64url(key) });
}

/**
 * The one-time recovery phrase lives in chrome.storage.session (in-memory, survives service-worker
 * teardown, auto-cleared when the browser closes) so it isn't lost if the popup is closed/reopened
 * — or the SW recycled — before the user confirms they saved it. It is never written to disk.
 */
async function getPendingRecovery(): Promise<string | null> {
  const v = await chrome.storage.session.get(PENDING_RECOVERY_KEY);
  return (v[PENDING_RECOVERY_KEY] as string | undefined) ?? null;
}
async function setPendingRecovery(phrase: string | null): Promise<void> {
  if (phrase === null) await chrome.storage.session.remove(PENDING_RECOVERY_KEY);
  else await chrome.storage.session.set({ [PENDING_RECOVERY_KEY]: phrase });
}

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

  /**
   * Reload the vault key from storage.session if this worker instance was recycled and lost its
   * in-memory copy. Call at the start of any operation that reads unlock state or needs the key.
   */
  private async hydrate(): Promise<void> {
    if (this.vaultKey) return;
    const stored = await getStoredKey();
    if (stored) this.vaultKey = stored;
  }

  async getState(): Promise<VaultState> {
    await this.hydrate();
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
      pendingRecovery: await getPendingRecovery(),
    };
  }

  /** Called once the user confirms they've saved the recovery phrase. */
  async ackRecovery(): Promise<void> {
    await setPendingRecovery(null);
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
    await setStoredKey(this.vaultKey);
    await cacheClear();
    await setPendingRecovery(recoveryMnemonic);
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
    await setStoredKey(this.vaultKey);
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
    await setStoredKey(this.vaultKey);
    this.lastError = null;
    // Best-effort background refresh; unlock still succeeds fully offline.
    void this.sync().catch(() => undefined);
  }

  async lock(): Promise<void> {
    this.vaultKey = null;
    this.decrypted.clear();
    await setStoredKey(null);
  }

  async forget(): Promise<void> {
    await this.lock();
    await cacheClear();
    await clearAccount();
    await setPendingRecovery(null);
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
    await this.hydrate();
    this.requireKey();
    const records = await cacheGetAll();
    const out: ItemSummary[] = [];
    for (const r of records) {
      if (r.deletedAt) continue;
      const { fields } = await this.decryptRecord(r);
      // Card numbers/secrets never leak into the list subtitle — only a masked last-4 hint for
      // cards. Notes intentionally show no subtitle (the body may be sensitive).
      const cardNumber = (fields.number as string) ?? '';
      out.push({
        id: r.id,
        type: r.type,
        name: (fields.name as string) ?? '(no name)',
        username:
          (fields.username as string) ??
          (fields.email as string) ??
          (fields.account as string) ??
          (fields.issuer as string) ??
          (r.type === 'card' && cardNumber ? `•••• ${cardNumber.slice(-4)}` : null) ??
          (fields.city as string) ??
          null,
        // Passkeys don't have a `uris` field (they store `rpId`, the relying-party domain) —
        // synthesize one so the list's favicon lookup (keyed off the first uri) works for them too.
        uris: (fields.uris as string[]) ?? (r.type === 'passkey' && fields.rpId ? [fields.rpId as string] : []),
        favorite: r.favorite,
        // Standalone authenticator entries carry their secret so the list can render a live code.
        totp: r.type === 'totp' ? (fields.secret as string) : undefined,
      });
    }
    out.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
    return out;
  }

  async getItem(id: string): Promise<{ type: string; fields: unknown; favorite: boolean }> {
    await this.hydrate();
    this.requireKey();
    const records = await cacheGetAll();
    const rec = records.find((r) => r.id === id);
    if (!rec) throw new Error('Item not found.');
    const { fields } = await this.decryptRecord(rec);
    return { type: rec.type, fields, favorite: rec.favorite };
  }

  async createLogin(fields: LoginFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const upsert = await encryptItem(key, 'login', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Overwrite an existing login item's fields (re-encrypted under the vault key). Preserves
   *  metadata (favorite / tags / folder) that isn't part of the editable field set. */
  async updateLogin(id: string, fields: LoginFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const prev = (await cacheGetAll()).find((r) => r.id === id);
    const upsert = await encryptItem(key, 'login', fields, {
      favorite: prev?.favorite,
      tags: prev?.tags,
      folderId: prev?.folderId,
    });
    const rec = await this.api(acct).updateItem(id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Create a standalone authenticator (TOTP) item. */
  async createTotp(fields: TotpFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const upsert = await encryptItem(key, 'totp', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Overwrite a standalone TOTP item's fields, preserving favorite/tags/folder metadata. */
  async updateTotp(id: string, fields: TotpFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const prev = (await cacheGetAll()).find((r) => r.id === id);
    const upsert = await encryptItem(key, 'totp', fields, {
      favorite: prev?.favorite,
      tags: prev?.tags,
      folderId: prev?.folderId,
    });
    const rec = await this.api(acct).updateItem(id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Create a designated API key / secret item. */
  async createSecret(fields: SecretFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const upsert = await encryptItem(key, 'secret', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Overwrite a secret item's fields, preserving favorite/tags/folder metadata. */
  async updateSecret(id: string, fields: SecretFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const prev = (await cacheGetAll()).find((r) => r.id === id);
    const upsert = await encryptItem(key, 'secret', fields, {
      favorite: prev?.favorite,
      tags: prev?.tags,
      folderId: prev?.folderId,
    });
    const rec = await this.api(acct).updateItem(id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Create an identity (name/address/contact) item. */
  async createIdentity(fields: AutofillIdentityFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const upsert = await encryptItem(key, 'autofill_identity', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Overwrite an identity item's fields, preserving favorite/tags/folder metadata. */
  async updateIdentity(id: string, fields: AutofillIdentityFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const prev = (await cacheGetAll()).find((r) => r.id === id);
    const upsert = await encryptItem(key, 'autofill_identity', fields, {
      favorite: prev?.favorite,
      tags: prev?.tags,
      folderId: prev?.folderId,
    });
    const rec = await this.api(acct).updateItem(id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Create a bank card item. */
  async createCard(fields: CardFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const upsert = await encryptItem(key, 'card', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Overwrite a bank card item's fields, preserving favorite/tags/folder metadata. */
  async updateCard(id: string, fields: CardFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const prev = (await cacheGetAll()).find((r) => r.id === id);
    const upsert = await encryptItem(key, 'card', fields, {
      favorite: prev?.favorite,
      tags: prev?.tags,
      folderId: prev?.folderId,
    });
    const rec = await this.api(acct).updateItem(id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Create a general note item. */
  async createNote(fields: NoteFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const upsert = await encryptItem(key, 'note', fields);
    const rec = await this.api(acct).createItem(upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Overwrite a general note item's fields, preserving favorite/tags/folder metadata. */
  async updateNote(id: string, fields: NoteFields): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const prev = (await cacheGetAll()).find((r) => r.id === id);
    const upsert = await encryptItem(key, 'note', fields, {
      favorite: prev?.favorite,
      tags: prev?.tags,
      folderId: prev?.folderId,
    });
    const rec = await this.api(acct).updateItem(id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Toggle/set the favorite flag on any item (re-encrypts to keep the metadata authoritative). */
  async setFavorite(id: string, favorite: boolean): Promise<void> {
    await this.hydrate();
    const key = this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    const rec0 = (await cacheGetAll()).find((r) => r.id === id);
    if (!rec0) throw new Error('Item not found.');
    const { fields } = await this.decryptRecord(rec0);
    const upsert = await encryptItem(key, rec0.type, fields, {
      favorite,
      tags: rec0.tags,
      folderId: rec0.folderId,
    });
    const rec = await this.api(acct).updateItem(id, upsert);
    await cacheUpsert([rec]);
    this.decrypted.delete(rec.id);
  }

  /** Offline password-health audit over all decrypted logins. Never leaves the device. */
  async audit(): Promise<AuditReport> {
    await this.hydrate();
    this.requireKey();
    const inputs: AuditInput[] = [];
    for (const r of await cacheGetAll()) {
      if (r.deletedAt || r.type !== 'login') continue;
      const { fields } = await this.decryptRecord(r);
      inputs.push({
        id: r.id,
        name: (fields.name as string) ?? '(no name)',
        password: fields.password as string | undefined,
        updatedAt: r.updatedAt,
      });
    }
    return auditVault(inputs);
  }

  /** Soft-delete any item on the server and drop it from the local cache. */
  async deleteItem(id: string): Promise<void> {
    await this.hydrate();
    this.requireKey();
    const acct = await getAccount();
    if (!acct) throw new Error('Not configured.');
    await this.api(acct).deleteItem(id);
    await cacheDelete(id);
    this.decrypted.delete(id);
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
    await this.hydrate();
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
      authenticatorData: b64url(result.response.authenticatorData),
      publicKey: b64url(result.response.publicKeySpki),
      publicKeyAlgorithm: result.response.publicKeyAlgorithm,
      transports: ['internal', 'hybrid'],
    };
  }

  /** List the saved passkeys matching a site (honoring allowCredentials), for the approval card. */
  async passkeyList(rpId: string, allowCredentials: string[] = []): Promise<{ credentialId: string; label: string }[]> {
    await this.hydrate();
    this.requireKey();
    const allow = new Set(allowCredentials);
    return (await this.passkeyItems())
      .filter((p) => p.fields.rpId === rpId)
      .filter((p) => allow.size === 0 || allow.has(p.fields.credentialId))
      .map((p) => ({
        credentialId: p.fields.credentialId,
        label: p.fields.userName || p.fields.userDisplayName || p.fields.rpId,
      }));
  }

  /** navigator.credentials.get() — find a matching passkey, sign the assertion, bump the counter. */
  async passkeyGet(req: PasskeyGetReq): Promise<PasskeyGetRes> {
    await this.hydrate();
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

    // Persist the incremented signature counter (clone-detection hygiene). This is BEST-EFFORT:
    // the assertion above is already valid and complete, so a failure to reach the server here
    // (or any persistence hiccup) must NOT abort the sign-in — otherwise a transient network blip
    // turns a good passkey login into "Authentication failed / Failed to fetch". We try to save,
    // and on failure just log and return the assertion; the counter re-syncs on the next success.
    try {
      const updated: PasskeyFields = { ...chosen.fields, signCount: assertion.newSignCount };
      const upsert = await encryptItem(key, 'passkey', updated);
      const rec = await this.api(acct).updateItem(chosen.record.id, upsert);
      await cacheUpsert([rec]);
      this.decrypted.delete(rec.id);
    } catch (e) {
      console.warn('[pm] passkey sign-counter persist failed (assertion still returned):', e);
    }

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
    await this.hydrate();
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

  /** All saved autofill_identity items, decrypted. Unlike autofillQuery() (login) there's no
   *  URL/matchMode filtering — identities aren't tied to a site, so every saved identity is
   *  always offered, letting the content script's picker do the choosing (same as passwords). */
  async identityQuery(): Promise<AutofillIdentityMatch[]> {
    await this.hydrate();
    if (!this.vaultKey) return [];
    const records = await cacheGetAll();
    const matches: AutofillIdentityMatch[] = [];
    for (const r of records) {
      if (r.deletedAt || r.type !== 'autofill_identity') continue;
      const { fields } = await this.decryptRecord(r);
      const f = fields as unknown as AutofillIdentityFields;
      matches.push({
        id: r.id,
        name: f.name ?? '(no name)',
        firstName: f.firstName ?? null,
        lastName: f.lastName ?? null,
        email: f.email ?? null,
        phone: f.phone ?? null,
        address1: f.address1 ?? null,
        address2: f.address2 ?? null,
        city: f.city ?? null,
        state: f.state ?? null,
        postalCode: f.postalCode ?? null,
        country: f.country ?? null,
      });
    }
    return matches;
  }

  /** All saved bank cards, decrypted. No URL/matchMode filtering — same rationale as identityQuery(). */
  async cardQuery(): Promise<AutofillCardMatch[]> {
    await this.hydrate();
    if (!this.vaultKey) return [];
    const records = await cacheGetAll();
    const matches: AutofillCardMatch[] = [];
    for (const r of records) {
      if (r.deletedAt || r.type !== 'card') continue;
      const { fields } = await this.decryptRecord(r);
      const f = fields as unknown as CardFields;
      matches.push({
        id: r.id,
        name: f.name ?? '(no name)',
        cardholder: f.cardholder ?? null,
        number: f.number ?? null,
        expMonth: f.expMonth ?? null,
        expYear: f.expYear ?? null,
        cvv: f.cvv ?? null,
      });
    }
    return matches;
  }

  setError(e: unknown): void {
    this.lastError = e instanceof Error ? e.message : String(e);
  }
}
