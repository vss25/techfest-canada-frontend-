/* =========================================================
   Where the TTFC app lives: the App Store and Google Play.
   Since Oct 22 2026 both store apps are live and they are how
   people are told to get TTFC everywhere (the organiser:
   "Prompt the users to download Android/iOS. Stop prompting
   people to install the web app"). The web app at /app keeps
   working; nothing offers to add it to the Home Screen any more.
   Used by StoreBadges (the badges): /app/install, the web app's
   Home card and desktop page, the website's homepage section,
   footer, /swag and the "Get the TTFC app" prompts.
   Kept tiny: no imports. Pure: node --test src/lib/appStores.test.mjs.
========================================================= */

export const SITE_ORIGIN = "https://www.thetechfestival.com";

/** Live on Google Play since Oct 17 2026. */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.atlaslinkmarkets.ttfc";

/**
 * The iPhone app (Apple ID 6820764803), live on the App Store since Oct 22 2026, 11:29 PM ET.
 * Set it to "" if the listing is ever pulled: the App Store badge then disappears everywhere (never a broken badge).
 */
export const APP_STORE_URL = "https://apps.apple.com/ca/app/the-tech-festival-canada/id6820764803";

/** The badges' words (as on the official badges), in the order a computer shows them. */
export const STORES = Object.freeze([
  Object.freeze({ id: "appstore", os: "ios", top: "Download on the", name: "App Store", label: "Download the TTFC app on the App Store" }),
  Object.freeze({ id: "play", os: "android", top: "GET IT ON", name: "Google Play", label: "Get the TTFC app on Google Play" }),
]);

const LIVE = { appstore: APP_STORE_URL, play: PLAY_STORE_URL };
const usable = (u) => typeof u === "string" && /^https:\/\/\S+$/.test(u.trim());

/**
 * The stores to show on a device. `os`: "ios" | "android" | "desktop" | "other" (lib/pwaPlatform.js detectOS).
 * → { stores: [{ id, os, top, name, label, url }], primary, phone }: an iPhone / iPad or Android phone gets only
 * its own store (the `primary` one); a computer both, App Store first, primary "". Only its own store since
 * Oct 23 2026: the iPhone app opens our pages in its in-app browser, and Apple doesn't allow other platforms'
 * names or badges in what its apps show (App Store guideline 2.3.10).
 * A store whose link isn't set is left out, so an empty URL never shows a badge.
 */
export function storePlan(os, urls = LIVE) {
  const list = STORES.filter((s) => usable(urls?.[s.id])).map((s) => ({ ...s, url: urls[s.id].trim() }));
  const phone = os === "ios" || os === "android";
  const mine = phone ? list.find((s) => s.os === os) : null;
  return { stores: mine ? [mine] : list, primary: mine ? mine.id : "", phone };
}

/** "the App Store or Google Play" (only the live ones; "" when neither is). With a phone's `os`, only its own store,
    like storePlan. */
export function storeNames(urls = LIVE, os = "") {
  const live = STORES.filter((s) => usable(urls?.[s.id]));
  const mine = live.find((s) => s.os === os);
  return (mine ? [mine] : live).map((s) => (s.id === "appstore" ? "the App Store" : "Google Play")).join(" or ");
}

/**
 * The phone link a desktop QR code opens: /app/install, the "Get the TTFC app" page, which puts the phone's own
 * store first, tagged ?source=desktop-qr. Another /app/… path is kept as it is. Nothing else from the address
 * bar is carried over (no tokens, no QA switches).
 */
export function phoneAppUrl(pathname = "/app/install") {
  let path = String(pathname || "/app/install");
  if (path === "/app" || path === "/app/" || !path.startsWith("/app/")) path = "/app/install";
  return `${SITE_ORIGIN}${path}?${new URLSearchParams({ source: "desktop-qr" })}`;
}
