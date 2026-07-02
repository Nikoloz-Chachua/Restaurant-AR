const CACHE_NAME = 'bl-v101';

const SUPABASE_URL  = 'https://lwdpegloznhpcecivhfy.supabase.co';
const SUPABASE_ANON = 'sb_publishable_65dKKpb-lxOr8JTjdj7yxw_LZzcJp5h';

// Pre-cached on install — these are ready before the user taps anything
const PRECACHE = [
    './',
    './aurora-cafe.html',
    './aurora-cafe/',
    './vendor/qrcode.js',
    './foods/menu.json',
    './foods/aurora-cafe-menu.json',
    './img/betareal-favicon.svg',
    './img/betareal-logo-dark.png',
    './img/betareal-logo-light.png',
    './img/grain.png',
    './img/monday-greens-favicon.svg',
];

// NOTE: models are intentionally NOT mass-precached on install anymore.
// Doing so fired a parallel download of every visible GLB during the cold
// first load, racing the page's own model fetches (a literal double-download)
// and saturating mobile bandwidth before the menu could even paint.
// Models now cache lazily through the fetch handler below as the page loads
// them (thumbnails + the deferred AR preload), so each GLB is fetched once.
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(c => c.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

// Page can force a waiting SW to activate by posting SKIP_WAITING
self.addEventListener('message', e => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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

    // Navigation requests (the HTML page itself): network-first with cache:'no-store'
    // so the browser's HTTP cache AND Cloudflare edge cache are both bypassed —
    // updates reach users on the very next reload. Cached copy only used offline.
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request, { cache: 'no-store' })
                .then(res => {
                    caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone())).catch(() => {});
                    return res;
                })
                .catch(() => caches.match(e.request).then(r => r || new Response('Offline', { status: 503 })))
        );
        return;
    }

    // Supabase REST / auth: always network — never serve stale menu or session data.
    // Storage GLBs (stable by URL) are allowed through to cache-first below.
    if (e.request.url.startsWith(SUPABASE_URL) &&
        !e.request.url.includes('/storage/v1/object/')) {
        e.respondWith(fetch(e.request));
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
