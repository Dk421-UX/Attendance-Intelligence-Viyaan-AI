/* ─────────────────────────────────────────────────────
   Attendance Intelligence — Service Worker
   Strategy: Cache-First with network fallback
   Cache name versioned so updates bust old caches.
───────────────────────────────────────────────────── */

var CACHE_NAME = 'attendance-ai-v1';

var PRECACHE_URLS = [
  './',
  './index.html',
  './logo.png',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

/* ── INSTALL: pre-cache all critical assets ── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        console.warn('[SW] Pre-cache partial failure (expected for CDN):', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE: delete old caches ── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key)   { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── FETCH: cache-first, network fallback, offline page ── */
self.addEventListener('fetch', function (event) {
  /* Only handle GET requests */
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        /* Only cache valid responses from same origin or CDN */
        if (!response || response.status !== 200) return response;

        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return response;

      }).catch(function () {
        /* Offline fallback: serve index.html for navigation requests */
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
