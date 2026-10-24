/* The check-in desk app's link for the Admin card (src/admin/checkin/DeskApp.jsx). The path comes from the server at
   runtime (GET /api/checkin/desk/info, staff only, password sign-in: the shared contract's C5): /checkin/ (unlisted:
   the public website never links to it); only a path of the desk's own shape is ever shown.
   Pure; node --test src/admin/checkin/deskLink.test.mjs */

/** Is this the desk's path (/checkin/, or the older /checkin-<token>/ form, the token 8–40 lowercase letters and digits)? */
export const isDeskPath = (p) => typeof p === "string" && /^\/checkin(-[a-z0-9]{8,40})?\/$/.test(p);

/** The full link to show and put in the QR code ("" until the server has said). */
export const deskUrl = (origin, path) => (isDeskPath(path) ? `${String(origin || "").replace(/\/$/, "")}${path}` : "");

/**
 * Each station's own address under the desk's path (the desk app's src/checkin/lib/routes.js STATION_SLUGS, Oct 24
 * 2026): one link per iPad. [{ key, label, slug }], the home's order (the More stations last).
 */
export const STATION_LINKS = Object.freeze([
  { key: "lobby", label: "Lobby", slug: "lobby" },
  { key: "desk", label: "Floor 1", slug: "floor-1" },
  { key: "breakfast", label: "CxO Breakfast", slug: "cxo-breakfast" },
  { key: "lunch", label: "Lunch", slug: "lunch" },
  { key: "evening", label: "Evening entry", slug: "evening" },
  { key: "media", label: "Media desk", slug: "media" },
  { key: "av", label: "AV station", slug: "av-station" },
  { key: "exhibitor", label: "Exhibitor desk", slug: "exhibitor-desk" },
].map((x) => Object.freeze(x)));

/** A station's full link ("" until the server has said the desk's path). */
export const stationUrl = (origin, path, slug) => { const base = deskUrl(origin, path); return base && slug ? `${base}${slug}` : ""; };
