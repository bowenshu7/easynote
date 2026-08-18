const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('edgeNote', {
  toggleTop: () => ipcRenderer.invoke('window:toggle-top'),
  minimizeBubble: () => ipcRenderer.invoke('window:minimize-bubble'),
  restore: () => ipcRenderer.invoke('window:restore'),
  close: () => ipcRenderer.invoke('window:close'),
  save: (payload) => ipcRenderer.invoke('note:save', payload),
  saveAs: (payload) => ipcRenderer.invoke('note:save-as', payload),
  open: () => ipcRenderer.invoke('note:open'),
  chooseImage: () => ipcRenderer.invoke('image:choose'),
  chooseBackground: () => ipcRenderer.invoke('background:choose'),
  getGlobalSettings: () => ipcRenderer.invoke('settings:get-global'),
  saveGlobalSettings: (settings) => ipcRenderer.invoke('settings:save-global', settings),
  search: (text, forward) => ipcRenderer.invoke('note:search', { text, forward }),
  stopSearch: () => ipcRenderer.invoke('note:stop-search'),
  onSearchResult: (callback) => ipcRenderer.on('note:search-result', (_event, result) => callback(result))
});
