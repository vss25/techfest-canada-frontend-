/* =========================================================
   "Get the TTFC app" for web app users (Oct 24 2026). The
   organiser: the store prompt "should only be for people who are
   using web apps and … detect the device type for those web app
   users to prompt them to download from app or play store."
   So it lives only in the web app (/app; the website shows no
   pop-up any more) and offers one store:
     • iPhone / iPad (iPadOS's Mac-style user agent too, given
       away by its touch points: lib/pwaPlatform.js osFrom) → the
       App Store;
     • Android phones and tablets → Google Play;
     • anything else → nothing (computers get the "made for your
       phone" page anyway).
   Once per browser session, after 5 s of visible time on a calm
   screen (Home, the Schedule, Network, Chats, the Profile tab),
   never on sign-in, forms (Stay updated, Edit profile…), a chat,
   live polls, install / legal pages or the check-in desk app
   (/checkin/), and never while a sheet is open or someone is
   typing (components/StorePrompt.jsx checks those two).
   Staff switch: App text & switches › Feature switches ›
   "Prompt web app users to get the store app" (flag.pwaPrompt;
   missing = off). "Not now" (also ×, Escape, the backdrop) or the
   store button snoozes it, and Home's "The TTFC app is here" card
   with it, for 7 days. Visitors who came from a store app
   (lib/nativeVisit.js) never see it.
   Pure: node --test src/app/lib/storePrompt.test.mjs
========================================================= */

import { storePlan } from "../../lib/appStores.js";

/** Shared with Home's "The TTFC app is here" card (components/GetAppCard.jsx): one snooze for both. */
export const SNOOZE_KEY = "ttfc.getApp.hiddenUntil";
export const SNOOZE_MS = 7 * 24 * 3600 * 1000;
/** sessionStorage: shown once this session. */
export const SEEN_KEY = "ttfc.storePrompt.seen";
/** sessionStorage: visible time on calm screens so far (ms), across screens. */
export const VISIBLE_KEY = "ttfc.storePrompt.visibleMs";
export const DELAY_MS = 5000;
export const FLAG_KEY = "flag.pwaPrompt";

/** The store a device is offered: "appstore" (iPhone / iPad), "play" (Android) or "" (anything else, or no link). */
export function promptStore(os) {
  return os === "ios" || os === "android" ? storePlan(os).primary : "";
}

/** Screens of the web app where the sheet may open (the paths inside /app). */
const CALM = [/^\/$/, /^\/schedule$/, /^\/network(\/[^/]+)?$/, /^\/chats(\/[^/]+)?$/, /^\/profile$/, /^\/notifications$/];

/**
 * A calm screen for the sheet. `pathname` is the page's full path (location.pathname): only /app/… counts, so the
 * website, the check-in desk app (/checkin/) and anything else never do.
 */
export function calmScreen(pathname) {
  const p = String(pathname ?? "");
  if (!/^\/app(\/|$)/i.test(p)) return false;
  const inner = (p.replace(/^\/app/i, "") || "/").replace(/\/+$/, "") || "/";
  return CALM.some((re) => re.test(inner.toLowerCase()));
}

/** The staff switch: true / "true" only (missing or anything else = off). */
export const switchOn = (values) => values?.[FLAG_KEY] === true || values?.[FLAG_KEY] === "true";

/**
 * Why the sheet can't open (a reason), or "" when it may.
 * { values: the app content, os, nativeVisit, seen, snoozedUntil, mode: "out" | "guest" | "user" | "demo",
 *   pathname, now }
 */
export function promptBlocker({ values, os, nativeVisit, seen, snoozedUntil, mode, pathname, now = Date.now() } = {}) {
  if (!switchOn(values)) return "switch-off";
  if (!promptStore(os)) return "device";
  if (nativeVisit) return "native-app";
  if (seen) return "seen";
  if (Number(snoozedUntil) > now) return "snoozed";
  if (mode === "out" || !mode) return "signed-out";
  if (!calmScreen(pathname)) return "screen";
  return "";
}
