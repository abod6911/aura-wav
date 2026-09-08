const CACHE_NAME = 'aura-wav-v8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  /* __BUILD_ASSETS__ */
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical precache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-http(s) or range audio requests
  if (!event.request.url.startsWith('http') || event.request.headers.has('range')) {
    return;
  }

  // 1. Navigation requests (HTML document): NETWORK-FIRST with guaranteed offline fallback
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((res) => res || caches.match('/index.html'))
            .then((res) => res || caches.match('/'));
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, SVGs, Fonts, Images): CACHE-FIRST with network fallback
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, copy);
        }
        return networkResponse;
      } catch (err) {
        // Offline asset fallback: if specific hashed JS/CSS is missing, attempt closest match
        const url = event.request.url;
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();

        if (url.endsWith('.js')) {
          const jsKey = keys.find((k) => k.url.includes('/assets/') && k.url.endsWith('.js'));
          if (jsKey) {
            const fallback = await cache.match(jsKey);
            if (fallback) return fallback;
          }
        } else if (url.endsWith('.css')) {
          const cssKey = keys.find((k) => k.url.includes('/assets/') && k.url.endsWith('.css'));
          if (cssKey) {
            const fallback = await cache.match(cssKey);
            if (fallback) return fallback;
          }
        }

        // Return empty 200 response rather than undefined to prevent browser crash screen
        return new Response('', { status: 200, statusText: 'Offline Fallback' });
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      self.clients.claim();
    });
  }
});
