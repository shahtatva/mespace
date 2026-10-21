import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePage, expiredTrash, daysLeftInTrash, blankPage } from '../app/js/model.js';

test('normalizePage rejects records without an id or a valid date', () => {
  assert.equal(normalizePage(null), null);
  assert.equal(normalizePage({ date: '2026-10-21' }), null);
  assert.equal(normalizePage({ id: 'a', date: 'yesterday' }), null);
});

test('normalizePage fills defaults and cleans bad fields', () => {
  const p = normalizePage({ id: 'a', date: '2026-10-21', paper: 'graph', hand: 42, ink: [{ c: 7, w: 'x', p: [1.4, 2.6, 3] }, { p: [] }, null] });
  assert.equal(p.paper, 'lined');
  assert.equal(p.hand, 'print');
  assert.deepEqual(p.ink, [{ c: 1, w: 3.4, p: [1, 3] }]);
  assert.equal(p.photo, null);
  assert.equal(p.deletedAt, null);
  assert.equal(p.text, '');
});

test('blankPage uses today unless given a valid date', () => {
  assert.equal(blankPage({ date: '2026-01-02' }).date, '2026-01-02');
  assert.match(blankPage({ date: 'nope' }).date, /^\d{4}-\d{2}-\d{2}$/);
});

test('trash keeps pages for 30 days', () => {
  const now = Date.UTC(2026, 9, 21);
  const pages = [
    { id: 'live', deletedAt: null },
    { id: 'recent', deletedAt: now - 2 * 864e5 },
    { id: 'old', deletedAt: now - 31 * 864e5 },
  ];
  assert.deepEqual(expiredTrash(pages, now).map(p => p.id), ['old']);
  assert.equal(daysLeftInTrash(pages[1], now), 28);
});
