/* =========================================================
   TTFC app service worker (/app/sw.js, scope /app/).

   Built by vite.config.js (ttfcAppPwa): the two placeholders
   below become the list of files the app needs offline and a
   version hash. Nothing here is a dependency; it's plain JS.

   • App shell + hashed JS/CSS + icons: precached, cache-first
     (repeat visits cost no Vercel bandwidth).
   • Page loads inside /app/: the cached shell, straight away.
     Updates are found when the page asks (at most about once an
     hour) or when the browser re-checks this file; a new version
     waits until the person taps "Reload".
   • Agenda / speakers / partners (Sanity CDN) and the public
     app content: stale-while-revalidate, so Schedule works offline.
   • Speaker photos and logos: cache-first, capped.
   • Anything signed in, and every write: network only, never cached.
========================================================= */

const PRECACHE = self.__TTFC_PRECACHE__;
const VERSION = self.__TTFC_VERSION__;
const SHELL = `ttfc-app-shell-${VERSION}`;
const DATA = "ttfc-app-data-v1";
const IMAGES = "ttfc-app-images-v1";
const MAX_IMAGES = 220;
const KEEP = new Set([SHELL, DATA, IMAGES]);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // One by one, so a single missing file can't block the whole install.
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res.ok) await cache.put(url, res);
      } catch { /* offline during install: fetched on first use instead */ }
    }));
    // First install: take over at once. Updates wait for "Reload".
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith("ttfc-app-") && !KEEP.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "VERSION" && event.ports && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

const isSanityQuery = (url) => /(^|\.)apicdn\.sanity\.io$|(^|\.)api\.sanity\.io$/.test(url.hostname) && url.pathname.includes("/data/query/");
const isImage = (url) => url.hostname === "cdn.sanity.io" || url.hostname === "res.cloudinary.com" || url.pathname.startsWith("/api/files/avatar/");
const isPublicContent = (url) => /\/api\/app\/content$/.test(url.pathname) || /\/api\/status$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // writes: network only
  const url = new URL(req.url);

  // Page loads inside the app: the cached shell (fresh one in the background only on update).
  if (req.mode === "navigate") {
    if (url.origin !== self.location.origin || !url.pathname.startsWith("/app")) return;
    event.respondWith(shell(req));
    return;
  }

  // Signed-in API calls carry a token: never cached here.
  if (req.headers.has("Authorization")) return;

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/app/icons/") || /\.(woff2?|ttf)$/.test(url.pathname)) {
      event.respondWith(cacheFirst(req, SHELL));
    } else if (url.pathname === "/app/manifest.webmanifest") {
      event.respondWith(staleWhileRevalidate(req, SHELL));
    }
    return;
  }

  if (isSanityQuery(url) || isPublicContent(url)) {
    event.respondWith(staleWhileRevalidate(req, DATA));
    return;
  }
  if (isImage(url)) {
    event.respondWith(cacheFirst(req, IMAGES, MAX_IMAGES));
  }
});

async function shell(req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match("/app/");
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put("/app/", res.clone());
    return res;
  } catch {
    return offlinePage();
  }
}

async function cacheFirst(req, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreVary: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    // Only readable (CORS) responses: opaque ones would eat the storage quota.
    if (res.ok && res.type !== "opaque") {
      await cache.put(req, res.clone());
      if (max) trim(cache, max);
    }
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const fresh = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  if (hit) return hit;
  const res = await fresh;
  return res || new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "Content-Type": "application/json" } });
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function offlinePage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>TTFC 2026 · Offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0E0828;color:#fff;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
main{max-width:340px}h1{font-size:22px;margin:16px 0 8px}p{color:rgba(219,206,255,.72);margin:0 0 20px}
button{min-height:48px;padding:0 22px;border:0;border-radius:12px;background:#8B52E0;color:#fff;font:600 16px inherit}</style></head>
<body><main><img src="/app/icons/icon-96.png" width="72" height="72" alt="" style="border-radius:18px"><h1>You're offline</h1><p>Connect to the internet to open the TTFC app for the first time. After that, the schedule works offline.</p><button onclick="location.reload()">Try again</button></main></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
