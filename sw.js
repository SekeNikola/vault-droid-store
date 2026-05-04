// VaultDroid Service Worker
// Cache strategy:
//   - GitHub API (api.github.com) → network-only
//   - APK downloads (.apk) → network-only
//   - Everything else → cache-first with network fallback

const CACHE_NAME = 'vaultdroid-v1';
const SHELL_FILES = ['.', 'manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Network-only: GitHub API calls
  if (url.includes('api.github.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-only: APK downloads (use pathname to handle query strings)
  if (new URL(url).pathname.endsWith('.apk')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first with network fallback + cache.put on miss
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
