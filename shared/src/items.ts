/**
 * Plaintext item field shapes — the structured JSON that lives INSIDE the encrypted blob.
 * The server never sees these; only clients, after unlock.
 */

import type { MatchMode } from './matching.js';

export interface CustomField {
  name: string;
  value: string;
  hidden?: boolean; // render as password dots + reveal
}

/** Login "bundle": username AND email AND password held simultaneously (per the design). */
export interface LoginFields {
  name: string;
  username?: string;
  email?: string;
  password?: string;
  uris: string[];
  matchMode: MatchMode;
  totp?: string; // otpauth:// or raw secret (TOTP category can also stand alone)
  notes?: string;
  customFields?: CustomField[];
}

/** Flexible key/value secret: API keys, SSH keys, license codes, Wi-Fi passwords, … */
export interface SecretFields {
  name: string;
  value: string;
  notes?: string;
  customFields?: CustomField[];
}

export interface CardFields {
  name: string;
  cardholder?: string;
  number?: string;
  expMonth?: string;
  expYear?: string;
  cvv?: string;
  notes?: string;
}

export interface AutofillIdentityFields {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** A standalone authenticator entry: a TOTP not tied to a stored login (like Google Authenticator). */
export interface TotpFields {
  name: string; // display, e.g. "GitHub (alice)"
  secret: string; // otpauth:// URI or raw base32 secret
  issuer?: string;
  account?: string;
  notes?: string;
}

/** A WebAuthn/FIDO2 passkey stored in the vault (Phase 2). Private key is PKCS#8, base64. */
export interface PasskeyFields {
  name: string; // display, e.g. "github.com — user@example.com"
  rpId: string;
  rpName?: string;
  userHandle: string; // base64 (PublicKeyCredentialUserEntity.id)
  userName?: string;
  userDisplayName?: string;
  credentialId: string; // base64url
  privateKey: string; // PKCS#8, base64
  signCount: number;
  createdAt: number;
  notes?: string;
}

export type ItemFields =
  | LoginFields
  | SecretFields
  | CardFields
  | AutofillIdentityFields
  | TotpFields
  | PasskeyFields;

/** Every item type carries a display `name`. */
export function itemDisplayName(fields: { name?: string }): string {
  return fields.name?.trim() || '(no name)';
}
