const CACHE_NAME = 'bl-v1';

// Pre-cached on install — these are ready before the user taps anything
const PRECACHE = [
    './',
    './foods/menu.json',
    './food.glb',
    './Druidi.glb',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(c => c.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

// Remove old caches when a new version activates
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;

    // Navigation requests (the HTML page itself): network-first so app updates
    // reach users immediately; serve cached copy only when offline.
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Everything else (GLBs, JSON, fonts, model-viewer, Three.js CDN modules):
    // cache-first — serve instantly if available, fetch and cache if not.
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                // Only cache valid CORS responses — skips opaque cross-origin responses
                // that could silently eat storage quota.
                if (res.ok) {
                    caches.open(CACHE_NAME)
                        .then(c => c.put(e.request, res.clone()))
                        .catch(() => {});
                }
                return res;
            });
        })
    );
});
