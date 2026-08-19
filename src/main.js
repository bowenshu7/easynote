const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const fs = require('fs/promises');
const path = require('path');
let mainWindow, bubbleWindow, allowClose = false;
let bubbleDragInterval = null, bubbleDragTimeout = null, bubbleDragStart = null, bubbleDragOffset = null;
let bubbleMode = 'bubble';
const BUBBLE_SIZE = 58, MARKER_WIDTH = 14, MARKER_HEIGHT = 42, EDGE_THRESHOLD = 24, SCREEN_MARGIN = 4;
const appConfigPath = () => path.join(app.getPath('userData'), 'app-settings.json');
const bubbleStatePath = () => path.join(app.getPath('userData'), 'bubble-state.json');
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
async function readBubbleState() {
  try { return JSON.parse(await fs.readFile(bubbleStatePath(), 'utf8')); }
  catch { return null; }
}
async function saveBubbleState(display, bounds) {
  try { await fs.writeFile(bubbleStatePath(), JSON.stringify({ mode: bubbleMode, displayId: display.id, x: bounds.x, y: bounds.y }, null, 2), 'utf8'); }
  catch {}
}
function bubbleDisplay(state) {
  const displays = screen.getAllDisplays();
  return displays.find(display => String(display.id) === String(state?.displayId)) ||
    screen.getDisplayNearestPoint(state && Number.isFinite(state.x) && Number.isFinite(state.y) ? { x: state.x, y: state.y } : screen.getCursorScreenPoint());
}
function markerBounds(side, y, area) {
  return {
    x: side === 'left' ? area.x : area.x + area.width - MARKER_WIDTH,
    y: Math.max(area.y + SCREEN_MARGIN, Math.min(Math.round(y), area.y + area.height - MARKER_HEIGHT - SCREEN_MARGIN)),
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT
  };
}
function bubbleBounds(x, y, area) {
  return {
    x: Math.max(area.x + SCREEN_MARGIN, Math.min(Math.round(x), area.x + area.width - BUBBLE_SIZE - SCREEN_MARGIN)),
    y: Math.max(area.y + SCREEN_MARGIN, Math.min(Math.round(y), area.y + area.height - BUBBLE_SIZE - SCREEN_MARGIN)),
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE
  };
}
function setBubbleMode(mode, bounds) {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) return;
  bubbleMode = mode; bubbleWindow.setBounds(bounds, true); bubbleWindow.webContents.send('bubble:mode', mode);
}
async function createBubble() {
  if (bubbleWindow) return;
  const state = await readBubbleState(); const display = bubbleDisplay(state); const area = display.workArea;
  bubbleMode = ['left', 'right'].includes(state?.mode) ? state.mode : 'bubble';
  const initialBounds = bubbleMode === 'bubble'
    ? bubbleBounds(state?.x ?? area.x + area.width - BUBBLE_SIZE - SCREEN_MARGIN, state?.y ?? area.y + Math.round(area.height * .36), area)
    : markerBounds(bubbleMode, state?.y ?? area.y + Math.round(area.height * .36), area);
  bubbleWindow = new BrowserWindow({ ...initialBounds, frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });
  bubbleWindow.loadFile(path.join(__dirname, 'bubble.html')); bubbleWindow.webContents.once('did-finish-load', () => bubbleWindow?.webContents.send('bubble:mode', bubbleMode));
  bubbleWindow.on('closed', () => { stopBubbleDrag(); bubbleWindow = null; });
}
function stopBubbleDrag() {
  if (bubbleDragInterval) clearInterval(bubbleDragInterval);
  if (bubbleDragTimeout) clearTimeout(bubbleDragTimeout);
  bubbleDragInterval = null; bubbleDragTimeout = null;
}
function startBubbleDrag(offset) {
  if (!bubbleWindow || bubbleMode !== 'bubble') return false;
  stopBubbleDrag(); bubbleDragStart = screen.getCursorScreenPoint(); bubbleDragOffset = offset;
  bubbleDragInterval = setInterval(() => {
    if (!bubbleWindow || bubbleWindow.isDestroyed()) return stopBubbleDrag();
    const cursor = screen.getCursorScreenPoint(); bubbleWindow.setPosition(Math.round(cursor.x - bubbleDragOffset.x), Math.round(cursor.y - bubbleDragOffset.y));
  }, 16);
  bubbleDragTimeout = setTimeout(() => endBubbleDrag(), 10000);
  return true;
}
async function endBubbleDrag() {
  stopBubbleDrag(); if (!bubbleWindow || !bubbleDragStart) return false;
  const cursor = screen.getCursorScreenPoint(); const moved = Math.hypot(cursor.x - bubbleDragStart.x, cursor.y - bubbleDragStart.y) > 4;
  if (moved) {
    const display = screen.getDisplayNearestPoint(cursor); const area = display.workArea;
    const desired = bubbleBounds(cursor.x - bubbleDragOffset.x, cursor.y - bubbleDragOffset.y, area);
    const leftDistance = Math.abs((cursor.x - bubbleDragOffset.x) - area.x);
    const rightDistance = Math.abs(area.x + area.width - (cursor.x - bubbleDragOffset.x + BUBBLE_SIZE));
    if (leftDistance <= EDGE_THRESHOLD) setBubbleMode('left', markerBounds('left', desired.y + (BUBBLE_SIZE - MARKER_HEIGHT) / 2, area));
    else if (rightDistance <= EDGE_THRESHOLD) setBubbleMode('right', markerBounds('right', desired.y + (BUBBLE_SIZE - MARKER_HEIGHT) / 2, area));
    else setBubbleMode('bubble', desired);
    await saveBubbleState(display, bubbleWindow.getBounds());
  }
  bubbleDragStart = null; bubbleDragOffset = null; return moved;
}
async function expandBubble() {
  if (!bubbleWindow || bubbleMode === 'bubble') return false;
  const side = bubbleMode; const current = bubbleWindow.getBounds(); const display = screen.getDisplayMatching(current); const area = display.workArea;
  const x = side === 'left' ? area.x + SCREEN_MARGIN : area.x + area.width - BUBBLE_SIZE - SCREEN_MARGIN;
  const bounds = bubbleBounds(x, current.y - (BUBBLE_SIZE - MARKER_HEIGHT) / 2, area);
  setBubbleMode('bubble', bounds); await saveBubbleState(display, bounds); return true;
}
function restoreMain() { if (!mainWindow) createMainWindow(); if (bubbleWindow) bubbleWindow.close(); mainWindow.show(); mainWindow.restore(); mainWindow.focus(); }
app.whenReady().then(() => { createMainWindow(); app.on('activate', () => { if (!mainWindow) createMainWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
ipcMain.handle('window:toggle-top', () => { const next = !mainWindow.isAlwaysOnTop(); mainWindow.setAlwaysOnTop(next); return next; });
ipcMain.handle('window:minimize-bubble', async () => { mainWindow.hide(); await createBubble(); });
ipcMain.handle('window:restore', restoreMain);
ipcMain.handle('window:force-close', () => { allowClose = true; mainWindow.close(); });
ipcMain.handle('window:confirm-close', async (_event, language = 'zh') => {
  const en = language === 'en'; const result = await dialog.showMessageBox(mainWindow, { type: 'question', title: en ? 'Unsaved changes' : '未保存的修改', message: en ? 'Save changes before closing?' : '关闭应用前是否保存当前修改？', detail: en ? 'Unsaved text and display changes will be lost.' : '未保存的文字和显示设置将会丢失。', buttons: en ? ['Save', "Don't Save", 'Cancel'] : ['保存', '不保存', '取消'], defaultId: 0, cancelId: 2, noLink: true });
  return ['save', 'discard', 'cancel'][result.response];
});
ipcMain.handle('bubble:drag-start', (_event, offset) => startBubbleDrag(offset));
ipcMain.handle('bubble:drag-end', () => endBubbleDrag());
ipcMain.handle('bubble:get-mode', () => bubbleMode);
ipcMain.handle('bubble:expand', () => expandBubble());
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
