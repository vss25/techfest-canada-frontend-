/* =========================================================
   TTFC Check-in service worker (<desk path>sw.js, scope = the desk
   path). Built by vite.config.js (ttfcDeskPwa): the placeholders become
   the files the app needs offline, a version hash and the scope.
   • The app shell and its hashed JS/CSS, icons, manifest: precached.
     The app opens with no connection after its first visit; the guest
     list comes from the device's own copy, taps queue on the device.
   • Opening the app: the network first (2.5 s), then the cached copy,
     so a new version is picked up at launch.
   • The API (guests, taps, the live stream) is never cached here: it's
     on another host, and every call carries a sign-in.
   • Updates wait for the page to say when (lib/pwa.js: at launch or
     in the background, never while a station is running in front).
   Caches start with "ttfc-desk-": the attendee app's worker (/app/sw.js)
   only ever removes its own "ttfc-app-" caches, and this one only its own.
========================================================= */

const PRECACHE = self.__DESK_PRECACHE__;
const VERSION = self.__DESK_VERSION__;
const SCOPE = self.__DESK_SCOPE__;
const SHELL = `ttfc-desk-shell-${VERSION}`;
const NAV_TIMEOUT = 2500;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res.ok) await cache.put(url, res);
      } catch { /* fetched on first use instead */ }
    }));
    // The page and its scripts must be in, or this version doesn't install (the working one stays).
    for (const u of PRECACHE.filter((x) => x === SCOPE || (/^\/assets\//.test(x) && /\.(js|css)$/.test(x)))) {
      if (!(await cache.match(u))) throw new Error(`TTFC Check-in: ${u} didn't download; keeping the current version`);
    }
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith("ttfc-desk-shell-") && n !== SHELL).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "VERSION" && event.ports && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // the API: network only
  if (req.mode === "navigate") {
    if (!url.pathname.startsWith(SCOPE.replace(/\/$/, ""))) return;
    event.respondWith(shell(req));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith(`${SCOPE}icons/`) || url.pathname === `${SCOPE}manifest.webmanifest`) {
    event.respondWith(cacheFirst(req));
  }
});

async function shell(req) {
  const cache = await caches.open(SHELL);
  const network = fetch(req).then((res) => {
    if (res.ok && res.type === "basic") cache.put(SCOPE, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT));
  const res = await Promise.race([network.catch(() => null), timeout]);
  if (res && res.ok) return res;
  const cached = await cache.match(SCOPE);
  if (cached) return cached;
  if (res) return res;
  try { return await network; } catch { return offline(); }
}

async function cacheFirst(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreVary: true, ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

function offline() {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TTFC Check-in · Offline</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0823;color:#fff;font:18px -apple-system,system-ui,sans-serif;text-align:center;padding:24px">
<main><h1 style="font-size:24px">No connection</h1><p style="color:#B8AFD9">TTFC Check-in needs to open online once on this device. Check the Wi-Fi, then try again.</p>
<button onclick="location.reload()" style="min-height:56px;padding:0 28px;border:0;border-radius:14px;background:#8B52E0;color:#fff;font-size:18px">Try again</button></main>`,
  { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
