import { app as l, globalShortcut as _, BrowserWindow as m, ipcMain as a, shell as U } from "electron";
import r from "node:path";
import { fileURLToPath as C } from "node:url";
const b = r.dirname(C(import.meta.url));
process.env.APP_ROOT = r.join(b, "..");
const g = process.env.VITE_DEV_SERVER_URL, j = r.join(process.env.APP_ROOT, "dist-electron"), R = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = g ? r.join(process.env.APP_ROOT, "public") : R;
let e = null;
function w() {
  e = new m({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: r.join(b, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (n, o, c, p, s) => {
    console.log(`[Renderer Console ${o}] ${c} (${s}:${p})`);
  }), e.webContents.on("did-fail-load", (n, o, c) => {
    console.error(`[Load Error ${o}] ${c}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), g ? e.loadURL(g) : e.loadFile(r.join(R, "index.html"));
}
l.whenReady().then(() => {
  w();
  try {
    _.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (n) {
    console.error("Failed to register global hotkey:", n);
  }
  l.on("activate", () => {
    m.getAllWindows().length === 0 && w();
  });
});
l.on("will-quit", () => {
  _.unregisterAll();
});
l.on("window-all-closed", () => {
  process.platform !== "darwin" && l.quit();
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
a.on("open-external", (n, o) => {
  o && (o.startsWith("http://") || o.startsWith("https://")) && U.openExternal(o);
});
a.handle("google-oauth", async () => new Promise((n) => {
  const p = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://password-manager.fayber.dev/oauth/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`, s = new m({
    width: 500,
    height: 620,
    show: !0,
    autoHideMenuBar: !0,
    title: "Sign in with Google — NextPass",
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0
    }
  });
  let u = !1;
  const f = (i) => {
    if (i.includes("id_token=") || i.includes("access_token="))
      try {
        const t = i.indexOf("#"), I = t !== -1 ? i.substring(t + 1) : "", h = new URLSearchParams(I).get("id_token");
        if (h) {
          const P = h.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), x = decodeURIComponent(
            atob(P).split("").map((E) => "%" + ("00" + E.charCodeAt(0).toString(16)).slice(-2)).join("")
          ), d = JSON.parse(x);
          u = !0, s.close(), n({
            googleId: d.sub,
            email: d.email,
            name: d.name,
            picture: d.picture,
            idToken: h
          });
        }
      } catch (t) {
        console.error("[Google OAuth] Error parsing token:", t);
      }
  };
  s.webContents.on("will-navigate", (i, t) => f(t)), s.webContents.on("will-redirect", (i, t) => f(t)), s.on("closed", () => {
    u || n(null);
  }), s.loadURL(p);
}));
export {
  j as MAIN_DIST,
  R as RENDERER_DIST,
  g as VITE_DEV_SERVER_URL
};
