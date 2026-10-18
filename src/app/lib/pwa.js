import { createStore, local } from "./store";
import { detectBrowser, detectOS, isStandalone, markInstalled, markedInstalled } from "../../lib/pwaPlatform";
import { track } from "../../lib/pwaEvents";
import { isMidTask } from "./busy";
import { showAlert } from "./ui";

/* =========================================================
   Installable-app plumbing:
   • the service worker (/app/sw.js) and its "New version" prompt
   • Chrome / Edge / Samsung's install prompt (beforeinstallprompt)
   • install / launch events and the first-launch welcome card
   Imported first by main.jsx, so the install prompt event is
   never missed.
========================================================= */

const standalone = isStandalone();
const FIRST_LAUNCH_KEY = "ttfc.pwa.launched";
const WELCOMED_KEY = "ttfc.pwa.welcomed";
const CHECKED_KEY = "ttfc.sw.checkedAt";

export const pwa = createStore({
  standalone,
  installed: standalone || markedInstalled(),
  canPrompt: false,       // Chrome-style install prompt available
  updateReady: false,     // a new version is waiting
  welcome: false,         // first launch from the Home Screen
  os: detectOS(),
  browser: detectBrowser(),
});

let deferred = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  pwa.set({ canPrompt: true });
});
window.addEventListener("appinstalled", () => {
  markInstalled();
  deferred = null;
  pwa.set({ installed: true, canPrompt: false });
  track("pwa_installed", {});
});

/** Shows the browser's own install dialog. → "accepted" | "dismissed" | "unavailable" */
export async function promptInstall() {
  if (!deferred) return "unavailable";
  const e = deferred;
  deferred = null;
  try {
    e.prompt();
    const { outcome } = await e.userChoice;
    track("pwa_install_click", { outcome });
    pwa.set({ canPrompt: false, ...(outcome === "accepted" ? { installed: true } : {}) });
    if (outcome === "accepted") markInstalled();
    return outcome;
  } catch {
    pwa.set({ canPrompt: false });
    return "unavailable";
  }
}

// ---------- Launch from the Home Screen ----------

if (standalone) {
  markInstalled();
  track("pwa_launch", { firstLaunch: !local.get(FIRST_LAUNCH_KEY) });
  if (!local.get(FIRST_LAUNCH_KEY)) {
    local.set(FIRST_LAUNCH_KEY, new Date().toISOString());
    // iPhone has no install event: the first Home Screen launch is the install.
    if (detectOS() === "ios") track("pwa_installed", { firstLaunch: true });
  }
  if (!local.get(WELCOMED_KEY)) pwa.set({ welcome: true });
}

export function dismissWelcome() {
  local.set(WELCOMED_KEY, "1");
  pwa.set({ welcome: false });
}

// ---------- Service worker ----------
//
// Updates apply on their own:
//  • checked on every launch and whenever the app comes back to the front
//    (at most every 5 minutes): one request for /app/sw.js;
//  • a new version found in the first seconds after launch (before any tap)
//    or while the app is in the background reloads straight away, then says
//    "Updated to the latest version";
//  • if the person is typing or uploading, the "New version available"
//    banner stays and the update applies the next time the app is hidden;
//  • otherwise it applies on the next screen change or when hidden.

const UPDATED_FLAG = "ttfc.sw.updated";
const LAUNCH_WINDOW = 4000;
const RECHECK_MS = 5 * 60 * 1000;
const startedAt = Date.now();
let interacted = false;
let registration = null;
let reloading = false;
let applying = false;
let pendingOnNav = false;

["pointerdown", "keydown"].forEach((t) => window.addEventListener(t, () => { interacted = true; }, { capture: true, once: true }));
const inLaunchWindow = () => !interacted && Date.now() - startedAt < LAUNCH_WINDOW;

function checkForUpdate(force = false) {
  if (!registration) return;
  const last = Number(local.get(CHECKED_KEY, 0));
  if (!force && Date.now() - last < RECHECK_MS) return;
  local.set(CHECKED_KEY, String(Date.now()));
  registration.update().catch(() => {});
}

function reloadOnto(newVersion) {
  if (reloading) return;
  reloading = true;
  try { if (newVersion) sessionStorage.setItem(UPDATED_FLAG, "1"); } catch { /* storage blocked */ }
  window.location.reload();
}

let silentSwap = false;

/** Switch to the waiting version now (skipWaiting) and reload onto it. */
function applyNow() {
  const waiting = registration?.waiting;
  if (!waiting || applying) return;
  applying = true;
  waiting.postMessage({ type: "SKIP_WAITING" });
  setTimeout(() => { if (!silentSwap) reloadOnto(true); }, 3000); // controllerchange normally gets there first
}

/** Does the waiting worker already list this page's entry script? (The launch fetched the new build.) */
function isSameBuild(worker) {
  const entry = document.querySelector('script[type="module"][src*="/assets/"]');
  if (!entry || typeof MessageChannel === "undefined") return Promise.resolve(false);
  const url = new URL(entry.src, window.location.href).pathname;
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const t = setTimeout(() => resolve(false), 800);
    ch.port1.onmessage = (e) => { clearTimeout(t); resolve(!!e.data?.has); };
    worker.postMessage({ type: "HAS", url }, [ch.port2]);
  });
}

/** A new version is installed and waiting: apply it now, or as soon as it's safe. */
async function onWaiting() {
  const waiting = registration?.waiting;
  if (!waiting || applying) return;
  if (await isSameBuild(waiting)) {
    // This page is already the new build: hand over without a reload.
    silentSwap = true;
    applying = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }
  if (document.visibilityState === "hidden" || inLaunchWindow()) { applyNow(); return; }
  if (isMidTask()) { pwa.set({ updateReady: true }); return; } // banner; applied when hidden
  pendingOnNav = true; // the next screen change (or hidden)
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const wanted = !import.meta.env.DEV || new URLSearchParams(window.location.search).get("sw") === "1";
  if (!wanted) return;

  // Tell the worker this page applies updates itself (copies from before this get reloaded by it).
  if ("caches" in window) caches.open("ttfc-meta").then((c) => c.put("/app/__updates", new Response("1"))).catch(() => {});

  let updated = false;
  try {
    if (sessionStorage.getItem(UPDATED_FLAG)) { sessionStorage.removeItem(UPDATED_FLAG); updated = true; }
  } catch { /* storage blocked */ }
  // Reloaded by the worker itself (copies from before self-updating): ?ttfc-updated=1.
  const q = new URLSearchParams(window.location.search);
  if (q.has("ttfc-updated")) {
    q.delete("ttfc-updated");
    const rest = q.toString();
    window.history.replaceState(window.history.state, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
    updated = true;
  }
  if (updated) setTimeout(() => showAlert("Updated to the latest version", "", { ms: 3000 }), 600);

  navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).then((reg) => {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) onWaiting();
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) onWaiting();
      });
    });
    checkForUpdate(true); // every launch
  }).catch(() => { /* private mode etc.: the app still works online */ });

  const hadController = !!navigator.serviceWorker.controller;
  let changedUnderUs = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // First install takes control without a reload; after that, a new controller = a new version.
    if (!hadController && !applying) return;
    if (silentSwap) { silentSwap = false; applying = false; return; }
    // Another window applied it while this one has typing in progress: wait for hidden.
    if (!applying && isMidTask()) { changedUnderUs = true; pwa.set({ updateReady: true }); return; }
    reloadOnto(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
    else if (registration?.waiting) applyNow();
    else if (changedUnderUs) reloadOnto(true);
  });
}

/** Called on every screen change (App.jsx): a quiet moment to apply a waiting update. */
export function onScreenChange() {
  if (!pendingOnNav || !registration?.waiting) return;
  if (isMidTask()) { pendingOnNav = false; pwa.set({ updateReady: true }); return; }
  applyNow();
}

/** "Reload" on the update prompt. */
export function applyUpdate() {
  if (registration?.waiting) applyNow();
  else reloadOnto(false);
}

export const platform = () => ({ os: detectOS(), browser: detectBrowser() });
