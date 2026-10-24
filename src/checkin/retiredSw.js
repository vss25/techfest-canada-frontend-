/* =========================================================
   TTFC Check-in: the service worker at an EARLIER address of the app
   (src/checkin/deskPath.js RETIRED_DESK_PATHS, e.g. the Oct 23
   /checkin-<token>/; the app is at /checkin/ since Oct 24). Published
   by vite.config.js (ttfcDeskPwa) as <old path>sw.js; vercel.json
   redirects everything else under the old path to the new one.
   A device that opened or installed the old address has the old app's
   worker registered there, and that worker answers the old address
   from its own cache without asking the server, so the server's
   redirect alone would never reach it. The browser checks that
   worker's file for updates (each time the old address opens, every
   10 minutes while the old app is open, and when the new app opens:
   lib/retired.js), gets this one, and it takes over at once:
   • opening the old address (a bookmark, a home-screen icon, a reload
     of an old tab) → a redirect to the new one, made here, so it works
     offline too (the new address then opens from its own worker once
     it has been opened online on the device);
   • an old tab open when it takes over (the old address just opened
     from its own cache, or open since before the move) is moved to the
     new address: the sign-in, the station and any queued taps are in
     localStorage, per site, the same for both addresses, so it comes
     back signed in on the same station and sends the taps (one tap
     turns the chime back on, as after any reload). Where a browser
     can't move a tab (no WindowClient.navigate), the old app's own
     update (by itself when no station runs, else its "Update ready ·
     tap to reload" banner) reloads it, and the reload lands here;
   • the old version's cache (ttfc-desk-shell-…) is removed. The new
     app's cache (ttfc-checkin-shell-…) is never touched, nor anything
     else.
   So a device that had the old address ends on the new one when the
   old address is next opened (or reloaded) online, at the latest.
   Tested: node --test src/checkin/sw.test.mjs
========================================================= */

const TARGET = self.__DESK_TARGET__;
/** The caches the old app's worker kept (each version's own). */
const OLD_CACHES = "ttfc-desk-shell-";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(OLD_CACHES)).map((n) => caches.delete(n)));
    } catch { /* tidied next time */ }
    await self.clients.claim();
    // The old address's open tabs (this worker's, now): to the new address, with their query (?source=pwa).
    // Never holds up the activation for long (a tab that doesn't answer is left to its own update, above).
    const tabs = await self.clients.matchAll({ type: "window" }).catch(() => []);
    const moved = Promise.all(tabs.map((tab) => Promise.resolve()
      .then(() => { if (typeof tab.navigate === "function") return tab.navigate(new URL(TARGET + new URL(tab.url).search, self.location.origin).href); })
      .catch(() => {})));
    await Promise.race([moved, new Promise((resolve) => setTimeout(resolve, 3000))]);
  })());
});

// The old app asks a waiting worker to take over (and for its version) before it reloads.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "VERSION" && event.ports && event.ports[0]) event.ports[0].postMessage({ version: "retired" });
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(Response.redirect(new URL(TARGET + url.search, self.location.origin).href, 302));
});
