import { app, BrowserWindow, ipcMain, globalShortcut, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
