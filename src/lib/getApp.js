import { APP_STORE_URL, PLAY_STORE_URL } from "./appStores.js";
import { osFrom } from "./pwaPlatform.js";

/* =========================================================
   /get-app (Oct 24 2026): the short link the check-in desk's lobby QR
   code opens (src/checkin/lib/appQr.js), so the code stays low-density
   and scans from across the desk. One code for every phone:
     iPhone / iPad (an iPad's Safari says "Macintosh": its touch
       points give it away)   → the App Store
     Android                  → Google Play
     anything else (a computer, a store not live) → /app/install, the
       "Get the TTFC app" page with both badges
   `from` (e.g. lobby-qr) goes along to /app/install, whose page
   already reports it ("pwa_guide_open"); a phone sent straight to
   its store reports the same event first (src/getApp/main.js).
   Each phone only ever sees its own store (App Store guideline
   2.3.10, as src/lib/appStores.js storePlan). Not linked from the
   website: only the desk's QR code opens it.
   Pure: node --test src/lib/getApp.test.mjs
========================================================= */

const usable = (u) => typeof u === "string" && /^https:\/\/\S+$/.test(u.trim());
const cleanFrom = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "qr";

/**
 * Where /get-app sends this device. → { os, kind: "store" | "page", url, from }
 * `ua`, `maxTouchPoints`: the browser's; `search`: the address's query ("?from=lobby-qr").
 */
export function getAppTarget({ ua = "", maxTouchPoints = 0, search = "" } = {}, urls = { appstore: APP_STORE_URL, play: PLAY_STORE_URL }) {
  const os = osFrom(ua, maxTouchPoints);
  let from = "qr";
  try { from = cleanFrom(new URLSearchParams(search || "").get("from")); } catch { from = "qr"; }
  if (os === "ios" && usable(urls?.appstore)) return { os, kind: "store", url: urls.appstore.trim(), from };
  if (os === "android" && usable(urls?.play)) return { os, kind: "store", url: urls.play.trim(), from };
  return { os, kind: "page", url: `/app/install?${new URLSearchParams({ from })}`, from };
}
