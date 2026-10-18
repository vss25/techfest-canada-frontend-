/* =========================================================
   Which phone / browser is this, and is the TTFC app already
   installed? Shared by the website's install prompt and the
   app (/app). Kept tiny: no imports.
========================================================= */

const ua = () => (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");

/** Forced platform for screenshots / QA: ?pwa-ua=ios-safari | ios-chrome | android-chrome | inapp-ios … */
function forced() {
  try {
    const q = new URLSearchParams(window.location.search).get("pwa-ua");
    if (q) sessionStorage.setItem("ttfc.pwa.ua", q);
    return sessionStorage.getItem("ttfc.pwa.ua") || "";
  } catch { return ""; }
}

/** A QA override is on (events aren't sent then, so stats stay real). */
export const isForcedPlatform = () => !!forced();

/** "ios" | "android" | "desktop" | "other" */
export function detectOS() {
  const f = forced();
  if (f) return f.split("-")[0] === "inapp" ? (f.split("-")[1] || "ios") : f.split("-")[0];
  const u = ua();
  if (/iPhone|iPad|iPod/i.test(u)) return "ios";
  // iPadOS reports itself as a Mac; touch points give it away.
  if (/Macintosh/.test(u) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1) return "ios";
  if (/Android/i.test(u)) return "android";
  if (/Windows|Macintosh|Linux|CrOS|X11/i.test(u)) return "desktop";
  return "other";
}

/** Apps that open links in their own browser, where installing isn't possible. */
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A|LinkedInApp|Line\/|Snapchat|musical_ly|Bytedance|TikTok|Twitter|WhatsApp|GSA\/|Pinterest|; wv\)|WebView|MicroMessenger/i;

/** "safari" | "chrome" | "edge" | "samsung" | "firefox" | "inapp" | "other" */
export function detectBrowser() {
  const f = forced();
  if (f) return f.startsWith("inapp") ? "inapp" : (f.split("-")[1] || "other");
  const u = ua();
  if (IN_APP.test(u)) return "inapp";
  if (/EdgiOS|EdgA|Edg\//.test(u)) return "edge";
  if (/SamsungBrowser/.test(u)) return "samsung";
  if (/FxiOS|Firefox\//.test(u)) return "firefox";
  if (/CriOS|Chrome\//.test(u)) return /OPR\/|OPT\/|OPiOS|YaBrowser|DuckDuckGo/.test(u) ? "other" : "chrome";
  if (/Safari\//.test(u) && /Version\//.test(u)) return "safari";
  if (detectOS() === "ios" && /AppleWebKit/.test(u) && !/Safari\//.test(u)) return "inapp";
  return "other";
}

/** iOS major.minor (e.g. 17.4), or 0 when unknown. */
export function iosVersion() {
  const m = ua().match(/OS (\d+)[_.](\d+)/);
  if (!m) return forced().startsWith("ios") ? 26 : 0;
  return Number(m[1]) + Number(m[2]) / 10;
}

/** Running as the installed app (Home Screen / app drawer). */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  } catch { /* old browsers */ }
  return window.navigator.standalone === true;
}

export const displayMode = () => (isStandalone() ? "standalone" : "browser");

/** A phone (not a tablet or computer). */
export function isPhone() {
  if (typeof window === "undefined") return false;
  if (forced()) return true;
  const u = ua();
  if (/iPhone|iPod/.test(u) || (/Android/.test(u) && /Mobile/.test(u))) return true;
  try {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = Math.min(window.screen?.width || 9999, window.screen?.height || 9999) < 600;
    return coarse && narrow;
  } catch { return false; }
}

const INSTALLED_KEY = "ttfc.pwa.installed";

/** This browser said / saw that the app is installed. */
export function markedInstalled() {
  try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
}
export function markInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* storage blocked */ }
}

/** Props every install/launch event carries. */
export function platformProps() {
  return { os: detectOS(), browser: detectBrowser(), displayMode: displayMode() };
}
