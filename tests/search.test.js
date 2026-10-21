import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchEntries, snippet } from '../app/js/search.js';

const entries = [
  { pi: 2, page: { title: 'Tomb visit', text: 'Why do the cabinets look like beds?', transcript: '' } },
  { pi: 3, page: { title: 'Paper page', text: '', transcript: 'Emotions I currently feel' } },
  { pi: 4, page: { title: 'Walk', text: 'Beds of yellow poppies by the path.', transcript: '' } },
];

test('search covers titles, text and transcripts, newest first', () => {
  assert.deepEqual(searchEntries(entries, 'beds').map(h => h.entry.pi), [4, 2]);
  assert.deepEqual(searchEntries(entries, 'EMOTIONS').map(h => h.entry.pi), [3]);
  assert.deepEqual(searchEntries(entries, 'tomb').map(h => h.entry.pi), [2]);
  assert.deepEqual(searchEntries(entries, '   '), []);
});

test('snippets surround the match and mark cut ends', () => {
  const long = { text: 'a'.repeat(100) + ' needle ' + 'b'.repeat(100) };
  const s = snippet(long, 'needle');
  assert.equal(s.match, 'needle');
  assert.equal(s.cutStart, true);
  assert.equal(s.cutEnd, true);
  assert.equal(s.pre.length, 40);
});
