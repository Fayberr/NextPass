# Desktop app deployment (Windows PC)

Target: `C:/Users/derfa/pm-desktop` on the WinPC (`derfa@192.168.178.3`).

The deployed app is just the built renderer (`dist/`) + Electron main/preload
(`dist-electron/`) + the minimal runtime `package.json` from this folder, run by a
locally installed Electron (`node_modules/electron`, installed once, `--no-save`).
No installer/electron-builder involved.

## Redeploy (after `npm run build:desktop` at the repo root)

```bash
cd desktop
tar -czf - dist dist-electron -C deploy package.json \
  | ssh derfa@192.168.178.3 'tar -xzf - -C C:/Users/derfa/pm-desktop'
```

## One-time setup (already done 2026-07-24)

```bash
ssh derfa@192.168.178.3 'mkdir C:\Users\derfa\pm-desktop'
# ...first tar-deploy as above, then:
ssh derfa@192.168.178.3 'cd /d C:\Users\derfa\pm-desktop && set OPENSSL_CONF= && npm install --no-save electron@33'
scp deploy/start-nextpass.cmd derfa@192.168.178.3:'C:/Users/derfa/pm-desktop/'
```

## Run

`C:/Users/derfa/pm-desktop/start-nextpass.cmd` (or run
`node_modules\electron\dist\electron.exe .` from the folder). The start script calls
`electron.exe` directly, NOT via the `electron.cmd`/npx node wrapper - the WinPC has a
broken global `OPENSSL_CONF` (points at a missing scoop openssl.cnf) that kills every
node launch unless cleared first.

## Gotchas

- `"type": "module"` + `"main": "dist-electron/main.js"` in the runtime package.json are
  required (the built main.js is ESM).
- Verify a redeploy actually landed with a fresh file mtime, e.g.:
  `ssh derfa@192.168.178.3 'dir C:\Users\derfa\pm-desktop\dist-electron'`.
