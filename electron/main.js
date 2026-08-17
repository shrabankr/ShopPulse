'use strict';

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');

// ── Keep reference to window (prevent garbage collection) ──
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ShopPulse',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Don't show until ready (prevents white flash)
    backgroundColor: '#0f172a',
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Show window once fully loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in browser, allow internal print/preview windows in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 960,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      }
    };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App Menu ──
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Invoice',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#billing-sales';Billing&&Billing.openNew&&Billing.openNew('sales');")
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#settings';")
        },
        { type: 'separator' },
        {
          label: 'Reset Demo Data',
          click: () => {
            const choice = dialog.showMessageBoxSync(mainWindow, {
              type: 'warning',
              buttons: ['Cancel', 'Reset'],
              defaultId: 0,
              title: 'Reset Data',
              message: 'Reset all data to demo?',
              detail: 'This will delete all your invoices, products, and contacts. This cannot be undone.',
            });
            if (choice === 1) {
              mainWindow?.webContents.executeJavaScript("localStorage.clear(); location.reload();");
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Dashboard',        accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#dashboard'") },
        { label: 'Sales Invoices',   accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#billing-sales'") },
        { label: 'Purchase Bills',   accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#billing-purchases'") },
        { type: 'separator' },
        { label: 'Inventory',        accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#inventory'") },
        { label: 'Customers',        accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#customers'") },
        { label: 'Suppliers',        accelerator: 'CmdOrCtrl+6', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#suppliers'") },
        { type: 'separator' },
        { label: 'Reports',          accelerator: 'CmdOrCtrl+7', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#reports'") },
        { label: 'GST Returns',      accelerator: 'CmdOrCtrl+8', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#gst'") },
        { label: 'AI Assistant',     accelerator: 'CmdOrCtrl+9', click: () => mainWindow?.webContents.executeJavaScript("window.location.hash='#ai'") },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { type: 'separator' },
        { role: 'zoomIn',  label: 'Zoom In',  accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', label: 'Zoom Out', accelerator: 'CmdOrCtrl+-' },
        { role: 'resetZoom', label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen', accelerator: 'F11' },
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ShopPulse',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About ShopPulse',
              message: 'ShopPulse v1.0.0',
              detail: 'GST-compliant billing, inventory & CRM\nfor Indian IT/CCTV businesses.\n\nAll data stored locally on your computer.',
              buttons: ['OK'],
            });
          }
        },
        {
          label: 'Open Data Folder',
          click: () => shell.openPath(app.getPath('userData'))
        },
        { type: 'separator' },
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/shrabankr/ShopPulse')
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Lifecycle ──
app.whenReady().then(() => {
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Security: block new window creation ──
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
});
