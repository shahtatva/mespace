import { makeBackup, parseBackup, mergePages, backupFilename } from './backup.js';
import { shortDate, daysAgo } from './dates.js';
import { labelOf, sortPages } from './book.js';
import { createEditor } from './editor.js';
import { normalizePage, expiredTrash, daysLeftInTrash, PAPERS, HANDS } from './model.js';
import { createNotebook } from './notebook.js';
import { forgetPhoto } from './photos.js';
import { openStore, requestPersistence } from './store.js';
import { $, esc, coarsePointer } from './util.js';

const BACKUP_DUE_DAYS = 14;

const store = await openStore();
let pages = [];
let style = { paper: 'lined', hand: 'print' };

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

/* ---------- sheets (Trash, install help) ---------- */
const openSheet = id => { $(id).hidden = false; $(id).querySelector('.sheet-close')?.focus(); };
const closeSheet = id => { $(id).hidden = true; };
const anySheetOpen = () => !$('trashSheet').hidden || !$('installSheet').hidden;
for (const btn of document.querySelectorAll('.sheet-close')) btn.addEventListener('click', () => closeSheet(btn.closest('.sheet').id));
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  if (!$('menu').hidden) closeMenu();
  for (const id of ['trashSheet', 'installSheet']) if (!$(id).hidden) closeSheet(id);
});

/* ---------- book + editor ---------- */
const notebook = createNotebook({
  store,
  onOpenPage: page => editor.open(page, page.photo ? 'photo' : 'write'),
  onNew: mode => editor.open(null, mode),
  isBlocked: () => editor.isOpen() || anySheetOpen() || !$('menu').hidden,
});

const editor = createEditor({
  store,
  toast,
  getStyle: () => style,
  setStyle: s => { style = s; store.setMeta('style', s).catch(() => {}); },
  pageNumberOf: id => notebook.pageNumberOf(id),
  onSaved: async id => {
    await reload(id);
    if (pages.length) requestPersistence();
  },
  onTrashed: async page => {
    await reload();
    toast('Moved to Trash', { label: 'Undo', run: () => restorePage(page.id) });
  },
});

async function reload(focusId = null) {
  pages = (await store.allPages()).map(normalizePage).filter(Boolean);
  notebook.setPages(pages, { focusId });
  updateStatus();
  if (!$('trashSheet').hidden) renderTrash();
}

$('btnNew').addEventListener('click', () => editor.open(null, 'write'));

/* ---------- status line ---------- */
async function updateStatus() {
  const st = $('status'), text = $('statusText'), btn = $('statusBackup');
  btn.hidden = true;
  if (store.kind === 'memory') {
    st.dataset.s = 'warn';
    text.textContent = 'This browser isn’t letting the app save. Pages last until you close it.';
    return;
  }
  const last = await store.getMeta('lastBackupAt').catch(() => null);
  const live = pages.filter(p => !p.deletedAt).length;
  const due = live > 0 && (!last || Date.now() - last > BACKUP_DUE_DAYS * 864e5);
  st.dataset.s = due ? 'warn' : 'ok';
  const detail = live === 0 ? '' : last ? `backed up ${daysAgo(last)}` : 'not backed up yet';
  // Phones show only the backup state; there's no room for both.
  text.textContent = !detail ? 'Saved on this device'
    : innerWidth < 760 ? detail[0].toUpperCase() + detail.slice(1)
    : `Saved on this device · ${detail}`;
  btn.hidden = !due;
}
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
  const file = new File([blob], name, { type: 'application/json' });
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
$('statusBackup').addEventListener('click', backupNow);

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
  await store.putPage({ ...p, deletedAt: null });
  await reload(id);
  toast('Page restored');
}

async function deleteForever(id) {
  const p = pages.find(x => x.id === id);
  if (!p) return;
  await store.removePage(id);
  if (p.photo) await editor.removeUnusedPhoto(p.photo);
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
try {
  const saved = await store.getMeta('style');
  if (saved && PAPERS.includes(saved.paper) && HANDS.includes(saved.hand)) style = saved;
  const all = (await store.allPages()).map(normalizePage).filter(Boolean);
  for (const p of expiredTrash(all)) {
    await store.removePage(p.id);
    if (p.photo && !all.some(o => o.id !== p.id && o.photo === p.photo)) { await store.removePhoto(p.photo); forgetPhoto(p.photo); }
  }
} catch {
  /* start with whatever loads below */
}
await reload();
