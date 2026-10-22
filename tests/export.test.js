import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, createZip } from '../app/js/zip.js';
import { safeName, pageMarkdown, inkSVG, exportFiles, pagesForExport } from '../app/js/export.js';

/** Reads a zip's central directory: [{ name, data }]. Only handles the stored files createZip writes. */
function readZip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  assert.equal(v.getUint32(end, true), 0x06054b50);
  const count = v.getUint16(end + 10, true);
  let at = v.getUint32(end + 16, true);
  const files = [];
  for (let i = 0; i < count; i++) {
    assert.equal(v.getUint32(at, true), 0x02014b50);
    const crc = v.getUint32(at + 16, true), size = v.getUint32(at + 20, true);
    const nameLen = v.getUint16(at + 28, true), offset = v.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    const localName = v.getUint16(offset + 26, true);
    const data = bytes.subarray(offset + 30 + localName, offset + 30 + localName + size);
    assert.equal(crc32(data), crc, `crc for ${name}`);
    files.push({ name, data });
    at += 46 + nameLen;
  }
  return files;
}

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
});

test('a zip round-trips its files, UTF-8 names included', () => {
  const zip = createZip([{ name: 'a/Café notes.md', data: '# Hi\n' }, { name: 'b.bin', data: new Uint8Array([0, 255, 7]) }]);
  const files = readZip(zip);
  assert.deepEqual(files.map(f => f.name), ['a/Café notes.md', 'b.bin']);
  assert.equal(new TextDecoder().decode(files[0].data), '# Hi\n');
  assert.deepEqual([...files[1].data], [0, 255, 7]);
});

test('titles become safe file names', () => {
  assert.equal(safeName('Q&A: why/how? <draft>'), 'Q&A- why-how- -draft');
  assert.equal(safeName('   '), 'Untitled');
  assert.equal(safeName('x'.repeat(100)).length, 60);
});

test('a page becomes readable Markdown with its photo, text from the photo, and drawing', () => {
  const md = pageMarkdown(
    { date: '2026-10-21', title: 'Tomb visit', text: 'Notes here.', transcript: 'What the page says.', notebook: 'Blue notebook', photo: 'p1' },
    { no: 5, photoFile: '2026-10-21 Tomb visit.jpg', drawingFile: '2026-10-21 Tomb visit.svg' });
  assert.match(md, /^# Tomb visit\n\n\*Wednesday, 21 October 2026 · page 5 · from Blue notebook\*/);
  assert.match(md, /Notes here\./);
  assert.match(md, /!\[Photo of the paper page\]\(\.\.\/photos\/2026-10-21%20Tomb%20visit\.jpg\)/);
  assert.match(md, /## What the page says\n\nWhat the page says\./);
  assert.match(md, /!\[Drawing\]\(\.\.\/drawings\/2026-10-21%20Tomb%20visit\.svg\)/);
});

test('drawings export as standalone SVG', () => {
  const svg = inkSVG([{ c: 1, w: 3.4, p: [0, 0, 10, 10] }]);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /stroke="#1F4FAE"/);
});

test('an export holds an index, one Markdown file per page, photos and drawings, with no name clashes', () => {
  const pages = [
    { id: 'a', date: '2026-10-21', title: 'Same', text: 'one', createdAt: 1, ink: [{ c: 0, w: 3, p: [1, 1, 2, 2] }] },
    { id: 'b', date: '2026-10-21', title: 'Same', text: 'two', createdAt: 2, photo: 'ph' },
    { id: 'c', date: '2026-09-01', title: 'Gone', text: '', createdAt: 3, deletedAt: 5 },
  ];
  const entries = pagesForExport(pages);
  assert.deepEqual(entries.map(e => e.page.id), ['a', 'b']);
  const files = exportFiles(entries, new Map([['ph', { data: new Uint8Array([1, 2]).buffer }]]), 'out');
  assert.deepEqual(files.map(f => f.name), [
    'out/index.md',
    'out/drawings/2026-10-21 Same.svg',
    'out/pages/2026-10-21 Same.md',
    'out/photos/2026-10-21 Same (2).jpg',
    'out/pages/2026-10-21 Same (2).md',
  ]);
  assert.match(files[0].data, /\| 2026-10-21 \| 3 \| \[Same\]\(pages\/2026-10-21%20Same\.md\) \|/);
  assert.deepEqual(pagesForExport(pages, '2026-10-22').length, 0);
});
