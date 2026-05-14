const CACHE_NAME = 'gongkao-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png'
];

// Chart.js CDN - cache for offline
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install: cache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE).then(() => {
                // Try to cache CDN assets, don't fail if unavailable
                return Promise.allSettled(
                    CDN_ASSETS.map(url =>
                        fetch(url).then(response => {
                            if (response.ok) cache.put(url, response);
                        }).catch(() => {})
                    )
                );
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first for local, network-first for CDN
self.addEventListener('fetch', event => {
    let url = new URL(event.request.url);

    if (CDN_ASSETS.some(cdn => event.request.url.startsWith(cdn))) {
        // Network-first for CDN resources
        event.respondWith(
            fetch(event.request).then(response => {
                let clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match(event.request))
        );
    } else {
        // Cache-first for local resources
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request).then(response => {
                    let clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                });
            }).catch(() => {
                // Fallback to index.html for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
        );
    }
});