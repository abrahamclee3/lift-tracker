const CACHE_NAME = 'lift-tracker-offline-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(['./', './index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Always serve the cached app shell immediately on page navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then((cached) => {
          const networkUpdate = fetch(event.request)
            .then((res) => {
              if (res && res.ok) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
              }
              return res;
            })
            .catch(() => cached);
          return cached || networkUpdate;
        })
    );
    return;
  }

  // Cache-first for scripts, fonts, and icons
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
