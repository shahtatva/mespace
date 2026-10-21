import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strokeD, addPoint, eraseAt } from '../app/js/ink.js';

test('a single tap still draws a dot', () => {
  assert.match(strokeD([10, 20]), /^M10 20L10\.1 20$/);
});

test('longer strokes are smoothed with quadratic curves', () => {
  const d = strokeD([0, 0, 10, 10, 20, 0, 30, 10]);
  assert.match(d, /^M0 0Q10 10 15 5Q20 0 25 5L30 10$/);
});

test('points too close together are skipped', () => {
  const p = [];
  assert.equal(addPoint(p, 0, 0), true);
  assert.equal(addPoint(p, 1, 1), false);
  assert.equal(addPoint(p, 3, 0), true);
  assert.deepEqual(p, [0, 0, 3, 0]);
});

test('the eraser removes whole strokes it touches', () => {
  const strokes = [{ p: [0, 0, 100, 0] }, { p: [0, 200, 100, 200] }];
  assert.equal(eraseAt(strokes, 98, 5).length, 1);
  assert.equal(eraseAt(strokes, 500, 500).length, 2);
});
