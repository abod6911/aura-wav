const CACHE_NAME = 'aura-wav-v26';
const IMAGE_CACHE_NAME = 'aura-wav-images-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/fonts/fonts.css',
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
          // Purge all old caches including previous versions (v20, v21, etc.) and old audio caches
          if (key.startsWith('aura-wav-') && key !== CACHE_NAME && key !== IMAGE_CACHE_NAME) {
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

  // 2. Artwork Images: Cache-first with network fallback and opaque cross-origin caching
  if (event.request.destination === 'image' || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp && (resp.status === 200 || resp.type === 'opaque')) {
            const cache = await caches.open(IMAGE_CACHE_NAME);
            cache.put(event.request, resp.clone()).catch(() => {});
          }
          return resp;
        } catch {
          return new Response('', { status: 404, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // 3. Navigation Requests (HTML document): NETWORK-FIRST with offline fallback to cached index.html
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

  // 4. Critical UI Assets (JS, CSS, Fonts): NETWORK-FIRST strategy so updates apply instantly
  // On network failure (offline), falls back safely to cached asset bundle.
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
