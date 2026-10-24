// Exposes a tiny, explicit API to the web app. No Node.js access leaks into the page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: 'electron',
  openExternal: (url) => ipcRenderer.send('open-external', String(url)),
  setTitleBarTheme: (theme) => ipcRenderer.send('title-bar-theme', theme),
});
