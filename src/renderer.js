const $ = id => document.getElementById(id);
const editor = $('editor');
const editorShell = $('editorShell');
const status = $('status');
const count = $('count');
const dirtyMark = $('dirty');
const topBtn = $('topBtn');
const searchInput = $('searchInput');
const searchResult = $('searchResult');
const modal = $('settingsModal');
const preview = $('settingsPreview');
let currentPath = '';
let dirty = false;
let globalSettings = { backgroundImage: '', backgroundOpacity: 18 };
let noteSettings = defaultNoteSettings();
let draftBackground = '';

function defaultNoteSettings() {
  return { fontSize: 17, lineHeight: 1.8, ruledLines: false, backgroundScope: 'global', backgroundImage: '', backgroundOpacity: 18 };
}
function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
function normalizeNoteSettings(settings = {}) {
  const oldLocalBackground = !settings.backgroundScope && Boolean(settings.backgroundImage);
  return {
    fontSize: clamp(settings.fontSize, 10, 48, 17),
    lineHeight: clamp(settings.lineHeight, 1, 3, 1.8),
    ruledLines: Boolean(settings.ruledLines),
    backgroundScope: settings.backgroundScope || (oldLocalBackground ? 'local' : 'global'),
    backgroundImage: settings.backgroundImage || '',
    backgroundOpacity: clamp(settings.backgroundOpacity, 0, 100, 18)
  };
}
function normalizeGlobalSettings(settings = {}) {
  return { backgroundImage: settings.backgroundImage || '', backgroundOpacity: clamp(settings.backgroundOpacity, 0, 100, 18) };
}
function effectiveBackground(settings = noteSettings) {
  return settings.backgroundScope === 'local'
    ? { image: settings.backgroundImage, opacity: settings.backgroundOpacity }
    : { image: globalSettings.backgroundImage, opacity: globalSettings.backgroundOpacity };
}
function cssImage(image) { return image ? `url("${image.replace(/"/g, '%22')}")` : 'none'; }
function applyNoteSettings() {
  const background = effectiveBackground();
  editor.style.setProperty('--font-size', `${noteSettings.fontSize}px`);
  editor.style.setProperty('--line-height', noteSettings.lineHeight);
  editor.classList.toggle('ruled', noteSettings.ruledLines);
  editorShell.style.setProperty('--background-opacity', background.opacity / 100);
  editorShell.style.setProperty('--note-background', cssImage(background.image));
}
function markDirty(value = true) { dirty = value; dirtyMark.textContent = value ? '•' : ''; }
function updateCount() { count.textContent = `${editor.innerText.trim().length} 字`; }
function notePayload() { return { currentPath, text: editor.innerText, html: editor.innerHTML, settings: noteSettings }; }
function finishSave(saved) {
  if (!saved) return;
  currentPath = saved; status.textContent = saved.split(/[\\/]/).pop(); markDirty(false);
}
async function saveNote() { finishSave(await window.edgeNote.save(notePayload())); }
async function saveNoteAs() { finishSave(await window.edgeNote.saveAs(notePayload())); }
function runSearch(forward = true) {
  const text = searchInput.value.trim();
  if (!text) { window.edgeNote.stopSearch(); searchResult.textContent = ''; return; }
  window.edgeNote.search(text, forward);
}

function selectedScope() { return document.querySelector('input[name="backgroundScope"]:checked').value; }
function setScope(scope) { document.querySelector(`input[name="backgroundScope"][value="${scope}"]`).checked = true; }
function loadModalValues() {
  setScope(noteSettings.backgroundScope);
  const background = effectiveBackground();
  draftBackground = background.image;
  $('backgroundOpacity').value = background.opacity;
  $('opacityValue').textContent = `${background.opacity}%`;
  $('fontSize').value = noteSettings.fontSize;
  $('lineHeight').value = noteSettings.lineHeight;
  $('ruledLines').checked = noteSettings.ruledLines;
  updatePreview();
}
function updatePreview() {
  const opacity = clamp($('backgroundOpacity').value, 0, 100, 18);
  preview.style.setProperty('--preview-background', cssImage(draftBackground));
  preview.style.setProperty('--preview-opacity', opacity / 100);
  preview.style.setProperty('--preview-font-size', `${clamp($('fontSize').value, 10, 48, 17)}px`);
  preview.style.setProperty('--preview-line-height', clamp($('lineHeight').value, 1, 3, 1.8));
  preview.classList.toggle('ruled', $('ruledLines').checked);
  $('opacityValue').textContent = `${opacity}%`;
}
function showSettings() { loadModalValues(); modal.hidden = false; }
function hideSettings() { modal.hidden = true; }

editor.addEventListener('input', () => { markDirty(); updateCount(); });
$('saveBtn').onclick = saveNote;
$('saveAsBtn').onclick = saveNoteAs;
$('openBtn').onclick = async () => {
  const note = await window.edgeNote.open();
  if (!note) return;
  currentPath = note.filePath;
  if (note.html) editor.innerHTML = note.html; else editor.innerText = note.text;
  noteSettings = normalizeNoteSettings(note.settings);
  applyNoteSettings();
  status.textContent = currentPath.split(/[\\/]/).pop(); markDirty(false); updateCount();
};
$('newBtn').onclick = () => {
  if (dirty && !confirm('当前内容尚未保存，确定新建吗？')) return;
  currentPath = ''; editor.innerHTML = ''; noteSettings = defaultNoteSettings(); applyNoteSettings();
  status.textContent = '未命名.txt'; markDirty(false); updateCount(); editor.focus();
};
$('imageBtn').onclick = async () => {
  const src = await window.edgeNote.chooseImage();
  if (!src) return;
  editor.focus(); document.execCommand('insertHTML', false, `<img src="${src}" alt="插入的图片"><div><br></div>`); markDirty(); updateCount();
};
topBtn.onclick = async () => {
  const topmost = await window.edgeNote.toggleTop();
  topBtn.classList.toggle('active', topmost); topBtn.setAttribute('aria-pressed', String(topmost));
  topBtn.title = topmost ? '置顶已开启，点击取消 (Ctrl+T)' : '置顶已关闭，点击开启 (Ctrl+T)';
};

$('settingsBtn').onclick = showSettings;
$('settingsClose').onclick = hideSettings;
$('settingsCancel').onclick = hideSettings;
modal.addEventListener('click', event => { if (event.target === modal) hideSettings(); });
document.querySelectorAll('input[name="backgroundScope"]').forEach(radio => radio.onchange = () => {
  const source = selectedScope() === 'global' ? globalSettings : noteSettings;
  draftBackground = source.backgroundImage || '';
  $('backgroundOpacity').value = source.backgroundOpacity ?? 18;
  updatePreview();
});
$('chooseBackgroundBtn').onclick = async () => { const src = await window.edgeNote.chooseBackground(); if (src) { draftBackground = src; updatePreview(); } };
$('clearBackgroundBtn').onclick = () => { draftBackground = ''; updatePreview(); };
['backgroundOpacity', 'fontSize', 'lineHeight', 'ruledLines'].forEach(id => $(id).addEventListener('input', updatePreview));
$('settingsApply').onclick = async () => {
  const scope = selectedScope();
  const opacity = clamp($('backgroundOpacity').value, 0, 100, 18);
  if (scope === 'global') {
    globalSettings = { backgroundImage: draftBackground, backgroundOpacity: opacity };
    await window.edgeNote.saveGlobalSettings(globalSettings);
  }
  noteSettings = {
    fontSize: clamp($('fontSize').value, 10, 48, 17),
    lineHeight: clamp($('lineHeight').value, 1, 3, 1.8),
    ruledLines: $('ruledLines').checked,
    backgroundScope: scope,
    backgroundImage: scope === 'local' ? draftBackground : noteSettings.backgroundImage,
    backgroundOpacity: scope === 'local' ? opacity : noteSettings.backgroundOpacity
  };
  applyNoteSettings(); markDirty(); hideSettings();
};

searchInput.addEventListener('input', () => runSearch(true));
searchInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); runSearch(!event.shiftKey); }
  if (event.key === 'Escape') $('searchClose').click();
});
$('searchPrev').onclick = () => runSearch(false);
$('searchNext').onclick = () => runSearch(true);
$('searchClose').onclick = () => { searchInput.value = ''; searchResult.textContent = ''; window.edgeNote.stopSearch(); editor.focus(); };
window.edgeNote.onSearchResult(result => { searchResult.textContent = result.matches ? `${result.activeMatchOrdinal}/${result.matches}` : '无结果'; });
$('minBtn').onclick = () => window.edgeNote.minimizeBubble();
$('closeBtn').onclick = () => window.edgeNote.close();
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !modal.hidden) hideSettings();
  if (event.ctrlKey && event.key.toLowerCase() === 's') { event.preventDefault(); if (event.shiftKey) saveNoteAs(); else saveNote(); }
  if (event.ctrlKey && event.key.toLowerCase() === 't') { event.preventDefault(); topBtn.click(); }
  if (event.ctrlKey && event.key.toLowerCase() === 'f') { event.preventDefault(); searchInput.focus(); searchInput.select(); }
});

(async () => {
  globalSettings = normalizeGlobalSettings(await window.edgeNote.getGlobalSettings());
  applyNoteSettings(); updateCount();
})();
