// Konexigo service worker.
//
// Scope is deliberately narrow: this exists so the app is installable
// (Add to Home Screen) and still opens if the network is briefly
// unavailable - it is NOT an offline-data app. Safe-caching rules:
//   - Supabase (API + auth) requests: NEVER touched by the cache. Every
//     such request goes straight to the network, every time, so a partner
//     or admin never sees stale or another session's data.
//   - Navigations (HTML page loads): network-first. A visitor always gets
//     the latest deployed app shell when online; the cached shell is only
//     a fallback if the network request fails outright.
//   - Same-origin build assets (JS/CSS/fonts/images Vite emits with a
//     content hash in the filename, plus the icons/manifest above):
//     cache-first, refreshed in the background. Safe because a changed
//     file gets a new hashed filename, so "cached" never means "outdated".
const CACHE_NAME = "konexigo-shell-v1";
const PRECACHE_URLS = ["/", "/manifest.webmanifest", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isSupabaseRequest(url) {
  return /\.supabase\.co$/.test(url.hostname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin and non-Supabase third-party requests (fonts.googleapis,
  // the dicebear avatar API, etc.) are left to the browser's own handling -
  // this worker only opts in same-origin traffic and explicitly opts out
  // Supabase.
  if (url.origin !== self.location.origin || isSupabaseRequest(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/").then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
