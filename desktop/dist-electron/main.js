import { app as t, globalShortcut as a, BrowserWindow as c, ipcMain as s, shell as d } from "electron";
import o from "node:path";
import { fileURLToPath as m } from "node:url";
const h = o.dirname(m(import.meta.url));
process.env.APP_ROOT = o.join(h, "..");
const r = process.env.VITE_DEV_SERVER_URL, g = o.join(process.env.APP_ROOT, "dist-electron"), p = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = r ? o.join(process.env.APP_ROOT, "public") : p;
let e = null;
function l() {
  e = new c({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: o.join(h, "preload.mjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), e.once("ready-to-show", () => {
    e == null || e.show();
  }), r ? e.loadURL(r) : e.loadFile(o.join(p, "index.html"));
}
t.whenReady().then(() => {
  l();
  try {
    a.register("CommandOrControl+Alt+A", () => {
      e && (e.isMinimized() && e.restore(), e.focus(), e.webContents.send("toggle-quick-search"));
    });
  } catch (n) {
    console.error("Failed to register global hotkey:", n);
  }
  t.on("activate", () => {
    c.getAllWindows().length === 0 && l();
  });
});
t.on("will-quit", () => {
  a.unregisterAll();
});
t.on("window-all-closed", () => {
  process.platform !== "darwin" && t.quit();
});
s.on("window-minimize", () => {
  e == null || e.minimize();
});
s.on("window-maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
s.on("window-close", () => {
  e == null || e.close();
});
s.on("open-external", (n, i) => {
  i && (i.startsWith("http://") || i.startsWith("https://")) && d.openExternal(i);
});
export {
  g as MAIN_DIST,
  p as RENDERER_DIST,
  r as VITE_DEV_SERVER_URL
};
