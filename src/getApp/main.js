import { getAppTarget } from "../lib/getApp.js";
import { flush, track } from "../lib/pwaEvents.js";

/* /get-app (get-app/index.html): straight on to this phone's store, or to /app/install (src/lib/getApp.js). */
const t = getAppTarget({ ua: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints || 0, search: window.location.search });
if (t.kind === "store") {
  // The same event the install page reports (a phone sent straight to its store never opens that page).
  track("pwa_guide_open", { from: t.from, flow: "qr-store", device: t.os });
  flush();
}
// A store link leaves this page in the history, so coming back from a store that hasn't got TTFC (not every
// country does) shows its "Use TTFC in your browser" line. /app/install replaces it, as before.
if (t.kind === "store") window.location.assign(t.url);
else window.location.replace(t.url);
