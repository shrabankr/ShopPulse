'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  version: '1.2.0',
  platform: process.platform,
  isDesktop: true,
  printHtml: (html) => ipcRenderer.invoke('print-html', html),
  savePdf: (options) => ipcRenderer.invoke('save-pdf', options),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),
  saveBackup: (options) => ipcRenderer.invoke('save-backup', options),
  getBackupDir: (customDir) => ipcRenderer.invoke('get-backup-dir', customDir),
  autoSaveBackup: (options) => ipcRenderer.invoke('auto-save-backup', options),
  listBackups: (customDir) => ipcRenderer.invoke('list-backups', customDir),
  openBackupFolder: (customDir) => ipcRenderer.invoke('open-backup-folder', customDir),
  readBackupFile: (filePath) => ipcRenderer.invoke('read-backup-file', filePath)
});

