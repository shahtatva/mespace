/*
 * Keeps the app working offline. Pages and photos live in IndexedDB, not here;
 * this only caches the app's own files.
 *
 * Page loads try the network first so updates arrive; everything else is served from the cache
 * and refreshed in the background. Add new app files to SHELL (tests/sw.test.js checks the list).
 */
const CACHE = 'paperleaf-shell-v1';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/paperleaf.css',
  'fonts/fonts.css',
  'fonts/caveat-latin.woff2',
  'fonts/caveat-latin-ext.woff2',
  'fonts/jost-latin.woff2',
  'fonts/jost-latin-ext.woff2',
  'fonts/kalam-300-latin.woff2',
  'fonts/kalam-300-latin-ext.woff2',
  'fonts/kalam-400-latin.woff2',
  'fonts/kalam-400-latin-ext.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/backup.js',
  'js/book.js',
  'js/dates.js',
  'js/editor.js',
  'js/ink.js',
  'js/main.js',
  'js/model.js',
  'js/notebook.js',
  'js/photos.js',
  'js/render.js',
  'js/search.js',
  'js/store.js',
  'js/textfit.js',
  'js/util.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('paperleaf-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request, { ignoreSearch: true });
  const fresh = fetch(event.request).then(response => {
    if (response.ok) cache.put(event.request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(fresh.catch(() => {}));
    return cached;
  }
  return fresh;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : staleWhileRevalidate(event));
});
