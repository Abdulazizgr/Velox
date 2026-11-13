// Advanced Service Worker for Velox POS PWA
const CACHE_NAME = "velox-pos-cache-v3";
const STATIC_ASSETS = [
  "/favicon.ico",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/logo.jpg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Never cache API routes or non-GET requests - always live from network
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") {
    return;
  }

  // 2. Navigation & Next.js RSC requests: Network first, cache fallback
  if (event.request.mode === "navigate" || url.searchParams.has("_rsc")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((res) => res || caches.match("/")))
    );
    return;
  }

  // 3. Static assets & Next.js scripts: Stale-while-revalidate or Network-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Return cached immediately if available, while updating cache in background
      return cachedResponse || fetchPromise;
    })
  );
});
