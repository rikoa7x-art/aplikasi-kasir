/* ================================================
   SablonKas - Service Worker (PWA Offline Support)
   ================================================ */

const CACHE_VERSION = '1.4.0';
const CACHE_NAME = `sablonkas-v${CACHE_VERSION}`;

// File JS & CSS yang pakai network-first (selalu ambil versi terbaru)
const NETWORK_FIRST = [
  '/aplikasi-kasir/js/',
  '/aplikasi-kasir/css/',
  '/aplikasi-kasir/index.html',
  '/aplikasi-kasir/',
];

// File statis yang boleh di-cache lama (gambar, icon)
const STATIC_CACHE = [
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',
  './manifest.json',
];

// External CDN (cache dengan network fallback)
const EXTERNAL_CACHE = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js',
];

// ---- Install: hanya cache asset statis & external ----
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache icon & manifest
      try { await cache.addAll(STATIC_CACHE); } catch (e) { console.warn('[SW] Static cache err:', e); }

      // Cache external CDN (best effort)
      for (const url of EXTERNAL_CACHE) {
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        } catch (e) { console.warn('[SW] Cannot cache external:', url); }
      }
      console.log('[SW] Installed ✅');
    })
  );
  self.skipWaiting();
});

// ---- Activate: hapus cache lama ----
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => { console.log('[SW] Deleting old cache:', key); return caches.delete(key); })
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: strategi berbeda per tipe request ----
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // ---- External CDN (Supabase, SheetJS, Google Fonts) → cache-first ----
  if (
    url.includes('supabase.co') ||
    url.includes('jsdelivr.net') ||
    url.includes('sheetjs.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // ---- File JS, CSS, HTML → network-first (selalu versi terbaru) ----
  const isAppFile = NETWORK_FIRST.some((path) => url.includes(path)) ||
    url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.html') ||
    event.request.mode === 'navigate';

  if (isAppFile) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Simpan versi terbaru ke cache
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline → gunakan cache lama
          return caches.match(event.request).then((cached) =>
            cached || caches.match('./index.html')
          );
        })
    );
    return;
  }

  // ---- Asset statis lainnya (icon, gambar) → cache-first ----
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      }).catch(() => {
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

// ---- Background Sync ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') console.log('[SW] Background sync triggered');
});

// ---- Push Notifications ----
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'SablonKas', {
    body: data.body || 'Ada notifikasi baru',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    tag: 'sablonkas-notif',
  });
});
