const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('codeMeshDesktop', Object.freeze({
  platform: process.platform,
  isDesktop: true
}));
