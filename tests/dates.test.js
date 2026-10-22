import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validDate, parseDate, isoWeek, shortDate, daysAgo, toISODate } from '../app/js/dates.js';

test('validDate accepts real calendar dates only', () => {
  assert.equal(validDate('2026-10-21'), '2026-10-21');
  assert.equal(validDate('2024-02-29'), '2024-02-29');
  assert.equal(validDate('2025-02-29'), null);
  assert.equal(validDate('2026-13-01'), null);
  assert.equal(validDate('21/10/2026'), null);
  assert.equal(validDate(undefined), null);
});

test('parseDate reads local dates and round-trips', () => {
  assert.equal(toISODate(parseDate('2026-10-21')), '2026-10-21');
});

test('isoWeek matches ISO 8601 week numbers', () => {
  assert.equal(isoWeek(parseDate('2026-10-21')), 43);
  assert.equal(isoWeek(parseDate('2021-01-03')), 53);
  assert.equal(isoWeek(parseDate('2024-12-30')), 1);
});

test('shortDate and daysAgo read naturally', () => {
  assert.equal(shortDate('2026-05-18'), 'May 18');
  const now = Date.UTC(2026, 9, 21, 12);
  assert.equal(daysAgo(now - 3600e3, now), 'today');
  assert.equal(daysAgo(now - 864e5, now), 'yesterday');
  assert.equal(daysAgo(now - 5 * 864e5, now), '5 days ago');
});

test('timeAgo reads naturally for recent syncs', async () => {
  const { timeAgo } = await import('../app/js/dates.js');
  const now = Date.UTC(2026, 9, 22, 12);
  assert.equal(timeAgo(now - 20e3, now), 'just now');
  assert.equal(timeAgo(now - 5 * 60e3, now), '5 min ago');
  assert.equal(timeAgo(now - 3 * 3600e3, now), '3 h ago');
  assert.equal(timeAgo(now - 2 * 864e5, now), '2 days ago');
});
