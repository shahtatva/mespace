import { bytesToBase64, base64ToBytes } from './backup.js';
import { github, parseRepo, SyncError } from './github.js';
import {
  readTree, resolvePull, conflictCopy, pagesToPush, remoteDeletions, orphanPhotos,
  pageJSON, gitBlobSha, pagePath, photoPath,
} from './gitsync.js';
import { normalizePage } from './model.js';
import { forgetPhoto } from './photos.js';
import { uid } from './util.js';

export const SYNC_ERRORS = {
  'bad-token': 'GitHub rejected the sync token. It may have expired; add a new one in Settings.',
  'no-repo': 'The sync repository wasn’t found, or the token can’t see it.',
  'public-repo': 'That repository is public. Use a private repository for your journal.',
  'no-write': 'The token can’t write to the repository. Give it “Contents: Read and write”.',
  'bad-repo-name': 'Enter the repository as owner/name, for example jane/paperleaf-data.',
  busy: 'GitHub is busy. Sync will try again shortly.',
  offline: 'You’re offline. Sync resumes when you’re back online.',
  failed: 'Sync ran into a problem. It will try again shortly.',
};

const README = `# Paperleaf journal data

This private repository holds a Paperleaf journal: one JSON file per page in \`pages/\` and the photos in \`photos/\`.
The Paperleaf app reads and writes it; every sync is a commit, so the history here is a history of the journal.
`;

const MANUAL_FIX = new Set(['bad-token', 'no-repo', 'public-repo', 'no-write']);

/** A short name for this device, used in commit messages ("3 pages from iPhone"). */
export function deviceName(ua = navigator.userAgent) {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'browser';
}

const decodeBlob = blob => base64ToBytes(String(blob.content || '').replace(/\s/g, ''));
const decodeText = blob => new TextDecoder().decode(decodeBlob(blob));
const freshState = () => ({ synced: {}, lastSyncAt: 0 });

/**
 * Keeps this device's pages and photos in step with a private GitHub repository.
 * onState({ status: 'off' | 'idle' | 'syncing' | 'error', lastSyncAt, error, repo }) whenever that changes;
 * onChange() after a sync changed pages on this device.
 */
export function createSync({ store, onState, onChange }) {
  let config = null, state = { status: 'off', lastSyncAt: 0, error: '', repo: '' };
  let running = false, again = false, timer = null;

  function set(status, error = '') {
    state = { ...state, status, error, repo: config ? config.repo : '' };
    onState({ ...state });
  }

  const loadState = async () => ({ ...freshState(), ...((await store.getMeta('syncState')) || {}) });
  // Pages deleted for good here, waiting to be removed from the repository. Kept apart from the sync state,
  // so a sync that is already running can't write over a deletion made meanwhile.
  const loadTombstones = async () => (await store.getMeta('syncTombstones')) || [];

  async function init() {
    config = (await store.getMeta('githubSync')) || null;
    state.lastSyncAt = (await loadState()).lastSyncAt;
    set(config ? 'idle' : 'off');
  }

  /** Checks the repository and token, saves them, and runs a first sync. Throws SyncError. */
  async function connect(repoText, token) {
    const repo = parseRepo(repoText);
    if (!repo) throw new SyncError('bad-repo-name');
    if (!token.trim()) throw new SyncError('bad-token');
    const info = await github(token.trim(), repo).repoInfo();
    if (!info.private) throw new SyncError('public-repo');
    const previous = config;
    config = { repo: info.full_name, branch: info.default_branch || 'main', token: token.trim() };
    await store.setMeta('githubSync', config);
    // A different repository starts from nothing; the same one with a new token carries on.
    if (!previous || previous.repo !== config.repo) {
      await store.setMeta('syncState', freshState());
      await store.setMeta('syncTombstones', []);
    }
    set('idle');
    await run();
  }

  async function disconnect() {
    clearTimeout(timer);
    config = null;
    await store.setMeta('githubSync', null);
    set('off');
  }

  /** Remembers a page deleted for good here, so the next sync removes it from the repository too. */
  async function forget(pageId) {
    if (!config) return;
    const list = await loadTombstones();
    if (!list.includes(pageId)) await store.setMeta('syncTombstones', [...list, pageId]);
    request();
  }

  function request(delay = 2000) {
    if (!config) return;
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  }

  async function run() {
    if (!config) return;
    if (running) { again = true; return; }
    if (navigator.onLine === false) { set('error', 'offline'); return; }
    running = true;
    clearTimeout(timer);
    set('syncing');
    try {
      let changed = false;
      for (let attempt = 0; ; attempt++) {
        try {
          changed = (await syncOnce()) || changed;
          break;
        } catch (e) {
          if (e instanceof SyncError && e.reason === 'moved' && attempt < 3) continue;
          throw e;
        }
      }
      state.lastSyncAt = Date.now();
      await store.setMeta('syncState', { ...(await loadState()), lastSyncAt: state.lastSyncAt });
      set('idle');
      if (changed) onChange();
    } catch (e) {
      const reason = e instanceof SyncError && SYNC_ERRORS[e.reason] ? e.reason : 'failed';
      set('error', reason);
      if (!MANUAL_FIX.has(reason) && reason !== 'offline') request(60000);
    } finally {
      running = false;
      if (again) { again = false; request(500); }
    }
  }

  /** One full sync. Returns whether pages on this device changed. Throws SyncError. */
  async function syncOnce() {
    const gh = github(config.token, config.repo);
    const st = await loadState();
    const tombstones = new Set(await loadTombstones());

    let head;
    try {
      head = await gh.head(config.branch);
    } catch (e) {
      if (!(e instanceof SyncError) || e.reason !== 'empty') throw e;
      // A brand-new repository has no commits yet; give it a first one to build on.
      await gh.putFile('README.md', 'Start the Paperleaf journal', bytesToBase64(new TextEncoder().encode(README)));
      head = await gh.head(config.branch);
    }
    const commit = await gh.commit(head);
    const remote = readTree((await gh.tree(commit.tree.sha)).tree);
    const local = new Map((await store.allPages()).map(normalizePage).filter(Boolean).map(p => [p.id, p]));
    let changed = false;

    // 1. Bring in pages the other device changed.
    for (const [id, sha] of remote.pages) {
      // Unchanged since the last sync. (A page deleted here but edited on another device since
      // doesn't match, so it comes back rather than losing that edit.)
      if (st.synced[id] && st.synced[id].sha === sha) continue;
      const theirs = normalizePage(JSON.parse(decodeText(await gh.blob(sha))));
      if (!theirs) continue;
      const mine = local.get(id);
      const action = resolvePull(mine, theirs, st.synced[id]);
      if (action === 'same') {
        st.synced[id] = { sha, updatedAt: mine.updatedAt };
        continue;
      }
      const loser = action === 'conflict-take' ? mine : action === 'conflict-keep' ? theirs : null;
      if (loser) {
        const copy = conflictCopy(loser, uid(), Date.now());
        await store.putPage(copy);
        local.set(copy.id, copy);
      }
      if (action !== 'conflict-keep') {
        await store.putPage(theirs);
        local.set(id, theirs);
      }
      st.synced[id] = { sha, updatedAt: theirs.updatedAt };
      changed = true;
    }

    // 2. Remove pages the other device deleted for good.
    for (const id of remoteDeletions([...local.values()], remote.pages, st.synced)) {
      const gone = local.get(id);
      await store.removePage(id);
      local.delete(id);
      delete st.synced[id];
      if (gone.photo && ![...local.values()].some(p => p.photo === gone.photo)) {
        await store.removePhoto(gone.photo);
        forgetPhoto(gone.photo);
      }
      changed = true;
    }

    // 3. Download photos this device doesn't have yet.
    const havePhotos = new Set(await store.photoIds());
    for (const p of local.values()) {
      if (!p.photo || havePhotos.has(p.photo) || !remote.photos.has(p.photo)) continue;
      const bytes = decodeBlob(await gh.blob(remote.photos.get(p.photo)));
      await store.putPhoto({ id: p.photo, type: 'image/jpeg', data: bytes.buffer, w: 0, h: 0 });
      havePhotos.add(p.photo);
      changed = true;
    }
    // Saved now, so a retry after a lost race doesn't redo the work above.
    await store.setMeta('syncState', st);

    // 4. Send everything that changed here, as one commit.
    const entries = [], pushed = [];
    for (const p of pagesToPush([...local.values()], remote.pages, st.synced)) {
      const json = pageJSON(p);
      const sha = await gitBlobSha(json);
      if (remote.pages.get(p.id) === sha) { st.synced[p.id] = { sha, updatedAt: p.updatedAt }; continue; }
      const blob = await gh.createBlob(json, 'utf-8');
      entries.push({ path: pagePath(p.id), mode: '100644', type: 'blob', sha: blob.sha });
      pushed.push([p.id, blob.sha, p.updatedAt]);
    }
    const used = new Set([...local.values()].map(p => p.photo).filter(Boolean));
    for (const id of used) {
      if (remote.photos.has(id) || !havePhotos.has(id)) continue;
      const photo = await store.getPhoto(id);
      if (!photo) continue;
      const blob = await gh.createBlob(bytesToBase64(new Uint8Array(photo.data)), 'base64');
      entries.push({ path: photoPath(id), mode: '100644', type: 'blob', sha: blob.sha });
    }
    const removed = [...tombstones].filter(id => remote.pages.has(id) && !local.has(id));
    for (const id of removed) entries.push({ path: pagePath(id), mode: '100644', type: 'blob', sha: null });
    for (const id of orphanPhotos(remote.photos, [...local.values()])) {
      entries.push({ path: photoPath(id), mode: '100644', type: 'blob', sha: null });
    }

    if (entries.length) {
      const plural = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;
      const parts = [pushed.length && plural(pushed.length, 'page'), removed.length && `${plural(removed.length, 'page')} deleted`].filter(Boolean);
      const message = `${parts.join(', ') || 'Photos tidied'} from ${deviceName()}`;
      const tree = await gh.createTree(commit.tree.sha, entries);
      const next = await gh.createCommit(message, tree.sha, [head]);
      await gh.moveHead(config.branch, next.sha);
      for (const [id, sha, updatedAt] of pushed) st.synced[id] = { sha, updatedAt };
    }
    for (const id of tombstones) if (!local.has(id)) delete st.synced[id];
    await store.setMeta('syncState', st);
    // Clear only the deletions this sync handled; any made while it ran stay for the next one.
    const handled = new Set(tombstones);
    await store.setMeta('syncTombstones', (await loadTombstones()).filter(id => !handled.has(id)));
    return changed;
  }

  addEventListener('online', () => request(500));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - state.lastSyncAt > 60000) request(500);
  });
  setInterval(() => { if (document.visibilityState === 'visible') request(0); }, 5 * 60000);

  return {
    init, connect, disconnect, forget, request, run,
    get state() { return { ...state }; },
    get connected() { return !!config; },
  };
}
