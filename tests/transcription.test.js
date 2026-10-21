import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReading, chainImportDates, countUnclear } from '../app/js/transcription.js';

const page = extra => ({ id: 'p', date: '2026-10-21', title: '', transcript: '', dateSet: 'guess', importSeq: 0, ...extra });
const reading = extra => ({ text: 'Went for a walk.', date: null, title: 'A walk', legible: true, ...extra });

test('a reading fills the text, the empty title and a guessed date', () => {
  const p = applyReading(page(), reading({ date: '2025-05-18' }), 5);
  assert.equal(p.transcript, 'Went for a walk.');
  assert.equal(p.transcriptAI, 'Went for a walk.');
  assert.equal(p.title, 'A walk');
  assert.equal(p.date, '2025-05-18');
  assert.equal(p.dateSet, 'page');
  assert.equal(p.transcriptStatus, 'done');
  assert.equal(p.needsCheck, false);
  assert.equal(p.updatedAt, 5);
});

test('a reading never replaces a title I wrote or a date I set', () => {
  const p = applyReading(page({ title: 'Mine', dateSet: 'user' }), reading({ date: '2025-05-18' }));
  assert.equal(p.title, 'Mine');
  assert.equal(p.date, '2026-10-21');
});

test('unclear words or an unreadable photo mark the page for checking', () => {
  assert.equal(countUnclear('the cabnets[?] look [illegible] like beds'), 2);
  assert.equal(applyReading(page(), reading({ text: 'cabnets[?]' })).needsCheck, true);
  assert.equal(applyReading(page(), reading({ legible: false, text: '' })).needsCheck, true);
});

test('imported pages without a written date take the date of the page before', () => {
  const pages = [
    page({ id: 'a', importSeq: 0, date: '2025-05-18', dateSet: 'page' }),
    page({ id: 'b', importSeq: 1, date: '2026-10-21' }),
    page({ id: 'c', importSeq: 2, date: '2026-10-21' }),
    page({ id: 'd', importSeq: 3, date: '2025-05-20', dateSet: 'page' }),
    page({ id: 'e', importSeq: 4, date: '2026-10-21' }),
  ];
  const changed = chainImportDates(pages, 9);
  assert.deepEqual(changed.map(p => [p.id, p.date]), [['b', '2025-05-18'], ['c', '2025-05-18'], ['e', '2025-05-20']]);
  assert.equal(changed[0].dateSet, 'guess');
});

test('a guessed first page sets the starting date, and nothing changes when dates already agree', () => {
  const pages = [page({ id: 'a', date: '2024-01-01' }), page({ id: 'b', importSeq: 1, date: '2024-01-01' })];
  assert.deepEqual(chainImportDates(pages), []);
});
