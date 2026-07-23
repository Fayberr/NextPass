import { app as c, globalShortcut as g, BrowserWindow as _, ipcMain as a, shell as w } from "electron";
import n from "node:path";
import { fileURLToPath as E } from "node:url";
import k from "node:http";
const b = n.dirname(E(import.meta.url));
process.env.APP_ROOT = n.join(b, "..");
const m = process.env.VITE_DEV_SERVER_URL, O = n.join(process.env.APP_ROOT, "dist-electron"), R = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? n.join(process.env.APP_ROOT, "public") : R;
let e = null;
function f() {
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
      preload: n.join(b, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (o, t, r, i, s) => {
    console.log(`[Renderer Console ${t}] ${r} (${s}:${i})`);
  }), e.webContents.on("did-fail-load", (o, t, r) => {
    console.error(`[Load Error ${t}] ${r}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), m ? e.loadURL(m) : e.loadFile(n.join(R, "index.html"));
}
c.whenReady().then(() => {
  f();
  try {
    g.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (o) {
    console.error("Failed to register global hotkey:", o);
  }
  c.on("activate", () => {
    _.getAllWindows().length === 0 && f();
  });
});
c.on("will-quit", () => {
  g.unregisterAll();
});
c.on("window-all-closed", () => {
  process.platform !== "darwin" && c.quit();
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
a.on("open-external", (o, t) => {
  t && (t.startsWith("http://") || t.startsWith("https://")) && w.openExternal(t);
});
function I(o) {
  const r = o.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), i = Buffer.from(r, "base64").toString("utf-8");
  return JSON.parse(i);
}
a.handle("google-oauth", async () => new Promise((o) => {
  const i = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://password-manager.fayber.dev/oauth/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
  let s = !1;
  const p = k.createServer((d, h) => {
    if (h.setHeader("Access-Control-Allow-Origin", "*"), d.url && d.url.startsWith("/token")) {
      const u = new URL(d.url, "http://127.0.0.1:28999").searchParams.get("id_token");
      if (h.end("ok"), u && !s) {
        s = !0;
        try {
          const l = I(u);
          o({
            googleId: l.sub,
            email: l.email,
            name: l.name,
            picture: l.picture,
            idToken: u
          });
        } catch (l) {
          console.error("[Google OAuth] Error parsing token:", l), o(null);
        }
        p.close();
      }
    } else
      h.end("");
  });
  p.listen(28999, "127.0.0.1", () => {
    w.openExternal(i);
  }), setTimeout(() => {
    if (!s) {
      s = !0;
      try {
        p.close();
      } catch {
      }
      o(null);
    }
  }, 5 * 60 * 1e3);
}));
export {
  O as MAIN_DIST,
  R as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
