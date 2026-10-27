/* Sticky Pad · Gist Sync service worker: network first, cache fallback, so updates arrive when online and the page still opens offline.
   Only same-origin /sticky-gist/ files are handled; GitHub API calls are never cached.
   Cache names start with "sticky-gist-" so this worker never touches the plain Sticky Pad's "sticky-pad-*" caches (and vice versa). */
const CACHE = 'sticky-gist-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sticky-gist-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith('/sticky-gist/')) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r.mode === 'navigate' ? './' : r, copy)); }
    return res;
  }).catch(() => caches.match(r, {ignoreSearch: true}).then(m => m || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
