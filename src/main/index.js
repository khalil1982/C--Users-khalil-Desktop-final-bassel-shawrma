const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, closeDatabase, getDb, persistDatabase } = require('../database');
const { runTemplateCleanup } = require('../database/templateCleanup');
const authService = require('../services/auth');
const orderService = require('../services/order');
const reportService = require('../services/reports');
const expenseService = require('../services/expense');
const cashierAccountingService = require('../services/cashierAccounting');
const settingsService = require('../services/settings');
const customerService = require('../services/customer');
const partnerService = require('../services/partner');
const withdrawalService = require('../services/withdrawal');
const tableService = require('../services/table');
const employeeService = require('../services/employee');
const backupService = require('../services/backup');
const { initLogger, logAuth } = require('../utils/logger');

// Phase 2 Services
const menuService = require('../services/menu');
const businessDateService = require('../services/businessDate');
const auditService = require('../services/audit');
const { MAX_DEBT_SHEKELS } = require('../constants');
const errorHandler = require('../utils/errorHandler');

let mainWindow = null;
let startupLogPath = null;

// Initialize startup log path early (before app.whenReady)
try {
  const userDataPath = app.getPath('userData');
  startupLogPath = path.join(userDataPath, 'startup.log');
  // Ensure directory exists
  const logDir = path.dirname(startupLogPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (e) {
  console.error('[STARTUP] Failed to initialize log path:', e.message);
}

// ============================================
// GLOBAL ERROR HANDLERS - MUST BE FIRST
// ============================================

// Initialize logger first
initLogger();

/**
 * Get the correct path for resources in both dev and production
 */
function getResourcePath(...relativePath) {
  if (app.isPackaged) {
    // In production, resources are in the app.asar or resources folder
    // __dirname points to app.asar/main/index.js or resources/app/src/main/index.js
    return path.join(__dirname, ...relativePath);
  } else {
    // In development, use __dirname normally
    return path.join(__dirname, ...relativePath);
  }
}

/**
 * Write to startup log file
 */
function logStartup(message, error = null) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}${error ? `\n  Error: ${error.message}\n  Stack: ${error.stack}` : ''}\n`;
  
  console.log(`[STARTUP] ${message}`);
  if (error) {
    console.error(`[STARTUP ERROR]`, error);
  }
  
  if (startupLogPath) {
    try {
      fs.appendFileSync(startupLogPath, logLine, 'utf8');
    } catch (e) {
      console.error('[STARTUP] Failed to write to log file:', e.message);
    }
  }
}

/**
 * Global uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  const errorMsg = `Uncaught Exception: ${error.message}`;
  logStartup(errorMsg, error);
  errorHandler.logError(errorMsg, { stack: error.stack, context: 'uncaughtException' });
  
  // Log to auth debug file as well
  logAuth('UNCAUGHT EXCEPTION', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Don't exit immediately - let the app try to recover
  // In production, we want to see the error and potentially show a window
});

/**
 * Global unhandled rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const errorMsg = `Unhandled Rejection: ${error.message}`;
  logStartup(errorMsg, error);
  errorHandler.logError(errorMsg, { stack: error.stack, context: 'unhandledRejection' });
  
  // Log to auth debug file as well
  logAuth('UNHANDLED REJECTION', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
});

function createWindow() {
  try {
    logStartup('Starting createWindow()');
    
    // Resolve paths correctly for both dev and production
    const preloadPath = getResourcePath('preload.js');
    const rendererPath = getResourcePath('..', 'renderer', 'login.html');
    
    logStartup(`Preload path: ${preloadPath}`);
    logStartup(`Renderer path: ${rendererPath}`);
    logStartup(`Preload exists: ${fs.existsSync(preloadPath)}`);
    logStartup(`Renderer exists: ${fs.existsSync(rendererPath)}`);
    
    // Icon path resolution
    let iconPath = null;
    try {
      const assetsDir = path.join(__dirname, '..', '..', 'assets');
      const iconIco = path.join(assetsDir, 'icon.ico');
      const iconPng = path.join(assetsDir, 'icon.png');
      
      if (process.platform === 'win32' && fs.existsSync(iconIco)) {
        iconPath = iconIco;
      } else if (fs.existsSync(iconPng)) {
        iconPath = iconPng;
      }
      
      if (iconPath) {
        logStartup(`Icon path: ${iconPath}`);
      } else {
        logStartup('Warning: No icon file found');
      }
    } catch (iconError) {
      logStartup('Warning: Failed to resolve icon path', iconError);
    }
    
    const opts = {
      width: 1280,
      height: 800,
      fullscreen: true,
      fullscreenable: true,
      autoHideMenuBar: true,
      show: false, // Will show after ready-to-show event
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    };
    
    if (iconPath && fs.existsSync(iconPath)) {
      opts.icon = iconPath;
    }
    
    logStartup('Creating BrowserWindow with options');
    mainWindow = new BrowserWindow(opts);
    logStartup('BrowserWindow created successfully');

    Menu.setApplicationMenu(null);

    // Ensure window shows even if ready-to-show doesn't fire
    let hasShown = false;
    const showWindow = () => {
      if (!hasShown && mainWindow && !mainWindow.isDestroyed()) {
        hasShown = true;
        mainWindow.show();
        logStartup('Window shown');
      }
    };

    mainWindow.once('ready-to-show', () => {
      logStartup('Window ready-to-show event fired');
      showWindow();
    });

    // Fallback: show window after a timeout if ready-to-show doesn't fire
    setTimeout(() => {
      if (!hasShown && mainWindow && !mainWindow.isDestroyed()) {
        logStartup('Fallback: Showing window after timeout');
        showWindow();
      }
    }, 2000);

    // Handle load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      const errorMsg = `Failed to load: ${validatedURL} (Code: ${errorCode}, ${errorDescription})`;
      logStartup(errorMsg);
      errorHandler.logError(errorMsg, { 
        context: 'window-load-failure',
        errorCode,
        errorDescription,
        url: validatedURL
      });
    });

    // Log when page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
      logStartup('Page finished loading');
    });

    logStartup(`Loading file: ${rendererPath}`);
    mainWindow.loadFile(rendererPath).catch((loadError) => {
      logStartup('Failed to load file', loadError);
      errorHandler.logError('Failed to load renderer file', { 
        stack: loadError.stack,
        context: 'loadFile',
        path: rendererPath
      });
    });

    mainWindow.on('closed', () => {
      logStartup('Window closed');
      mainWindow = null;
    });

    logStartup('createWindow() completed successfully');
  } catch (error) {
    logStartup('Error in createWindow()', error);
    errorHandler.logError('Failed to create window', { 
      stack: error.stack,
      context: 'createWindow'
    });
    
    // Try to show error window if main window creation failed
    if (!mainWindow) {
      try {
        const errorWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });
        errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <html>
            <head><title>Startup Error</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Application Startup Error</h1>
              <p><strong>Error:</strong> ${error.message}</p>
              <p><strong>Details:</strong> Check the log file at: ${startupLogPath || 'N/A'}</p>
              <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">${error.stack}</pre>
            </body>
          </html>
        `)}`);
      } catch (e) {
        console.error('Failed to create error window:', e);
      }
    }
  }
}

app.whenReady().then(async () => {
  try {
    logStartup('app.whenReady() fired');
    
    // Set up error logging directory
    const userDataPath = app.getPath('userData');
    logStartup(`User data path: ${userDataPath}`);
    errorHandler.setLogDirectory(userDataPath);
    
    // Set up startup log file
    startupLogPath = path.join(userDataPath, 'startup.log');
    logStartup(`Startup log path: ${startupLogPath}`);
    logStartup(`App is packaged: ${app.isPackaged}`);
    logStartup(`App path: ${app.getAppPath()}`);
    logStartup(`__dirname: ${__dirname}`);
    
    logStartup('Initializing database...');
    await initDatabase();
    logStartup('Database initialized successfully');
    
    logStartup('Loading settings...');
    const settings = settingsService.getSettings();
    logStartup('Settings loaded successfully');

    // Apply auto-start setting
    try {
      app.setLoginItemSettings({
        openAtLogin: settings.autoStart,
        path: app.getPath('exe'),
      });
      logStartup('Auto-start settings applied');
    } catch (autoStartError) {
      logStartup('Warning: Failed to set auto-start', autoStartError);
    }

    logStartup('Calling createWindow()...');
    createWindow();
    logStartup('createWindow() call completed');
  } catch (error) {
    logStartup('Error in app.whenReady()', error);
    errorHandler.logError('Failed during app initialization', { 
      stack: error.stack,
      context: 'app.whenReady'
    });
    
    // Try to create window anyway to show error
    try {
      createWindow();
    } catch (createError) {
      logStartup('Failed to create window after error', createError);
    }
  }
});

app.on('window-all-closed', async () => {
  await closeDatabase();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('auth:login', async (_, { username, password }) => {
  const result = authService.login(username, password);
  if (result.ok) {
    try {
      businessDateService.logSessionStart(result.user.userId);
    } catch (error) {
      console.error('Failed to log app session start:', error);
    }
  }
  return result;
});

ipcMain.handle('auth:logout', async (_, { sessionId }) => {
  const session = authService.getCurrentSession();
  if (session?.user?.userId) {
    try {
      businessDateService.logSessionEnd(session.user.userId);
    } catch (error) {
      console.error('Failed to log app session end:', error);
    }
  }
  return authService.logout(sessionId);
});

ipcMain.handle('auth:getCurrentSession', async () => {
  return authService.getCurrentSession();
});

ipcMain.handle('auth:verifyAdmin', async (_, { username, password }) => {
  return authService.verifyAdminCredentials(username, password);
});

/** كلمة سر مدير النظام المخصصة لفتح تبويب الإعدادات فقط (مختلفة عن كلمة دخول admin). */
const MANAGER_SECRET = 'Admin123Admin';

ipcMain.handle('auth:verifyManagerSecret', async (_, password) => {
  const ok = typeof password === 'string' && password.trim() === MANAGER_SECRET;
  return ok ? { ok: true } : { ok: false, error: 'كلمة المرور غير صحيحة.' };
});

ipcMain.handle('error:getMessage', (_, errPayload) => {
  const err = errPayload?.message ?? errPayload?.error ?? errPayload;
  return errorHandler.getErrorMessage(err);
});

ipcMain.handle('error:report', (_, { message, stack, context }) => {
  errorHandler.logError(message || 'Unknown error', { stack, context });
});

ipcMain.handle('settings:get', async () => {
  return { ok: true, settings: settingsService.getSettings() };
});

ipcMain.handle('settings:update', async (_, data) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  const newSettings = settingsService.updateSettings(data);

  // Apply auto-start update immediately
  app.setLoginItemSettings({
    openAtLogin: newSettings.autoStart,
    path: app.getPath('exe'),
  });

  return { ok: true, settings: newSettings };
});

// ------------------------------------------
// Backup & Restore (admin only)
// ------------------------------------------

/** Default backup filename with timestamp: backup_YYYY-MM-DD_HH-mm.json */
function getDefaultBackupFilename() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `backup_${y}-${m}-${d}_${h}-${min}.json`;
}

ipcMain.handle('backup:export', async () => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const defaultPath = path.join(app.getPath('documents'), getDefaultBackupFilename());

  try {
    const result = await dialog.showSaveDialog(win, {
      title: 'حفظ النسخ الاحتياطي',
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return { ok: false, cancelled: true };
    }

    const backup = backupService.exportBackup();
    const content = JSON.stringify(backup, null, 2);
    fs.writeFileSync(result.filePath, content, 'utf8');
    console.log('[BACKUP] Export succeeded:', result.filePath);
    return { ok: true, path: result.filePath };
  } catch (err) {
    const msg = err && err.message ? err.message : 'فشل تصدير النسخ الاحتياطي.';
    console.error('[BACKUP] Export failed:', err);
    return { ok: false, error: msg };
  }
});

ipcMain.handle('backup:import', async () => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;

  try {
    const result = await dialog.showOpenDialog(win, {
      title: 'اختر ملف النسخ الاحتياطي',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { ok: false, cancelled: true };
    }

    const filePath = result.filePaths[0];
    const raw = fs.readFileSync(filePath, 'utf8');
    let backup;

    try {
      backup = JSON.parse(raw);
    } catch (parseErr) {
      return { ok: false, error: 'ملف النسخ الاحتياطي غير صالح أو تالف (JSON غير صحيح).' };
    }

    const validation = backupService.validateBackup(backup);
    if (!validation.ok) {
      return { ok: false, error: validation.error || 'ملف النسخ الاحتياطي غير صالح.' };
    }

    const restoreResult = backupService.restoreBackup(backup);
    if (!restoreResult.ok) {
      console.error('[BACKUP] Restore failed:', restoreResult.error);
      return restoreResult;
    }
    console.log('[BACKUP] Restore succeeded');
    return { ok: true };
  } catch (err) {
    const msg = err && err.message ? err.message : 'فشل استعادة النسخ الاحتياطي.';
    console.error('[BACKUP] Import failed:', err);
    return { ok: false, error: msg };
  }
});

ipcMain.handle('app:navigate', (_, { page }) => {
  if (!mainWindow) return;
  let file = 'login.html';
  if (page === 'main') file = 'main.html';
  else if (page === 'pos') file = 'pos.html';
  else if (page === 'menu') file = 'menu.html';
  else if (page === 'customers') file = 'customers.html';
  else if (page === 'finance') file = 'finance.html';
  else if (page === 'employees') file = 'employees.html';
  else if (page === 'reports') file = 'reports.html';
  else if (page === 'settings') file = 'settings.html';
  else if (page === 'contact') file = 'contact.html';
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', file));
});

ipcMain.handle('app:setCurrentSession', (_, session) => {
  authService.setCurrentSession(session);
});

ipcMain.handle('app:cleanForFreshUse', async () => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  try {
    runTemplateCleanup(getDb(), { resetSequences: false });
    persistDatabase();
    return { ok: true };
  } catch (e) {
    console.error('cleanForFreshUse error', e);
    return { ok: false, error: e?.message || 'فشل مسح البيانات.' };
  }
});

ipcMain.handle('app:clearCurrentSession', () => {
  authService.clearCurrentSession();
});

ipcMain.handle('app:getMaxDebtShekels', () => Promise.resolve(MAX_DEBT_SHEKELS));

/** عرض ورقة الطابعة الحرارية (80mm) وعرض المنطقة المطبوعة الفعلي (~72mm) */
const THERMAL_PAPER_WIDTH_MM = 80;
const THERMAL_PRINTABLE_WIDTH_MM = 72;
/** تحويل mm إلى px تقريبي عند 96 DPI */
function mmToPx(mm) {
  return Math.round((mm / 25.4) * 96);
}

/** طباعة فورية على الطابعة الرئيسية دون إظهار أي خيارات - ترميز UTF-8 للعربية. يُرجع Promise يُحلّ عند انتهاء الطباعة. */
ipcMain.handle('app:printReceipt', (_, { html }) => {
  return new Promise((resolve) => {
    if (!html || typeof html !== 'string') {
      resolve();
      return;
    }
    /* نافذة بعرض المنطقة المطبوعة (72mm) لتفادي قص المحتوى على اليمين */
    const receiptWidthPx = mmToPx(THERMAL_PRINTABLE_WIDTH_MM);
    const receiptHeightPx = 2000; /* نافذة طويلة لقياس ارتفاع المحتوى كاملاً (آخر سطر = بيانات المبرمج) */
    const printWin = new BrowserWindow({
      show: false,
      width: receiptWidthPx,
      height: receiptHeightPx,
      useContentSize: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    const tempReceiptPath = path.join(app.getPath('temp'), `receipt-${Date.now()}.html`);
    const htmlWithBom = '\uFEFF' + html;
    let useTempFile = false;
    try {
      fs.writeFileSync(tempReceiptPath, htmlWithBom, 'utf8');
      useTempFile = true;
    } catch (_e) { /* سنستخدم data URL كبديل */ }
    const cleanup = () => {
      try { if (fs.existsSync(tempReceiptPath)) fs.unlinkSync(tempReceiptPath); } catch (_e1) { /* ignore */ }
      try { printWin.destroy(); } catch (_e2) { /* ignore */ }
      resolve();
    };
    const doPrint = async () => {
      try {
        /* قياس ارتفاع المحتوى الفعلي (آخر سطر = بيانات المبرمج) لضبط ارتفاع الصفحة المطبوعة */
        const MICRONS_PER_PX = 25400 / 96;
        const minHeightMicrons = 50000; /* 50mm حد أدنى */
        const heightPx = await printWin.webContents.executeJavaScript(
          'document.body.scrollHeight || document.body.offsetHeight || 400'
        );
        const contentHeightMicrons = Math.max(minHeightMicrons, Math.ceil(heightPx * MICRONS_PER_PX));

        printWin.webContents.print(
          {
            silent: true,
            printBackground: true,
            copies: 1,
            pageSize: {
              width: THERMAL_PAPER_WIDTH_MM * 1000,
              height: contentHeightMicrons,
            },
            margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
          },
          (_success) => { cleanup(); }
        );
      } catch (e) {
        console.error('[PRINT] Receipt height measure failed, using fallback:', e);
        printWin.webContents.print(
          {
            silent: true,
            printBackground: true,
            copies: 1,
            pageSize: { width: THERMAL_PAPER_WIDTH_MM * 1000, height: 150000 },
            margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
          },
          (_success) => { cleanup(); }
        );
      }
    };
    if (useTempFile) {
      printWin.loadFile(tempReceiptPath, { encoding: 'utf-8' });
    } else {
      printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    }
    printWin.webContents.once('did-finish-load', doPrint);
    setTimeout(cleanup, 15000);
  });
});

ipcMain.handle('order:create', async (_, { data }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.createOrder(data || {}, session.user.userId);
});

ipcMain.handle('table:getAll', async () => {
  return { ok: true, tables: tableService.getAllTables() };
});

ipcMain.handle('table:get', async (_, { tableId }) => {
  const table = tableService.getTable(tableId);
  if (!table) {
    return { ok: false, error: 'الطاولة غير موجودة.' };
  }
  return { ok: true, table };
});

ipcMain.handle('table:updateStatus', async (_, { tableId, status }) => {
  return tableService.updateTableStatus(tableId, status);
});

ipcMain.handle('table:create', async (_, { tableNumber }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return tableService.createTable(tableNumber);
});

ipcMain.handle('table:updateCount', async (_, { count }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return tableService.updateTableCount(count);
});

ipcMain.handle('order:addItem', async (_, { orderId, menuItemId, quantity }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.addOrderItem(orderId, menuItemId, quantity, session.user.userId);
});

ipcMain.handle('order:removeItem', async (_, { orderItemId }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.removeOrderItem(orderItemId, session.user.userId);
});

ipcMain.handle('order:updateItemQuantity', async (_, { orderItemId, newQuantity }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.updateItemQuantity(orderItemId, newQuantity, session.user.userId);
});

ipcMain.handle('order:getWithItems', async (_, { orderId }) => {
  return { ok: true, order: orderService.getOrderWithItems(orderId) };
});

ipcMain.handle('order:applyDiscount', async (_, { orderId, discountType, discountValue }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.applyDiscount(orderId, discountType, discountValue, session.user);
});

ipcMain.handle('order:removeDiscount', async (_, { orderId }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.removeDiscount(orderId, session.user.userId);
});

ipcMain.handle('order:markReceived', async (_, { orderId, paymentMethod }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.markOrderReceived(orderId, paymentMethod, session.user.userId);
});

ipcMain.handle('order:cancel', async (_, { orderId, reason }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.cancelOrder(orderId, reason, session.user.userId);
});

ipcMain.handle('order:markDelivered', async (_, { orderId }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.markOrderDelivered(orderId, session.user.userId);
});

ipcMain.handle('order:updateStatusToPending', async (_, { orderId }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return orderService.updateOrderStatusToPending(orderId, session.user.userId);
});

ipcMain.handle('order:getActiveByTable', async (_, { tableId }) => {
  const order = orderService.getActiveOrderByTable(tableId);
  return { ok: true, order: order || null };
});

function requireAdminSession() {
  const session = authService.getCurrentSession();
  if (!session || !session.user || session.user.role !== 'manager') {
    return { ok: false, error: 'غير مصرح. هذه العملية للمدير فقط.' };
  }
  return { ok: true, session };
}
ipcMain.handle('report:summary', async (_, { startDate, endDate }) => {
  try {
    return reportService.getSalesSummary(startDate, endDate);
  } catch (e) {
    console.error('report:summary error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:bestSelling', async (_, { startDate, endDate, limit }) => {
  try {
    return reportService.getBestSellingItems(startDate, endDate, limit);
  } catch (e) {
    console.error('report:bestSelling error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:appSessions', async (_, { startDate, endDate }) => {
  try {
    return reportService.getAppSessionsReport(startDate, endDate);
  } catch (e) {
    console.error('report:appSessions error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:financialSummary', async (_, { startDate, endDate }) => {
  try {
    return reportService.getFinancialSummary(startDate, endDate);
  } catch (e) {
    console.error('report:financialSummary error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:debts', async (_, { startDate, endDate }) => {
  try {
    return reportService.getActiveDebts(startDate, endDate);
  } catch (e) {
    console.error('report:debts error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:debtRepayments', async (_, { startDate, endDate }) => {
  try {
    return reportService.getDebtRepayments(startDate, endDate);
  } catch (e) {
    console.error('report:debtRepayments error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:purchasesBreakdown', async (_, { startDate, endDate }) => {
  try {
    return reportService.getPurchasesBreakdown(startDate, endDate);
  } catch (e) {
    console.error('report:purchasesBreakdown error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:tablesBreakdown', async (_, { startDate, endDate }) => {
  try {
    return reportService.getTablesBreakdown(startDate, endDate);
  } catch (e) {
    console.error('report:tablesBreakdown error', e);
    return { ok: false, error: e?.message || 'خطأ في قاعدة البيانات.' };
  }
});

ipcMain.handle('report:exportExcel', async (_, { startDate, endDate }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة. سجّل الدخول أولاً.' };
  }
  try {
    return reportService.exportReportsToExcel(startDate, endDate);
  } catch (e) {
    console.error('report:exportExcel error', e);
    return { ok: false, error: e?.message || 'فشل تصدير ملف Excel.' };
  }
});

ipcMain.handle('report:exportEmployeeDetailsExcel', async (_, { employeeId, startDate, endDate }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  const details = employeeService.getEmployeeFinancialDetails(employeeId, startDate, endDate);
  if (!details) {
    return { ok: false, error: 'الموظف غير موجود.' };
  }
  const BOM = '\uFEFF';
  const rows = [];
  rows.push(['اسم الموظف', 'نوع العملية', 'الشهر', 'التاريخ', 'المبلغ (₪)', 'الملاحظات'].join(','));
  (details.salaries || []).forEach((s) => {
    rows.push([
      details.employee.name || '—',
      'مرتب',
      `${s.salary_year}-${s.salary_month}`,
      s.business_date || '',
      s.amount ?? '',
      (s.notes || '').replace(/,/g, ' ')
    ].join(','));
  });
  (details.withdrawals || []).forEach((w) => {
    rows.push([
      details.employee.name || '—',
      'سحب',
      '—',
      w.business_date || '',
      w.amount ?? '',
      (w.notes || '').replace(/,/g, ' ')
    ].join(','));
  });
  const csv = BOM + rows.join('\r\n');
  const fileName = `employee-details-${details.employee.name || employeeId}-${startDate}-${endDate}.csv`;
  const filePath = path.join(app.getPath('downloads'), fileName);
  fs.writeFileSync(filePath, csv, 'utf8');
  return { ok: true, fileName };
});

ipcMain.handle('expense:createCategory', async (_, { name, nameEn }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return expenseService.createExpenseCategory({ name, nameEn }, access.session.user.userId);
});

ipcMain.handle('expense:getCategories', async () => {
  return { ok: true, categories: expenseService.getExpenseCategories(true) };
});

ipcMain.handle('expense:updateCategory', async (_, { categoryId, name, nameEn }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return expenseService.updateExpenseCategory(categoryId, { name, nameEn }, access.session.user.userId);
});

ipcMain.handle('expense:deleteCategory', async (_, { categoryId }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return expenseService.deleteExpenseCategory(categoryId, access.session.user.userId);
});

ipcMain.handle('expense:create', async (_, { categoryId, amount, description, attachmentPath }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return expenseService.createExpense({ categoryId, amount, description, attachmentPath }, session.user.userId);
});

ipcMain.handle('expense:getByDate', async (_, { businessDate }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return { ok: true, expenses: expenseService.getExpensesByDate(businessDate) };
});

ipcMain.handle('customer:create', async (_, data) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return customerService.createCustomer(data || {}, session.user.userId);
});

ipcMain.handle('customer:recordDebt', async (_, { customerId, transactionType, amount, orderId, notes }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return customerService.recordDebtTransaction(
    { customerId, transactionType, amount, orderId, notes },
    session.user.userId
  );
});

ipcMain.handle('customer:createDebtByPhone', async (_, data) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return customerService.createOrUpdateCustomerByPhone(data || {}, session.user.userId);
});

ipcMain.handle('customer:createDebt', async (_, { name, phone, nationalId, amount }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return customerService.createDebt({ name, phone, nationalId, amount }, session.user.userId);
});

ipcMain.handle('customer:createDebtForOrder', async (_, { name, phone, nationalId, amount, orderId }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return customerService.createDebtForOrder(
    { name, phone, nationalId, amount, orderId },
    session.user.userId
  );
});

ipcMain.handle('customer:repayDebt', async (_, { customerId, amount, paymentMethod, notes }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return customerService.repayDebt({ customerId, amount, paymentMethod, notes }, session.user.userId);
});

ipcMain.handle('customer:getDebtors', async () => {
  return { ok: true, debtors: customerService.getDebtors() };
});

ipcMain.handle('customer:search', async (_, { query }) => {
  return { ok: true, customers: customerService.searchCustomers(query) };
});

ipcMain.handle('customer:getDetails', async (_, { customerId }) => {
  const details = customerService.getCustomerDetails(customerId);
  if (!details) {
    return { ok: false, error: 'الزبون غير موجود.' };
  }
  return { ok: true, details };
});

ipcMain.handle('auth:getUsers', async () => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return authService.getUsers();
});

ipcMain.handle('auth:changeUserPassword', async (_, { targetUserId, adminPassword, newPassword }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return authService.changeUserPassword({
    targetUserId,
    adminPassword,
    newPassword,
    adminUserId: access.session.user.userId,
  });
});

ipcMain.handle('partner:create', async (_, { name }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return partnerService.createPartner({ name }, access.session.user.userId);
});

ipcMain.handle('partner:getAll', async () => {
  return { ok: true, partners: partnerService.getPartners(true) };
});

ipcMain.handle('withdrawal:request', async (_, { partnerId, amount, notes, businessDate }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return withdrawalService.requestWithdrawal({ partnerId, amount, notes, businessDate }, session.user.userId);
});

ipcMain.handle('withdrawal:updateStatus', async (_, { withdrawalId, status }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return withdrawalService.updateWithdrawalStatus(withdrawalId, status, access.session.user.userId);
});

ipcMain.handle('withdrawal:getReport', async (_, { startDate, endDate }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return { ok: true, withdrawals: withdrawalService.getWithdrawalsReport(startDate, endDate) };
});

ipcMain.handle('cashier:getMySummary', async (_, { from, to }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return cashierAccountingService.getMyCashierSummary(session.user.userId, from, to);
});

ipcMain.handle('cashier:getAllSummaries', async (_, { from, to }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return cashierAccountingService.getAllCashiersSummary(from, to);
});

ipcMain.handle('audit:getRecentOrderEvents', async (_, { limit }) => {
  return { ok: true, events: auditService.getRecentOrderEvents(limit || 4) };
});


// ============================================
// PHASE 2: Menu Management IPC Handlers
// ============================================

/**
 * Get all menu items (optionally filtered by category)
 */
ipcMain.handle('menu:getAll', async (_, { category, activeOnly } = {}) => {
  try {
    const items = menuService.getMenuItems(category || null, activeOnly !== false);
    return { ok: true, items };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

/**
 * Get a single menu item by ID
 */
ipcMain.handle('menu:getById', async (_, { itemId }) => {
  try {
    const item = menuService.getMenuItem(itemId);
    if (!item) {
      return { ok: false, error: 'الصنف غير موجود' };
    }
    return { ok: true, item };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

/**
 * Create a new menu item (Admin only)
 */
ipcMain.handle('menu:create', async (_, data) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  return menuService.createMenuItem(data, access.session.user.userId);
});

/**
 * Update menu item price (Admin only)
 */
ipcMain.handle('menu:updatePrice', async (_, { itemId, newPrice, reason }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  return menuService.updateItemPrice(itemId, newPrice, reason, access.session.user.userId);
});

/**
 * Update menu item details (Admin only)
 */
ipcMain.handle('menu:update', async (_, { itemId, updates }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  return menuService.updateMenuItem(itemId, updates, access.session.user.userId);
});

/**
 * Toggle menu item status (active/inactive) (Admin only)
 */
ipcMain.handle('menu:toggleStatus', async (_, { itemId }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  return menuService.toggleItemStatus(itemId, access.session.user.userId);
});

ipcMain.handle('menu:delete', async (_, { itemId }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  return menuService.deleteMenuItem(itemId, access.session.user.userId);
});

// ============================================
// PHASE 2: Business Date & Sessions
// ============================================

/**
 * Get current business date
 */
ipcMain.handle('businessDate:getCurrent', async () => {
  try {
    const businessDate = businessDateService.getCurrentBusinessDate();
    return { ok: true, businessDate };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

/**
 * Log app session start
 */
ipcMain.handle('session:logStart', async () => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة' };
  }

  try {
    return businessDateService.logSessionStart(session.user.userId);
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

/**
 * Log app session end
 */
ipcMain.handle('session:logEnd', async () => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة' };
  }

  try {
    return businessDateService.logSessionEnd(session.user.userId);
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

/**
 * Get sessions for a business date (Admin only)
 */
ipcMain.handle('session:getByDate', async (_, { businessDate }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  try {
    const sessions = businessDateService.getSessionsByDate(businessDate);
    return { ok: true, sessions };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// ============================================
// PHASE 2: Audit Log
// ============================================

/**
 * Get audit log entries (Admin only)
 */
ipcMain.handle('audit:getLog', async (_, filters = {}) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  try {
    const logs = auditService.getAuditLog(filters);
    return { ok: true, logs };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

/**
 * Get audit statistics (Admin only)
 */
ipcMain.handle('audit:getStatistics', async (_, { businessDate }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;

  try {
    const statistics = auditService.getAuditStatistics(businessDate);
    return { ok: true, statistics };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// ============================================
// Employees IPC Handlers
// ============================================
ipcMain.handle('employee:create', async (_, data) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return employeeService.createEmployee(data || {}, access.session.user.userId);
});

ipcMain.handle('employee:update', async (_, { employeeId, updates }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return employeeService.updateEmployee(employeeId, updates || {}, access.session.user.userId);
});

ipcMain.handle('employee:getAll', async (_, { activeOnly }) => {
  return { ok: true, employees: employeeService.getAllEmployees(activeOnly) };
});

ipcMain.handle('employee:get', async (_, { employeeId }) => {
  const employee = employeeService.getEmployee(employeeId);
  if (!employee) {
    return { ok: false, error: 'الموظف غير موجود.' };
  }
  return { ok: true, employee };
});

ipcMain.handle('employee:recordSalary', async (_, data) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return employeeService.recordSalary(data || {}, session.user.userId);
});

ipcMain.handle('employee:getSalariesReport', async (_, { startDate, endDate }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return { ok: true, salaries: employeeService.getEmployeeSalariesReport(startDate, endDate) };
});

ipcMain.handle('employee:getMonthlyPayroll', async (_, { year, month }) => {
  const access = requireAdminSession();
  if (!access.ok) return access;
  return { ok: true, payroll: employeeService.getMonthlyPayrollReport(year, month) };
});

ipcMain.handle('employee:recordWithdrawal', async (_, data) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  return employeeService.recordWithdrawal(data || {}, session.user.userId);
});

ipcMain.handle('employee:getFinancialDetails', async (_, { employeeId, startDate, endDate }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  const details = employeeService.getEmployeeFinancialDetails(employeeId, startDate, endDate);
  if (!details) {
    return { ok: false, error: 'الموظف غير موجود.' };
  }
  return { ok: true, ...details };
});

ipcMain.handle('employee:getMonthlyWithdrawals', async (_, { employeeId, year, month }) => {
  const session = authService.getCurrentSession();
  if (!session || !session.user) {
    return { ok: false, error: 'الجلسة غير صالحة.' };
  }
  const summary = employeeService.getEmployeeMonthlyWithdrawals(employeeId, year, month);
  return { ok: true, ...summary };
});