import { DESK_PATH } from "../deskPath.js";

/* =========================================================
   TTFC Check-in: its own service worker (<DESK_PATH>sw.js, scope
   DESK_PATH), so the app shell opens offline after the first visit
   and the app installs on its own (iPad / iPhone Add to Home Screen,
   Android Chrome, desktop Chrome / Edge). Nothing depends on it being
   installed: a browser tab works the same.
   Updates apply themselves, but never in the middle of a shift: at
   launch (first 8 s, before any tap), or when the app is in the
   background. While a station is running in front, the header shows
   "Update ready" and a tap reloads (the chime needs a tap again after
   a reload, so we never reload a running desk on our own).
========================================================= */

const listeners = new Set();
let updateReady = false;
let reg = null;
const started = Date.now();
let interacted = false;
["pointerdown", "keydown"].forEach((t) => window.addEventListener(t, () => { interacted = true; }, { capture: true, once: true }));

export const onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const isUpdateReady = () => updateReady;

function apply() {
  const w = reg?.waiting;
  if (!w) return;
  let done = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!done) { done = true; window.location.reload(); } }, { once: true });
  w.postMessage({ type: "SKIP_WAITING" });
  setTimeout(() => { if (!done) { done = true; window.location.reload(); } }, 3000);
}

function waiting() {
  if (!reg?.waiting) return;
  if (document.visibilityState === "hidden" || (!interacted && Date.now() - started < 8000)) { apply(); return; }
  updateReady = true;
  listeners.forEach((fn) => fn(true));
}

/** "Update ready" tapped. */
export function applyUpdate() { if (reg?.waiting) apply(); else window.location.reload(); }

export function registerDeskWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("sw") !== "1") return;
  navigator.serviceWorker.register(`${DESK_PATH}sw.js`, { scope: DESK_PATH }).then((r) => {
    reg = r;
    if (r.waiting && navigator.serviceWorker.controller) waiting();
    r.addEventListener("updatefound", () => {
      const w = r.installing;
      w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) waiting(); });
    });
    r.update().catch(() => {});
    setInterval(() => { if (document.visibilityState === "visible") r.update().catch(() => {}); }, 10 * 60 * 1000);
  }).catch(() => { /* private mode: works online */ });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && reg?.waiting) apply();
    if (document.visibilityState === "visible") reg?.update().catch(() => {});
  });
}
