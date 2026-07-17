/**
 * Persistent account metadata (chrome.storage.local). Contains NO secret key material —
 * only the master-password-wrapped vault key blob (useless without the master password),
 * the device bearer token, KDF salt/params, and the server URL. The vault key itself is
 * derived at unlock time and lives only in the service worker's memory.
 */

import type { KdfParams } from '@pm/shared';

// Default points at the always-on Pi server over the LAN so the extension works turnkey from
// another machine (e.g. the Windows PC) with no manual entry. Override on the login screen for
// local dev (http://localhost:8787). The Pi origin is already in the manifest host_permissions.
export const DEFAULT_SERVER_URL = 'http://192.168.178.2:8787';

export interface AccountMeta {
  serverUrl: string;
  identifier: string;
  userId: string;
  vaultId: string;
  deviceToken: string;
  masterPwSalt: string;
  kdfParams: KdfParams;
  /** Master-password-wrapped vault key — decrypts only with the derived master key. */
  wrappedKeyByMasterPw: string;
  wrappedKeyByRecovery: string;
  syncCursor: number;
}

const KEY = 'pm.account';

export async function getAccount(): Promise<AccountMeta | null> {
  const got = await chrome.storage.local.get(KEY);
  return (got[KEY] as AccountMeta | undefined) ?? null;
}

export async function saveAccount(meta: AccountMeta): Promise<void> {
  await chrome.storage.local.set({ [KEY]: meta });
}

export async function patchAccount(patch: Partial<AccountMeta>): Promise<AccountMeta | null> {
  const cur = await getAccount();
  if (!cur) return null;
  const next = { ...cur, ...patch };
  await saveAccount(next);
  return next;
}

export async function clearAccount(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}
