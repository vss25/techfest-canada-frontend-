import { createStore, local } from "./store";
import { detectBrowser, detectOS, isStandalone, markInstalled, markedInstalled } from "../../lib/pwaPlatform";
import { track } from "../../lib/pwaEvents";

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

let registration = null;
let reloading = false;
let userAskedReload = false;

function checkForUpdate(force = false) {
  if (!registration) return;
  const last = Number(local.get(CHECKED_KEY, 0));
  if (!force && Date.now() - last < 3600000) return; // about once an hour
  local.set(CHECKED_KEY, String(Date.now()));
  registration.update().catch(() => {});
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const wanted = !import.meta.env.DEV || new URLSearchParams(window.location.search).get("sw") === "1";
  if (!wanted) return;
  navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).then((reg) => {
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) pwa.set({ updateReady: true });
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener("statechange", () => {
        if (w.state === "installed" && navigator.serviceWorker.controller) pwa.set({ updateReady: true });
      });
    });
    checkForUpdate();
  }).catch(() => { /* private mode etc.: the app still works online */ });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!userAskedReload || reloading) return;
    reloading = true;
    window.location.reload();
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(); });
}

/** "Reload" on the update prompt. */
export function applyUpdate() {
  userAskedReload = true;
  const waiting = registration?.waiting;
  if (waiting) waiting.postMessage({ type: "SKIP_WAITING" });
  else window.location.reload();
  setTimeout(() => { if (!reloading) window.location.reload(); }, 3000);
}

export const platform = () => ({ os: detectOS(), browser: detectBrowser() });
