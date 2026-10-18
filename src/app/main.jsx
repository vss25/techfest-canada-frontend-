import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
// Order matters: auth configures the API/event clients before pwa records the launch.
import "./lib/auth";
import { registerServiceWorker } from "./lib/pwa";
import "./lib/theme";
import App from "./App.jsx";

// /app (no slash) → /app/ so the page sits inside the service worker's scope.
if (window.location.pathname === "/app") {
  window.history.replaceState(window.history.state, "", "/app/" + window.location.search + window.location.hash);
}

registerServiceWorker();

createRoot(document.getElementById("app-root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
