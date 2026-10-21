import { isLive } from './model.js';

export const LINES = 17;
export const INDEX_ROWS = 17;

export function sortPages(pages) {
  return [...pages].sort((a, b) => String(a.date).localeCompare(String(b.date)) || (a.createdAt || 0) - (b.createdAt || 0));
}

export const firstLine = p => String(p.text || p.transcript || '').trim().split('\n')[0].slice(0, 70);
export const labelOf = p => p.title || firstLine(p) || (p.photo ? 'Paper page' : 'Untitled page');

/**
 * Lays live pages out as a book: index page(s), the guide, every entry in date order,
 * then a blank "new page", padded to an even count so spreads always pair up.
 * Returns the page list plus each entry's position (pi, 0-based) and printed page number (no).
 */
export function buildBook(pages) {
  const sorted = sortPages(pages.filter(isLive));
  const nIndex = Math.max(1, Math.ceil(sorted.length / INDEX_ROWS));
  const book = [];
  for (let i = 0; i < nIndex; i++) book.push({ kind: 'index', part: i, of: nIndex });
  book.push({ kind: 'guide' });
  const entries = sorted.map(page => {
    const e = { page, pi: book.length, no: book.length + 1 };
    book.push({ kind: 'entry', entry: e });
    return e;
  });
  book.push({ kind: 'new' });
  if (book.length % 2) book.push({ kind: 'blank' });
  return { book, entries };
}

export const viewCount = (len, single) => (single ? len : Math.ceil(len / 2));
export const viewOf = (pi, single) => (single ? pi : Math.floor(pi / 2));
export const pagesOfView = (v, single) => (single ? [null, v] : [2 * v, 2 * v + 1]);
export const firstPageOfView = (v, single) => (single ? v : 2 * v);

/** One tab per month that has pages (the latest `max` months), pointing at that month's first page. */
export function monthTabs(entries, max = 12) {
  const first = new Map();
  for (const e of entries) {
    const key = String(e.page.date).slice(0, 7);
    if (!first.has(key)) first.set(key, e.pi);
  }
  const tabs = [...first].slice(-max).map(([key, pi]) => ({ key, year: +key.slice(0, 4), month: +key.slice(5, 7) - 1, pi }));
  return { tabs, multiYear: new Set(tabs.map(t => t.year)).size > 1 };
}
