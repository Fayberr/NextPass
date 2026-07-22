/**
 * Typed message protocol between UI surfaces (popup, content script) and the background
 * service worker. The vault key NEVER crosses this boundary — the background holds it in
 * memory and only ever returns decrypted field data on explicit request.
 */

import type {
  AuditReport,
  LoginFields,
  TotpFields,
  SecretFields,
  CardFields,
  AutofillIdentityFields,
  NoteFields,
} from '@pm/shared';
import type { Settings } from './settings.js';

export interface VaultState {
  configured: boolean; // an account exists on this device
  unlocked: boolean; // vault key is in memory
  serverUrl: string;
  identifier: string | null;
  itemCount: number;
  online: boolean;
  lastError: string | null;
  /** One-time recovery phrase awaiting the user's acknowledgement (null once saved). */
  pendingRecovery: string | null;
}

/** Lightweight item summary safe to render in the list (already decrypted names). */
export interface ItemSummary {
  id: string;
  type: string;
  name: string;
  username: string | null;
  uris: string[];
  favorite: boolean;
  /** For standalone authenticator (type 'totp') items: the secret, so the list can render a live code. */
  totp?: string;
}

export type Msg =
  | { kind: 'get_state' }
  | { kind: 'set_server'; serverUrl: string }
  | { kind: 'register'; serverUrl: string; identifier: string; password: string }
  | { kind: 'login'; serverUrl: string; identifier: string; password: string }
  | { kind: 'unlock'; password: string }
  | { kind: 'lock' }
  | { kind: 'forget' }
  | { kind: 'ack_recovery' }
  | { kind: 'list_items' }
  | { kind: 'get_item'; id: string }
  | { kind: 'create_login'; fields: LoginFields }
  | { kind: 'update_login'; id: string; fields: LoginFields }
  | { kind: 'create_totp'; fields: TotpFields }
  | { kind: 'update_totp'; id: string; fields: TotpFields }
  | { kind: 'create_secret'; fields: SecretFields }
  | { kind: 'update_secret'; id: string; fields: SecretFields }
  | { kind: 'create_identity'; fields: AutofillIdentityFields }
  | { kind: 'update_identity'; id: string; fields: AutofillIdentityFields }
  | { kind: 'create_card'; fields: CardFields }
  | { kind: 'update_card'; id: string; fields: CardFields }
  | { kind: 'create_note'; fields: NoteFields }
  | { kind: 'update_note'; id: string; fields: NoteFields }
  | { kind: 'delete_item'; id: string }
  | { kind: 'set_favorite'; id: string; favorite: boolean }
  | { kind: 'audit' }
  | { kind: 'get_settings' }
  | { kind: 'set_settings'; patch: Partial<Settings> }
  | { kind: 'sync' }
  | { kind: 'autofill_query'; url: string }
  | { kind: 'autofill_identity_query' }
  | { kind: 'passkey_create'; req: PasskeyCreateReq }
  | { kind: 'passkey_get'; req: PasskeyGetReq }
  | { kind: 'open_unlock_ui' };

export type MsgResult =
  | { ok: true; kind: 'state'; state: VaultState; recovery?: string }
  | { ok: true; kind: 'items'; items: ItemSummary[] }
  | { ok: true; kind: 'item'; id: string; type: string; fields: unknown; favorite: boolean }
  | { ok: true; kind: 'sync'; pulled: number }
  | { ok: true; kind: 'autofill'; matches: AutofillMatch[] }
  | { ok: true; kind: 'identity_autofill'; matches: AutofillIdentityMatch[] }
  | { ok: true; kind: 'audit'; report: AuditReport }
  | { ok: true; kind: 'settings'; settings: Settings }
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
  authenticatorData: string; // base64url
  publicKey: string; // base64url (SPKI DER)
  publicKeyAlgorithm: number; // COSE alg id, ES256 = -7
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

/**
 * Sent from the background to a tab's content script (separate channel from the popup protocol)
 * to (a) obtain the page's true origin — the webAuthenticationProxy events don't include it — and
 * (b) show the in-page approval prompt for a passkey ceremony.
 */
export interface WaPromptPasskey {
  credentialId: string; // base64url
  label: string; // human-friendly (userName / displayName / rpId)
}
export interface WaPromptRequest {
  kind: 'wa_prompt';
  op: 'create' | 'get';
  rpId: string;
  userName?: string;
  /** For 'get': the saved passkeys matching this site, for the user to choose from. */
  passkeys?: WaPromptPasskey[];
}
export interface WaPromptResponse {
  approved: boolean;
  origin: string;
  /** For 'get': the credentialId the user picked (base64url), if a choice was offered. */
  credentialId?: string;
}

export interface AutofillMatch {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  password: string | null;
}

/** A saved autofill_identity item, decrypted, offered to the content script's identity-field
 *  autofill (name/address/phone-style checkout & registration fields — not password matching, so
 *  there's no URL/matchMode filtering: all saved identities are always offered, same as Bitwarden). */
export interface AutofillIdentityMatch {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}
