const CACHE_NAME = 'aura-wav-v10';
const AUDIO_CACHE_NAME = 'aura-wav-audio-v1';
const IMAGE_CACHE_NAME = 'aura-wav-images-v1';
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
          if (key.startsWith('aura-wav-') && key !== CACHE_NAME && key !== AUDIO_CACHE_NAME && key !== IMAGE_CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Ignore non-GET, non-http(s), Range requests (audio seeking is served by the
  // app from OPFS/IndexedDB or by the backend) and all backend API endpoints.
  if (
    event.request.method !== 'GET' ||
    !url.startsWith('http') ||
    event.request.headers.has('range') ||
    url.includes('/api/') ||
    url.includes('/songs/')
  ) {
    return;
  }

  // Artwork images: cache-first (precache included), bounded to 500 entries
  if (event.request.destination === 'image' || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && resp.status === 200) {
            const cache = await caches.open(IMAGE_CACHE_NAME);
            await cache.put(event.request, resp.clone());
            const keys = await cache.keys();
            if (keys.length > 500) {
              await cache.delete(keys[0]);
            }
          }
          return resp;
        } catch {
          return new Response('', { status: 404, statusText: 'Offline' });
        }
      })()
    );
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
  if (event.data && (event.data === 'skipWaiting' || event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      self.clients.claim();
    });
  }
  if (event.data && event.data.type === 'CHECK_OFFLINE_READY') {
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys();
      const cachedUrls = keys.map(k => new URL(k.url).pathname);
      const allCached = STATIC_ASSETS.every(asset => cachedUrls.includes(asset));
      event.source.postMessage({ type: 'OFFLINE_READY_STATUS', isReady: allCached });
    });
  }
});
