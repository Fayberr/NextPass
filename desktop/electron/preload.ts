const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  googleOAuth: () => ipcRenderer.invoke('google-oauth'),
  desktopSettingsGet: () => ipcRenderer.invoke('desktop-settings-get'),
  desktopSettingsSet: (patch: Record<string, unknown>) => ipcRenderer.invoke('desktop-settings-set', patch),
  chromeImport: () => ipcRenderer.invoke('chrome-import'),
  helloStatus: () => ipcRenderer.invoke('hello-status'),
  helloEnable: (vaultKeyB64: string) => ipcRenderer.invoke('hello-enable', vaultKeyB64),
  helloUnlock: () => ipcRenderer.invoke('hello-unlock'),
  helloDisable: () => ipcRenderer.invoke('hello-disable'),
  onQuickSearchToggle: (callback: () => void) => {
    ipcRenderer.on('toggle-quick-search', () => callback());
  },
});
