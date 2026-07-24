const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  googleOAuth: () => ipcRenderer.invoke('google-oauth'),
  desktopSettingsGet: () => ipcRenderer.invoke('desktop-settings-get'),
  desktopSettingsSet: (patch: Record<string, unknown>) => ipcRenderer.invoke('desktop-settings-set', patch),
  onQuickSearchToggle: (callback: () => void) => {
    ipcRenderer.on('toggle-quick-search', () => callback());
  },
});
