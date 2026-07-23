import { app as s, globalShortcut as c, BrowserWindow as d, ipcMain as r, shell as R } from "electron";
import t from "node:path";
import { fileURLToPath as _ } from "node:url";
const h = t.dirname(_(import.meta.url));
process.env.APP_ROOT = t.join(h, "..");
const l = process.env.VITE_DEV_SERVER_URL, b = t.join(process.env.APP_ROOT, "dist-electron"), p = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = l ? t.join(process.env.APP_ROOT, "public") : p;
let e = null;
function a() {
  e = new d({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: t.join(h, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.webContents.on("console-message", (n, o, i, f, m) => {
    console.log(`[Renderer Console ${o}] ${i} (${m}:${f})`);
  }), e.webContents.on("did-fail-load", (n, o, i) => {
    console.error(`[Load Error ${o}] ${i}`);
  }), e.once("ready-to-show", () => {
    e == null || e.show(), e == null || e.webContents.openDevTools({ mode: "detach" });
  }), l ? e.loadURL(l) : e.loadFile(t.join(p, "index.html"));
}
s.whenReady().then(() => {
  a();
  try {
    c.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (n) {
    console.error("Failed to register global hotkey:", n);
  }
  s.on("activate", () => {
    d.getAllWindows().length === 0 && a();
  });
});
s.on("will-quit", () => {
  c.unregisterAll();
});
s.on("window-all-closed", () => {
  process.platform !== "darwin" && s.quit();
});
r.on("window-minimize", () => {
  e == null || e.minimize();
});
r.on("window-maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
r.on("window-close", () => {
  e == null || e.close();
});
r.on("open-external", (n, o) => {
  o && (o.startsWith("http://") || o.startsWith("https://")) && R.openExternal(o);
});
export {
  b as MAIN_DIST,
  p as RENDERER_DIST,
  l as VITE_DEV_SERVER_URL
};
