/*
 * The decisions behind sync, kept free of network and storage so they can be tested.
 * The repository holds one JSON file per page (pages/<id>.json) and one file per photo (photos/<id>.jpg).
 * Each device remembers, per page, the version both sides last agreed on: { sha, updatedAt }.
 */
import { normalizePage } from './model.js';

export const pagePath = id => `pages/${id}.json`;
export const photoPath = id => `photos/${id}.jpg`;

/** The exact text stored for a page. Normalized, so the same page always produces the same bytes. */
export const pageJSON = page => JSON.stringify(normalizePage(page), null, 1) + '\n';

const encoder = new TextEncoder();

/** Git's id for a file's contents, so local and remote copies can be compared without downloading anything. */
export async function gitBlobSha(content) {
  const bytes = typeof content === 'string' ? encoder.encode(content) : content;
  const head = encoder.encode(`blob ${bytes.length}\0`);
  const all = new Uint8Array(head.length + bytes.length);
  all.set(head);
  all.set(bytes, head.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', all));
  return Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
}

/** Splits a git tree listing into page and photo ids, each mapped to its file's sha. */
export function readTree(entries) {
  const pages = new Map(), photos = new Map();
  for (const e of entries || []) {
    if (e.type !== 'blob') continue;
    let m = /^pages\/([^/]+)\.json$/.exec(e.path);
    if (m) { pages.set(m[1], e.sha); continue; }
    m = /^photos\/([^/]+)\.jpg$/.exec(e.path);
    if (m) photos.set(m[1], e.sha);
  }
  return { pages, photos };
}

/**
 * What to do with a page the other device changed:
 * 'take'          use the remote copy (nothing here, or nothing changed here since the last sync)
 * 'same'          both sides already match
 * 'conflict-take' both changed and the remote copy is newer: use it, keep this device's version as a copy
 * 'conflict-keep' both changed and this device's copy is newer: keep it, keep the remote version as a copy
 */
export function resolvePull(local, remote, synced) {
  if (!local) return 'take';
  if (pageJSON(local) === pageJSON(remote)) return 'same';
  const changedHere = !synced || (local.updatedAt || 0) > (synced.updatedAt || 0);
  if (!changedHere) return 'take';
  return (remote.updatedAt || 0) > (local.updatedAt || 0) ? 'conflict-take' : 'conflict-keep';
}

/** A separate page holding the version that lost a conflict, so nothing written is lost. */
export function conflictCopy(page, id, now) {
  return {
    ...page,
    id,
    title: `${page.title || 'Untitled'} (conflicting copy)`,
    createdAt: (page.createdAt || 0) + 1,
    updatedAt: now,
  };
}

/** Pages this device has to upload: new, changed since the last sync, or missing from the repository. */
export function pagesToPush(localPages, remotePages, synced) {
  return localPages.filter(p => {
    const s = synced[p.id];
    return !s || (p.updatedAt || 0) > (s.updatedAt || 0) || !remotePages.has(p.id);
  });
}

/** Pages the other device deleted for good: synced before, gone from the repository now, unchanged here since. */
export function remoteDeletions(localPages, remotePages, synced) {
  return localPages
    .filter(p => synced[p.id] && !remotePages.has(p.id) && (p.updatedAt || 0) <= (synced[p.id].updatedAt || 0))
    .map(p => p.id);
}

/** Photos in the repository that no page refers to any more. */
export function orphanPhotos(remotePhotos, pages) {
  const used = new Set(pages.map(p => p.photo).filter(Boolean));
  return [...remotePhotos.keys()].filter(id => !used.has(id));
}
