/* =========================================================
   TTFC Check-in: every station has its own address (Oct 24 2026, the
   organiser: "Checkin Page home page would be
   thetechfestival.com/checkin" and "Lobby, Floor 1, etc. should be
   thetechfestival.com/checkin/lobby etc.").
     /checkin/                 home: the station picker (after sign-in)
     /checkin/lobby            Lobby (Arrivals)
     /checkin/floor-1          Floor 1 (the pass desk)
     /checkin/cxo-breakfast    CxO Breakfast
     /checkin/lunch            Lunch (Networking Luncheon)
     /checkin/evening          Evening entry (Day 1 Catalyst Awards Night,
                               Day 2 Gala Dinner, as the agenda says)
     /checkin/media            Media desk        (home: More)
     /checkin/av-station       AV station        (home: More)
     /checkin/exhibitor-desk   Exhibitor desk    (home: More)
   The address is the truth: a device opened (or reloaded) on a station's
   address runs that station; the browser's back / forward move between
   them; the day is always today (Toronto), never in the address.
   Typed variants are forgiven and put right in the address bar
   (capitals, a trailing slash, "floor1", "pass-desk", "breakfast", "av",
   "exhibitor", …); an address that names no station opens the home.
   vercel.json serves the app's page for every /checkin/… address (the
   service worker does too, offline).
   Pure; node --test src/checkin/lib/routes.test.mjs
========================================================= */

import { DESK_PATH } from "../deskPath.js";

/** Station key (the server's) → its address under DESK_PATH. */
export const STATION_SLUGS = Object.freeze({
  lobby: "lobby",
  desk: "floor-1",
  breakfast: "cxo-breakfast",
  lunch: "lunch",
  evening: "evening",
  media: "media",
  av: "av-station",
  exhibitor: "exhibitor-desk",
});
const BY_SLUG = Object.fromEntries(Object.entries(STATION_SLUGS).map(([k, v]) => [v, k]));

/** What else people may type (lower-cased, without the slash), and the station it means. */
const ALIASES = Object.freeze({
  arrivals: "lobby", entrance: "lobby",
  "floor-one": "desk", floor1: "desk", "floor-1-desk": "desk", "pass-desk": "desk", passdesk: "desk", desk: "desk", "1st-floor": "desk", "first-floor": "desk",
  breakfast: "breakfast", cxo: "breakfast", cxobreakfast: "breakfast", "cxo-breakfast-entry": "breakfast",
  luncheon: "lunch", "networking-lunch": "lunch", "networking-luncheon": "lunch",
  "evening-entry": "evening", dinner: "evening", gala: "evening", "gala-dinner": "evening", awards: "evening", "awards-night": "evening", "catalyst-awards": "evening",
  "media-desk": "media", press: "media",
  av: "av", "av-desk": "av", avstation: "av",
  exhibitor: "exhibitor", exhibitors: "exhibitor", exhibitordesk: "exhibitor", "exhibitor-desks": "exhibitor",
});

/** The address of a station ("" or an unknown key: the home). */
export const stationPath = (key) => (STATION_SLUGS[key] ? `${DESK_PATH}${STATION_SLUGS[key]}` : DESK_PATH);

/** Is this address the app's (DESK_PATH, or anything under it, any capitalisation)? */
const inApp = (pathname) => String(pathname || "").toLowerCase().startsWith(DESK_PATH.slice(0, -1).toLowerCase());

/**
 * The station an address names → { station: key | "", canonical: the address it should read, or null when it already
 * does }. The home ("/checkin/", "/checkin"): station "". An unknown slug, or anything deeper than one slug: the home.
 */
export function routeOf(pathname = "") {
  const p = String(pathname || "");
  if (!inApp(p)) return { station: "", canonical: null };
  const rest = p.slice(DESK_PATH.length - 1).replace(/^\/+/, "");
  let slug = "";
  try { slug = decodeURIComponent(rest); } catch { slug = rest; }
  slug = slug.replace(/\/+$/, "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!slug || slug === "index.html") {
    return { station: "", canonical: p === DESK_PATH ? null : DESK_PATH };
  }
  const station = BY_SLUG[slug] || ALIASES[slug] || ALIASES[slug.replace(/-/g, "")] || "";
  const canonical = stationPath(station);
  return { station, canonical: canonical === p ? null : canonical };
}

/** The station the address names (the home: ""). */
export const stationFromPath = (pathname) => routeOf(pathname).station;

/** The stations the home shows for each day, in order, and the ones under "More" (open all day, both days). */
export const DAY_STATIONS = Object.freeze(["lobby", "desk", "breakfast", "lunch", "evening"]);
export const MORE_STATIONS = Object.freeze(["media", "av", "exhibitor"]);
