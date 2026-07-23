/**
 * Shared API + domain types. Used by the server and (later) every client.
 * The server treats all encrypted fields as opaque base64 blobs - it never sees plaintext.
 */

import type { KdfParams } from './crypto.js';

export type ItemType = 'login' | 'card' | 'secret' | 'autofill_identity' | 'passkey' | 'totp' | 'note';

/** Base64-encoded wrapped-key / ciphertext blob as stored and transported. */
export type B64 = string;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/** Everything the client sends to POST /api/register. Contains NO plaintext secret material. */
export interface RegistrationPayload {
  identifier: string;
  isAdmin: boolean;
  masterPwSalt: B64;
  kdfParams: KdfParams;
  /** SHA-256(authKey) - server stores this to verify future logins. */
  authKeyHash: B64;
  wrappedKeyByMasterPw: B64;
  /** Present for every normal user (admin backdoor); omitted for the admin's own account. */
  wrappedKeyByAdmin: B64 | null;
  wrappedKeyByRecovery: B64;
  device: DeviceRegistration;
}

export interface DeviceRegistration {
  platform: string;
}

/** Local-only result of registration - the recovery phrase is shown ONCE and never stored. */
export interface RegistrationResult {
  payload: RegistrationPayload;
  recoveryMnemonic: string;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface PreloginResponse {
  masterPwSalt: B64;
  kdfParams: KdfParams;
}

export interface GoogleAuthRequest {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  idToken?: string;
}

export interface GoogleAuthResponse {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  existingUser: boolean;
  identifier?: string;
  prelogin?: PreloginResponse;
  auth?: AuthResponse;
}

export interface LoginPayload {
  identifier: string;
  authKeyHash: B64;
  device: DeviceRegistration;
}

export interface AuthResponse {
  userId: string;
  deviceId: string;
  /** Bearer token - shown once, stored only hashed server-side. */
  deviceToken: string;
  vault: VaultKeysResponse;
}

export interface VaultKeysResponse {
  vaultId: string;
  wrappedKeyByMasterPw: B64;
  wrappedKeyByRecovery: B64;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface ItemRecord {
  id: string;
  type: ItemType;
  encryptedBlob: B64;
  itemKeyWrappedByVaultKey: B64;
  itemKeyWrappedByAutomationPubkey: B64 | null;
  tags: string[];
  favorite: boolean;
  folderId: string | null;
  version: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** Client → server when creating/updating an item. */
export interface ItemUpsert {
  id?: string;
  type: ItemType;
  encryptedBlob: B64;
  itemKeyWrappedByVaultKey: B64;
  itemKeyWrappedByAutomationPubkey?: B64 | null;
  tags?: string[];
  favorite?: boolean;
  folderId?: string | null;
  /** For last-write-wins conflict resolution on push. */
  updatedAt?: number;
  deletedAt?: number | null;
}

// ---------------------------------------------------------------------------
// Sync (Phase 0 stub)
// ---------------------------------------------------------------------------

export interface SyncPullResponse {
  items: ItemRecord[];
  cursor: number;
}

export interface SyncPushRequest {
  items: ItemUpsert[];
}

export interface SyncPushResponse {
  applied: number;
  skipped: number;
  cursor: number;
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export interface DeviceInfo {
  id: string;
  platform: string;
  createdAt: number;
  lastSeenAt: number;
  current: boolean;
}
