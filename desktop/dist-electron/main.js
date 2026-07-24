import { app as i, BrowserWindow as _, globalShortcut as S, ipcMain as a, shell as E } from "electron";
import b from "node:fs";
import c from "node:path";
import { fileURLToPath as v } from "node:url";
import A from "node:http";
const w = c.dirname(v(import.meta.url));
process.env.APP_ROOT = c.join(w, "..");
const p = process.env.VITE_DEV_SERVER_URL, $ = c.join(process.env.APP_ROOT, "dist-electron"), O = c.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = p ? c.join(process.env.APP_ROOT, "public") : O;
let e = null;
const d = "CommandOrControl+Alt+A", R = {
  launchOnStartup: !1,
  startMinimized: !1,
  quickSearchHotkey: d
};
let n = { ...R };
function T() {
  return c.join(i.getPath("userData"), "desktop-settings.json");
}
function H() {
  try {
    const t = JSON.parse(b.readFileSync(T(), "utf-8"));
    n = { ...R, ...t };
  } catch {
  }
}
function P() {
  try {
    b.writeFileSync(T(), JSON.stringify(n, null, 2));
  } catch (t) {
    console.error("Failed to persist desktop settings:", t);
  }
}
const I = process.argv.includes("--start-minimized");
function h(t) {
  try {
    return S.register(t, () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    }) ? null : `Could not register "${t}" - it may already be in use by another app.`;
  } catch {
    return `"${t}" is not a valid hotkey.`;
  }
}
function q() {
  const t = [i.getAppPath()];
  n.startMinimized && t.push("--start-minimized"), i.setLoginItemSettings({
    openAtLogin: n.launchOnStartup,
    path: process.execPath,
    args: t
  });
}
function y() {
  e = new _({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: c.join(w, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (t, o, r, s, l) => {
    console.log(`[Renderer Console ${o}] ${r} (${l}:${s})`);
  }), e.webContents.on("did-fail-load", (t, o, r) => {
    console.error(`[Load Error ${o}] ${r}`);
  }), e.once("ready-to-show", () => {
    I ? e == null || e.minimize() : e == null || e.show(), p && (e == null || e.webContents.openDevTools({ mode: "detach" }));
  }), p ? e.loadURL(p) : e.loadFile(c.join(O, "index.html"));
}
i.whenReady().then(() => {
  H(), y();
  const t = h(n.quickSearchHotkey);
  t && (console.error("Quick-search hotkey:", t), n.quickSearchHotkey !== d && (n.quickSearchHotkey = d, P(), h(d))), i.on("activate", () => {
    _.getAllWindows().length === 0 && y();
  });
});
i.on("will-quit", () => {
  S.unregisterAll();
});
i.on("window-all-closed", () => {
  process.platform !== "darwin" && i.quit();
});
a.on("window-minimize", () => {
  e == null || e.minimize();
});
a.on("window-maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
a.on("window-close", () => {
  e == null || e.close();
});
a.handle("desktop-settings-get", () => ({ ...n }));
a.handle("desktop-settings-set", (t, o) => {
  const r = { ...n };
  n = { ...n, ...o };
  let s = null;
  if (o.quickSearchHotkey && o.quickSearchHotkey !== r.quickSearchHotkey) {
    try {
      S.unregister(r.quickSearchHotkey);
    } catch {
    }
    s = h(n.quickSearchHotkey), s && (n.quickSearchHotkey = r.quickSearchHotkey, h(r.quickSearchHotkey));
  }
  return ("launchOnStartup" in o || "startMinimized" in o) && q(), P(), { settings: { ...n }, error: s };
});
a.on("open-external", (t, o) => {
  o && (o.startsWith("http://") || o.startsWith("https://")) && E.openExternal(o);
});
function z(t) {
  const r = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), s = Buffer.from(r, "base64").toString("utf-8");
  return JSON.parse(s);
}
a.handle("google-oauth", async () => new Promise((t) => {
  const s = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://password-manager.fayber.dev/oauth/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
  let l = !1;
  const f = A.createServer((g, m) => {
    if (m.setHeader("Access-Control-Allow-Origin", "*"), g.url && g.url.startsWith("/token")) {
      const k = new URL(g.url, "http://127.0.0.1:28999").searchParams.get("id_token");
      if (m.end("ok"), k && !l) {
        l = !0;
        try {
          const u = z(k);
          t({
            googleId: u.sub,
            email: u.email,
            name: u.name,
            picture: u.picture,
            idToken: k
          });
        } catch (u) {
          console.error("[Google OAuth] Error parsing token:", u), t(null);
        }
        f.close();
      }
    } else
      m.end("");
  });
  f.listen(28999, "127.0.0.1", () => {
    E.openExternal(s);
  }), setTimeout(() => {
    if (!l) {
      l = !0;
      try {
        f.close();
      } catch {
      }
      t(null);
    }
  }, 5 * 60 * 1e3);
}));
export {
  $ as MAIN_DIST,
  O as RENDERER_DIST,
  p as VITE_DEV_SERVER_URL
};
