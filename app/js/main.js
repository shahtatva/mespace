import { makeBackup, parseBackup, mergePages, backupFilename } from './backup.js';
import { shortDate, daysAgo, timeAgo } from './dates.js';
import { labelOf, sortPages } from './book.js';
import { READ_ERRORS } from './claude.js';
import { createEditor } from './editor.js';
import { pagesForExport, exportZip, preparePrintView } from './export.js';
import { normalizePage, expiredTrash, daysLeftInTrash, PAPERS, HANDS } from './model.js';
import { createNotebook } from './notebook.js';
import { forgetPhoto, photoURL } from './photos.js';
import { createScanner } from './scanner.js';
import { createSettings } from './settings.js';
import { openStore, requestPersistence } from './store.js';
import { createSync, SYNC_ERRORS } from './sync.js';
import { createTranscriber } from './transcriber.js';
import { $, esc, coarsePointer, uid } from './util.js';

const BACKUP_DUE_DAYS = 14;

const store = await openStore();
let pages = [];
let style = { paper: 'lined', hand: 'print' };
const getKey = () => store.getMeta('claudeKey').catch(() => null);
let deviceId = await store.getMeta('deviceId').catch(() => null);
if (!deviceId) { deviceId = uid(); await store.setMeta('deviceId', deviceId).catch(() => {}); }

/* ---------- toast ---------- */
let toastTimer;
function toast(message, action) {
  const t = $('toast');
  t.replaceChildren(Object.assign(document.createElement('span'), { textContent: message }));
  if (action) {
    const b = Object.assign(document.createElement('button'), { textContent: action.label, className: 'toast-action' });
    b.addEventListener('click', () => { t.classList.remove('show'); action.run(); });
    t.append(b);
  }
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? 6000 : 3200);
}

/* ---------- sheets (Trash, Settings, install help) ---------- */
const SHEETS = ['trashSheet', 'settingsSheet', 'installSheet', 'exportSheet'];
const openSheet = id => { $(id).hidden = false; $(id).querySelector('.sheet-close')?.focus(); };
const closeSheet = id => { $(id).hidden = true; };
const anySheetOpen = () => SHEETS.some(id => !$(id).hidden) || !$('cropSheet').hidden;
for (const btn of document.querySelectorAll('.sheet-close')) btn.addEventListener('click', () => closeSheet(btn.closest('.sheet').id));
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  if (!$('menu').hidden) closeMenu();
  for (const id of SHEETS) if (!$(id).hidden) closeSheet(id);
});

/* ---------- book + editor ---------- */
const notebook = createNotebook({
  store,
  onOpenPage: page => editor.open(page, page.photo ? 'photo' : 'write'),
  onNew: mode => (mode === 'scan' ? scanner.open() : editor.open(null, mode)),
  isBlocked: () => editor.isOpen() || scanner.isOpen() || anySheetOpen() || !$('menu').hidden,
});

const editor = createEditor({
  store,
  toast,
  getKey,
  openSettings: () => settings.open(),
  getStyle: () => style,
  setStyle: s => { style = s; store.setMeta('style', s).catch(() => {}); },
  pageNumberOf: id => notebook.pageNumberOf(id),
  onSaved: async id => {
    await reload(id);
    if (pages.length) requestPersistence();
    sync.request();
  },
  onTrashed: async page => {
    await reload();
    sync.request();
    toast('Moved to Trash', { label: 'Undo', run: () => restorePage(page.id) });
  },
});

async function reload(focusId = null) {
  pages = (await store.allPages()).map(normalizePage).filter(Boolean);
  notebook.setPages(pages, { focusId });
  updateStatus();
  if (!$('trashSheet').hidden) renderTrash();
  settings.refresh();
}

/* ---------- sync between devices ---------- */
let syncState = { status: 'off' };
const sync = createSync({
  store,
  onState: st => { syncState = st; updateStatus(); settings.refreshSync(); },
  onChange: () => reload(),
});

/* ---------- reading handwriting in the background ---------- */
let readState = null;
let reloadTimer;
const transcriber = createTranscriber({
  store,
  getKey,
  deviceId,
  onProgress: state => {
    if (state && state.state === 'done' && state.done) toast(`Finished reading ${state.done} page${state.done === 1 ? '' : 's'}`);
    readState = state && state.state !== 'done' && !(state.state === 'stopped' && !state.left) ? state : null;
    updateStatus();
  },
  onPageChanged: page => {
    editor.refreshIfOpen(page);
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => reload(), 250);
    sync.request(5000);
  },
});

const settings = createSettings({
  store,
  getPages: () => pages,
  transcriber,
  sync,
  onOpenPage: page => editor.open(page, 'photo'),
});

const scanner = createScanner({
  store,
  getKey,
  deviceId,
  toast,
  openSettings: () => settings.open(),
  onAdded: async (ids, { name, read }) => {
    await reload(ids[0]);
    requestPersistence();
    toast(`Added ${ids.length} page${ids.length === 1 ? '' : 's'}${name ? ` from ${name}` : ''}.${read ? ' Claude is reading them now.' : ''}`);
    if (read) transcriber.run();
    sync.request();
  },
});

$('btnNew').addEventListener('click', () => editor.open(null, 'write'));
$('mScan').addEventListener('click', () => scanner.open());
$('mSettings').addEventListener('click', () => settings.open());

/* ---------- status line ---------- */
let statusAction = null;
function setStatus(kind, text, action) {
  $('status').dataset.s = kind;
  $('statusText').textContent = text;
  $('statusAction').hidden = !action;
  if (action) $('statusAction').textContent = action.label;
  statusAction = action ? action.run : null;
}
$('statusAction').addEventListener('click', () => { if (statusAction) statusAction(); });

function readingStatus() {
  if (readState.state === 'reading') {
    return setStatus('busy', `Reading handwriting · ${readState.done + 1} of ${readState.total}`, { label: 'Stop', run: () => transcriber.stop() });
  }
  const n = `${readState.left} page${readState.left === 1 ? '' : 's'}`;
  switch (readState.reason) {
    case 'no-key': return setStatus('warn', `${n} waiting to be read`, { label: 'Set up', run: () => settings.open() });
    case 'offline': return setStatus('warn', `${n} waiting · reading resumes when you’re online`);
    case 'busy': return setStatus('warn', 'Claude is busy · trying again in a minute');
    case 'cancelled': return setStatus('warn', `${n} waiting to be read`, { label: 'Read now', run: () => transcriber.run() });
    default: return setStatus('warn', READ_ERRORS[readState.reason] || READ_ERRORS.failed, { label: 'Settings', run: () => settings.open() });
  }
}

// Problems only I can fix point to Settings; the rest sync retries by itself.
const SYNC_NEEDS_ME = new Set(['bad-token', 'no-repo', 'public-repo', 'no-write']);
function syncStatus() {
  const s = syncState;
  if (s.status === 'syncing') return setStatus('busy', 'Syncing…');
  if (s.status === 'error') {
    return setStatus('warn', SYNC_ERRORS[s.error] || SYNC_ERRORS.failed,
      SYNC_NEEDS_ME.has(s.error) ? { label: 'Settings', run: () => settings.open() } : null);
  }
  setStatus('ok', s.lastSyncAt ? `Synced ${timeAgo(s.lastSyncAt)}` : 'Sync is on', { label: 'Sync now', run: () => sync.run() });
}

async function updateStatus() {
  if (store.kind === 'memory') {
    setStatus('warn', 'This browser isn’t letting the app save. Pages last until you close it.');
    return;
  }
  if (readState) { readingStatus(); return; }
  // With sync on, the repository is the backup, so the backup reminder steps aside.
  if (syncState.status !== 'off') { syncStatus(); return; }
  const last = await store.getMeta('lastBackupAt').catch(() => null);
  if (readState) { readingStatus(); return; }
  const live = pages.filter(p => !p.deletedAt).length;
  const due = live > 0 && (!last || Date.now() - last > BACKUP_DUE_DAYS * 864e5);
  const detail = live === 0 ? '' : last ? `backed up ${daysAgo(last)}` : 'not backed up yet';
  // Phones show only the backup state; there's no room for both.
  setStatus(due ? 'warn' : 'ok',
    !detail ? 'Saved on this device'
      : innerWidth < 760 ? detail[0].toUpperCase() + detail.slice(1)
      : `Saved on this device · ${detail}`,
    due ? { label: 'Back up', run: backupNow } : null);
}
setInterval(updateStatus, 60000);
let statusTimer;
addEventListener('resize', () => { clearTimeout(statusTimer); statusTimer = setTimeout(updateStatus, 150); });

/* ---------- menu ---------- */
const menu = $('menu'), menuBtn = $('menuBtn');
function closeMenu() { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => {
  const opening = menu.hidden;
  menu.hidden = !opening;
  menuBtn.setAttribute('aria-expanded', String(opening));
  if (opening) {
    const trashed = pages.filter(p => p.deletedAt).length;
    $('mTrashCount').textContent = trashed ? String(trashed) : '';
    menu.querySelector('button:not([hidden])')?.focus();
  }
});
document.addEventListener('pointerdown', ev => { if (!menu.hidden && !ev.target.closest('#menu, #menuBtn')) closeMenu(); });
menu.addEventListener('click', ev => { if (ev.target.closest('button')) closeMenu(); });

/* ---------- backup ---------- */
async function saveFile(blob, name) {
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
  if (coarsePointer() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Paperleaf backup' });
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}

async function backupNow() {
  try {
    const [allPages, photos] = await Promise.all([store.allPages(), store.allPhotos()]);
    const blob = new Blob([JSON.stringify(makeBackup(allPages, photos))], { type: 'application/json' });
    const name = backupFilename();
    if (!(await saveFile(blob, name))) return;
    await store.setMeta('lastBackupAt', Date.now());
    toast(`Backup saved as ${name}. Keep it somewhere other than this device.`);
    updateStatus();
  } catch {
    toast('Couldn’t make the backup. Try again.');
  }
}
$('mBackup').addEventListener('click', backupNow);

$('mRestore').addEventListener('click', () => $('restoreFile').click());
$('restoreFile').addEventListener('change', async ev => {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  let data;
  try {
    data = parseBackup(await file.text());
  } catch (e) {
    const why = {
      'newer-version': 'That backup was made by a newer version of Paperleaf. Update the app, then try again.',
    }[e && e.reason] || 'That file isn’t a Paperleaf backup.';
    toast(why);
    return;
  }
  try {
    const current = await store.allPages();
    const { write, added, updated } = mergePages(current, data.pages);
    const have = new Set((await store.allPhotos()).map(ph => ph.id));
    const needed = new Set(write.map(p => p.photo).filter(Boolean));
    for (const ph of data.photos) if (needed.has(ph.id) && !have.has(ph.id)) await store.putPhoto(ph);
    for (const p of write) await store.putPage(p);
    sync.request();
    const newest = sortPages(write.filter(p => !p.deletedAt)).at(-1);
    await reload(newest ? newest.id : null);
    toast(write.length
      ? `Restored ${added} new page${added === 1 ? '' : 's'}${updated ? ` and updated ${updated}` : ''}.`
      : 'Every page in that backup is already here.');
  } catch {
    toast('Couldn’t finish restoring. Nothing already here was changed; try again.');
  }
});

/* ---------- trash ---------- */
async function restorePage(id) {
  const p = pages.find(x => x.id === id);
  if (!p) return;
  await store.putPage({ ...p, deletedAt: null, updatedAt: Date.now() });
  await reload(id);
  sync.request();
  toast('Page restored');
}

async function deleteForever(id) {
  const p = pages.find(x => x.id === id);
  if (!p) return;
  await store.removePage(id);
  if (p.photo) await editor.removeUnusedPhoto(p.photo);
  await sync.forget(id);
  await reload();
}

function renderTrash() {
  const trashed = pages.filter(p => p.deletedAt).sort((a, b) => b.deletedAt - a.deletedAt);
  $('trashList').innerHTML = trashed.length
    ? trashed.map(p => `<li><div class="tr-main"><span class="tr-date">${shortDate(p.date)}</span><span class="tr-title">${esc(labelOf(p))}</span>`
      + `<span class="tr-meta">Deleted ${daysAgo(p.deletedAt)} · removed for good in ${daysLeftInTrash(p)} days</span></div>`
      + `<div class="tr-actions"><button class="btn" data-restore="${esc(p.id)}">Restore</button>`
      + `<button class="btn ghost danger" data-purge="${esc(p.id)}">Delete now</button></div></li>`).join('')
    : '<li class="tr-empty">Trash is empty. Deleted pages stay here for 30 days.</li>';
}
$('mTrash').addEventListener('click', () => { renderTrash(); openSheet('trashSheet'); });
$('trashList').addEventListener('click', ev => {
  const r = ev.target.closest('[data-restore]');
  if (r) { restorePage(r.dataset.restore); return; }
  const d = ev.target.closest('[data-purge]');
  if (!d) return;
  if (d.dataset.confirm) { deleteForever(d.dataset.purge); return; }
  d.dataset.confirm = '1';
  d.textContent = 'Delete for good?';
  setTimeout(() => { if (d.isConnected) { delete d.dataset.confirm; d.textContent = 'Delete now'; } }, 4000);
});

/* ---------- export ---------- */
const exportEntries = () => pagesForExport(pages, $('exFrom').value, $('exTo').value);
function renderExportCount() {
  const n = exportEntries().length;
  $('exCount').textContent = n ? `${n} page${n === 1 ? '' : 's'} to export` : 'No pages in that range.';
  $('exPdf').disabled = $('exZip').disabled = !n;
}
$('mExport').addEventListener('click', () => { renderExportCount(); openSheet('exportSheet'); });
$('exFrom').addEventListener('change', renderExportCount);
$('exTo').addEventListener('change', renderExportCount);

$('exPdf').addEventListener('click', async () => {
  const btn = $('exPdf');
  btn.disabled = true;
  btn.textContent = 'Preparing…';
  try {
    await preparePrintView($('printBook'), exportEntries(), id => photoURL(store, id));
    closeSheet('exportSheet');
    window.print();
  } catch {
    toast('Couldn’t prepare the print view. Try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Open print view';
  }
});
addEventListener('afterprint', () => { $('printBook').innerHTML = ''; });

$('exZip').addEventListener('click', async () => {
  const btn = $('exZip');
  btn.disabled = true;
  btn.textContent = 'Preparing…';
  try {
    const entries = exportEntries();
    const photos = new Map();
    for (const { page } of entries) {
      if (page.photo && !photos.has(page.photo)) {
        const ph = await store.getPhoto(page.photo);
        if (ph) photos.set(page.photo, ph);
      }
    }
    const folder = `paperleaf-export-${new Date().toISOString().slice(0, 10)}`;
    const blob = new Blob([exportZip(entries, photos, folder)], { type: 'application/zip' });
    if (await saveFile(blob, `${folder}.zip`)) toast(`Exported ${entries.length} page${entries.length === 1 ? '' : 's'} as ${folder}.zip`);
  } catch {
    toast('Couldn’t make the export. Try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download .zip';
  }
});

/* ---------- install ---------- */
let installPrompt = null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
$('mInstall').hidden = !(isIOS && !installed());
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  $('mInstall').hidden = false;
});
addEventListener('appinstalled', () => { installPrompt = null; $('mInstall').hidden = true; });
$('mInstall').addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    $('mInstall').hidden = true;
  } else {
    openSheet('installSheet');
  }
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

/* ---------- start ---------- */
await sync.init().catch(() => {});
try {
  const saved = await store.getMeta('style');
  if (saved && PAPERS.includes(saved.paper) && HANDS.includes(saved.hand)) style = saved;
  const all = (await store.allPages()).map(normalizePage).filter(Boolean);
  for (const p of expiredTrash(all)) {
    await store.removePage(p.id);
    await sync.forget(p.id);
    if (p.photo && !all.some(o => o.id !== p.id && o.photo === p.photo)) { await store.removePhoto(p.photo); forgetPhoto(p.photo); }
  }
} catch {
  /* start with whatever loads below */
}
await reload();
// Carry on reading any pages left waiting last time, and catch up with other devices.
transcriber.run();
sync.run();
