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

/**
 * iOS major.minor (e.g. 17.4), or 0 when unknown. Safari on iOS 26 freezes
 * the OS token at 18_x, but its Version/ token is the real one (26.4).
 */
export function iosVersion() {
  const u = ua();
  const os = u.match(/OS (\d+)[_.](\d+)/);
  const ver = /Safari\//.test(u) && !/CriOS|FxiOS|EdgiOS/.test(u) ? u.match(/Version\/(\d+)\.(\d+)/) : null;
  const n = (m) => (m ? Number(m[1]) + Number(m[2]) / 10 : 0);
  const v = Math.max(n(os), n(ver));
  if (!v) return forced().startsWith("ios") ? 26 : 0;
  return v;
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
