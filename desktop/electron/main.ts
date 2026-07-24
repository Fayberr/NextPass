import { app, BrowserWindow, ipcMain, globalShortcut, shell, safeStorage } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let mainWindow: BrowserWindow | null = null;

// ---------------------------------------------------------------------------
// Desktop-only settings (launch on startup, start minimized, quick-search
// hotkey). Persisted as plain JSON in the app's userData dir - nothing secret
// lives here. The renderer reads/writes them via the desktop-settings IPC pair.
// ---------------------------------------------------------------------------

const DEFAULT_HOTKEY = 'CommandOrControl+Alt+A';

interface DesktopSettings {
  launchOnStartup: boolean;
  startMinimized: boolean;
  quickSearchHotkey: string;
}

const DEFAULT_DESKTOP_SETTINGS: DesktopSettings = {
  launchOnStartup: false,
  startMinimized: false,
  quickSearchHotkey: DEFAULT_HOTKEY,
};

let desktopSettings: DesktopSettings = { ...DEFAULT_DESKTOP_SETTINGS };

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'desktop-settings.json');
}

function loadDesktopSettings(): void {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsFile(), 'utf-8'));
    desktopSettings = { ...DEFAULT_DESKTOP_SETTINGS, ...raw };
  } catch {
    // First run / unreadable file - defaults are fine.
  }
}

function saveDesktopSettings(): void {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify(desktopSettings, null, 2));
  } catch (err) {
    console.error('Failed to persist desktop settings:', err);
  }
}

/** True when Windows auto-started us via the login item we registered with --start-minimized. */
const startMinimized = process.argv.includes('--start-minimized');

/**
 * (Re-)register the quick-search global hotkey. Returns an error string (for the
 * Settings UI) instead of throwing; on failure the caller decides the fallback.
 */
function registerHotkey(accel: string): string | null {
  try {
    const ok = globalShortcut.register(accel, () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('toggle-quick-search');
      }
    });
    return ok ? null : `Could not register "${accel}" - it may already be in use by another app.`;
  } catch {
    return `"${accel}" is not a valid hotkey.`;
  }
}

/**
 * Sync the Windows login item with the current settings. We run unpackaged
 * (electron.exe <appRoot>), so the app path must be passed explicitly - a bare
 * process.execPath would auto-start an empty Electron shell.
 */
function applyLoginItem(): void {
  const args = [app.getAppPath()];
  if (desktopSettings.startMinimized) args.push('--start-minimized');
  app.setLoginItemSettings({
    openAtLogin: desktopSettings.launchOnStartup,
    path: process.execPath,
    args,
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    console.error(`[Load Error ${code}] ${desc}`);
  });

  mainWindow.once('ready-to-show', () => {
    if (startMinimized) {
      // Auto-started at Windows login with "start minimized" enabled: sit in the
      // taskbar instead of stealing focus from whatever the user is doing.
      mainWindow?.minimize();
    } else {
      mainWindow?.show();
    }
    // Detached devtools only during dev - never auto-open in the deployed app.
    if (VITE_DEV_SERVER_URL) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.whenReady().then(() => {
  loadDesktopSettings();
  createWindow();

  // Register the quick-search hotkey from settings; fall back to the default if a
  // previously saved custom combo can no longer be registered (e.g. claimed by
  // another app since) so the feature never silently disappears.
  const err = registerHotkey(desktopSettings.quickSearchHotkey);
  if (err) {
    console.error('Quick-search hotkey:', err);
    if (desktopSettings.quickSearchHotkey !== DEFAULT_HOTKEY) {
      desktopSettings.quickSearchHotkey = DEFAULT_HOTKEY;
      saveDesktopSettings();
      registerHotkey(DEFAULT_HOTKEY);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('desktop-settings-get', () => ({ ...desktopSettings }));

ipcMain.handle('desktop-settings-set', (_e, patch: Partial<DesktopSettings>) => {
  const prev = { ...desktopSettings };
  desktopSettings = { ...desktopSettings, ...patch };
  let error: string | null = null;

  if (patch.quickSearchHotkey && patch.quickSearchHotkey !== prev.quickSearchHotkey) {
    try {
      globalShortcut.unregister(prev.quickSearchHotkey);
    } catch {}
    error = registerHotkey(desktopSettings.quickSearchHotkey);
    if (error) {
      // Roll back to the previous (known-good) combo so the hotkey keeps working.
      desktopSettings.quickSearchHotkey = prev.quickSearchHotkey;
      registerHotkey(prev.quickSearchHotkey);
    }
  }

  if ('launchOnStartup' in patch || 'startMinimized' in patch) applyLoginItem();
  saveDesktopSettings();
  return { settings: { ...desktopSettings }, error };
});

ipcMain.on('open-external', (_, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

// Google OAuth via system default browser + local loopback callback.
// Google refuses to authenticate inside embedded Electron webviews
// ("disallowed_useragent"), so the flow must open the OS browser and
// receive the token back through a short-lived local HTTP listener.
// This matches the redirect URI registered in Google Cloud Console
// (https://password-manager.fayber.dev/oauth/callback), whose page
// posts the token to http://127.0.0.1:28999/token.
import http from 'node:http';

function decodeJwt(idToken: string) {
  const base64Url = idToken.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

ipcMain.handle('google-oauth', async () => {
  return new Promise((resolve) => {
    const clientId = '103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com';
    const redirectUri = 'https://password-manager.fayber.dev/oauth/callback';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=id_token%20token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;

    let settled = false;
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (req.url && req.url.startsWith('/token')) {
        const url = new URL(req.url, 'http://127.0.0.1:28999');
        const idToken = url.searchParams.get('id_token');
        res.end('ok');
        if (idToken && !settled) {
          settled = true;
          try {
            const jwt = decodeJwt(idToken);
            resolve({
              googleId: jwt.sub,
              email: jwt.email,
              name: jwt.name,
              picture: jwt.picture,
              idToken,
            });
          } catch (e) {
            console.error('[Google OAuth] Error parsing token:', e);
            resolve(null);
          }
          server.close();
        }
      } else {
        res.end('');
      }
    });

    server.listen(28999, '127.0.0.1', () => {
      shell.openExternal(authUrl);
    });

    // Give up after 5 minutes so the promise never hangs forever.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        try { server.close(); } catch {}
        resolve(null);
      }
    }, 5 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// Direct Chrome password-store import (Windows).
//
// Reads Chrome's own encrypted credential store instead of asking the user to
// export a CSV first. The store is:
//   %LOCALAPPDATA%\Google\Chrome\User Data\<Profile>\Login Data   (SQLite)
// whose password_value blobs are AES-256-GCM encrypted ("v10"/"v11" prefix)
// with a per-user key kept, DPAPI-wrapped, in ...\User Data\Local State
// (os_crypt.encrypted_key, base64, "DPAPI" 5-byte prefix). We DPAPI-unwrap the
// key via PowerShell's ProtectedData (no native module needed), open a copy of
// the SQLite file with sql.js (pure-wasm), and decrypt each blob with node's
// crypto. Newer "v20" app-bound blobs can't be decrypted outside Chrome itself,
// so those are counted and reported rather than failing the whole import.
// Everything stays on-device; nothing here is persisted or sent anywhere.
// ---------------------------------------------------------------------------

interface BrowserCredential {
  url: string;
  username: string;
  password: string;
}

interface ChromeImportResult {
  ok: boolean;
  error?: string;
  credentials?: BrowserCredential[];
  /** Blobs we couldn't decrypt (e.g. Chrome's newer app-bound "v20" encryption). */
  undecryptable?: number;
  profiles?: number;
}

/** Chrome must be closed - it holds a lock on Login Data, and copying a live DB risks a torn read. */
function isChromeRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq chrome.exe', '/NH'], (err, stdout) => {
      if (err) return resolve(false);
      resolve(/chrome\.exe/i.test(stdout));
    });
  });
}

/** DPAPI-unwrap the base64 os_crypt key via PowerShell (avoids a native DPAPI module). Returns the
 *  raw 32-byte AES key. The encrypted blob is passed through an env var to sidestep shell quoting. */
function dpapiUnprotect(b64: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const script =
      'Add-Type -AssemblyName System.Security; ' +
      '$b=[Convert]::FromBase64String($env:NP_ENC_KEY); ' +
      "$k=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,'CurrentUser'); " +
      '[Convert]::ToBase64String($k)';
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { env: { ...process.env, NP_ENC_KEY: b64 }, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        try {
          resolve(Buffer.from(stdout.trim(), 'base64'));
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

/** Decrypt one Chrome password blob. Returns null for anything we can't handle (v20 app-bound,
 *  legacy DPAPI-only blobs, or a GCM auth failure) so the caller can count it as undecryptable. */
function decryptChromePassword(blob: Buffer, key: Buffer): string | null {
  if (blob.length < 3 + 12 + 16) return null;
  const prefix = blob.subarray(0, 3).toString('latin1');
  if (prefix !== 'v10' && prefix !== 'v11') return null; // v20 = app-bound, undecryptable here
  const nonce = blob.subarray(3, 15);
  const tag = blob.subarray(blob.length - 16);
  const ciphertext = blob.subarray(15, blob.length - 16);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
  } catch {
    return null;
  }
}

ipcMain.handle('chrome-import', async (): Promise<ChromeImportResult> => {
  try {
    if (process.platform !== 'win32') {
      return { ok: false, error: 'Direct browser import is only available on Windows.' };
    }
    if (await isChromeRunning()) {
      return { ok: false, error: 'Please fully close Google Chrome, then try again.' };
    }

    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const userDataDir = path.join(localAppData, 'Google', 'Chrome', 'User Data');
    if (!fs.existsSync(userDataDir)) {
      return { ok: false, error: 'No Google Chrome installation was found for this user.' };
    }

    // Unwrap the AES key from Local State.
    const localStatePath = path.join(userDataDir, 'Local State');
    let key: Buffer;
    try {
      const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf-8'));
      const encKeyB64: string | undefined = localState?.os_crypt?.encrypted_key;
      if (!encKeyB64) return { ok: false, error: "Couldn't read Chrome's encryption key." };
      const encKey = Buffer.from(encKeyB64, 'base64');
      // Strip the 5-byte "DPAPI" prefix before unwrapping.
      const dpapiBlob = encKey.subarray(5);
      key = await dpapiUnprotect(dpapiBlob.toString('base64'));
    } catch {
      return { ok: false, error: "Couldn't decrypt Chrome's encryption key (Windows DPAPI)." };
    }

    // sql.js loads its wasm from beside the bundled main.js (see vite.config copySqlWasm).
    const SQL = await initSqlJs({ locateFile: () => path.join(__dirname, 'sql-wasm.wasm') });

    // Enumerate profiles: "Default" plus any "Profile N".
    const profiles = fs
      .readdirSync(userDataDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && (d.name === 'Default' || /^Profile \d+$/.test(d.name)))
      .map((d) => d.name);

    const credentials: BrowserCredential[] = [];
    let undecryptable = 0;
    let profilesWithData = 0;

    for (const profile of profiles) {
      const loginDataPath = path.join(userDataDir, profile, 'Login Data');
      if (!fs.existsSync(loginDataPath)) continue;
      // Copy to temp so we never touch (or lock) Chrome's live file.
      const tmpCopy = path.join(os.tmpdir(), `nextpass-logindata-${Date.now()}-${profile.replace(/\W/g, '')}`);
      try {
        fs.copyFileSync(loginDataPath, tmpCopy);
        const db = new SQL.Database(fs.readFileSync(tmpCopy));
        try {
          const res = db.exec('SELECT origin_url, username_value, password_value FROM logins');
          if (res.length > 0) {
            profilesWithData++;
            for (const row of res[0]!.values) {
              const url = String(row[0] ?? '');
              const username = String(row[1] ?? '');
              const blob = row[2];
              if (!(blob instanceof Uint8Array) || blob.length === 0) {
                if (url || username) undecryptable++;
                continue;
              }
              const password = decryptChromePassword(Buffer.from(blob), key);
              if (password === null) {
                undecryptable++;
                continue;
              }
              credentials.push({ url, username, password });
            }
          }
        } finally {
          db.close();
        }
      } catch {
        // A single unreadable profile shouldn't abort the whole import.
      } finally {
        try { fs.unlinkSync(tmpCopy); } catch {}
      }
    }

    return { ok: true, credentials, undecryptable, profiles: profilesWithData };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Chrome import failed.' };
  }
});

// ---------------------------------------------------------------------------
// Windows Hello quick unlock.
//
// Two layers combine into "sign in with your Windows PIN/fingerprint/face":
//  1. UserConsentVerifier (WinRT) shows the real Windows Hello prompt and reports whether the
//     person at the keyboard passed PIN/biometric verification. Reached via PowerShell's WinRT
//     projection - Electron has no binding for it and the deployed app can't use native modules
//     (WinPC runs a bare electron.exe with a fully-bundled main.js, no node_modules).
//  2. safeStorage (DPAPI) encrypts the vault key at rest in userData/hello-unlock.bin, bound to
//     the signed-in Windows account. The base64 vault key is plain ASCII, so - unlike the Chrome
//     import's raw AES key above - decryptString's string round-trip is lossless here.
//
// The main process only releases the decrypted key to the renderer after a live "Verified" from
// the Hello prompt. Threat model matches the Google device-unlock (convenience unlock, not a
// hardware boundary): malware running as this Windows user could call DPAPI itself. The blob is
// deleted on log-out and master-password change (see SessionManager in the shared code).
// ---------------------------------------------------------------------------

function helloBlobFile(): string {
  return path.join(app.getPath('userData'), 'hello-unlock.bin');
}

/** WinRT async plumbing shared by both Hello scripts. The `IAsyncOperation\`1` backtick is
 *  PowerShell generic-arity syntax, escaped for this TS template literal. */
const HELLO_PS_PRELUDE = `
[void][Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
function Await-WinRT($op, [Type]$resultType) {
  $m = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'GetAwaiter' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
  $awaiter = $m.MakeGenericMethod($resultType).Invoke($null, @($op))
  while (-not $awaiter.IsCompleted) { Start-Sleep -Milliseconds 50 }
  $awaiter.GetResult()
}
`;

/** Write a temp .ps1 and run it (dodges every -Command quoting pitfall); returns trimmed stdout.
 *  Dynamic values only ever travel via environment variables, never string-spliced into scripts. */
function runHelloScript(body: string, env: NodeJS.ProcessEnv, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `nextpass-hello-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
    fs.writeFileSync(tmp, HELLO_PS_PRELUDE + body, 'utf-8');
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmp],
      { env: { ...process.env, ...env }, timeout: timeoutMs, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        try { fs.unlinkSync(tmp); } catch {}
        if (err) return reject(err);
        resolve(stdout.trim());
      },
    );
  });
}

let helloAvailableCache: boolean | null = null;

async function isHelloAvailable(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  if (helloAvailableCache !== null) return helloAvailableCache;
  try {
    const out = await runHelloScript(
      `$r = Await-WinRT ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
Write-Output ("result=" + $r)`,
      {},
      20_000,
    );
    helloAvailableCache = /result=Available/.test(out);
  } catch {
    helloAvailableCache = false;
  }
  return helloAvailableCache;
}

/** Show the Windows Hello prompt; resolves to the verdict string ("Verified", "Canceled", …). */
async function requestHelloVerification(message: string): Promise<string> {
  const out = await runHelloScript(
    `$r = Await-WinRT ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync($env:NP_HELLO_MSG)) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])
Write-Output ("result=" + $r)`,
    { NP_HELLO_MSG: message },
    120_000, // generous - the user is interacting with the Hello dialog
  );
  const m = /result=(\w+)/.exec(out);
  return m?.[1] ?? 'Unknown';
}

function helloVerdictError(verdict: string): string {
  switch (verdict) {
    case 'Canceled':
      return 'Windows Hello was cancelled.';
    case 'RetriesExhausted':
      return 'Too many failed Windows Hello attempts. Please use your master password.';
    case 'DeviceNotPresent':
    case 'NotConfiguredForUser':
      return 'Windows Hello is not set up on this PC (Settings > Accounts > Sign-in options).';
    case 'DisabledByPolicy':
      return 'Windows Hello is disabled by system policy.';
    case 'DeviceBusy':
      return 'Windows Hello is busy - try again in a moment.';
    default:
      return 'Windows Hello verification failed.';
  }
}

ipcMain.handle('hello-status', async () => {
  if (process.platform !== 'win32') return { available: false, enabled: false };
  return { available: await isHelloAvailable(), enabled: fs.existsSync(helloBlobFile()) };
});

ipcMain.handle('hello-enable', async (_e, vaultKeyB64: string) => {
  try {
    if (process.platform !== 'win32') return { ok: false, error: 'Windows Hello requires Windows.' };
    if (typeof vaultKeyB64 !== 'string' || !vaultKeyB64) return { ok: false, error: 'No vault key provided.' };
    if (!(await isHelloAvailable())) {
      return { ok: false, error: 'Windows Hello is not set up on this PC (Settings > Accounts > Sign-in options).' };
    }
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: 'Windows credential encryption (DPAPI) is unavailable.' };
    }
    // Verify FIRST - the person enabling this must be able to pass Hello right now.
    const verdict = await requestHelloVerification('Confirm your identity to enable Windows Hello unlock for NextPass');
    if (verdict !== 'Verified') return { ok: false, error: helloVerdictError(verdict) };
    fs.writeFileSync(helloBlobFile(), safeStorage.encryptString(vaultKeyB64), { mode: 0o600 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not enable Windows Hello unlock.' };
  }
});

ipcMain.handle('hello-unlock', async () => {
  try {
    const file = helloBlobFile();
    if (!fs.existsSync(file)) {
      return { ok: false, error: 'Windows Hello unlock is not set up on this device.' };
    }
    const verdict = await requestHelloVerification('Unlock your NextPass vault');
    if (verdict !== 'Verified') return { ok: false, error: helloVerdictError(verdict) };
    const vaultKey = safeStorage.decryptString(fs.readFileSync(file));
    return { ok: true, vaultKey };
  } catch {
    // Corrupt blob / DPAPI failure (e.g. Windows account changed): drop it so the UI stops
    // offering an unlock path that can never succeed.
    try { fs.unlinkSync(helloBlobFile()); } catch {}
    return { ok: false, error: 'Could not read the stored key. Unlock with your master password and re-enable Windows Hello.' };
  }
});

ipcMain.handle('hello-disable', async () => {
  try { fs.unlinkSync(helloBlobFile()); } catch {}
  return { ok: true };
});
