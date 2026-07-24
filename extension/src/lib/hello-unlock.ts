/**
 * Windows Hello quick-unlock bridge (desktop app only).
 *
 * The Electron main process (desktop/electron/main.ts) exposes four IPC calls via the preload's
 * `window.electronAPI`; this module is the typed accessor the shared session code uses. In the
 * browser extension popup none of these methods exist, so `getHelloApi()` returns null and every
 * Hello feature stays inert.
 *
 * How it works (see main.ts for the implementation):
 *  - Enabling (while unlocked) shows a Windows Hello prompt; on success the raw vault key is
 *    encrypted with Electron safeStorage (Windows DPAPI, bound to the signed-in Windows user)
 *    and written to the app's userData dir.
 *  - Unlocking shows the Hello prompt again; only a successful PIN/biometric verification
 *    releases the decrypted vault key back to the session.
 *
 * Threat model (same class as the Google device-unlock, not a hardware boundary): DPAPI protects
 * the blob against OTHER Windows users and offline disk theft, and the Hello prompt gates casual
 * access to an unattended, signed-in machine. Malware running AS this Windows user could call
 * DPAPI itself and skip the prompt - identical to the existing device-unlock capability, and the
 * usual limit of every convenience unlock. The master password remains the root credential; the
 * blob is dropped on log-out and on master-password change.
 */

export interface HelloStatus {
  /** Windows Hello (PIN/biometric) is set up and usable on this machine. */
  available: boolean;
  /** A Hello-protected vault-key blob exists on this device (feature switched on). */
  enabled: boolean;
}

export interface HelloApi {
  helloStatus: () => Promise<HelloStatus>;
  helloEnable: (vaultKeyB64: string) => Promise<{ ok: boolean; error?: string }>;
  helloUnlock: () => Promise<{ ok: boolean; vaultKey?: string; error?: string }>;
  helloDisable: () => Promise<{ ok: boolean }>;
}

export function getHelloApi(): HelloApi | null {
  const api = (globalThis as { electronAPI?: Partial<HelloApi> }).electronAPI;
  return api?.helloStatus && api.helloEnable && api.helloUnlock && api.helloDisable
    ? (api as HelloApi)
    : null;
}
