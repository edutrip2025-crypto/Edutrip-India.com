const CACHE_NAME = 'edutrip-cache-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/styles/minimal.css',
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
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache successful GET requests
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
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