/* =========================================================
   "Rate the app" (Oct 27 2026): thetechfestival.com/rate (and
   /app/rate in the web app), the link a notification can carry so
   one tap opens the right store's review page: an iPhone / iPad
   goes to the App Store's "Write a Review", an Android phone to the
   Google Play listing; anything else sees both badges with neutral
   words. Never ask for five stars or a good rating: both stores
   reject apps that do. ?store=ios|android picks the store (the
   survey's thank-you links that way on a computer).
   Pure, imports only appStores.js: node --test src/lib/rate.test.mjs.
========================================================= */

import { PLAY_STORE_URL } from "./appStores.js";

export const RATE_PAGE = "/rate";
export const RATE_URL = "https://www.thetechfestival.com/rate";
export const APP_STORE_REVIEW_URL = "https://apps.apple.com/app/id6820764803?action=write-review";
export const PLAY_STORE_REVIEW_URL = PLAY_STORE_URL;
export const RATE_TEXT = "Enjoying the TTFC app? A rating helps other attendees find it.";
export const RATE_PROMPT = "Enjoying the TTFC app? Rate it";

/** "ios" | "android" | "" from ?store= (anything else is ignored). */
export function storeParam(search) {
  let v = "";
  try { v = new URLSearchParams(search instanceof URLSearchParams ? search : String(search ?? "")).get("store") || ""; } catch { v = ""; }
  v = v.trim().toLowerCase();
  return v === "ios" || v === "appstore" ? "ios" : v === "android" || v === "play" ? "android" : "";
}

/** Where /rate sends this visitor: the review page for their phone (or the ?store= one), else "" (show both badges). */
export function rateTarget(os, store = "") {
  const pick = store || os;
  return pick === "ios" ? APP_STORE_REVIEW_URL : pick === "android" ? PLAY_STORE_REVIEW_URL : "";
}

/** The survey's thank-you offers "Rate it" to people who came from the app (or are on a phone). */
export const showRatePrompt = ({ os, fromApp = false }) => !!fromApp || os === "ios" || os === "android";

/** The thank-you's rate buttons: this phone's store, or both on a computer. → [{ store, label, href }] (via /rate). */
export function rateLinks(os) {
  const ios = { store: "ios", label: "Rate it on the App Store", href: `${RATE_PAGE}?store=ios` };
  const android = { store: "android", label: "Rate it on Google Play", href: `${RATE_PAGE}?store=android` };
  if (os === "ios") return [ios];
  if (os === "android") return [android];
  return [ios, android];
}
