// Third-party analytics / advertising tags.
//
// Nothing here loads unless the visitor chose "Accept All" in the cookie
// banner (localStorage tfc_cookie_consent === "all"). "Essential only", or no
// choice yet, loads nothing. index.html defines harmless gtag/fbq stubs up
// front, so calls such as window.fbq("track", "Purchase", ...) never throw;
// they only reach Meta/Google if the real scripts are loaded here later.

export var CONSENT_KEY = "tfc_cookie_consent";

var GA_ID = "G-NG7Q6JVKPH";
var META_PIXEL_ID = "1071261145737578";
var VISITOR_ID_SRC =
  "https://a.usbrowserspeed.com/cs?pid=ddae2e0bce828a30a7b24f94f87290780f71120eaf9f11353f234c3bd86512d3&puid=%7B%22userId%22%3A%226a85fbe1cc41d025e8b088e3%22%2C%22env%22%3A%22prod%22%7D";

var loaded = false;

export function getConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked: the choice applies to this page view only */
  }
}

export function clearConsent() {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* storage blocked */
  }
}

export function hasTrackingConsent() {
  return getConsent() === "all";
}

export function trackersLoaded() {
  return loaded;
}

function addScript(src) {
  var s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
  return s;
}

// Injects GA4, the Meta Pixel and the visitor-identification script once,
// and only with "Accept All" consent. Returns true if it loaded them now.
export function loadTrackers() {
  if (loaded || !hasTrackingConsent()) return false;
  loaded = true;
  var w = window;

  // Google Analytics 4
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    w.gtag = function () { w.dataLayer.push(arguments); };
  }
  w.gtag("js", new Date());
  w.gtag("config", GA_ID);
  addScript("https://www.googletagmanager.com/gtag/js?id=" + GA_ID);

  // Meta Pixel (init + PageView). The queue stub normally comes from index.html.
  if (typeof w.fbq !== "function") {
    var n = (w.fbq = function () {
      if (n.callMethod) n.callMethod.apply(n, arguments);
      else n.queue.push(arguments);
    });
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  }
  w.fbq("init", META_PIXEL_ID);
  w.fbq("track", "PageView");
  addScript("https://connect.facebook.net/en_US/fbevents.js");

  // Visitor-identification script
  addScript(VISITOR_ID_SRC);

  return true;
}

// Adds a page-specific tracking script only with "Accept All" consent.
// Returns a cleanup function (for useEffect), or undefined if nothing was added.
export function addConsentedScript(src) {
  if (!hasTrackingConsent()) return undefined;
  var s = document.createElement("script");
  s.type = "text/javascript";
  s.src = src;
  document.head.appendChild(s);
  return function () { s.remove(); };
}

// Re-opens the cookie banner (used by "Cookie settings" in the footer).
export var OPEN_SETTINGS_EVENT = "tfc:open-cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
