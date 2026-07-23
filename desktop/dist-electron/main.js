import { app as i, globalShortcut as f, BrowserWindow as g, ipcMain as a, shell as w } from "electron";
import r from "node:path";
import { fileURLToPath as C } from "node:url";
import E from "node:http";
const _ = r.dirname(C(import.meta.url));
process.env.APP_ROOT = r.join(_, "..");
const m = process.env.VITE_DEV_SERVER_URL, U = r.join(process.env.APP_ROOT, "dist-electron"), b = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? r.join(process.env.APP_ROOT, "public") : b;
let e = null;
function u() {
  e = new g({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: r.join(_, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (n, o, s, c, l) => {
    console.log(`[Renderer Console ${o}] ${s} (${l}:${c})`);
  }), e.webContents.on("did-fail-load", (n, o, s) => {
    console.error(`[Load Error ${o}] ${s}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), m ? e.loadURL(m) : e.loadFile(r.join(b, "index.html"));
}
i.whenReady().then(() => {
  u();
  try {
    f.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (n) {
    console.error("Failed to register global hotkey:", n);
  }
  i.on("activate", () => {
    g.getAllWindows().length === 0 && u();
  });
});
i.on("will-quit", () => {
  f.unregisterAll();
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
a.on("open-external", (n, o) => {
  o && (o.startsWith("http://") || o.startsWith("https://")) && w.openExternal(o);
});
a.handle("google-oauth", async () => new Promise((n) => {
  let o = null, s = !1;
  const c = () => {
    if (o) {
      try {
        o.close();
      } catch {
      }
      o = null;
    }
  };
  o = E.createServer((l, t) => {
    var d;
    if (t.setHeader("Access-Control-Allow-Origin", "*"), t.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS"), t.setHeader("Access-Control-Allow-Headers", "*"), l.method === "OPTIONS") {
      t.writeHead(204), t.end();
      return;
    }
    if ((d = l.url) != null && d.startsWith("/token")) {
      const h = new URL(l.url, "http://127.0.0.1:28999").searchParams.get("id_token");
      if (h)
        try {
          const O = h.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), T = decodeURIComponent(
            atob(O).split("").map((A) => "%" + ("00" + A.charCodeAt(0).toString(16)).slice(-2)).join("")
          ), p = JSON.parse(T);
          t.writeHead(200, { "Content-Type": "application/json" }), t.end(JSON.stringify({ ok: !0 })), s = !0, c(), n({
            googleId: p.sub,
            email: p.email,
            name: p.name,
            picture: p.picture,
            idToken: h
          });
        } catch {
          t.writeHead(400), t.end();
        }
    }
  }), o.listen(28999, "127.0.0.1", () => {
    const d = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://password-manager.fayber.dev/oauth/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
    w.openExternal(d);
  }), setTimeout(() => {
    s || (c(), n(null));
  }, 12e4);
}));
export {
  U as MAIN_DIST,
  b as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
