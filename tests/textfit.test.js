import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitText, contTitle } from '../app/js/textfit.js';

const fits20 = s => s.length <= 20;

test('text that fits stays on one page', () => {
  assert.deepEqual(splitText('short entry', fits20), ['short entry']);
});

test('long text splits at word boundaries and loses nothing but the break spaces', () => {
  const text = 'one two three four five six seven eight nine ten eleven twelve';
  const chunks = splitText(text, fits20);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(fits20));
  assert.equal(chunks.join(' '), text);
});

test('a single word longer than a page is cut rather than looping', () => {
  const chunks = splitText('x'.repeat(50), fits20);
  assert.deepEqual(chunks.map(c => c.length), [20, 20, 10]);
});

test('continuation titles are marked once', () => {
  assert.equal(contTitle('Long day'), 'Long day (cont.)');
  assert.equal(contTitle('Long day (cont.)'), 'Long day (cont.)');
  assert.equal(contTitle(''), '(cont.)');
});
