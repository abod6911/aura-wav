const CACHE_NAME = 'aura-wav-v30';
const ARTWORK_CACHE_NAME = 'aurawave-artwork-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/cloudCatalog.json',
  './logo.svg',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/fonts.css',
  /* __BUILD_ASSETS__ */
];

const OFFLINE_ARTWORK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23141418"/><circle cx="150" cy="150" r="48" fill="%23202028"/><path d="M142 128v44l26-22z" fill="%23FA2D48"/></svg>`;

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
          // Purge all old caches (previous app versions and legacy image caches)
          if (
            (key.startsWith('aura-wav-') && key !== CACHE_NAME) ||
            key === 'aura-wav-images-v1'
          ) {
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

  // 1. Strict Audio Exclusion: Audio streams (MP3/WAV/AAC/FLAC), Hugging Face CDN, and Range requests
  // MUST NEVER be saved to Cache API to prevent memory bloat and Safari audio crashes.
  if (
    event.request.method !== 'GET' ||
    !url.startsWith('http') ||
    event.request.headers.has('range') ||
    /\.(mp3|m4a|wav|flac|aac|ogg|opus)(\?|$)/i.test(url) ||
    url.includes('huggingface.co') ||
    url.includes('cdn-lfs.huggingface.co') ||
    url.includes('/songs/') ||
    url.includes('/api/')
  ) {
    return;
  }

  // 2. Artwork Images: Cache-first with network fallback, opaque cross-origin caching, and SVG fallback
  if (
    event.request.destination === 'image' ||
    /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) ||
    url.includes('mzstatic.com') ||
    url.includes('/covers/')
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ARTWORK_CACHE_NAME);
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        try {
          const resp = await fetch(event.request);
          if (resp && (resp.status === 200 || resp.type === 'opaque')) {
            cache.put(event.request, resp.clone()).catch(() => {});
          }
          return resp;
        } catch {
          // Offline fallback: serve inline SVG placeholder instead of broken image icon
          return new Response(OFFLINE_ARTWORK_SVG, {
            status: 200,
            headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
          });
        }
      })()
    );
    return;
  }

  // 3. Catalog Data & JSON: Stale-While-Revalidate (Instant offline response + background refresh)
  if (url.includes('/catalog') || url.includes('catalog-data') || url.endsWith('.json')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })()
    );
    return;
  }

  // 4. Navigation Requests (HTML document): NETWORK-FIRST with offline fallback to cached index.html
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

  // 5. Critical UI Assets (JS, CSS, Fonts): NETWORK-FIRST strategy with instant offline cache fallback
  event.respondWith(
    fetch(event.request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, copy).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network unavailable: fall back to cached version
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If specific hashed JS/CSS is missing, attempt closest match in cache
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

        return new Response('', { status: 200, statusText: 'Offline Fallback' });
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
