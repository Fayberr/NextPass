/**
 * Thin typed HTTP client for the server API. No crypto here - callers pass already-wrapped
 * blobs (built with `register.ts` / `vault.ts`). Works in the browser and in Node (global fetch).
 */

import type { KdfParams } from './crypto.js';
import type {
  AuthResponse,
  DeviceInfo,
  GoogleAuthRequest,
  GoogleAuthResponse,
  ItemRecord,
  ItemUpsert,
  LoginPayload,
  PreloginResponse,
  RegistrationPayload,
  SyncPullResponse,
  SyncPushResponse,
} from './types.js';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private token: string | null;
  private fetchImpl: typeof fetch;

  constructor(
    private baseUrl: string,
    token: string | null = null,
    fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
    // Bind to the global scope. In a service worker (and browsers), fetch must be
    // invoked with `this === globalThis`; calling it as a bound method property
    // (this.fetchImpl(...)) triggers "Illegal invocation". Binding fixes that.
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.token) headers['authorization'] = `Bearer ${this.token}`;

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : undefined;
    if (!res.ok) throw new ApiError(res.status, parsed);
    return parsed as T;
  }

  // --- auth ---
  health(): Promise<{ status: string; phase: number }> {
    return this.req('GET', '/api/health');
  }
  register(payload: RegistrationPayload): Promise<AuthResponse> {
    return this.req('POST', '/api/register', payload);
  }
  googleAuth(payload: GoogleAuthRequest): Promise<GoogleAuthResponse> {
    return this.req('POST', '/api/auth/google', payload);
  }
  prelogin(identifier: string): Promise<PreloginResponse> {
    return this.req('POST', '/api/prelogin', { identifier });
  }
  login(payload: LoginPayload): Promise<AuthResponse> {
    return this.req('POST', '/api/login', payload);
  }
  changePassword(payload: {
    masterPwSalt: string;
    kdfParams: KdfParams;
    authKeyHash: string;
    wrappedKeyByMasterPw: string;
  }): Promise<{ ok: boolean }> {
    return this.req('POST', '/api/user/change-password', payload);
  }

  updateRecovery(payload: { wrappedKeyByRecovery: string }): Promise<{ ok: boolean }> {
    return this.req('POST', '/api/user/update-recovery', payload);
  }

  linkGoogle(payload: { googleId: string; googleEmail: string }): Promise<{ ok: boolean; googleEmail: string }> {
    return this.req('POST', '/api/user/link-google', payload);
  }

  unlinkGoogle(): Promise<{ ok: boolean }> {
    return this.req('POST', '/api/user/unlink-google');
  }

  // --- vault + items ---
  getVault(): Promise<{ vaultId: string; wrappedKeyByMasterPw: string; wrappedKeyByRecovery: string }> {
    return this.req('GET', '/api/vault');
  }
  listItems(): Promise<{ items: ItemRecord[] }> {
    return this.req('GET', '/api/items');
  }
  getItem(id: string): Promise<ItemRecord> {
    return this.req('GET', `/api/items/${id}`);
  }
  createItem(item: ItemUpsert): Promise<ItemRecord> {
    return this.req('POST', '/api/items', item);
  }
  updateItem(id: string, item: ItemUpsert): Promise<ItemRecord> {
    return this.req('PUT', `/api/items/${id}`, item);
  }
  deleteItem(id: string): Promise<void> {
    return this.req('DELETE', `/api/items/${id}`);
  }
  purgeItems(): Promise<{ ok: boolean }> {
    return this.req('DELETE', '/api/items/purge');
  }

  // --- sync ---
  syncPull(since: number): Promise<SyncPullResponse> {
    return this.req('GET', `/api/sync?since=${since}`);
  }
  syncPush(items: ItemUpsert[]): Promise<SyncPushResponse> {
    return this.req('POST', '/api/sync', { items });
  }

  // --- devices ---
  listDevices(): Promise<{ devices: DeviceInfo[] }> {
    return this.req('GET', '/api/devices');
  }
  revokeDevice(id: string): Promise<void> {
    return this.req('DELETE', `/api/devices/${id}`);
  }
}
