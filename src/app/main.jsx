import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
// Order matters: auth configures the API/event clients before pwa records the launch.
import "./lib/auth";
import { registerServiceWorker } from "./lib/pwa";
import "./lib/theme";
import { desktopGated } from "./lib/desktopGate";
import { track } from "../lib/pwaEvents";
import App from "./App.jsx";

// Computers get the "made for your phone" page instead of the app (lib/desktopGate.js).
const DesktopGate = lazy(() => import("./screens/DesktopGate"));

// /app (no slash) → /app/ so the page sits inside the service worker's scope.
if (window.location.pathname === "/app") {
  window.history.replaceState(window.history.state, "", "/app/" + window.location.search + window.location.hash);
}

const gated = desktopGated();
if (gated) {
  // Not installable on a computer: no manifest, so the browser offers no "Install app".
  document.querySelector('link[rel="manifest"]')?.remove();
} else if (new URLSearchParams(window.location.search).get("source") === "desktop-qr") {
  track("pwa_qr_open", { path: window.location.pathname.slice(0, 120) });
}

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
    {gated ? <Suspense fallback={null}><DesktopGate /></Suspense> : <App />}
  </StrictMode>,
);
