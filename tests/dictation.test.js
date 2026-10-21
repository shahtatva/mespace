import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSegment, mergeResults, joinText } from '../app/js/dictation.js';

const fin = text => ({ isFinal: true, text });
const tmp = text => ({ isFinal: false, text });

test('saying a word three times keeps it three times', () => {
  assert.equal(mergeResults([fin('okay'), fin(' okay'), fin(' okay')]).final, 'okay okay okay');
});

test('Chrome on Android repeating earlier phrases does not duplicate them', () => {
  assert.equal(mergeResults([fin('okay'), fin('okay okay'), fin('okay okay okay')]).final, 'okay okay okay');
  assert.equal(mergeResults([fin('I went'), fin('I went to the park'), fin('I went to the park today')]).final, 'I went to the park today');
});

test('rebuilding from the whole result list means re-sent results are not added twice', () => {
  const list = [fin('hello there'), tmp('how are')];
  const once = mergeResults(list);
  const again = mergeResults(list);
  assert.deepEqual(once, again);
  assert.deepEqual(once, { final: 'hello there', interim: 'how are' });
});

test('in-progress text that repeats the finished words only shows the new ones', () => {
  assert.equal(mergeResults([fin('good morning'), tmp('good morning everyone')]).interim, 'everyone');
  assert.equal(mergeResults([fin('good morning'), tmp('Good morning.')]).interim, '');
});

test('repeats are matched ignoring case and punctuation', () => {
  assert.equal(mergeSegment('Okay.', 'okay, okay'), 'okay, okay');
  assert.equal(mergeSegment('', ' first '), 'first');
  assert.equal(mergeSegment('kept', '   '), 'kept');
});

test('joinText spaces and capitalizes dictated words', () => {
  assert.equal(joinText('', 'hello'), 'Hello');
  assert.equal(joinText('It rained.', 'then it stopped'), 'It rained. Then it stopped');
  assert.equal(joinText('and', 'more'), 'and more');
  assert.equal(joinText('Line one\n', 'next'), 'Line one\nNext');
  assert.equal(joinText('same', ''), 'same');
});
