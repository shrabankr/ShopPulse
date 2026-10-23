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
              message: `ShopPulse v${app.getVersion()}`,
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
ipcMain.handle('print-html', async (event, payload) => {
  const fs = require('fs');
  const path = require('path');
  const html = typeof payload === 'string' ? payload : (payload.html || '');
  const title = (typeof payload === 'object' && payload.title) ? payload.title : 'ShopPulse_Document';
  const autoPrint = typeof payload === 'object' && typeof payload.autoPrint === 'boolean' ? payload.autoPrint : false;

  const sanitizedTitle = title.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '_');

  let printWin = new BrowserWindow({
    width: 960,
    height: 980,
    title: `${title} — ShopPulse`,
    icon: path.join(__dirname, 'icon.ico'),
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
      <span style="font-size:.82rem;color:#94a3b8;font-weight:600">| ${title}</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:7px 16px;border-radius:6px;font-weight:700;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(37,99,235,0.4)">
        🖨️ Print
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
        const clone = document.documentElement.cloneNode(true);
        clone.querySelectorAll('.print-toolbar').forEach(el => el.remove());
        await window.desktopApp.savePdf({
          html: '<!DOCTYPE html><html>' + clone.innerHTML + '</html>',
          title: '${sanitizedTitle.replace(/'/g, "\\'")}'
        });
      } else {
        window.print();
      }
    });
  </script>
  `;

  let processedHtml = html;
  if (processedHtml.includes('<title>')) {
    processedHtml = processedHtml.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  } else if (processedHtml.includes('<head>')) {
    processedHtml = processedHtml.replace('<head>', `<head><title>${title}</title>`);
  }

  if (processedHtml.includes('<body')) {
    processedHtml = processedHtml.replace(/<body[^>]*>/i, match => `${match}\n${toolbarHtml}\n`);
  } else {
    processedHtml = toolbarHtml + processedHtml;
  }

  const tempPreviewFile = path.join(app.getPath('temp'), `shoppulse_preview_${Date.now()}.html`);
  fs.writeFileSync(tempPreviewFile, processedHtml, 'utf8');

  await printWin.loadFile(tempPreviewFile);

  printWin.on('closed', () => {
    try { fs.unlinkSync(tempPreviewFile); } catch (e) {}
    printWin = null;
  });

  if (autoPrint) {
    printWin.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        if (printWin && !printWin.isDestroyed()) {
          printWin.webContents.print({ silent: false, printBackground: true });
        }
      }, 350);
    });
  }

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

// ── Automated & Rolling Local Backup Engine (Keeps 7 daily copies) ──
ipcMain.handle('get-backup-dir', async (event, customDir) => {
  const fs = require('fs');
  const path = require('path');
  const backupDir = customDir && customDir.trim() ? customDir.trim() : path.join(app.getPath('documents'), 'ShopPulse_Backups');
  if (!fs.existsSync(backupDir)) {
    try { fs.mkdirSync(backupDir, { recursive: true }); } catch (e) {}
  }
  return backupDir;
});

ipcMain.handle('auto-save-backup', async (event, { data, customDir, isManual = false }) => {
  const fs = require('fs');
  const path = require('path');
  const backupDir = customDir && customDir.trim() ? customDir.trim() : path.join(app.getPath('documents'), 'ShopPulse_Backups');
  if (!fs.existsSync(backupDir)) {
    try { fs.mkdirSync(backupDir, { recursive: true }); } catch (e) {
      return { success: false, error: e.message };
    }
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  let filename = '';
  if (isManual) {
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    filename = `ShopPulse_ManualBackup_${dateStr}_${timeStr}.json`;
  } else {
    filename = `ShopPulse_AutoBackup_${dateStr}.json`;
  }

  const filePath = path.join(backupDir, filename);
  const jsonContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, jsonContent, 'utf8');

  // Rolling retention: keep latest 7 daily automated backups
  try {
    const files = fs.readdirSync(backupDir);
    const autoBackups = files
      .filter(f => f.startsWith('ShopPulse_AutoBackup_') && f.endsWith('.json'))
      .map(f => {
        const full = path.join(backupDir, f);
        const stat = fs.statSync(full);
        return { name: f, full, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime); // Newest first

    if (autoBackups.length > 7) {
      const toRemove = autoBackups.slice(7);
      toRemove.forEach(item => {
        try { fs.unlinkSync(item.full); } catch (err) {}
      });
    }
  } catch (cleanErr) {
    console.warn('Backup retention cleanup warning:', cleanErr);
  }

  return { success: true, filePath, filename, dir: backupDir };
});

ipcMain.handle('list-backups', async (event, customDir) => {
  const fs = require('fs');
  const path = require('path');
  const backupDir = customDir && customDir.trim() ? customDir.trim() : path.join(app.getPath('documents'), 'ShopPulse_Backups');
  if (!fs.existsSync(backupDir)) return [];

  try {
    const files = fs.readdirSync(backupDir);
    const backups = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const fullPath = path.join(backupDir, file);
      try {
        const stat = fs.statSync(fullPath);
        const isAuto = file.includes('AutoBackup');
        backups.push({
          filename: file,
          filePath: fullPath,
          sizeBytes: stat.size,
          sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB',
          mtime: stat.mtime.toISOString(),
          type: isAuto ? 'Automated Daily' : 'Manual Backup'
        });
      } catch (e) {}
    }
    backups.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    return backups;
  } catch (err) {
    return [];
  }
});

ipcMain.handle('open-backup-folder', async (event, customDir) => {
  const fs = require('fs');
  const path = require('path');
  const backupDir = customDir && customDir.trim() ? customDir.trim() : path.join(app.getPath('documents'), 'ShopPulse_Backups');
  if (!fs.existsSync(backupDir)) {
    try { fs.mkdirSync(backupDir, { recursive: true }); } catch (e) {}
  }
  shell.openPath(backupDir);
  return { success: true, path: backupDir };
});

ipcMain.handle('read-backup-file', async (event, filePath) => {
  const fs = require('fs');
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, error: 'File not found' };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
  const targetWin = BrowserWindow.getFocusedWindow() || mainWindow;

  // Clean filename: Replace spaces, slashes and special chars with underscores/dashes
  const cleanTitle = (title || 'ShopPulse_Document')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  const defaultFilename = `${cleanTitle}.pdf`;
  const baseDir = defaultDir || app.getPath('documents') || app.getPath('downloads');
  const defaultPath = path.join(baseDir, defaultFilename);

  const { canceled, filePath } = await dialog.showSaveDialog(targetWin, {
    title: `Save PDF — ${cleanTitle}`,
    defaultPath: defaultPath,
    filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) return { canceled: true };

  let pdfWin = new BrowserWindow({
    width: 900,
    height: 1000,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Ensure clean HTML without toolbar
  let cleanHtml = html || '';
  cleanHtml = cleanHtml.replace(/<div class="print-toolbar"[\s\S]*?<\/div>/gi, '');

  const tempPdfPath = path.join(app.getPath('temp'), `shoppulse_pdf_gen_${Date.now()}.html`);
  fs.writeFileSync(tempPdfPath, cleanHtml, 'utf8');

  await pdfWin.loadFile(tempPdfPath);

  // Ensure DOM is fully rendered
  await new Promise(resolve => {
    if (pdfWin.webContents.isLoading()) {
      pdfWin.webContents.once('did-finish-load', resolve);
    } else {
      resolve();
    }
  });
  await new Promise(r => setTimeout(r, 250));

  const isCompactThermal = cleanHtml.includes('compact-pos') || cleanHtml.includes('compact_pos') || cleanHtml.includes('80mm');

  const pdfBuffer = await pdfWin.webContents.printToPDF({
    printBackground: true,
    pageSize: isCompactThermal ? { width: 80000, height: 297000 } : 'A4',
    margins: { top: 0.15, bottom: 0.15, left: 0.15, right: 0.15 },
  });

  fs.writeFileSync(filePath, pdfBuffer);

  if (pdfWin && !pdfWin.isDestroyed()) {
    pdfWin.close();
    pdfWin = null;
  }

  try { fs.unlinkSync(tempPdfPath); } catch (e) {}

  // Open saved PDF in system default viewer
  try { shell.openPath(filePath); } catch (e) {}

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

