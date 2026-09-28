// Habino Accounting - High Performance Service Worker v5 (TWA, Fonts/Icons Cache & Offline-First)
const CACHE_NAME = 'habino-twa-cache-v5';
const FONTS_ICONS_CACHE = 'habino-fonts-icons-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/.well-known/assetlinks.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== FONTS_ICONS_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or chrome-extension URLs
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Never intercept or cache Vite development modules or hot reload scripts
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('node_modules') ||
    url.search.includes('v=') ||
    url.search.includes('t=')
  ) {
    return;
  }

  // P0 Cache Optimization: Cache-First for Persian Web Fonts & Static Vector Icons
  const isFontOrIcon = 
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.pathname.match(/\.(woff2?|ttf|otf|eot|svg|ico|png|webp)$/i);

  if (isFontOrIcon) {
    event.respondWith(
      caches.open(FONTS_ICONS_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached font or icon immediately for instant offline rendering
            return cachedResponse;
          }
          // Fetch from network, put into long-term fonts/icons cache, and return
          return fetch(request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Fallback to general cache if present
            return caches.match(request);
          });
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for navigation (HTML) requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // Stale-while-revalidate for scripts, styles, and other app assets
  if (url.pathname.match(/\.(js|css|json)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Default network fetch with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Listen for message from client to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
