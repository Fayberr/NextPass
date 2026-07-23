const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  googleOAuth: () => ipcRenderer.invoke('google-oauth'),
  onQuickSearchToggle: (callback: () => void) => {
    ipcRenderer.on('toggle-quick-search', () => callback());
  },
});
