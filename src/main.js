const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const fs = require('fs/promises');
const path = require('path');

let mainWindow;
let bubbleWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 680,
    minWidth: 460,
    minHeight: 360,
    frame: false,
    show: false,
    backgroundColor: '#f6f1e8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; if (bubbleWindow) bubbleWindow.close(); });
}

function createBubble() {
  if (bubbleWindow) return;
  const area = screen.getPrimaryDisplay().workArea;
  bubbleWindow = new BrowserWindow({
    width: 62,
    height: 62,
    x: area.x + area.width - 70,
    y: area.y + Math.round(area.height * 0.36),
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  bubbleWindow.loadFile(path.join(__dirname, 'bubble.html'));
  bubbleWindow.on('moved', snapBubble);
  bubbleWindow.on('closed', () => { bubbleWindow = null; });
}

function snapBubble() {
  if (!bubbleWindow) return;
  const bounds = bubbleWindow.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const centerX = bounds.x + bounds.width / 2;
  const x = centerX < area.x + area.width / 2 ? area.x + 6 : area.x + area.width - bounds.width - 6;
  const y = Math.max(area.y + 6, Math.min(bounds.y, area.y + area.height - bounds.height - 6));
  if (bounds.x !== x || bounds.y !== y) bubbleWindow.setPosition(x, y, true);
}

function restoreMain() {
  if (!mainWindow) return;
  if (bubbleWindow) bubbleWindow.close();
  mainWindow.show();
  mainWindow.restore();
  mainWindow.focus();
}

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => { if (!mainWindow) createMainWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('window:toggle-top', () => {
  const next = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(next);
  return next;
});
ipcMain.handle('window:minimize-bubble', () => { mainWindow.hide(); createBubble(); });
ipcMain.handle('window:restore', restoreMain);
ipcMain.handle('window:close', () => mainWindow.close());

async function writeNote(filePath, payload) {
  await fs.writeFile(filePath, payload.text, 'utf8');
  await fs.writeFile(`${filePath}.edgenote.json`, JSON.stringify({ html: payload.html, settings: payload.settings || {} }, null, 2), 'utf8');
  return filePath;
}

async function chooseSavePath(payload) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '另存为',
    defaultPath: payload.currentPath || path.join(app.getPath('documents'), '我的笔记.txt'),
    filters: [{ name: '文本文件', extensions: ['txt'] }]
  });
  if (result.canceled) return null;
  return result.filePath;
}

ipcMain.handle('note:save', async (_event, payload) => {
  const filePath = payload.currentPath || await chooseSavePath(payload);
  return filePath ? writeNote(filePath, payload) : null;
});

ipcMain.handle('note:save-as', async (_event, payload) => {
  const filePath = await chooseSavePath(payload);
  return filePath ? writeNote(filePath, payload) : null;
});

ipcMain.handle('note:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '打开笔记',
    properties: ['openFile'],
    filters: [{ name: '文本文件', extensions: ['txt'] }]
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const text = await fs.readFile(filePath, 'utf8');
  let html = null;
  let settings = {};
  try {
    const metadata = JSON.parse(await fs.readFile(`${filePath}.edgenote.json`, 'utf8'));
    html = metadata.html;
    settings = metadata.settings || {};
  } catch {}
  return { filePath, text, html, settings };
});

ipcMain.handle('image:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '插入图片',
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
  });
  if (result.canceled) return null;
  return `file:///${result.filePaths[0].replace(/\\/g, '/')}`;
});

ipcMain.handle('background:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择背景图片',
    properties: ['openFile'],
    filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
  });
  if (result.canceled) return null;
  return `file:///${result.filePaths[0].replace(/\\/g, '/')}`;
});

function globalSettingsPath() {
  return path.join(app.getPath('userData'), 'display-settings.json');
}
ipcMain.handle('settings:get-global', async () => {
  try { return JSON.parse(await fs.readFile(globalSettingsPath(), 'utf8')); } catch { return {}; }
});
ipcMain.handle('settings:save-global', async (_event, settings) => {
  await fs.writeFile(globalSettingsPath(), JSON.stringify(settings || {}, null, 2), 'utf8');
  return true;
});

ipcMain.handle('note:search', (_event, { text, forward }) => {
  if (!text) { mainWindow.webContents.stopFindInPage('clearSelection'); return 0; }
  return mainWindow.webContents.findInPage(text, { forward, findNext: true });
});
ipcMain.handle('note:stop-search', () => mainWindow.webContents.stopFindInPage('clearSelection'));
app.on('web-contents-created', (_event, contents) => {
  contents.on('found-in-page', (_foundEvent, result) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('note:search-result', result);
  });
});
