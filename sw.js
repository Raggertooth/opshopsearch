// sw.js — App-shell + data caching for offline-capable PWA
const VERSION = 'v18';
const SHELL_CACHE = 'opshop-shell-' + VERSION;
const DATA_CACHE = 'opshop-data-' + VERSION;
const TILE_CACHE = 'opshop-tiles-' + VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/hours.js',
  './js/favourites.js',
  './js/recent.js',
  './js/visited.js',
  './js/map.js',
  './js/markers.js',
  './js/detail-panel.js',
  './js/filters.js',
  './js/search.js',
  './js/chips.js',
  './js/geolocation.js',
  './js/url-state.js',
  './js/install-prompt.js',
  './js/a11y.js',
  './js/list-view.js',
  './js/csv-export.js',
  './js/qr.js',
  './js/op-shop-run.js',
  './js/surprise.js',
  './js/heatmap.js',
  './js/voice-search.js',
  './js/pull-refresh.js',
  './js/haptics.js',
  './js/panel-swipe.js',
  './js/compare.js',
  './js/newsletter.js',
  './js/analytics.js',
  './js/konami.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './favicon.ico',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_FILES).catch((err) => console.warn('SW precache partial:', err))
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => ![SHELL_CACHE, DATA_CACHE, TILE_CACHE].includes(k))
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Map tiles — cache-first, fall back to network
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(event.request, TILE_CACHE));
    return;
  }

  // Shop data — network-first so corrections propagate
  if (url.pathname.endsWith('/data/gold-coast-opshops.json')) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // Shell — cache-first
  event.respondWith(cacheFirst(event.request, SHELL_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}
