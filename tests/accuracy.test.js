import { test } from 'node:test';
import assert from 'node:assert/strict';
import { words, wordEdits, pageAccuracy, accuracySummary } from '../app/js/accuracy.js';

test('words ignore case, punctuation and unclear-word markers', () => {
  assert.deepEqual(words('Why do they look like beds? cabnets[?] [illegible]'), ['why', 'do', 'they', 'look', 'like', 'beds', 'cabnets']);
});

test('edit distance counts substitutions, insertions and deletions', () => {
  assert.equal(wordEdits(['a', 'b', 'c'], ['a', 'b', 'c']), 0);
  assert.equal(wordEdits(['a', 'b', 'c'], ['a', 'x', 'c']), 1);
  assert.equal(wordEdits(['a', 'b', 'c'], ['a', 'c']), 1);
  assert.equal(wordEdits(['a', 'b'], ['a', 'b', 'c', 'd']), 2);
});

test('only checked pages with a reading count, weighted by their words', () => {
  const pages = [
    { transcriptChecked: true, transcriptAI: 'the cabnets look like beds', transcript: 'The cabinets look like beds.' },
    { transcriptChecked: true, transcriptAI: 'one two three four five', transcript: 'one two three four five' },
    { transcriptChecked: false, transcriptAI: 'x', transcript: 'y' },
    { transcriptChecked: true, transcriptAI: '', transcript: 'typed by hand' },
  ];
  assert.deepEqual(pageAccuracy(pages[0]), { words: 5, edits: 1 });
  const s = accuracySummary(pages);
  assert.equal(s.pages, 2);
  assert.equal(s.words, 10);
  assert.equal(s.edits, 1);
  assert.equal(s.accuracy, 0.9);
});

test('no checked pages means no accuracy figure', () => {
  assert.equal(accuracySummary([]).accuracy, null);
});
