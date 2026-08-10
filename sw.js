const CACHE_NAME = 'dishtv-refresh-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './logo.svg',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event: cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: Network-first strategy for HTML, Stale-while-revalidate for others
self.addEventListener('fetch', event => {
    const request = event.request;

    // For HTML navigation requests, use Network First, fallback to cache
    if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache the latest version
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                    return response;
                })
                .catch(() => {
                    // If network fails, serve from cache
                    return caches.match(request).then(cachedResponse => {
                        return cachedResponse || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // For everything else (assets, fonts), use Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                return networkResponse;
            }).catch(() => {
                // Ignore network errors on asset fetch
            });

            return cachedResponse || fetchPromise;
        })
    );
});
