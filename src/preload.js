const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('edgeNote', {
  toggleTop: () => ipcRenderer.invoke('window:toggle-top'), minimizeBubble: () => ipcRenderer.invoke('window:minimize-bubble'), restore: () => ipcRenderer.invoke('window:restore'),
  confirmClose: language => ipcRenderer.invoke('window:confirm-close', language), forceClose: () => ipcRenderer.invoke('window:force-close'), onCloseRequested: callback => ipcRenderer.on('window:close-requested', callback),
  bubbleMove: point => ipcRenderer.invoke('bubble:move', point), bubbleSnap: () => ipcRenderer.invoke('bubble:snap'),
  save: payload => ipcRenderer.invoke('note:save', payload), saveAs: payload => ipcRenderer.invoke('note:save-as', payload), open: language => ipcRenderer.invoke('note:open', language),
  chooseImage: language => ipcRenderer.invoke('image:choose', language), chooseBackground: language => ipcRenderer.invoke('background:choose', language),
  getGlobalSettings: () => ipcRenderer.invoke('settings:get-global'), saveGlobalSettings: settings => ipcRenderer.invoke('settings:save-global', settings)
});
