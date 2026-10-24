import { RETIRED_DESK_PATHS } from "../deskPath.js";

/* =========================================================
   TTFC Check-in: the app's earlier addresses (deskPath.js
   RETIRED_DESK_PATHS, e.g. the Oct 23 /checkin-<token>/). A device
   that opened one still has the old app's service worker registered
   there. Opening the new address (/checkin/) asks the browser to check
   that worker for an update now: it gets src/checkin/retiredSw.js (the
   file at the old address's sw.js), which sends the old address here,
   offline too, and removes the old app's cache. Without this, that
   only happens the next time the old address itself is opened.
   Nothing is unregistered: the replacement worker is what keeps an old
   home-screen icon working offline. Never throws, never blocks the app.
   Pure (the service worker container is passed in):
   node --test src/checkin/lib/retired.test.mjs
========================================================= */

/** The registrations at an earlier address (`scope` is a full URL; its path is compared). */
export function retiredRegistrations(regs, retired = RETIRED_DESK_PATHS) {
  return (regs || []).filter((r) => {
    try { return retired.includes(new URL(r.scope).pathname); } catch { return false; }
  });
}

/** Ask for each earlier address's worker to be updated. → how many there were (0 when none, or on any error). */
export async function retireOldWorkers(container = typeof navigator !== "undefined" ? navigator.serviceWorker : null, retired = RETIRED_DESK_PATHS) {
  try {
    if (!container || typeof container.getRegistrations !== "function") return 0;
    const old = retiredRegistrations(await container.getRegistrations(), retired);
    for (const r of old) {
      try { Promise.resolve(r.update()).catch(() => {}); } catch { /* the next open tries again */ }
    }
    return old.length;
  } catch {
    return 0;
  }
}
