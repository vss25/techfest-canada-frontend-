/* =========================================================
   The TTFC 2026 fact sheet (Oct 23 2026): an UNLISTED page.
   The organiser: "don't let it accessible to any one from website
   unless they have the direct link". So its only address is
   /fact-sheet/<token>, with a random 12-character token
   (openssl rand). Plain /fact-sheet, a wrong token or the token in
   capitals match no route: they look like any other unknown URL.
   Nothing on the site links to it (no menu, footer, sitemap or
   search entry) and robots.txt doesn't name it. While it's open the
   page sets <meta name="robots" content="noindex, nofollow,
   noarchive">, and vercel.json sends the same X-Robots-Tag for
   /fact-sheet/(.*). The page itself is a lazy chunk
   (src/pages/FactSheet.jsx), so its text isn't in the main bundle.
   Unlisted is not private: anyone who has the link can open it and
   pass it on. A new token = a new link (the old one stops working).
========================================================= */

export const FACT_SHEET_TOKEN = "s2cqa9c5sf3h";

/** The fact sheet's only route. Matched case-sensitively (App.jsx). */
export const FACT_SHEET_PATH = `/fact-sheet/${FACT_SHEET_TOKEN}`;

/** True only on the fact sheet itself (a trailing slash is fine; any other spelling isn't). */
export const isFactSheetPath = (pathname) => String(pathname || "").replace(/\/+$/, "") === FACT_SHEET_PATH;
