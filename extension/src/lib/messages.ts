/**
 * Typed message protocol between UI surfaces (popup, content script) and the background
 * service worker. The vault key NEVER crosses this boundary — the background holds it in
 * memory and only ever returns decrypted field data on explicit request.
 */

import type { LoginFields } from '@pm/shared';

export interface VaultState {
  configured: boolean; // an account exists on this device
  unlocked: boolean; // vault key is in memory
  serverUrl: string;
  identifier: string | null;
  itemCount: number;
  online: boolean;
  lastError: string | null;
}

/** Lightweight item summary safe to render in the list (already decrypted names). */
export interface ItemSummary {
  id: string;
  type: string;
  name: string;
  username: string | null;
  uris: string[];
  favorite: boolean;
}

export type Msg =
  | { kind: 'get_state' }
  | { kind: 'set_server'; serverUrl: string }
  | { kind: 'register'; serverUrl: string; identifier: string; password: string }
  | { kind: 'login'; serverUrl: string; identifier: string; password: string }
  | { kind: 'unlock'; password: string }
  | { kind: 'lock' }
  | { kind: 'forget' }
  | { kind: 'list_items' }
  | { kind: 'get_item'; id: string }
  | { kind: 'create_login'; fields: LoginFields }
  | { kind: 'sync' }
  | { kind: 'autofill_query'; url: string }
  | { kind: 'passkey_create'; req: PasskeyCreateReq }
  | { kind: 'passkey_get'; req: PasskeyGetReq };

export type MsgResult =
  | { ok: true; kind: 'state'; state: VaultState; recovery?: string }
  | { ok: true; kind: 'items'; items: ItemSummary[] }
  | { ok: true; kind: 'item'; id: string; type: string; fields: unknown }
  | { ok: true; kind: 'sync'; pulled: number }
  | { ok: true; kind: 'autofill'; matches: AutofillMatch[] }
  | { ok: true; kind: 'passkey_created'; res: PasskeyCreateRes }
  | { ok: true; kind: 'passkey_asserted'; res: PasskeyGetRes }
  | { ok: true; kind: 'void' }
  | { ok: false; error: string };

/**
 * WebAuthn shim payloads. All binary values are base64url strings because these cross the
 * chrome.runtime messaging boundary (JSON-serialized) and, before that, window.postMessage
 * from the page's main world. The background reconstructs bytes with `fromB64url`.
 */
export interface PasskeyCreateReq {
  rpId: string;
  rpName?: string;
  origin: string;
  challenge: string; // base64url
  userHandle: string; // base64url (PublicKeyCredentialUserEntity.id)
  userName?: string;
  userDisplayName?: string;
  excludeCredentials: string[]; // base64url credential IDs already registered
}

export interface PasskeyCreateRes {
  credentialId: string; // base64url
  clientDataJSON: string; // base64url
  attestationObject: string; // base64url
  transports: string[];
}

export interface PasskeyGetReq {
  rpId: string;
  origin: string;
  challenge: string; // base64url
  allowCredentials: string[]; // base64url credential IDs (may be empty for discoverable)
}

export interface PasskeyGetRes {
  credentialId: string; // base64url
  clientDataJSON: string; // base64url
  authenticatorData: string; // base64url
  signature: string; // base64url (DER)
  userHandle: string; // base64url
}

export interface AutofillMatch {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  password: string | null;
}
