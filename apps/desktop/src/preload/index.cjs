const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('codeMeshDesktop', Object.freeze({
  platform: process.platform,
  isDesktop: true,
  runNativeCode: (input) => ipcRenderer.invoke('codemesh:run-native-code', input)
}));
