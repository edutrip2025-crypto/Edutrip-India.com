const CACHE = 'edutrip-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './src/styles/minimal.css',
  './edutrip-logo.png',
  './assets/site.webmanifest',
  './assets/favicon-96x96.png',
  './assets/favicon-32x32.png',
  './assets/favicon-16x16.png',
  './assets/favicon.svg',
  './assets/favicon.ico',
  './assets/apple-touch-icon.png',
  './assets/simplearn.png',
  './assets/sporteen.png',
  './assets/smarti.png',
  './assets/init_logo.png',
  './assets/raghavendra.jpg',
  './assets/koteswara_rao.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});