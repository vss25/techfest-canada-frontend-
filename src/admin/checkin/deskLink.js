/* The check-in desk app's link for the Admin card (src/admin/checkin/DeskApp.jsx). The unlisted path comes from the
   server at runtime (GET /api/checkin/desk/info, staff only, password sign-in: the shared contract's C5), so its token
   is in no public website file; only a path of the desk's own shape is ever shown.
   Pure; node --test src/admin/checkin/deskLink.test.mjs */

/** Is this the desk's path (only ever /checkin-<token>/, the token 8–40 lowercase letters and digits)? */
export const isDeskPath = (p) => typeof p === "string" && /^\/checkin-[a-z0-9]{8,40}\/$/.test(p);

/** The full link to show and put in the QR code ("" until the server has said). */
export const deskUrl = (origin, path) => (isDeskPath(path) ? `${String(origin || "").replace(/\/$/, "")}${path}` : "");
