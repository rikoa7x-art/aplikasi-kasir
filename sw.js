/* ================================================
   SablonKas - Service Worker (PWA Offline Support)
   ================================================ */

const CACHE_NAME = 'sablonkas-v1';
const CACHE_VERSION = '1.0.0';

// Files to cache for offline use
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data.js',
  './js/utils.js',
  './js/app.js',
  './js/modules/dashboard.js',
  './js/modules/penjualan.js',
  './js/modules/kas.js',
  './js/modules/pembelian.js',
  './js/modules/produksi.js',
  './js/modules/piutang.js',
  './js/modules/hutang.js',
  './js/modules/beban.js',
  './js/modules/laporan.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',
];

// External resources to cache (with network fallback)
const EXTERNAL_CACHE = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js',
];

// ---- Install Event: Cache all assets ----
self.addEventListener('install', (event) => {
  console.log('[SW] Installing SablonKas Service Worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache local assets
      await cache.addAll(ASSETS_TO_CACHE);
      console.log('[SW] Local assets cached');

      // Cache external resources (best effort)
      for (const url of EXTERNAL_CACHE) {
        try {
          const response = await fetch(url);
          if (response.ok) await cache.put(url, response);
        } catch (e) {
          console.warn('[SW] Could not cache external:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

// ---- Activate Event: Clean old caches ----
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating SablonKas Service Worker');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// ---- Fetch Event: Cache-first strategy ----
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For navigation requests (HTML pages), use network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For everything else, use cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback for images
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#1a1a2e" width="200" height="200"/><text fill="#6c63ff" x="100" y="110" text-anchor="middle" font-size="40">📱</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});

// ---- Background Sync (for future use) ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
  }
});

// ---- Push Notifications (for future use) ----
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'SablonKas', {
    body: data.body || 'Ada notifikasi baru',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    tag: 'sablonkas-notif',
  });
});
