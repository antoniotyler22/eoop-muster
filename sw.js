// Offline cache. The app opens from the phone instantly; a newer version is fetched in the background.
// Everything the app uses is served from this site: no outside fonts, scripts or trackers.
const CACHE = "eop-numbers-v107";
const CORE = ["./", "./index.html", "./app.bundle.js", "./terms.html", "./app.css", "./native.js", "./privacy.html", "./support.html", "./help.html", "./manifest.webmanifest",
  "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./fonts/pjs-400.woff2", "./fonts/pjs-500.woff2", "./fonts/pjs-600.woff2", "./fonts/pjs-700.woff2", "./fonts/pjs-800.woff2"];
const LIBS = ["./lib/qrcode.js", "./lib/xlsx.full.min.js", "./lib/pdf.min.js", "./lib/pdf.worker.min.js", "./lib/mammoth.browser.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).then(() => c.addAll(LIBS).catch(() => {}))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Opens instantly from the phone; checks for a newer version in the background and tells the app.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("/version.json")) return; // always straight from the network: it's how the app learns a new version is live
  const isPage = url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  const isStatic = /\/(lib|fonts)\//.test(url.pathname) || /\.(png|woff2)$/.test(url.pathname);
  if (isPage) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const key = "./index.html";
      const cached = await c.match(key);
      let servedCache = false;
      const net = fetch(key, { cache: "no-cache" }).then(async res => {
        if (!res.ok) return res;
        const fresh = res.clone();
        const was = cached ? await cached.clone().text() : "";
        const now = await res.clone().text();
        await c.put(key, fresh);
        if (cached && was !== now && servedCache) {
          const cs = await self.clients.matchAll({ type: "window" });
          cs.forEach(w => w.postMessage({ type: "updated" }));
        }
        return res;
      }).catch(() => null);
      // Network first (fresh links always open on the newest app), cached copy if no signal within 3 s.
      if (cached) { const quick = await Promise.race([net, new Promise(r => setTimeout(() => r(null), 3000))]); if (quick && quick.ok) return quick; servedCache = true; e.waitUntil(net); return cached; }
      return (await net) || caches.match(key);
    }));
    return;
  }
  // App code and styles: exact version from cache, else network (and keep a copy), else any cached version.
  if (/\/app\.(js|css)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }))));
    return;
  }
  if (isStatic) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
  );
});

// Push alerts for live recall check-ins. Payload holds no names: a title, a line of text and a help flag.
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {}
  const title = d.title || "New check-in";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "Open the recall to see who.", tag: d.open === "feed" ? "feed" : d.open === "board" ? "team" : d.help ? "recall-help" : (d.open === "live" ? "board" : "recall"), renotify: true,
    icon: "./icon-192.png", badge: "./icon-192.png", requireInteraction: !!d.help, data: { open: ["live", "feed", "board", "checkins"].includes(d.open) ? d.open : "recall" }, vibrate: d.help ? [300, 100, 300, 100, 300] : [120]
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const dest = "./#" + ((e.notification.data && e.notification.data.open) || "recall");
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if (w.url.includes(self.registration.scope)) { w.navigate(dest).catch(() => {}); return w.focus(); } }
    return clients.openWindow(dest);
  }));
});
