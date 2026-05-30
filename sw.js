/* ============================================================
   sw.js — Service Worker untuk PWA (Offline Support)
   PWO App | WYSPORT by Kakami
   ============================================================ */

const CACHE_NAME  = 'pwo-app-v2';
const STATIC_URLS = [
  './',
  './index.html',
  './form.html',
  './invoice.html',
  './manifest.json',
  './css/base.css',
  './css/dashboard.css',
  './css/form.css',
  './js/db.js',
  './js/dashboard.js',
  './js/form.js',
];

// ---- Install: cache all static assets ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: delete old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: cache-first for static, network-first for CDN ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // CDN resources: network-first with cache fallback
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Local files: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});
