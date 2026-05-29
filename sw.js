const CACHE_NAME = 'bl-v24';

const SUPABASE_URL  = 'https://xctoxhaahxtcicfgnmme.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdG94aGFhaHh0Y2ljZmdubW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDMyMDEsImV4cCI6MjA5NTMxOTIwMX0.VA2tQL6WT96ifBjON4NLaJa0BbzBGI0ipD7iB5fHjnQ';

// Pre-cached on install — these are ready before the user taps anything
const PRECACHE = [
    './',
    './foods/menu.json',
];

// Pre-cache Draco WASM decoder so it's ready before the first AR tap
async function _precacheDraco() {
    const urls = [
        'https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_wasm_wrapper.js',
        'https://www.gstatic.com/draco/versioned/decoders/1.5.6/draco_decoder.wasm',
    ];
    try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
            urls.map(url =>
                fetch(url).then(r => { if (r.ok) cache.put(url, r.clone()); }).catch(() => {})
            )
        );
    } catch (_) {}
}

// Fetch all Supabase Storage GLB URLs from the DB and pre-cache them
async function _precacheModels() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/menu_items?select=model&visible=eq.true`,
            { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
        );
        if (!res.ok) return;
        const items = await res.json();
        const urls = [...new Set(
            items.map(i => i.model).filter(m => m && m.startsWith('https://'))
        )];
        if (!urls.length) return;
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
            urls.map(url =>
                fetch(url).then(r => { if (r.ok) cache.put(url, r.clone()); }).catch(() => {})
            )
        );
    } catch (_) {}
}

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(c => c.addAll(PRECACHE))
            .then(() => Promise.all([_precacheModels(), _precacheDraco()]))
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
