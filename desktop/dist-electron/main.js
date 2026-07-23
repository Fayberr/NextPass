import { app as l, globalShortcut as u, BrowserWindow as b, ipcMain as a, shell as x } from "electron";
import s from "node:path";
import { fileURLToPath as v } from "node:url";
import E from "node:http";
const w = s.dirname(v(import.meta.url));
process.env.APP_ROOT = s.join(w, "..");
const m = process.env.VITE_DEV_SERVER_URL, U = s.join(process.env.APP_ROOT, "dist-electron"), y = s.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? s.join(process.env.APP_ROOT, "public") : y;
let e = null;
function g() {
  e = new b({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: s.join(w, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (o, t, i, c, r) => {
    console.log(`[Renderer Console ${t}] ${i} (${r}:${c})`);
  }), e.webContents.on("did-fail-load", (o, t, i) => {
    console.error(`[Load Error ${t}] ${i}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), m ? e.loadURL(m) : e.loadFile(s.join(y, "index.html"));
}
l.whenReady().then(() => {
  g();
  try {
    u.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (o) {
    console.error("Failed to register global hotkey:", o);
  }
  l.on("activate", () => {
    b.getAllWindows().length === 0 && g();
  });
});
l.on("will-quit", () => {
  u.unregisterAll();
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
a.on("open-external", (o, t) => {
  t && (t.startsWith("http://") || t.startsWith("https://")) && x.openExternal(t);
});
a.handle("google-oauth", async () => new Promise((o) => {
  let t = null, i = !1;
  const c = () => {
    if (t) {
      try {
        t.close();
      } catch {
      }
      t = null;
    }
  };
  t = E.createServer((r, n) => {
    var p, f;
    if ((p = r.url) != null && p.startsWith("/callback"))
      n.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }), n.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>NextPass — Signed In</title>
              <style>
                body { background: #09090b; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; height: 100vh; align-items: center; justify-content: center; margin: 0; }
                .card { background: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; text-align: center; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                h2 { color: #a855f7; margin-top: 0; margin-bottom: 12px; font-size: 24px; font-weight: 700; }
                p { color: #a1a1aa; font-size: 15px; line-height: 1.5; margin-bottom: 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>Signed in to NextPass!</h2>
                <p>Authentication complete. You can close this browser tab and return to NextPass Desktop.</p>
              </div>
              <script>
                if (window.location.hash) {
                  fetch('/token' + window.location.hash.replace('#', '?'));
                }
              <\/script>
            </body>
          </html>
        `);
    else if ((f = r.url) != null && f.startsWith("/token")) {
      const h = new URL(r.url, "http://127.0.0.1:28999").searchParams.get("id_token");
      if (h)
        try {
          const R = h.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), P = decodeURIComponent(
            atob(R).split("").map((k) => "%" + ("00" + k.charCodeAt(0).toString(16)).slice(-2)).join("")
          ), d = JSON.parse(P);
          n.writeHead(200, { "Content-Type": "application/json" }), n.end(JSON.stringify({ ok: !0 })), i = !0, c(), o({
            googleId: d.sub,
            email: d.email,
            name: d.name,
            picture: d.picture,
            idToken: h
          });
        } catch {
          n.writeHead(400), n.end();
        }
    }
  }), t.listen(28999, "127.0.0.1", () => {
    const p = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("http://127.0.0.1:28999/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
    x.openExternal(p);
  }), setTimeout(() => {
    i || (c(), o(null));
  }, 12e4);
}));
export {
  U as MAIN_DIST,
  y as RENDERER_DIST,
  m as VITE_DEV_SERVER_URL
};
