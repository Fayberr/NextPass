import { app as l, globalShortcut as w, BrowserWindow as u, ipcMain as a, shell as U } from "electron";
import s from "node:path";
import { fileURLToPath as k } from "node:url";
const b = s.dirname(k(import.meta.url));
process.env.APP_ROOT = s.join(b, "..");
const m = process.env.VITE_DEV_SERVER_URL, A = s.join(process.env.APP_ROOT, "dist-electron"), R = s.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? s.join(process.env.APP_ROOT, "public") : R;
let e = null;
function _() {
  e = new u({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: s.join(b, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (n, o, c, h, d) => {
    console.log(`[Renderer Console ${o}] ${c} (${d}:${h})`);
  }), e.webContents.on("did-fail-load", (n, o, c) => {
    console.error(`[Load Error ${o}] ${c}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), m ? e.loadURL(m) : e.loadFile(s.join(R, "index.html"));
}
l.whenReady().then(() => {
  _();
  try {
    w.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (n) {
    console.error("Failed to register global hotkey:", n);
  }
  l.on("activate", () => {
    u.getAllWindows().length === 0 && _();
  });
});
l.on("will-quit", () => {
  w.unregisterAll();
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
  const h = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://hfkiimdacpchmfglajeeghjagdecajbk.chromiumapp.org/")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
  let d = !1;
  const i = new u({
    width: 520,
    height: 640,
    show: !0,
    autoHideMenuBar: !0,
    title: "Sign in with Google — NextPass",
    webPreferences: {
      partition: "persist:google_session",
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), f = (r) => {
    if (r.includes("id_token=") || r.includes("access_token="))
      try {
        const t = r.indexOf("#"), I = t !== -1 ? r.substring(t + 1) : "", g = new URLSearchParams(I).get("id_token");
        if (g) {
          const P = g.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), x = decodeURIComponent(
            atob(P).split("").map((E) => "%" + ("00" + E.charCodeAt(0).toString(16)).slice(-2)).join("")
          ), p = JSON.parse(x);
          d = !0;
          try {
            i.close();
          } catch {
          }
          n({
            googleId: p.sub,
            email: p.email,
            name: p.name,
            picture: p.picture,
            idToken: g
          });
        }
      } catch (t) {
        console.error("[Google OAuth] Error parsing token:", t);
      }
  };
  i.webContents.on("will-navigate", (r, t) => f(t)), i.webContents.on("will-redirect", (r, t) => f(t)), i.on("closed", () => {
    d || n(null);
  }), i.loadURL(h);
}));
export {
  A as MAIN_DIST,
  R as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
