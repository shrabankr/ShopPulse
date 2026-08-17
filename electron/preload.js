'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  version: '1.1.0',
  platform: process.platform,
  isDesktop: true,
  printHtml: (html) => ipcRenderer.invoke('print-html', html),
  savePdf: (options) => ipcRenderer.invoke('save-pdf', options),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),
  saveBackup: (options) => ipcRenderer.invoke('save-backup', options)
});

