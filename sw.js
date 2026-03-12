// Service Worker para Trébol Repuestos
// Esta app siempre requiere internet - solo registra para permitir instalación PWA

// OneSignal no se carga directamente para evitar errores de red
// La funcionalidad de notificaciones se maneja desde el servidor

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

// Suppress OneSignal console spam
self.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('OneSignal')) {
        console.warn('[SW] OneSignal error suppressed (server-side notifications active)');
        event.stopImmediatePropagation();
    }
});

// Network only fetch
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => response)
            .catch(() => new Response(JSON.stringify({ error: 'Sin conexión' }), {
                status: 503, headers: { 'Content-Type': 'application/json' }
            }))
    );
});

