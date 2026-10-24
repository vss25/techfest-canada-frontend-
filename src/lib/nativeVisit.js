/* =========================================================
   Came from the TTFC iPhone or Android app? (Oct 24 2026)
   The store apps open our pages in the phone's browser (iPhone:
   Safari; Android: a Chrome Custom Tab) with ?source=ios or
   ?source=android, e.g. Profile › "Stay updated for TTFC 2027"
   → /stay-updated?source=ios. The organiser (Oct 24 2026): people
   who already have the app must never be told to download it.
   So a page opened with ?source=ios | android | ios-app |
   android-app | ttfc-app, or ?from=ttfc-app | ios-app |
   android-app, marks this browser session (sessionStorage, so the
   tab keeps it from page to page, the web app at /app included)
   and no "Get the TTFC app" prompt, banner or card shows in it.
   The plain store badges (the footer, /app/install) stay.
   Shared by the website (src/main.jsx) and the web app (src/app/
   main.jsx). Kept tiny: no imports.
   Pure parts: node --test src/lib/nativeVisit.test.mjs
========================================================= */

export const NATIVE_VISIT_KEY = "ttfc.nativeAppVisit";

const SOURCES = new Set(["ios", "android", "ios-app", "android-app", "ttfc-app"]);
const FROMS = new Set(["ttfc-app", "ios-app", "android-app"]);

/**
 * "ios" | "android" | "app" when the address says the page was opened from a TTFC store app, else "".
 * `search` is a query string ("?source=ios&…") or URLSearchParams.
 */
export function nativeAppSource(search) {
  let q;
  try { q = search instanceof URLSearchParams ? search : new URLSearchParams(String(search ?? "")); } catch { return ""; }
  const pick = (name, allowed) => {
    const v = String(q.get(name) ?? "").trim().toLowerCase();
    return allowed.has(v) ? v : "";
  };
  const v = pick("source", SOURCES) || pick("from", FROMS);
  if (!v) return "";
  if (v.startsWith("ios")) return "ios";
  if (v.startsWith("android")) return "android";
  return "app";
}

/** sessionStorage, or null where it's blocked / missing (node, private modes). */
function sessionStore() {
  try { return typeof sessionStorage !== "undefined" ? sessionStorage : null; } catch { return null; }
}

/** Remembers a native-app visit for this browser session. → this session's app ("ios" | "android" | "app") or "". */
export function noteNativeVisit(search = typeof location !== "undefined" ? location.search : "", store = sessionStore()) {
  const now = nativeAppSource(search);
  try {
    if (now) store?.setItem(NATIVE_VISIT_KEY, now);
    return now || store?.getItem(NATIVE_VISIT_KEY) || "";
  } catch {
    return now; // storage blocked: this page still knows
  }
}

// This page's own answer, in case storage is blocked and the address changes later (the SPA moves on).
let noted = "";

/** Call once when the page loads (both entry points). */
export function rememberNativeVisit() {
  noted = noteNativeVisit() || noted;
  return noted;
}

/** True when this browser session started from (or passed through) a TTFC store app link. */
export function isNativeVisit(store = sessionStore()) {
  if (noted) return true;
  try { return !!store?.getItem(NATIVE_VISIT_KEY); } catch { return false; }
}

/**
 * A link that's an app download: the App Store, Google Play, the store apps' own schemes, or the web app's
 * "Get the TTFC app" page (/app/install). Used to keep an announcement like that from native-app visitors.
 */
export function isAppDownloadLink(href) {
  const s = String(href ?? "").trim();
  if (!s) return false;
  if (/^(itms-apps|itms|market):/i.test(s)) return true;
  let u;
  try { u = new URL(s, "https://www.thetechfestival.com"); } catch { return false; }
  const host = u.hostname.toLowerCase();
  if (host === "apps.apple.com" || host === "itunes.apple.com") return true;
  if (host === "play.google.com" && u.pathname.startsWith("/store/apps")) return true;
  const ours = host === "thetechfestival.com" || host.endsWith(".thetechfestival.com");
  return ours && /^\/app\/install(\/|$)/i.test(u.pathname);
}
