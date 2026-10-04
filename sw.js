/* Saint Augustine AI — minimal offline-shell service worker.
   Strategy: network-first for the app shell + API; cache fallback for shell
   so the UI opens offline (conversations live in localStorage anyway).
   No caching of cross-origin fonts/CDN beyond a simple pass-through. */
const CACHE = "sa-app-improvements-v19";
const SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./app-data.js?v=app-improvements-1",
  // Keep this token in sync with the stylesheet link in index.html.
  "./frontend-revamp.css?v=app-improvements-1",
  "./app-features.css?v=app-improvements-2",
  "./app-features.js?v=app-improvements-2",
  "./frontend-revamp.js",
  "./lessons.js?v=study-content-3",
  "./lesson-sources.js?v=source-audit-1",
  "./manifest.webmanifest",
  "./assets/heart.svg",
  "./assets/favicon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // same-origin app shell + backend proxy: network-first, cache fallback
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
    );
  }
});
