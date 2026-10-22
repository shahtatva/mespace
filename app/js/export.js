/*
 * Readable exports: a .zip of Markdown pages, original photos and drawings, and a print view
 * that lays every page out as it looks in the book, for "Save as PDF".
 */
import { buildBook, labelOf, INDEX_ROWS } from './book.js';
import { MONTHS, WEEKDAYS, parseDate, todayISO } from './dates.js';
import { strokeD } from './ink.js';
import { isLive } from './model.js';
import { pageInner } from './render.js';
import { createZip } from './zip.js';

const INK_COLORS = ['#1C2030', '#1F4FAE', '#B0392D'];

/** A file-name-safe version of a title. */
export function safeName(text, max = 60) {
  const s = String(text || '').replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '-').replace(/\s+/g, ' ').trim().slice(0, max).replace(/[ .-]+$/, '');
  return s || 'Untitled';
}

/** Live pages within an optional date range, in book order with their page numbers. */
export function pagesForExport(pages, from = '', to = '') {
  const { entries } = buildBook(pages.filter(isLive));
  return entries.filter(e => (!from || e.page.date >= from) && (!to || e.page.date <= to));
}

/** A page's ink as a standalone SVG, in the light-paper ink colors. */
export function inkSVG(ink) {
  const paths = (ink || []).map(s => `<path d="${strokeD(s.p)}" stroke="${INK_COLORS[(s.c | 0) % 3]}" stroke-width="${+s.w || 3.4}"/>`).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" width="1000" height="1414">'
    + '<rect width="1000" height="1414" fill="#FCFBF7"/>'
    + `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>\n`;
}

const longDate = iso => {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** One page as Markdown. Paths to its photo and drawing are relative to the pages/ folder. */
export function pageMarkdown(page, { no, photoFile, drawingFile } = {}) {
  const meta = [longDate(page.date), no ? `page ${no}` : '', page.notebook ? `from ${page.notebook}` : ''].filter(Boolean).join(' · ');
  const parts = [`# ${labelOf(page)}`, `*${meta}*`];
  if (page.text) parts.push(page.text);
  if (photoFile) parts.push(`![Photo of the paper page](../photos/${encodeURI(photoFile)})`);
  if (page.transcript) parts.push('## What the page says', page.transcript);
  if (drawingFile) parts.push(`![Drawing](../drawings/${encodeURI(drawingFile)})`);
  return parts.join('\n\n') + '\n';
}

/**
 * Every file in the text-and-photos export, under one folder.
 * `photos` maps photo id to { data: ArrayBuffer }.
 */
export function exportFiles(entries, photos, folder) {
  const files = [], used = new Set(), rows = [];
  const unique = base => {
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = `${base} (${n++})`;
    used.add(name.toLowerCase());
    return name;
  };
  for (const { page, no } of entries) {
    const base = unique(`${page.date} ${safeName(labelOf(page))}`);
    const photo = page.photo && photos.get(page.photo);
    const photoFile = photo ? `${base}.jpg` : '';
    const drawingFile = page.ink && page.ink.length ? `${base}.svg` : '';
    if (photo) files.push({ name: `${folder}/photos/${photoFile}`, data: new Uint8Array(photo.data) });
    if (drawingFile) files.push({ name: `${folder}/drawings/${drawingFile}`, data: inkSVG(page.ink) });
    files.push({ name: `${folder}/pages/${base}.md`, data: pageMarkdown(page, { no, photoFile, drawingFile }) });
    rows.push(`| ${page.date} | ${no} | [${labelOf(page).replace(/\|/g, '\\|')}](pages/${encodeURI(base)}.md) |`);
  }
  const index = ['# Paperleaf journal', `${entries.length} page${entries.length === 1 ? '' : 's'}, exported ${longDate(todayISO())}.`,
    '| Date | Page | Entry |\n|---|---|---|\n' + rows.join('\n')].join('\n\n') + '\n';
  return [{ name: `${folder}/index.md`, data: index }, ...files];
}

export const exportZip = (entries, photos, folder) => createZip(exportFiles(entries, photos, folder));

/**
 * Fills the print container with the index and every exported page, one per printed sheet,
 * then resolves once all photos have loaded so printing captures them.
 */
export async function preparePrintView(container, entries, loadPhotoURL) {
  const of = Math.max(1, Math.ceil(entries.length / INDEX_ROWS));
  const ctx = { entries, indexRows: INDEX_ROWS, loading: false };
  const sheets = [];
  for (let part = 0; part < of; part++) sheets.push(pageInner({ kind: 'index', part, of }, part + 1, ctx));
  for (const e of entries) sheets.push(pageInner({ kind: 'entry', entry: e }, e.no, ctx));
  container.innerHTML = sheets.map((html, i) => `<div class="page ${i % 2 ? 'l' : 'r'}">${html}</div>`).join('');
  const imgs = [...container.querySelectorAll('img[data-photo]')];
  await Promise.all(imgs.map(async img => {
    try {
      img.src = await loadPhotoURL(img.dataset.photo);
      await img.decode();
    } catch {
      img.parentElement.classList.add('broken');
    }
  }));
}
