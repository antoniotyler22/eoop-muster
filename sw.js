// Offline cache. Network first for the app so updates arrive; cache as fallback with no signal.
// Everything the app uses is served from this site: no outside fonts, scripts or trackers.
const CACHE = "eop-numbers-v18";
const CORE = ["./", "./index.html", "./privacy.html", "./support.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./fonts/pjs-400.woff2", "./fonts/pjs-500.woff2", "./fonts/pjs-600.woff2", "./fonts/pjs-700.woff2", "./fonts/pjs-800.woff2"];
const LIBS = ["./lib/xlsx.full.min.js", "./lib/pdf.min.js", "./lib/pdf.worker.min.js", "./lib/mammoth.browser.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).then(() => c.addAll(LIBS).catch(() => {}))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
  );
});
