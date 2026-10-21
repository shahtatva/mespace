import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBook, monthTabs, viewOf, pagesOfView, viewCount, labelOf, INDEX_ROWS } from '../app/js/book.js';

const page = (id, date, extra = {}) => ({ id, date, title: '', text: '', createdAt: 0, deletedAt: null, ...extra });

test('an empty book has the index, the guide, a fresh page and a blank', () => {
  const { book, entries } = buildBook([]);
  assert.deepEqual(book.map(p => p.kind), ['index', 'guide', 'new', 'blank']);
  assert.equal(entries.length, 0);
});

test('entries are in date order, then creation order, and trashed pages are left out', () => {
  const { book, entries } = buildBook([
    page('b', '2026-10-02'),
    page('c2', '2026-10-21', { createdAt: 2 }),
    page('a', '2026-09-14'),
    page('gone', '2026-09-20', { deletedAt: 1 }),
    page('c1', '2026-10-21', { createdAt: 1 }),
  ]);
  assert.deepEqual(entries.map(e => e.page.id), ['a', 'b', 'c1', 'c2']);
  assert.equal(entries[0].pi, 2);
  assert.equal(entries[0].no, 3);
  assert.equal(book.length % 2, 0);
  assert.equal(book[entries.at(-1).pi + 1].kind, 'new');
});

test('the index grows a page for every INDEX_ROWS entries', () => {
  const many = Array.from({ length: INDEX_ROWS + 1 }, (_, i) => page('p' + i, '2026-01-01', { createdAt: i }));
  const { book } = buildBook(many);
  assert.deepEqual(book.slice(0, 3).map(p => p.kind), ['index', 'index', 'guide']);
});

test('month tabs point at the first page of each month', () => {
  const { entries } = buildBook([page('a', '2025-12-30'), page('b', '2026-01-05'), page('c', '2026-01-09')]);
  const { tabs, multiYear } = monthTabs(entries);
  assert.deepEqual(tabs.map(t => [t.key, t.pi]), [['2025-12', 2], ['2026-01', 3]]);
  assert.equal(multiYear, true);
});

test('views pair pages into spreads, or show one page at a time', () => {
  assert.equal(viewOf(5, false), 2);
  assert.deepEqual(pagesOfView(2, false), [4, 5]);
  assert.equal(viewOf(5, true), 5);
  assert.equal(viewCount(8, false), 4);
});

test('labels fall back from title to first line to page type', () => {
  assert.equal(labelOf({ title: 'Walk', text: 'x' }), 'Walk');
  assert.equal(labelOf({ title: '', text: '\nFirst line\nsecond' }), 'First line');
  assert.equal(labelOf({ title: '', text: '', photo: 'p1' }), 'Paper page');
  assert.equal(labelOf({ title: '', text: '' }), 'Untitled page');
});
