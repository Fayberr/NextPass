import { app as i, globalShortcut as g, BrowserWindow as f, ipcMain as c, shell as w } from "electron";
import r from "node:path";
import { fileURLToPath as A } from "node:url";
import C from "node:http";
const _ = r.dirname(A(import.meta.url));
process.env.APP_ROOT = r.join(_, "..");
const m = process.env.VITE_DEV_SERVER_URL, U = r.join(process.env.APP_ROOT, "dist-electron"), b = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? r.join(process.env.APP_ROOT, "public") : b;
let e = null;
function u() {
  e = new f({
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
  }), e.webContents.on("console-message", (n, o, s, a, l) => {
    console.log(`[Renderer Console ${o}] ${s} (${l}:${a})`);
  }), e.webContents.on("did-fail-load", (n, o, s) => {
    console.error(`[Load Error ${o}] ${s}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), m ? e.loadURL(m) : e.loadFile(r.join(b, "index.html"));
}
i.whenReady().then(() => {
  u();
  try {
    g.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (n) {
    console.error("Failed to register global hotkey:", n);
  }
  i.on("activate", () => {
    f.getAllWindows().length === 0 && u();
  });
});
i.on("will-quit", () => {
  g.unregisterAll();
});
i.on("window-all-closed", () => {
  process.platform !== "darwin" && i.quit();
});
c.on("window-minimize", () => {
  e == null || e.minimize();
});
c.on("window-maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
c.on("window-close", () => {
  e == null || e.close();
});
c.on("open-external", (n, o) => {
  o && (o.startsWith("http://") || o.startsWith("https://")) && w.openExternal(o);
});
c.handle("google-oauth", async () => new Promise((n) => {
  let o = null, s = !1;
  const a = () => {
    if (o) {
      try {
        o.close();
      } catch {
      }
      o = null;
    }
  };
  o = C.createServer((l, t) => {
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
            atob(O).split("").map((j) => "%" + ("00" + j.charCodeAt(0).toString(16)).slice(-2)).join("")
          ), p = JSON.parse(T);
          t.writeHead(200, { "Content-Type": "application/json" }), t.end(JSON.stringify({ ok: !0 })), s = !0, a(), n({
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
    const d = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://hfkiimdacpchmfglajeeghjagdecajbk.chromiumapp.org/")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
    w.openExternal(d);
  }), setTimeout(() => {
    s || (a(), n(null));
  }, 12e4);
}));
export {
  U as MAIN_DIST,
  b as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
