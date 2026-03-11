// Service Worker para Trébol Repuestos
// Esta app siempre requiere internet - solo registra para permitir instalación PWA

const CACHE_NAME = 'trebol-v1';

// Assets mínimos para instalación (sin offline)
const PRECACHE_ASSETS = [
    '/',
    '/tienda.html',
    '/manifest.json'
];

// Install event - precache básico
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Service Worker instalado');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event
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
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Network only (siempre requiere internet)
self.addEventListener('fetch', (event) => {
    // Siempre ir a la red - requiere internet
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Solo devolver respuestas válidas
                return response;
            })
            .catch(() => {
                // Si no hay internet, devolver error
                return new Response(
                    JSON.stringify({ error: 'Se requiere conexión a internet' }),
                    { 
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            })
    );
});

