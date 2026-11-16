import { storeNames, storePlan } from "../../lib/appStores.js";

/* =========================================================
   /app/install: "Get the TTFC app" (Oct 22 2026, the organiser:
   "Prompt the users to download Android/iOS. Stop prompting people
   to install the web app any longer. However, let the web app be
   active."). One simple page:
     - the App Store and Google Play badges, the phone's own store
       first and highlighted (lib/appStores.js storePlan); store
       links open fine from Instagram's, LinkedIn's or Gmail's
       browser too, so nobody has to switch browsers first;
     - on a computer, both badges and a QR code to this page on the
       phone;
     - "App not in your country's store? Use TTFC here in your
       browser" (Oct 27 2026: the stores don't list TTFC in every
       country, not yet in the EU): the web app keeps working at /app, it just isn't
       offered as a Home Screen install any more (no steps, no
       videos; the recordings in public/app/guide stay, unused).
   Opened from the emails, the website's "Get the TTFC app" links
   (/app/?install=1 lands here), the web app's sign-in screen,
   Profile and the notification settings.
   Pure: node --test src/app/lib/installPage.test.mjs.
========================================================= */

export const INSTALL_URL = "https://www.thetechfestival.com/app/install";
export const WEB_APP_LABEL = "thetechfestival.com/app";
/** The app's name in both stores (the listing's title). */
export const STORE_NAME = "The Tech Festival Canada";

/**
 * The page for this device. `os`: lib/pwaPlatform.js detectOS; `standalone`: opened from a Home Screen web app.
 * → { phone, lead, search, qr, keep }: `search` the "Or search the store" hint on a phone, `qr` the code's link on a
 * computer ("" on a phone), `keep` the line about the web app ({ text, link: true } = a link to /app on the phone).
 */
export function getAppPage({ os, standalone = false } = {}, urls) {
  const plan = storePlan(os, urls);
  const names = storeNames(urls, os);
  const own = plan.stores.find((s) => s.id === plan.primary);
  const lead = names
    ? `Free on ${names}. Your pass, the schedule, live polls and chat on your phone.`
    : `Your pass, the schedule, live polls and chat on your phone, at ${WEB_APP_LABEL}.`;
  return {
    phone: plan.phone,
    lead,
    search: own ? `Button not opening? Search for “${STORE_NAME}” in ${own.id === "appstore" ? "the App Store" : "Google Play"}.` : "",
    qr: plan.phone ? "" : `${INSTALL_URL}?source=desktop-qr`,
    keep: plan.phone
      ? { text: standalone ? "You're using the TTFC web app. You can keep using it here." : "App not in your country's store? Use TTFC here in your browser.", link: true }
      : { text: `Already using TTFC in your phone's browser? It keeps working at ${WEB_APP_LABEL}.`, link: false },
  };
}
