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
  | { kind: 'autofill_query'; url: string };

export type MsgResult =
  | { ok: true; kind: 'state'; state: VaultState; recovery?: string }
  | { ok: true; kind: 'items'; items: ItemSummary[] }
  | { ok: true; kind: 'item'; id: string; type: string; fields: unknown }
  | { ok: true; kind: 'sync'; pulled: number }
  | { ok: true; kind: 'autofill'; matches: AutofillMatch[] }
  | { ok: true; kind: 'void' }
  | { ok: false; error: string };

export interface AutofillMatch {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  password: string | null;
}
