import { DESK_PATH } from "../deskPath.js";
import { createUpdateController } from "./updatePolicy.js";
import { RESUME_KEY } from "./device.js";

/* =========================================================
   TTFC Check-in: its own service worker (<DESK_PATH>sw.js, scope
   DESK_PATH), so the app shell opens offline after the first visit
   and the app installs on its own (iPad / iPhone Add to Home Screen,
   Android Chrome, desktop Chrome / Edge). Nothing depends on it being
   installed: a browser tab works the same.
   Updates (lib/updatePolicy.js): a new version applies itself only
   while no station is running (sign-in, loading, the station picker,
   the Start screen). A running station is never reloaded on its own,
   in front or in the background: the header shows "Update ready · tap
   to reload", and after that tap the station opens on its Start
   screen, so one more tap turns the chime back on.
========================================================= */

const listeners = new Set();
let reg = null;

export const onUpdate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function activate(w) {
  let done = false;
  const reload = () => { if (!done) { done = true; window.location.reload(); } };
  navigator.serviceWorker.addEventListener("controllerchange", reload, { once: true });
  w.postMessage({ type: "SKIP_WAITING" });
  setTimeout(reload, 3000);
}

const updates = createUpdateController({
  activate,
  reload: () => window.location.reload(),
  onReady: (v) => listeners.forEach((fn) => fn(v)),
});
export const isUpdateReady = () => updates.ready();
/** The screen the app shows ("station" while a station is running): updates wait while it is. */
export const setAppScreen = (name) => updates.setScreen(name);

/** "Update ready" tapped: reload into the new version; the station comes back on its Start screen. */
export function applyUpdate(station = "") {
  try { if (station) sessionStorage.setItem(RESUME_KEY, station); } catch { /* blocked: the sound bar asks instead */ }
  updates.applyNow();
}

export function registerDeskWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("sw") !== "1") return;
  navigator.serviceWorker.register(`${DESK_PATH}sw.js`, { scope: DESK_PATH }).then((r) => {
    reg = r;
    if (r.waiting && navigator.serviceWorker.controller) updates.found(r.waiting);
    r.addEventListener("updatefound", () => {
      const w = r.installing;
      w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) updates.found(r.waiting || w); });
    });
    r.update().catch(() => {});
    setInterval(() => { if (document.visibilityState === "visible") r.update().catch(() => {}); }, 10 * 60 * 1000);
  }).catch(() => { /* private mode: works online */ });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg?.update().catch(() => {}); });
}
