import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gitBlobSha, readTree, resolvePull, conflictCopy, pagesToPush, remoteDeletions, orphanPhotos, pageJSON } from '../app/js/gitsync.js';
import { parseRepo } from '../app/js/github.js';

const page = (id, extra = {}) => ({ id, date: '2026-10-21', title: 't', text: '', updatedAt: 10, createdAt: 1, ...extra });

test('blob ids match git’s own', async () => {
  assert.equal(await gitBlobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a');
  assert.equal(await gitBlobSha(new Uint8Array()), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
});

test('the same page always serializes to the same bytes', () => {
  const a = pageJSON({ ...page('a'), extra: 'ignored' });
  const b = pageJSON({ title: 't', id: 'a', updatedAt: 10, createdAt: 1, date: '2026-10-21', text: '' });
  assert.equal(a, b);
});

test('a tree listing splits into pages and photos', () => {
  const { pages, photos } = readTree([
    { path: 'README.md', type: 'blob', sha: 'r' },
    { path: 'pages', type: 'tree', sha: 'x' },
    { path: 'pages/p1.json', type: 'blob', sha: 's1' },
    { path: 'photos/ph1.jpg', type: 'blob', sha: 's2' },
  ]);
  assert.deepEqual([...pages], [['p1', 's1']]);
  assert.deepEqual([...photos], [['ph1', 's2']]);
});

test('pulling: take remote changes unless this device changed the page too', () => {
  const synced = { sha: 'old', updatedAt: 10 };
  assert.equal(resolvePull(undefined, page('a'), synced), 'take');
  assert.equal(resolvePull(page('a', { text: 'old' }), page('a', { text: 'new', updatedAt: 20 }), synced), 'take');
  assert.equal(resolvePull(page('a', { text: 'same', updatedAt: 30 }), page('a', { text: 'same', updatedAt: 30 }), synced), 'same');
  assert.equal(resolvePull(page('a', { text: 'mine', updatedAt: 15 }), page('a', { text: 'theirs', updatedAt: 20 }), synced), 'conflict-take');
  assert.equal(resolvePull(page('a', { text: 'mine', updatedAt: 25 }), page('a', { text: 'theirs', updatedAt: 20 }), synced), 'conflict-keep');
  assert.equal(resolvePull(page('a', { text: 'mine', updatedAt: 5 }), page('a', { text: 'theirs', updatedAt: 9 }), undefined), 'conflict-take');
});

test('a conflict keeps the losing version as its own page', () => {
  const copy = conflictCopy(page('a', { title: 'Walk' }), 'b', 99);
  assert.equal(copy.id, 'b');
  assert.equal(copy.title, 'Walk (conflicting copy)');
  assert.equal(copy.updatedAt, 99);
  assert.equal(copy.date, '2026-10-21');
});

test('pushing: new, changed, or missing-remotely pages go up', () => {
  const remote = new Map([['a', 's'], ['b', 's']]);
  const synced = { a: { sha: 's', updatedAt: 10 }, b: { sha: 's', updatedAt: 10 } };
  const local = [page('a'), page('b', { updatedAt: 12 }), page('c')];
  assert.deepEqual(pagesToPush(local, remote, synced).map(p => p.id), ['b', 'c']);
  assert.deepEqual(pagesToPush([page('a')], new Map(), synced).map(p => p.id), ['a']);
});

test('pages deleted for good elsewhere go here too, unless changed here since', () => {
  const synced = { a: { sha: 's', updatedAt: 10 }, b: { sha: 's', updatedAt: 10 } };
  const local = [page('a'), page('b', { updatedAt: 11 }), page('c')];
  assert.deepEqual(remoteDeletions(local, new Map(), synced), ['a']);
});

test('photos no page uses are tidied away', () => {
  const remote = new Map([['ph1', 'x'], ['ph2', 'y']]);
  assert.deepEqual(orphanPhotos(remote, [page('a', { photo: 'ph1' }), page('b', { photo: null })]), ['ph2']);
});

test('repository names are read from what people paste', () => {
  assert.equal(parseRepo('jane/paperleaf-data'), 'jane/paperleaf-data');
  assert.equal(parseRepo(' https://github.com/jane/paperleaf-data.git/ '), 'jane/paperleaf-data');
  assert.equal(parseRepo('paperleaf-data'), null);
  assert.equal(parseRepo('a/b/c'), null);
});
