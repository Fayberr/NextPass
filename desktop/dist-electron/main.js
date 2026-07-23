import { app as l, globalShortcut as _, BrowserWindow as u, ipcMain as a, shell as b } from "electron";
import s from "node:path";
import { fileURLToPath as k } from "node:url";
const R = s.dirname(k(import.meta.url));
process.env.APP_ROOT = s.join(R, "..");
const m = process.env.VITE_DEV_SERVER_URL, A = s.join(process.env.APP_ROOT, "dist-electron"), I = s.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? s.join(process.env.APP_ROOT, "public") : I;
let e = null;
function w() {
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
      preload: s.join(R, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (n, o, c, d, p) => {
    console.log(`[Renderer Console ${o}] ${c} (${p}:${d})`);
  }), e.webContents.on("did-fail-load", (n, o, c) => {
    console.error(`[Load Error ${o}] ${c}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), m ? e.loadURL(m) : e.loadFile(s.join(I, "index.html"));
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
    u.getAllWindows().length === 0 && w();
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
  o && (o.startsWith("http://") || o.startsWith("https://")) && b.openExternal(o);
});
a.handle("google-oauth", async () => new Promise((n) => {
  const d = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://hfkiimdacpchmfglajeeghjagdecajbk.chromiumapp.org/")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
  let p = !1;
  b.openExternal(d);
  const i = new u({
    width: 520,
    height: 640,
    show: !0,
    autoHideMenuBar: !0,
    title: "Sign in with Google — NextPass",
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), f = (r) => {
    if (r.includes("id_token=") || r.includes("access_token="))
      try {
        const t = r.indexOf("#"), x = t !== -1 ? r.substring(t + 1) : "", g = new URLSearchParams(x).get("id_token");
        if (g) {
          const E = g.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), P = decodeURIComponent(
            atob(E).split("").map((U) => "%" + ("00" + U.charCodeAt(0).toString(16)).slice(-2)).join("")
          ), h = JSON.parse(P);
          p = !0;
          try {
            i.close();
          } catch {
          }
          n({
            googleId: h.sub,
            email: h.email,
            name: h.name,
            picture: h.picture,
            idToken: g
          });
        }
      } catch (t) {
        console.error("[Google OAuth] Error parsing token:", t);
      }
  };
  i.webContents.on("will-navigate", (r, t) => f(t)), i.webContents.on("will-redirect", (r, t) => f(t)), i.on("closed", () => {
    p || n(null);
  }), i.loadURL(d);
}));
export {
  A as MAIN_DIST,
  I as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
