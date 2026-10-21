import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBackup, parseBackup, mergePages, bytesToBase64, base64ToBytes, backupFilename, BackupError } from '../app/js/backup.js';

const page = { id: 'a', date: '2026-10-21', title: 'Hi', text: 'Body', paper: 'lined', hand: 'print', ink: [], photo: 'ph1', photoAspect: 0.75, transcript: '', notebook: '',
  transcriptAI: '', transcriptStatus: '', transcriptError: '', transcriptChecked: false, needsCheck: false,
  importId: '', importSeq: 0, dateSet: 'user', createdAt: 1, updatedAt: 2, deletedAt: null };

test('base64 helpers round-trip binary data, including large buffers', () => {
  const bytes = new Uint8Array(100000).map((_, i) => (i * 31) % 256);
  assert.deepEqual(base64ToBytes(bytesToBase64(bytes)), bytes);
});

test('a backup round-trips pages and photos', () => {
  const photo = { id: 'ph1', type: 'image/jpeg', w: 3, h: 4, data: new Uint8Array([1, 2, 3, 250]).buffer };
  const text = JSON.stringify(makeBackup([page], [photo], Date.UTC(2026, 9, 21)));
  const back = parseBackup(text);
  assert.deepEqual(back.pages, [page]);
  assert.equal(back.photos[0].id, 'ph1');
  assert.deepEqual(new Uint8Array(back.photos[0].data), new Uint8Array([1, 2, 3, 250]));
});

test('files that are not backups are refused with a reason', () => {
  const reason = text => { try { parseBackup(text); } catch (e) { assert.ok(e instanceof BackupError); return e.reason; } };
  assert.equal(reason('not json'), 'not-json');
  assert.equal(reason('{"kind":"other","pages":[]}'), 'not-backup');
  assert.equal(reason('{"kind":"paperleaf-backup","version":99,"pages":[]}'), 'newer-version');
});

test('restoring adds new pages and newer edits, and keeps newer local copies', () => {
  const existing = [{ id: 'a', updatedAt: 5 }, { id: 'b', updatedAt: 5 }];
  const incoming = [{ id: 'a', updatedAt: 9 }, { id: 'b', updatedAt: 1 }, { id: 'c', updatedAt: 1 }];
  const r = mergePages(existing, incoming);
  assert.deepEqual(r.write.map(p => p.id), ['a', 'c']);
  assert.deepEqual([r.added, r.updated, r.unchanged], [1, 1, 1]);
});

test('backup files are named by date', () => {
  assert.equal(backupFilename(new Date(2026, 9, 1)), 'paperleaf-backup-2026-10-01.json');
});
