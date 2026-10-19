import { detectOS, isForcedPlatform, isMobileDevice } from "../../lib/pwaPlatform";

/* =========================================================
   The web app is for phones and tablets only (the organiser,
   Oct 19 2026). On a computer, an installed desktop app window
   included, /app shows the "made for your phone" page instead
   (screens/DesktopGate.jsx). Decided once, before the app
   renders (main.jsx), from the device itself.
   QA only (localhost or a dev build, never the live site):
   ?allow-desktop=1 opens the app on a computer for this tab
   (?allow-desktop=0 undoes it), and so does a phone ?pwa-ua=….
========================================================= */

const ALLOW_KEY = "ttfc.app.allowDesktop";
const DEV_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/i;

/** QA switches work here: a dev build, or a page served from this computer. */
const qaHost = () => import.meta.env.DEV || DEV_HOST.test(window.location.hostname);

function qaAllowsDesktop() {
  if (!qaHost()) return false;
  try {
    const q = new URLSearchParams(window.location.search).get("allow-desktop");
    if (q === "1") sessionStorage.setItem(ALLOW_KEY, "1");
    if (q === "0") sessionStorage.removeItem(ALLOW_KEY);
    if (sessionStorage.getItem(ALLOW_KEY) === "1") return true;
  } catch { /* storage blocked: the query string still counts */
    if (new URLSearchParams(window.location.search).get("allow-desktop") === "1") return true;
  }
  return isForcedPlatform() && detectOS() !== "desktop";
}

/** true → show the desktop page, not the app. */
export const desktopGated = () => !isMobileDevice() && !qaAllowsDesktop();
