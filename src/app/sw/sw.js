/* =========================================================
   TTFC app service worker (/app/sw.js, scope /app/).

   Built by vite.config.js (ttfcAppPwa): the two placeholders
   below become the list of files the app needs offline and a
   version hash. Nothing here is a dependency; it's plain JS.

   • App shell + hashed JS/CSS + icons: precached, cache-first
     (repeat visits cost no Vercel bandwidth).
   • Page loads inside /app/: the network first (2.5 s), then the
     cached shell, then an offline page — a fresh deploy is picked
     up on launch.
   • Updates: the page checks on every launch and whenever it comes
     back to the front (src/app/lib/pwa.js). A new version waits
     for the page to say when (straight away at launch or while
     hidden; after the person's done typing or uploading). Copies
     installed before that logic existed have no say: they're
     switched over and reloaded at once.
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
// Written by pages that manage their own updates (lib/pwa.js). Not "ttfc-app-" so no old worker deletes it.
const META = "ttfc-meta";
const MANAGED_KEY = "/app/__updates";
const NAV_TIMEOUT = 2500;

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
    // First install: take over at once. An update waits for the page to
    // apply it — unless the open pages predate that (they'd never ask).
    if (!self.registration.active || !(await managed())) await self.skipWaiting();
  })());
});

async function managed() {
  try { return !!(await (await caches.open(META)).match(MANAGED_KEY)); } catch { return false; }
}

self.addEventListener("activate", (event) => {
  const ready = (async () => {
    const names = await caches.keys();
    // The old shell and its files go: nothing can be served from them after this.
    await Promise.all(names.filter((n) => n.startsWith("ttfc-app-") && !KEEP.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })();
  event.waitUntil(ready);
  // After activation (a reload awaited inside it would wait on this worker's own fetch handler).
  ready.then(async () => {
    const wins = await self.clients.matchAll({ type: "window" });
    if (await managed()) {
      wins.forEach((c) => c.postMessage({ type: "ACTIVATED", version: VERSION }));
    } else {
      // Pages from before self-updating: reload them onto this version.
      wins.forEach((c) => {
        if (!c.url.includes("/app")) return;
        const u = new URL(c.url);
        u.searchParams.set("ttfc-updated", "1"); // the page says "Updated to the latest version"
        c.navigate(u.href).catch(() => {});
      });
    }
  }).catch(() => {});
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "VERSION" && event.ports && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
  // "Is this page already your build?" (its entry script is in your list) → no reload needed.
  if (event.data && event.data.type === "HAS" && event.ports && event.ports[0]) event.ports[0].postMessage({ has: PRECACHE.includes(event.data.url) });
});

const isSanityQuery = (url) => /(^|\.)apicdn\.sanity\.io$|(^|\.)api\.sanity\.io$/.test(url.hostname) && url.pathname.includes("/data/query/");
const isImage = (url) => url.hostname === "cdn.sanity.io" || url.hostname === "res.cloudinary.com" || url.pathname.startsWith("/api/files/avatar/");
const isPublicContent = (url) => /\/api\/app\/content$/.test(url.pathname) || /\/api\/status$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // writes: network only
  const url = new URL(req.url);

  // Page loads inside the app: network first (short timeout), then the cached shell.
  if (req.mode === "navigate") {
    if (url.origin !== self.location.origin || !url.pathname.startsWith("/app")) return;
    event.respondWith(shell(req));
    return;
  }

  // Signed-in API calls carry a token: never cached here.
  if (req.headers.has("Authorization")) return;

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/app/icons/") || url.pathname.startsWith("/app/brand/") || /\.(woff2?|ttf)$/.test(url.pathname)) {
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
  const network = fetch(req).then((res) => {
    if (res.ok && res.type === "basic") cache.put("/app/", res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT));
  const res = await Promise.race([network.catch(() => null), timeout]);
  if (res && res.ok) return res;
  const cached = await cache.match("/app/");
  if (cached) return cached;
  if (res) return res; // nothing cached yet: whatever the server said
  try { return await network; } catch { return offlinePage(); }
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
    // A script from a build that's no longer deployed (a page still open from
    // before an update): reload onto the current version instead of breaking.
    if (res.status === 404 && /^\/assets\/.+\.js$/.test(new URL(req.url).pathname)) {
      return new Response("self.location.reload();export default null;", { status: 200, headers: { "Content-Type": "text/javascript" } });
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
