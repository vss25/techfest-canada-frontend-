/* =========================================================
   TTFC Check-in (Oct 23 2026): the guest check-in desk app.
   Its address since Oct 24 2026 (the organiser: "make the URL as
   https://www.thetechfestival.com/checkin but don't put this on the
   website. Only direct link should be there."): /checkin/. Typed
   variants (/checkin, /check-in, any capitalisation, with or without
   the slash) redirect there (vercel.json).
   Unlisted: it's not linked from the public site, not in any sitemap
   or robots.txt, sends noindex (meta + X-Robots-Tag in vercel.json) and
   is its own installable app (own manifest, scope, icons and service
   worker, built by vite.config.js ttfcDeskPwa). The link is shown to
   staff in Admin › Event day › Check-in ("Check-in desk app", with a QR
   code for each iPad). Unlisted is not the security: nothing about
   guests loads without a staff or volunteer sign-in (the backend's
   /api/checkin/desk). src/checkin/lib/deskPath.test.mjs checks all of
   this against vercel.json and the build.
========================================================= */

/** The app's folder and scope: /checkin/ (with the slash). */
export const DESK_PATH = "/checkin/";

/**
 * Its earlier addresses (Oct 23 2026: an unlisted /checkin-<token>/). vercel.json redirects each one (and everything
 * under it) to DESK_PATH, except its sw.js: there the build publishes a small worker (src/checkin/retiredSw.js) that
 * replaces the one a device installed at the old address, so an old bookmark or home-screen icon opens DESK_PATH,
 * offline too.
 */
export const RETIRED_DESK_PATHS = ["/checkin-j0s8e5p4akvh/"];

export const DESK_NAME = "TTFC Check-in";
