/* S.A.R.A.H. service worker — fresh-first so updates reach everyone fast */
const CACHE = "sarah-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const isPage = e.request.mode === "navigate" ||
    (e.request.destination === "document") ||
    e.request.url.endsWith(".html") || e.request.url.endsWith("/");

  if (isPage) {
    // Network-first for the app itself → always the freshest version when online,
    // falls back to the cached copy when offline.
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
    );
  } else {
    // Cache-first for static assets (icon, manifest) → fast.
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        }).catch(() => caches.match("./index.html"))
      )
    );
  }
});
