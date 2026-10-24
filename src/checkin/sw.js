/* =========================================================
   TTFC Check-in service worker (<desk path>sw.js, scope = the desk
   path). Built by vite.config.js (ttfcDeskPwa): the placeholders become
   the files the app needs offline, a version hash and the scope.
   • A version installs whole or not at all: its page, every hashed
     JS/CSS file that page names, icons and manifest go into the
     version's own cache (ttfc-desk-shell-<version>). If any page or
     script doesn't download, the install fails, what it downloaded is
     removed (no partial cache piles up) and the working version stays
     as it was.
   • Opening the app: the page from the active version's own cache,
     which always has that page's scripts next to it. Nothing fetched
     while the app is open is ever written over it, so a flaky load
     after a deploy can't leave a page whose scripts are missing. A new
     version is picked up through the update (lib/pwa.js): it installs
     in the background, then takes over (activate swaps the caches).
     Before any version is installed: the network, else "No connection".
   • The API (guests, taps, the live stream) is never cached here: it's
     on another host, and every call carries a sign-in.
   • Updates wait for the page to say when (lib/pwa.js: never while a
     station is running).
   • An install cut off half way (the iPad turned off, the app closed
     during the download) can't clean up after itself: on activate and
     whenever the app is opened, any desk cache that isn't the active
     version's (or a waiting version's, installed whole) is removed,
     never while another version is installing.
   Caches start with "ttfc-desk-": the attendee app's worker (/app/sw.js)
   only ever removes its own "ttfc-app-" caches, and this one only its own.
   Tested with the built file: node --test src/checkin/sw.test.mjs
========================================================= */

const PRECACHE = self.__DESK_PRECACHE__;
const VERSION = self.__DESK_VERSION__;
const SCOPE = self.__DESK_SCOPE__;
const SHELL = `ttfc-desk-shell-${VERSION}`;
const isScript = (u) => /^\/assets\//.test(u) && /\.(js|css)$/.test(u);
/** The /assets/ files a page names (scripts, styles, preloads). */
const assetsIn = (html) => [...String(html).matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((m) => m[1]);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // A cache by this name already there is another worker's of the same version (never this install's to remove).
    const had = await caches.has(SHELL);
    const cache = await caches.open(SHELL);
    const get = async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res.ok) await cache.put(url, res);
      } catch { /* checked below */ }
    };
    await Promise.all(PRECACHE.map(get));
    // The page as it was downloaded may be newer than this list (a deploy in between): it gets what it names, too.
    const page = await cache.match(SCOPE);
    const named = page ? assetsIn(await page.clone().text()) : [];
    await Promise.all(named.filter((u) => !PRECACHE.includes(u)).map(get));
    // The page and every script it needs must be in, or this version doesn't install (the working one stays), and
    // what it did download goes (a failed try never leaves a partial cache on the device; the next try starts clean).
    for (const u of new Set([SCOPE, ...PRECACHE.filter(isScript), ...named.filter(isScript)])) {
      if (!(await cache.match(u))) {
        if (!had) await caches.delete(SHELL).catch(() => {});
        throw new Error(`TTFC Check-in: ${u} didn't download; keeping the current version`);
      }
    }
    // Its cache removed meanwhile (a tidy that started before this install did): not installed; the next try starts clean.
    if (!(await caches.has(SHELL))) throw new Error("TTFC Check-in: this version's files were removed during the install; keeping the current version");
    if (!self.registration.active) await self.skipWaiting();
  })());
});

/** The version a waiting worker runs, asked over a message ("" when it doesn't answer in time). */
function versionOf(worker, ms = 3000) {
  return new Promise((resolve) => {
    let done = false;
    const ch = new MessageChannel();
    const finish = (v) => { if (done) return; done = true; clearTimeout(timer); try { ch.port1.close(); } catch { /* closed */ } resolve(v); };
    const timer = setTimeout(() => finish(""), ms);
    ch.port1.onmessage = (e) => finish(String((e.data && e.data.version) || ""));
    try { worker.postMessage({ type: "VERSION" }, [ch.port2]); } catch { finish(""); }
  });
}

/**
 * Every desk cache but this version's (and a waiting version's, installed whole) goes: an older version's after an
 * update, and what an install cut off half way left behind. Never while another version is installing (its cache
 * isn't finished yet), and nothing when a waiting version doesn't say which it is.
 */
async function tidy() {
  const reg = self.registration;
  if (reg.installing) return;
  const keep = new Set([SHELL]);
  if (reg.waiting) {
    const v = await versionOf(reg.waiting);
    if (!v) return;
    keep.add(`ttfc-desk-shell-${v}`);
  }
  if (reg.installing) return;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith("ttfc-desk-shell-") && !keep.has(n)).map((n) => caches.delete(n)));
}

// The new version takes over: the older versions' caches go (each version only ever reads its own).
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await tidy().catch(() => {});
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
    // The app opened: anything an install cut off half way left behind goes now, not at the next update.
    event.waitUntil(tidy().catch(() => {}));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith(`${SCOPE}icons/`) || url.pathname === `${SCOPE}manifest.webmanifest`) {
    event.respondWith(cacheFirst(req));
  }
});

/** The app's page: this version's own copy (installed together with its scripts); never replaced while it runs. */
async function shell(req) {
  const cache = await caches.open(SHELL);
  const page = await cache.match(SCOPE);
  if (page) return page;
  try { return await fetch(req); } catch { return offline(); }
}

async function cacheFirst(req) {
  const cache = await caches.open(SHELL);
  const hit = (await cache.match(req, { ignoreVary: true, ignoreSearch: true }))
    // A hashed file is the same in any cache that has it (e.g. a waiting version's).
    || (url(req).pathname.startsWith("/assets/") ? await caches.match(req, { ignoreVary: true, ignoreSearch: true }) : undefined);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    // Hashed files never change, so one fetched now can be kept; the page itself never is (above).
    if (res.ok && url(req).pathname.startsWith("/assets/")) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}
const url = (req) => new URL(req.url);

function offline() {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TTFC Check-in · Offline</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0823;color:#fff;font:18px -apple-system,system-ui,sans-serif;text-align:center;padding:24px">
<main><h1 style="font-size:24px">No connection</h1><p style="color:#B8AFD9">TTFC Check-in needs to open online once on this device. Check the Wi-Fi, then try again.</p>
<button onclick="location.reload()" style="min-height:56px;padding:0 28px;border:0;border-radius:14px;background:#8B52E0;color:#fff;font-size:18px">Try again</button></main>`,
  { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
