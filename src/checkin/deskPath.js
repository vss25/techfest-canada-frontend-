/* =========================================================
   TTFC Check-in (Oct 23 2026): the guest check-in desk app.
   Its only address is this UNLISTED path, with a random 12-character
   token (openssl rand), like the fact sheet. It's not linked from the
   public site, not in any sitemap or robots.txt, sends noindex (meta +
   X-Robots-Tag in vercel.json) and is its own installable app (own
   manifest, scope, icons and service worker, built by vite.config.js
   ttfcDeskPwa). The link is shown to staff in Admin › Event day ›
   Check-in ("Check-in desk app", with a QR code for each iPad).
   Unlisted is not the security: nothing about guests loads without a
   staff or volunteer sign-in (the backend's /api/checkin/desk).
   A new token = a new link: change it here, in vercel.json (the test
   src/checkin/lib/deskPath.test.mjs checks they agree) and re-share it.
========================================================= */

export const DESK_TOKEN = "j0s8e5p4akvh";

/** The app's folder and scope: /checkin-<token>/ (with the slash). */
export const DESK_PATH = `/checkin-${DESK_TOKEN}/`;

export const DESK_NAME = "TTFC Check-in";
