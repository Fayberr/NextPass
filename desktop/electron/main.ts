import { app, BrowserWindow, ipcMain, globalShortcut, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let mainWindow: BrowserWindow | null = null;

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
    mainWindow?.show();
    mainWindow?.webContents.openDevTools({ mode: 'detach' });
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Register Global Hotkey for Quick Search Overlay (e.g., Ctrl+Alt+A)
  try {
    globalShortcut.register('CommandOrControl+Alt+A', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('toggle-quick-search');
      }
    });
  } catch (err) {
    console.error('Failed to register global hotkey:', err);
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

ipcMain.on('open-external', (_, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

// System Browser / Electron OAuth Handler (Standard 1-click Google Auth for Desktop Apps)
ipcMain.handle('google-oauth', async () => {
  return new Promise((resolve) => {
    const clientId = '103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com';
    const redirectUri = 'https://hfkiimdacpchmfglajeeghjagdecajbk.chromiumapp.org/';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=id_token%20token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;

    let resolved = false;

    // Launch in system default browser (Chrome/Edge/Brave) where Google accounts are already logged in
    shell.openExternal(authUrl);

    // Also open a helper auth window as window fallback so login works in all environments
    const authWindow = new BrowserWindow({
      width: 520,
      height: 640,
      show: true,
      autoHideMenuBar: true,
      title: 'Sign in with Google — NextPass',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const handleUrl = (url: string) => {
      if (url.includes('id_token=') || url.includes('access_token=')) {
        try {
          const hashIndex = url.indexOf('#');
          const hash = hashIndex !== -1 ? url.substring(hashIndex + 1) : '';
          const params = new URLSearchParams(hash);
          const idToken = params.get('id_token');
          if (idToken) {
            const base64Url = idToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
            );
            const jwt = JSON.parse(jsonPayload);
            resolved = true;
            try { authWindow.close(); } catch {}
            resolve({
              googleId: jwt.sub,
              email: jwt.email,
              name: jwt.name,
              picture: jwt.picture,
              idToken,
            });
          }
        } catch (e) {
          console.error('[Google OAuth] Error parsing token:', e);
        }
      }
    };

    authWindow.webContents.on('will-navigate', (_, url) => handleUrl(url));
    authWindow.webContents.on('will-redirect', (_, url) => handleUrl(url));

    authWindow.on('closed', () => {
      if (!resolved) resolve(null);
    });

    authWindow.loadURL(authUrl);
  });
});
