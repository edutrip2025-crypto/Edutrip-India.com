const CACHE_NAME = 'edutrip-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/styles/minimal.css?v=20260311-2',
  '/edutrip-logo.png',
  './assets/india-map-icon.png',
  './assets/tech-icon.png',
  './assets/simplearn.png',
  './assets/sporteen.png',
  './assets/smarti.png',
  './assets/init_logo.png',
  './assets/raghavendra.jpg',
  './assets/koteswara_rao.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const isCriticalAsset = request.mode === 'navigate' ||
    request.destination === 'style' ||
    request.destination === 'script';

  if (isCriticalAsset) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache successful GET requests
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' && request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline if not in cache
        return cachedResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
