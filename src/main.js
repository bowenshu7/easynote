const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const fs = require('fs/promises');
const path = require('path');
let mainWindow, bubbleWindow, allowClose = false;
const appConfigPath = () => path.join(app.getPath('userData'), 'app-settings.json');
async function readConfig() {
  try { return JSON.parse(await fs.readFile(appConfigPath(), 'utf8')); }
  catch {
    try { return { settings: JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'display-settings.json'), 'utf8')), paths: {} }; }
    catch { return { settings: {}, paths: {} }; }
  }
}
async function updateConfig(patch) {
  const current = await readConfig();
  const next = { settings: { ...(current.settings || {}), ...(patch.settings || {}) }, paths: { ...(current.paths || {}), ...(patch.paths || {}) } };
  await fs.writeFile(appConfigPath(), JSON.stringify(next, null, 2), 'utf8'); return next;
}
function createMainWindow() {
  allowClose = false;
  mainWindow = new BrowserWindow({ width: 820, height: 700, minWidth: 500, minHeight: 390, frame: false, show: false, backgroundColor: '#f6f1e8', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  mainWindow.loadFile(path.join(__dirname, 'index.html')); mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', event => { if (!allowClose && mainWindow?.webContents) { event.preventDefault(); mainWindow.webContents.send('window:close-requested'); } });
  mainWindow.on('closed', () => { mainWindow = null; if (bubbleWindow) bubbleWindow.close(); });
}
function createBubble() {
  if (bubbleWindow) return;
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  bubbleWindow = new BrowserWindow({ width: 64, height: 64, x: area.x + area.width - 72, y: area.y + Math.round(area.height * .36), frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  bubbleWindow.loadFile(path.join(__dirname, 'bubble.html')); bubbleWindow.on('closed', () => { bubbleWindow = null; });
}
function snapBubble() {
  if (!bubbleWindow) return; const bounds = bubbleWindow.getBounds(); const area = screen.getDisplayMatching(bounds).workArea;
  const x = bounds.x + bounds.width / 2 < area.x + area.width / 2 ? area.x + 6 : area.x + area.width - bounds.width - 6;
  const y = Math.max(area.y + 6, Math.min(bounds.y, area.y + area.height - bounds.height - 6)); bubbleWindow.setPosition(x, y, true);
}
function restoreMain() { if (!mainWindow) createMainWindow(); if (bubbleWindow) bubbleWindow.close(); mainWindow.show(); mainWindow.restore(); mainWindow.focus(); }
app.whenReady().then(() => { createMainWindow(); app.on('activate', () => { if (!mainWindow) createMainWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('window:toggle-top', () => { const next = !mainWindow.isAlwaysOnTop(); mainWindow.setAlwaysOnTop(next); return next; });
ipcMain.handle('window:minimize-bubble', () => { mainWindow.hide(); createBubble(); });
ipcMain.handle('window:restore', restoreMain);
ipcMain.handle('window:force-close', () => { allowClose = true; mainWindow.close(); });
ipcMain.handle('window:confirm-close', async (_event, language = 'zh') => {
  const en = language === 'en'; const result = await dialog.showMessageBox(mainWindow, { type: 'question', title: en ? 'Unsaved changes' : '未保存的修改', message: en ? 'Save changes before closing?' : '关闭应用前是否保存当前修改？', detail: en ? 'Unsaved text and display changes will be lost.' : '未保存的文字和显示设置将会丢失。', buttons: en ? ['Save', "Don't Save", 'Cancel'] : ['保存', '不保存', '取消'], defaultId: 0, cancelId: 2, noLink: true });
  return ['save', 'discard', 'cancel'][result.response];
});
ipcMain.handle('bubble:move', (_event, p) => { if (bubbleWindow) bubbleWindow.setPosition(Math.round(p.x), Math.round(p.y)); });
ipcMain.handle('bubble:snap', snapBubble);
async function writeNote(filePath, payload) {
  await fs.writeFile(filePath, payload.text, 'utf8'); await fs.writeFile(`${filePath}.edgenote.json`, JSON.stringify({ html: payload.html, settings: payload.settings || {} }, null, 2), 'utf8');
  await updateConfig({ paths: { notes: path.dirname(filePath) } }); return filePath;
}
async function chooseSavePath(payload) {
  const config = await readConfig(); const result = await dialog.showSaveDialog(mainWindow, { title: payload.language === 'en' ? 'Save As' : '另存为', defaultPath: payload.currentPath || path.join(config.paths?.notes || app.getPath('documents'), payload.language === 'en' ? 'My Note.txt' : '我的笔记.txt'), filters: [{ name: 'Text', extensions: ['txt'] }] });
  return result.canceled ? null : result.filePath;
}
ipcMain.handle('note:save', async (_e, payload) => { const filePath = payload.currentPath || await chooseSavePath(payload); return filePath ? writeNote(filePath, payload) : null; });
ipcMain.handle('note:save-as', async (_e, payload) => { const filePath = await chooseSavePath(payload); return filePath ? writeNote(filePath, payload) : null; });
ipcMain.handle('note:open', async (_e, language = 'zh') => {
  const config = await readConfig(); const result = await dialog.showOpenDialog(mainWindow, { title: language === 'en' ? 'Open Note' : '打开笔记', defaultPath: config.paths?.notes || app.getPath('documents'), properties: ['openFile'], filters: [{ name: 'Text', extensions: ['txt'] }] });
  if (result.canceled) return null; const filePath = result.filePaths[0]; await updateConfig({ paths: { notes: path.dirname(filePath) } });
  const text = await fs.readFile(filePath, 'utf8'); let html = null, settings = {};
  try { const metadata = JSON.parse(await fs.readFile(`${filePath}.edgenote.json`, 'utf8')); html = metadata.html; settings = metadata.settings || {}; } catch {}
  return { filePath, text, html, settings };
});
async function chooseImage(kind, language) {
  const config = await readConfig(); const key = kind === 'background' ? 'backgrounds' : 'insertImages';
  const result = await dialog.showOpenDialog(mainWindow, { title: language === 'en' ? (kind === 'background' ? 'Choose Background' : 'Insert Image') : (kind === 'background' ? '选择背景图片' : '插入图片'), defaultPath: config.paths?.[key] || app.getPath('pictures'), properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }] });
  if (result.canceled) return null; await updateConfig({ paths: { [key]: path.dirname(result.filePaths[0]) } }); return `file:///${result.filePaths[0].replace(/\\/g, '/')}`;
}
ipcMain.handle('image:choose', (_e, language) => chooseImage('insert', language));
ipcMain.handle('background:choose', (_e, language) => chooseImage('background', language));
ipcMain.handle('settings:get-global', async () => (await readConfig()).settings || {});
ipcMain.handle('settings:save-global', async (_e, settings) => { await updateConfig({ settings }); return true; });
