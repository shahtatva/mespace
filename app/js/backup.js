import { normalizePage } from './model.js';

export const BACKUP_KIND = 'paperleaf-backup';
export const BACKUP_VERSION = 1;

export function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** A plain JSON object holding every page (Trash included) and every photo. */
export function makeBackup(pages, photos, now = Date.now()) {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    pages,
    photos: photos.map(ph => ({ id: ph.id, type: ph.type, w: ph.w, h: ph.h, data: bytesToBase64(new Uint8Array(ph.data)) })),
  };
}

export const backupFilename = (now = new Date()) =>
  `paperleaf-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`;

export class BackupError extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}

/** Reads a backup file's text. Throws BackupError('not-json' | 'not-backup' | 'newer-version'). */
export function parseBackup(text) {
  let o;
  try { o = JSON.parse(text); } catch { throw new BackupError('not-json'); }
  if (!o || o.kind !== BACKUP_KIND || !Array.isArray(o.pages)) throw new BackupError('not-backup');
  if (typeof o.version !== 'number' || o.version > BACKUP_VERSION) throw new BackupError('newer-version');
  const pages = o.pages.map(normalizePage).filter(Boolean);
  const photos = (Array.isArray(o.photos) ? o.photos : [])
    .filter(ph => ph && typeof ph.id === 'string' && typeof ph.data === 'string')
    .map(ph => ({
      id: ph.id,
      type: /^image\/(jpeg|png|webp|gif)$/.test(ph.type) ? ph.type : 'image/jpeg',
      w: +ph.w || 0, h: +ph.h || 0,
      data: base64ToBytes(ph.data).buffer,
    }));
  return { pages, photos };
}

/** Which incoming pages to write: new ones, and ones edited more recently than the copy already here. */
export function mergePages(existing, incoming) {
  const byId = new Map(existing.map(p => [p.id, p]));
  const write = [];
  let added = 0, updated = 0, unchanged = 0;
  for (const p of incoming) {
    const cur = byId.get(p.id);
    if (!cur) { write.push(p); added++; }
    else if ((p.updatedAt || 0) > (cur.updatedAt || 0)) { write.push(p); updated++; }
    else unchanged++;
  }
  return { write, added, updated, unchanged };
}
