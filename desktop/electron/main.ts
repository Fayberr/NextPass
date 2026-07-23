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

// System Default Browser 1-Click Google OAuth Handler
ipcMain.handle('google-oauth', async () => {
  return new Promise((resolve) => {
    let server: http.Server | null = null;
    let resolved = false;

    const cleanup = () => {
      if (server) {
        try { server.close(); } catch {}
        server = null;
      }
    };

    server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url?.startsWith('/token')) {
        const urlObj = new URL(req.url, 'http://127.0.0.1:28999');
        const idToken = urlObj.searchParams.get('id_token');
        if (idToken) {
          try {
            const base64Url = idToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join(''),
            );
            const jwt = JSON.parse(jsonPayload);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            resolved = true;
            cleanup();
            resolve({
              googleId: jwt.sub,
              email: jwt.email,
              name: jwt.name,
              picture: jwt.picture,
              idToken,
            });
          } catch (e) {
            res.writeHead(400);
            res.end();
          }
        }
      }
    });

    server.listen(28999, '127.0.0.1', () => {
      const clientId = '103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com';
      const redirectUri = 'https://hfkiimdacpchmfglajeeghjagdecajbk.chromiumapp.org/';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=id_token%20token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;

      // Launch in system default browser (Chrome/Edge/Brave) where user is signed into Google
      shell.openExternal(authUrl);
    });

    setTimeout(() => {
      if (!resolved) {
        cleanup();
        resolve(null);
      }
    }, 120000);
  });
});
