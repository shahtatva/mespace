import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP = new URL('../app/', import.meta.url).pathname;
const shell = [...readFileSync(join(APP, 'sw.js'), 'utf8').match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const CACHED = /\.(html|css|js|woff2|png|svg|webmanifest)$/;

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [relative(APP, full)];
  });
}

test('every file the service worker caches exists', () => {
  for (const f of shell.filter(f => f !== './')) assert.ok(existsSync(join(APP, f)), `missing ${f}`);
});

test('every app file is cached for offline use', () => {
  const missing = walk(APP).filter(f => CACHED.test(f) && f !== 'sw.js' && !shell.includes(f));
  assert.deepEqual(missing, []);
});
