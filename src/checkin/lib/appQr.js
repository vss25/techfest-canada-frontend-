/* =========================================================
   TTFC Check-in: the lobby's "Get the TTFC app" QR code (Oct 24 2026,
   the organiser: "big enough so that people can see it and scan it but
   it shouldn't stop people from doing what they are doing or make them
   inefficient").
   One short link, so the code stays low-density and scans from a
   distance: https://www.thetechfestival.com/get-app?from=lobby-qr
   (get-app/index.html): an iPhone or iPad goes straight to the App
   Store, an Android phone to Google Play, a computer to /app/install
   (both badges); `from` goes along for the install page's analytics.
   Drawn on the device (qrcode.react, already in the website's bundle),
   so it shows offline too. Where it sits never covers the search, the
   results, Mark arrived, NO DETAILS FOUND or the banners:
     wide (an iPad in landscape, a laptop; 900 px and up): a right-hand
       column next to the lobby's search and list;
     tablet (an iPad in portrait, 640–899 px): the same column, smaller;
     phone: a small "App QR" chip above the recent arrivals (hidden
       while a search shows results); open, a compact card there.
   It collapses to the chip and stays so on this device (localStorage);
   open by default on an iPad / laptop, collapsed on a phone. Tap the
   code: full screen (for scanning from further away), any tap or key
   closes it, and it closes by itself after 20 s.
   Pure; node --test src/checkin/lib/appQr.test.mjs
========================================================= */

import { SITE_ORIGIN } from "../../lib/appStores.js";

/** The page every TTFC app QR on the desk opens (get-app/index.html: the phone's own store). */
export const GET_APP_PATH = "/get-app";
export const LOBBY_QR_URL = `${SITE_ORIGIN}${GET_APP_PATH}?from=lobby-qr`;
export const QR_COLLAPSED_KEY = "ttfc.desk.appQr.collapsed";
export const QR_FULL_MS = 20 * 1000;

/** Where the QR goes for a lobby this wide: "side" (a column beside the list) | "inline" (the phone's chip / card). */
export const qrPlacement = (width) => (Number(width) >= 640 ? "side" : "inline");

/** The code's size in CSS pixels: ≥ 200 on an iPad (240 from 1000 px wide), 160 on a phone. */
export function qrSize(width, height = 800) {
  const w = Number(width) || 0;
  if (w < 640) return 160;
  if (w >= 1000 && Number(height) >= 600) return 240;
  return 200;
}

/** Collapsed? What this device chose ("1" / "0"), else collapsed on a phone and open on an iPad or laptop. */
export function qrCollapsed(stored, width) {
  if (stored === "1") return true;
  if (stored === "0") return false;
  return qrPlacement(width) === "inline";
}
