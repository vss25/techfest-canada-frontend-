/* =========================================================
   Which phone / browser is this, and is the TTFC app already
   installed? Shared by the website's install prompt and the
   app (/app). Kept tiny: no imports. The detectors take an
   optional user-agent string (unit tests: pwaPlatform.test.mjs).
========================================================= */

/** A raw user-agent override for QA on a local dev server only: ?pwa-uastring=<UA> (kept for the tab). */
function qaUserAgent() {
  try {
    const host = window.location.hostname;
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) && !host.endsWith(".localhost")) return "";
    const q = new URLSearchParams(window.location.search).get("pwa-uastring");
    if (q) sessionStorage.setItem("ttfc.pwa.uastring", q);
    return sessionStorage.getItem("ttfc.pwa.uastring") || "";
  } catch { return ""; }
}

const ua = () => qaUserAgent() || (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");

/**
 * Forced platform for screenshots / QA: ?pwa-ua=<os>-<browser>[-<iOS major>], e.g. ios-safari,
 * ios-safari-27, ios-safari-18, ios-chrome, android-chrome, inapp-ios, inapp-android, desktop-chrome.
 */
function forced() {
  try {
    const q = new URLSearchParams(window.location.search).get("pwa-ua");
    if (q) sessionStorage.setItem("ttfc.pwa.ua", q);
    return sessionStorage.getItem("ttfc.pwa.ua") || "";
  } catch { return ""; }
}

/** A QA override is on (events aren't sent then, so stats stay real). */
export const isForcedPlatform = () => !!forced();

/**
 * "ios" | "android" | "desktop" | "other" from a user agent and the screen's touch points (pure: pwaPlatform.test.mjs).
 * iPadOS Safari reports itself as a Mac ("Macintosh", navigator.platform "MacIntel"); more than one touch point gives
 * it away (a Mac has none). Android tablets say Android without "Mobile": still "android".
 */
export function osFrom(u = "", maxTouchPoints = 0) {
  const s = String(u || "");
  if (/iPhone|iPad|iPod/i.test(s)) return "ios";
  if (/Macintosh/.test(s) && Number(maxTouchPoints) > 1) return "ios";
  if (/Android/i.test(s)) return "android";
  if (/Windows|Macintosh|Linux|CrOS|X11/i.test(s)) return "desktop";
  return "other";
}

/** "ios" | "android" | "desktop" | "other" */
export function detectOS(given) {
  const f = given ? "" : forced();
  if (f) return f.split("-")[0] === "inapp" ? (f.split("-")[1] || "ios") : f.split("-")[0];
  return osFrom(given || ua(), typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0);
}

/**
 * Apps that open links in their own browser, where installing isn't possible: Instagram, Facebook / Messenger,
 * LinkedIn, Gmail, the Google app, WhatsApp, X, TikTok, Snapchat, Pinterest, LINE, WeChat, Teams, Slack… and
 * any iOS web view without Safari's own tokens (caught in detectBrowser).
 */
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A|MessengerForiOS|LinkedInApp|LinkedIn\/|GmailApp|Gmail\/|Line\/|Snapchat|musical_ly|Bytedance|TikTok|Twitter|WhatsApp|GSA\/|Pinterest|; wv\)|WebView|MicroMessenger|Teams\/|Slack\//i;

const IN_APP_NAMES = [
  [/Instagram/i, "Instagram"], [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, "Facebook"], [/MessengerForiOS/i, "Messenger"],
  [/LinkedInApp|LinkedIn\//i, "LinkedIn"], [/GmailApp|Gmail\//i, "Gmail"], [/GSA\//, "the Google app"], [/WhatsApp/i, "WhatsApp"],
  [/Twitter/i, "X"], [/TikTok|musical_ly|Bytedance/i, "TikTok"], [/Snapchat/i, "Snapchat"], [/Pinterest/i, "Pinterest"],
  [/Teams\//i, "Teams"], [/Slack\//i, "Slack"],
];

/** The app whose built-in browser this is ("Instagram"…), or "" when it doesn't say. */
export function inAppName(given) {
  const u = given || ua();
  const hit = IN_APP_NAMES.find(([re]) => re.test(u));
  return hit ? hit[1] : "";
}

/** "safari" | "chrome" | "edge" | "samsung" | "firefox" | "inapp" | "other" */
export function detectBrowser(given) {
  const f = given ? "" : forced();
  if (f) return f.startsWith("inapp") ? "inapp" : (f.split("-")[1] || "other");
  const u = given || ua();
  if (IN_APP.test(u)) return "inapp";
  if (/EdgiOS|EdgA|Edg\//.test(u)) return "edge";
  if (/SamsungBrowser/.test(u)) return "samsung";
  if (/FxiOS|Firefox\//.test(u)) return "firefox";
  if (/CriOS|Chrome\//.test(u)) return /OPR\/|OPT\/|OPiOS|YaBrowser|DuckDuckGo/.test(u) ? "other" : "chrome";
  if (/Safari\//.test(u) && /Version\//.test(u)) return "safari";
  // A web view inside an app: WebKit without Safari's own tokens.
  if (detectOS(u) === "ios" && /AppleWebKit/.test(u) && !/Safari\//.test(u)) return "inapp";
  return "other";
}

/**
 * iOS major.minor (e.g. 17.4), or 0 when unknown. Since iOS 26, Safari freezes the OS token at 18_x
 * (18_6, later 18_7) but its Version/ token is the real one (Version/26.4, Version/27.0), so for Safari
 * the Version/ token wins. Other iOS browsers (Chrome, Edge, Firefox, app web views) only carry the
 * frozen OS token: 18.x there means "iOS 18 or later".
 */
export function iosVersion(given) {
  const f = given ? "" : forced();
  if (f) {
    if (!f.startsWith("ios") && !f.startsWith("inapp-ios")) return 0;
    const v = Number(f.split("-")[2]);
    return v > 0 ? v : 26;
  }
  const u = given || ua();
  const os = u.match(/OS (\d+)[_.](\d+)/);
  const ver = /Safari\//.test(u) && !/CriOS|FxiOS|EdgiOS/.test(u) ? u.match(/Version\/(\d+)\.(\d+)/) : null;
  const n = (m) => (m ? Number(m[1]) + Number(m[2]) / 10 : 0);
  return Math.max(n(os), n(ver));
}

/** Desktop Safari major version (17 = macOS Sonoma's "Add to Dock"), or 0. */
export function safariVersion() {
  const f = forced();
  if (f) return f.endsWith("safari") ? 17 : 0;
  const u = ua();
  if (!/Safari\//.test(u) || /Chrome|Chromium|Edg|OPR|Firefox/.test(u)) return 0;
  const m = u.match(/Version\/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** Chrome, Edge, Brave, Opera, Arc…: browsers with an "Install app" prompt. */
export function isChromium() {
  const f = forced();
  if (f) return /chrome|edge|opera/.test(f);
  return /Chrome\/|Chromium\/|Edg\/|OPR\//.test(ua()) && !/Firefox|FxiOS/.test(ua());
}

/** "mac" | "windows" | "linux" | "chromeos" | "" (computers only). */
export function desktopKind() {
  const u = ua();
  if (/CrOS/.test(u)) return "chromeos";
  if (/Macintosh/.test(u)) return "mac";
  if (/Windows/.test(u)) return "windows";
  if (/Linux|X11/.test(u)) return "linux";
  return "";
}

/** A computer whose browser can install the app (Chromium, or Safari 17+ on a Mac). */
export function desktopCanInstall() {
  const f = forced();
  if (f) return f.startsWith("desktop") && !f.includes("firefox");
  if (detectOS() !== "desktop") return false;
  return isChromium() || (desktopKind() === "mac" && safariVersion() >= 17);
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

/**
 * A real phone or tablet, from the device itself (the ?pwa-ua QA override never counts):
 * iPhone, iPad (also iPadOS's desktop-style "Macintosh" UA, given away by touch points),
 * Android phones and tablets (also Chrome's "Desktop site" mode, which says Linux but has
 * only a touch screen). Windows, Mac, ChromeOS and Linux computers are not, installed
 * desktop app windows included. Unknown devices count as mobile.
 */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return true;
  const u = ua();
  const hints = navigator.userAgentData;
  if (hints && (hints.mobile === true || /^(Android|iOS|iPadOS)$/i.test(hints.platform || ""))) return true;
  if (/iPhone|iPad|iPod|Android|Mobi|Silk\/|Kindle|PlayBook|BB10|webOS/i.test(u)) return true;
  if (/Macintosh/.test(u) && navigator.maxTouchPoints > 1) return true;
  if (/Windows|Macintosh|CrOS/.test(u)) return false;
  if (/Linux|X11/.test(u)) {
    try {
      const touchOnly = window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(hover: none)").matches && !window.matchMedia("(any-pointer: fine)").matches;
      return touchOnly && navigator.maxTouchPoints > 0;
    } catch { return false; }
  }
  return true;
}

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
