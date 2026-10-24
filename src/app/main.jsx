import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
// Order matters: auth configures the API/event clients before pwa records the launch.
import "./lib/auth";
import { registerServiceWorker } from "./lib/pwa";
import "./lib/theme";
import { desktopGated } from "./lib/desktopGate";
import { track } from "../lib/pwaEvents";
import { recordInviteVisit } from "./lib/inviteVisit";
import { rememberNativeVisit } from "../lib/nativeVisit";
import { API } from "./lib/config";
import { installViewportFix } from "./lib/viewport";
import App from "./App.jsx";

// Computers get the "made for your phone" page instead of the app (lib/desktopGate.js); /app/install shows the
// install page there too (screens/DesktopPages.jsx).
const DesktopPages = lazy(() => import("./screens/DesktopPages"));

// /app (no slash) → /app/ so the page sits inside the service worker's scope.
if (window.location.pathname === "/app") {
  window.history.replaceState(window.history.state, "", "/app/" + window.location.search + window.location.hash);
}

// Opened from the iPhone or Android app (?source=ios …): no "Get the TTFC app" nudges in this tab (lib/nativeVisit.js).
rememberNativeVisit();

// Opened from the app invite or swag email's button (/app/#r=<token>, /app/install?…#r=<token>): count the visit, then tidy the address (lib/inviteVisit.js).
recordInviteVisit(API);

const gated = desktopGated();
if (gated) {
  // Not installable on a computer: no manifest, so the browser offers no "Install app".
  document.querySelector('link[rel="manifest"]')?.remove();
} else if (new URLSearchParams(window.location.search).get("source") === "desktop-qr") {
  track("pwa_qr_open", { path: window.location.pathname.slice(0, 120) });
}
// The docked tab bar stays on the bottom edge after the keyboard or a filter picker closes (lib/viewport.js).
if (!gated) installViewportFix();

// A computer that already has the worker (an installed desktop app) keeps getting updates;
// other computers don't download the app for offline use.
if (!gated || navigator.serviceWorker?.controller) registerServiceWorker();

// The launch screen never outstays a slow or failed first load.
setTimeout(() => {
  const el = document.getElementById("boot-splash");
  if (el) { el.classList.add("is-done"); setTimeout(() => el.remove(), 300); }
}, 8000);

createRoot(document.getElementById("app-root")).render(
  <StrictMode>
    {gated ? <Suspense fallback={null}><DesktopPages /></Suspense> : <App />}
  </StrictMode>,
);
