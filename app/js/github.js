/*
 * The few GitHub REST calls sync needs, made straight from the browser with a fine-grained token
 * that can only reach the journal's own repository. GitHub's API accepts cross-origin requests from any site.
 */
const API = 'https://api.github.com';

export class SyncError extends Error {
  /** reason: 'bad-token' | 'no-repo' | 'public-repo' | 'no-write' | 'busy' | 'offline' | 'empty' | 'moved' | 'bad-repo-name' | 'failed' */
  constructor(reason, detail = '') { super(detail || reason); this.reason = reason; }
}

/** "owner/name" from what someone might paste: a name, or a github.com address. */
export function parseRepo(text) {
  const name = String(text || '').trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '');
  return /^[\w.-]+\/[\w.-]+$/.test(name) ? name : null;
}

export function github(token, repo) {
  async function call(method, path, body) {
    let res;
    try {
      res = await fetch(`${API}/repos/${repo}${path}`, {
        method,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new SyncError(navigator.onLine === false ? 'offline' : 'busy');
    }
    if (res.ok) return res.status === 204 ? null : res.json();
    const data = await res.json().catch(() => ({}));
    const msg = data && data.message ? data.message : '';
    if (res.status === 401) throw new SyncError('bad-token', msg);
    if (res.status === 403 || res.status === 429) {
      if (res.status === 429 || res.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(msg)) throw new SyncError('busy', msg);
      throw new SyncError('no-write', msg);
    }
    if (res.status === 404) throw new SyncError('no-repo', msg);
    if (res.status === 409) throw new SyncError('empty', msg);
    // A head that moved since we read it means another device synced first; the whole sync starts again.
    if (res.status === 422 && method === 'PATCH') throw new SyncError('moved', msg);
    if (res.status >= 500) throw new SyncError('busy', msg);
    throw new SyncError('failed', msg);
  }

  return {
    repoInfo: () => call('GET', ''),
    head: async branch => (await call('GET', `/git/ref/heads/${branch}`)).object.sha,
    commit: sha => call('GET', `/git/commits/${sha}`),
    tree: sha => call('GET', `/git/trees/${sha}?recursive=1`),
    blob: sha => call('GET', `/git/blobs/${sha}`),
    createBlob: (content, encoding) => call('POST', '/git/blobs', { content, encoding }),
    createTree: (baseTree, tree) => call('POST', '/git/trees', { base_tree: baseTree, tree }),
    createCommit: (message, tree, parents) => call('POST', '/git/commits', { message, tree, parents }),
    moveHead: (branch, sha) => call('PATCH', `/git/refs/heads/${branch}`, { sha, force: false }),
    putFile: (path, message, contentBase64) => call('PUT', `/contents/${path}`, { message, content: contentBase64 }),
  };
}
