/* Trébol Repuestos - OneSignal Compatible Service Worker v2 */
importScripts('./OneSignalSDKWorker.js');

/* Minimal PWA caching - NO fetch interference with OneSignal */
const CACHE_NAME = 'trebol-pwa-v2';
const PRECACHE_URLS = [
  '/',
  '/tienda.html', 
  '/admin.html',
  '/manifest.json',
  '/css/tienda.css',
  '/css/admin.css'
];

/* Install: Basic precache + OneSignal setup */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        PRECACHE_URLS.map(url => 
          fetch(url).then(res => cache.put(url, res))
            .catch(() => console.log(`[SW] Cache failed: ${url}`))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

/* Activate: Cleanup old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames.map(name => 
          name !== CACHE_NAME && caches.delete(name)
        )
      )
    )
  );
  self.clients.claim();
});

/* NO fetch handler - Let OneSignal handle notifications */
console.log('[SW] Trébol PWA + Local OneSignal Service Worker loaded ✅');

