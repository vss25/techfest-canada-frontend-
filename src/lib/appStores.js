/* =========================================================
   Where the TTFC app lives, for the "made for your phone"
   page at /app on computers and the website's desktop nudge.
   Kept tiny: no imports.
========================================================= */

export const SITE_ORIGIN = "https://www.thetechfestival.com";

/** Live on Google Play since Oct 17 2026. */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.atlaslinkmarkets.ttfc";

/**
 * The iOS app (Apple ID 6820764803). Empty while it isn't on the App Store:
 * https://apps.apple.com/ca/app/id6820764803 answered 404 on Oct 19 2026.
 * Put "https://apps.apple.com/ca/app/id6820764803" here once the listing is live
 * and the App Store badge appears next to Google Play.
 */
export const APP_STORE_URL = "";

/**
 * The phone link a desktop QR code opens: the same /app screen (deep links like
 * /app/session/x are kept), tagged ?source=desktop-qr. Nothing else from the
 * address bar is carried over (no tokens, no QA switches); `install` adds
 * install=1, which opens the step-by-step install guide on the phone.
 */
export function phoneAppUrl(pathname = "/app/", { install = false } = {}) {
  let path = String(pathname || "/app/");
  if (path === "/app" || !path.startsWith("/app/")) path = "/app/";
  const q = new URLSearchParams({ source: "desktop-qr" });
  if (install) q.set("install", "1");
  return `${SITE_ORIGIN}${path}?${q.toString()}`;
}
