/*
 * Where pages and photos live: IndexedDB on this device, or memory when the browser refuses
 * storage (some private windows). Both share one interface, so the rest of the app never knows which.
 *
 * Every record passes through `codec` on its way in and out. Today it changes nothing;
 * it is the one place end-to-end encryption plugs in later.
 */
export const codec = {
  encode: async record => record,
  decode: async record => record,
};

const DB_NAME = 'paperleaf';
const DB_VERSION = 1;

const request = r => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

function openDB(name) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('pages', { keyPath: 'id' });
      db.createObjectStore('photos', { keyPath: 'id' });
      db.createObjectStore('meta');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('blocked'));
  });
}

async function deviceStore(name = DB_NAME) {
  const db = await openDB(name);
  const read = store => db.transaction(store, 'readonly').objectStore(store);
  // Resolves once the transaction has committed, not just when the request succeeded.
  const write = (store, fn) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    fn(tx.objectStore(store));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
  return {
    kind: 'device',
    async allPages() { return Promise.all((await request(read('pages').getAll())).map(codec.decode)); },
    async putPage(page) { const v = await codec.encode(page); await write('pages', s => s.put(v)); },
    async removePage(id) { await write('pages', s => s.delete(id)); },
    async getPhoto(id) { const v = await request(read('photos').get(id)); return v ? codec.decode(v) : null; },
    async allPhotos() { return Promise.all((await request(read('photos').getAll())).map(codec.decode)); },
    async photoIds() { return request(read('photos').getAllKeys()); },
    async putPhoto(photo) { const v = await codec.encode(photo); await write('photos', s => s.put(v)); },
    async removePhoto(id) { await write('photos', s => s.delete(id)); },
    async getMeta(key) { return request(read('meta').get(key)); },
    async setMeta(key, value) { await write('meta', s => s.put(value, key)); },
  };
}

export function memoryStore() {
  const pages = new Map(), photos = new Map(), meta = new Map();
  const copy = v => structuredClone(v);
  return {
    kind: 'memory',
    async allPages() { return [...pages.values()].map(copy); },
    async putPage(page) { pages.set(page.id, copy(page)); },
    async removePage(id) { pages.delete(id); },
    async getPhoto(id) { return photos.has(id) ? copy(photos.get(id)) : null; },
    async allPhotos() { return [...photos.values()].map(copy); },
    async photoIds() { return [...photos.keys()]; },
    async putPhoto(photo) { photos.set(photo.id, copy(photo)); },
    async removePhoto(id) { photos.delete(id); },
    async getMeta(key) { return meta.get(key); },
    async setMeta(key, value) { meta.set(key, value); },
  };
}

export async function openStore() {
  try {
    if (!globalThis.indexedDB) throw new Error('no indexedDB');
    return await deviceStore();
  } catch {
    return memoryStore();
  }
}

/** Asks the browser not to clear this site's storage when the device runs low on space. */
export async function requestPersistence() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
