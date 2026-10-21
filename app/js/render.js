import { MONTHS, WEEKDAYS, pad2, isoWeek, parseDate, shortDate } from './dates.js';
import { LINES, labelOf } from './book.js';
import { strokeD } from './ink.js';
import { esc } from './util.js';

const RULED = '<svg class="pp-svg" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true">'
  + Array.from({ length: LINES }, (_, k) => `<line class="r" x1="0" x2="1000" y1="${376 + 56 * k}" y2="${376 + 56 * k}"/>`).join('')
  + '<line class="m" x1="125" x2="125" y1="220" y2="1324"/></svg>';

export function paperHTML(paper, faint) {
  const inner = paper === 'dot' ? '<div class="pp-dots"></div>' : paper === 'plain' ? '' : RULED;
  return `<div class="pp${faint ? ' faint' : ''}">${inner}</div>`;
}

export function headHTML(d) {
  return `<div class="pg-head"><div class="ph-day"><span class="day">${d.getDate()}</span><span class="wd">${WEEKDAYS[d.getDay()]}</span></div>`
    + `<div class="meta"><span>W${pad2(isoWeek(d))}</span><span>${MONTHS[d.getMonth()].slice(0, 3)}</span><span>${d.getFullYear()}</span></div></div>`;
}

export const strokeHTML = s => `<path class="ink${(s.c | 0) % 3}" stroke-width="${+s.w || 3.4}" d="${strokeD(s.p)}"/>`;

const inkHTML = ink => `<svg class="pg-ink" viewBox="0 0 1000 1414" preserveAspectRatio="none" aria-hidden="true">${(ink || []).map(strokeHTML).join('')}</svg>`;

function photoBox(aspect) {
  const W = 83.5, H = 94.5, pad = 3.2;
  const a = aspect > 0 ? aspect : 0.75;
  let iw = W - pad, ih = iw / a;
  if (ih > H - pad) { ih = H - pad; iw = ih * a; }
  return { iw: +iw.toFixed(2), ih: +ih.toFixed(2) };
}

/** A photo taped onto the page. Pass `id` for a stored photo (filled in later) or `src` for a preview. */
export function photoHTML({ id, src }, aspect) {
  const { iw, ih } = photoBox(aspect);
  const source = id ? `data-photo="${esc(id)}"` : `src="${esc(src)}"`;
  return `<figure><img ${source} alt="Photo of a handwritten journal page" style="width:${iw}cqw;height:${ih}cqw">`
    + '<span class="tape t1"></span><span class="tape t2"></span></figure>';
}

const handClass = hand => (hand === 'script' ? 'hand-script' : 'hand-print');

function entryHTML(page, no) {
  const hand = handClass(page.hand);
  const body = page.photo
    ? `<div class="pg-photo">${photoHTML({ id: page.photo }, page.photoAspect)}</div>`
    : `<div class="pg-text ${hand}">${esc(page.text)}</div>`;
  return paperHTML(page.paper) + headHTML(parseDate(page.date))
    + `<div class="pg-title ${hand}">${esc(page.title)}</div>` + body + inkHTML(page.ink)
    + `<div class="pg-num">${no}</div>`;
}

function indexHTML(p, no, ctx) {
  const rows = ctx.entries.slice(p.part * ctx.indexRows, (p.part + 1) * ctx.indexRows).map(e =>
    `<button class="ix-row" data-goto="${e.pi}"><span class="ix-date">${shortDate(e.page.date)}</span>`
    + `<span class="ix-title">${esc(labelOf(e.page))}</span><span class="ix-no">${e.no}</span></button>`).join('');
  const count = ctx.entries.length;
  const empty = ctx.loading ? 'Opening your notebook…' : 'Each page you add is listed here, one per line.';
  return paperHTML('lined')
    + `<div class="pg-head"><span class="big">Index${p.of > 1 ? ` <small>${p.part + 1}/${p.of}</small>` : ''}</span>`
    + `<div class="meta"><span>${count} ${count === 1 ? 'page' : 'pages'}</span></div></div>`
    + '<div class="ix-cols"><span>Date</span><span>Entry</span><span>Page</span></div>'
    + (count ? `<div class="ix-list">${rows}</div>` : `<div class="ix-empty hand-print">${empty}</div>`)
    + `<div class="pg-num">${no}</div>`;
}

const GUIDE = [
  'This notebook keeps your pages the way paper does, without the shelf space. Every entry is a page you can fill however you like.',
  '',
  '<span class="lead">→ Write:</span> type on the lines and it lands in handwriting.',
  '<span class="lead">→ Draw:</span> pick up the pen and sketch anywhere on the page.',
  '<span class="lead">→ Speak:</span> talk, and your words fill the lines.',
  '<span class="lead">→ Photo:</span> tape in a picture of a paper page.',
  '',
  'Pages stay on this device. Make a backup from the menu now and then.',
  '',
  'Revisit when necessary!',
].join('\n');

function guideHTML(no) {
  return paperHTML('lined')
    + '<div class="pg-head"><span class="big hand">Start here!</span><div class="meta"><span>A guide</span></div></div>'
    + '<div class="pg-title hand-print">How this notebook works</div>'
    + `<div class="pg-text hand-print">${GUIDE}</div>`
    + `<div class="pg-num">${no}</div>`;
}

function newHTML(no, ctx) {
  return paperHTML('lined', true) + `<div class="pp faint">${headHTML(new Date())}</div>`
    + `<div class="new-cta"><p>${ctx.entries.length ? 'A fresh page' : 'Your first page'}</p>`
    + '<button class="btn primary" data-act="write">Write today’s page</button>'
    + '<button class="btn ghost" data-act="photo">Import a paper page</button></div>'
    + `<div class="pg-num">${no}</div>`;
}

/** Inner HTML for one page of the book. `ctx` carries { entries, indexRows, loading }. */
export function pageInner(p, no, ctx) {
  switch (p.kind) {
    case 'index': return indexHTML(p, no, ctx);
    case 'guide': return guideHTML(no);
    case 'entry': return entryHTML(p.entry.page, no);
    case 'new': return newHTML(no, ctx);
    default: return paperHTML('lined', true) + `<div class="pg-num">${no}</div>`;
  }
}
