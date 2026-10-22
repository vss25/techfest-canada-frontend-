import { createStore } from "./store";

/* =========================================================
   "You're offline", only when it's true. In Home Screen web
   apps on iOS (and the Simulator after the Mac sleeps or
   changes network) navigator.onLine can stay false while the
   network works, and no "online" event ever comes. So a hint
   (onLine false, an "offline" event, an API call that couldn't
   reach the server) is first checked with a real request: a
   HEAD for the app's manifest, never cached, 5 s at most (HEAD
   so the service worker can't answer it from its cache).
   While the bar shows: checked again on "online", when the app
   comes back to the front, and every 15 s; any request that
   gets through hides it.
========================================================= */

export const connectivity = createStore({ offline: false });

const PROBE = "/app/manifest.webmanifest";
const TIMEOUT = 5000;
const RECHECK = 15000;
let pending = null;
let timer = null;

async function reachable() {
  const ctl = typeof AbortController === "undefined" ? null : new AbortController();
  const t = setTimeout(() => ctl?.abort(), TIMEOUT);
  try {
    await fetch(PROBE, { method: "HEAD", cache: "no-store", signal: ctl?.signal });
    return true; // any answer at all: the network works
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function setOffline(offline) {
  if (connectivity.get().offline !== offline) connectivity.set({ offline });
  clearInterval(timer);
  timer = offline ? setInterval(checkConnection, RECHECK) : null;
}

/** Checks for real (one check at a time). → true when online. */
export function checkConnection() {
  if (!pending) pending = reachable().then((ok) => { pending = null; setOffline(!ok); return ok; });
  return pending;
}

/** A request got an answer from the server. */
export function reachedServer() {
  if (connectivity.get().offline) setOffline(false);
}

/** A request failed before reaching the server: offline, or just that server? */
export function couldNotReach() {
  checkConnection();
}

if (typeof window !== "undefined") {
  const recheck = () => { if (connectivity.get().offline) checkConnection(); };
  window.addEventListener("offline", () => checkConnection());
  window.addEventListener("online", recheck);
  window.addEventListener("focus", recheck);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") recheck(); });
  if (navigator.onLine === false) checkConnection();
}
