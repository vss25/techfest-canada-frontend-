import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./checkin.css";
import { DESK_PATH } from "./deskPath.js";
import { applyTheme } from "./lib/device.js";
import { registerDeskWorker } from "./lib/pwa.js";
import { boot } from "./lib/desk.js";
import App from "./App.jsx";

/* TTFC Check-in (desk/index.html, served at the unlisted DESK_PATH). Never blocks a computer: phones, iPads and laptops
   all get the app, in a tab or installed. */

// /checkin-<token> (no slash) → with the slash, inside the service worker's scope.
if (window.location.pathname === DESK_PATH.slice(0, -1)) {
  window.history.replaceState(window.history.state, "", DESK_PATH + window.location.search + window.location.hash);
}
applyTheme();
registerDeskWorker();
boot();

createRoot(document.getElementById("ci-root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
