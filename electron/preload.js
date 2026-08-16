'use strict';
// Preload runs in renderer context with access to Node APIs
// Currently minimal — expand if you need Node.js features in the app
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  version: '1.0.0',
  platform: process.platform, // 'win32', 'darwin', 'linux'
  isDesktop: true,
});
