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

// ── Native Desktop Print & PDF Export Handlers ──
ipcMain.handle('print-html', async (event, html) => {
  const path = require('path');
  let printWin = new BrowserWindow({
    width: 920,
    height: 950,
    title: 'Print Preview & Dispatch — ShopPulse',
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const toolbarHtml = `
  <div class="print-toolbar" style="position:sticky;top:0;left:0;right:0;z-index:99999;background:#0f172a;color:#fff;padding:10px 18px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,sans-serif;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-weight:800;font-size:.95rem;color:#38bdf8">⚡ ShopPulse Dispatch</span>
      <span style="font-size:.8rem;color:#94a3b8">| Select action:</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(37,99,235,0.4)">
        🖨️ Select Printer &amp; Print
      </button>
      <button id="btn-save-as-pdf" style="background:#059669;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(5,150,105,0.4)">
        📄 Save as PDF
      </button>
      <button onclick="window.close()" style="background:#334155;color:#f8fafc;border:none;padding:7px 14px;border-radius:6px;font-weight:600;font-size:.85rem;cursor:pointer">
        ✕ Close
      </button>
    </div>
  </div>
  <style>
    @media print {
      .print-toolbar { display: none !important; }
      body { margin-top: 0 !important; }
    }
  </style>
  <script>
    document.getElementById('btn-save-as-pdf')?.addEventListener('click', async () => {
      if (window.desktopApp && window.desktopApp.savePdf) {
        await window.desktopApp.savePdf({ html: document.documentElement.outerHTML, title: document.title || 'Invoice' });
      } else {
        window.print();
      }
    });
  </script>
  `;

  let processedHtml = html;
  if (processedHtml.includes('<body')) {
    processedHtml = processedHtml.replace(/<body[^>]*>/i, match => `${match}\n${toolbarHtml}\n`);
  } else {
    processedHtml = toolbarHtml + processedHtml;
  }

  const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(processedHtml);
  await printWin.loadURL(dataUri);

  printWin.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      printWin.webContents.print({
        silent: false,
        printBackground: true,
      });
    }, 300);
  });

  return { success: true };
});

ipcMain.handle('select-directory', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Destination Folder — ShopPulse',
    defaultPath: defaultPath || undefined,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { canceled: true };
  }
  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('save-backup', async (event, { data, defaultDir, filename }) => {
  const fs = require('fs');
  const path = require('path');
  const defaultFilename = filename || `ShopPulse_Backup_${new Date().toISOString().split('T')[0]}.json`;
  const defaultPath = defaultDir ? path.join(defaultDir, defaultFilename) : defaultFilename;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Database Backup — ShopPulse',
    defaultPath: defaultPath,
    filters: [{ name: 'JSON Backup (*.json)', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }],
  });

  if (canceled || !filePath) return { canceled: true };

  fs.writeFileSync(filePath, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
  return { success: true, filePath };
});

ipcMain.handle('save-pdf', async (event, { html, title, defaultDir }) => {
  const fs = require('fs');
  const path = require('path');
  const sanitizedTitle = (title || 'ShopPulse_Invoice').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const defaultFilename = `${sanitizedTitle}.pdf`;
  const defaultPath = defaultDir ? path.join(defaultDir, defaultFilename) : defaultFilename;

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Invoice as PDF — ShopPulse',
    defaultPath: defaultPath,
    filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return { canceled: true };

  let pdfWin = new BrowserWindow({
    width: 860,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  await pdfWin.loadURL(dataUri);

  // Ensure DOM and fonts are completely loaded
  await new Promise(resolve => {
    if (pdfWin.webContents.isLoading()) {
      pdfWin.webContents.once('did-finish-load', resolve);
    } else {
      resolve();
    }
  });
  await new Promise(r => setTimeout(r, 200));

  const pdfBuffer = await pdfWin.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 },
  });

  fs.writeFileSync(filePath, pdfBuffer);
  
  if (pdfWin && !pdfWin.isDestroyed()) {
    pdfWin.close();
    pdfWin = null;
  }

  // Open saved PDF in default PDF reader automatically
  shell.openPath(filePath);
  return { success: true, filePath };
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

