/* =========================================================
   The app invite email's button (Oct 20 2026) opens
   https://www.thetechfestival.com/app/#r=<token>: whose email it
   was, signed by the backend (services/trackToken.js). On load we
   send it back once (POST /api/t/v, text/plain so there's no CORS
   preflight, no cookies, never waited for), so Admin › App invite
   email can count who opened the app from it; then #r= comes off
   the address bar, so it isn't bookmarked, shared or added to the
   home screen with it. The backend checks the signature; a token
   that isn't ours is ignored.
========================================================= */

const TOKEN = /^[A-Za-z0-9_-]{8,377}\.[A-Za-z0-9_-]{22}$/;

/** The token in a hash like "#r=…" (other hash parts are kept by takeInviteToken). "" when there's none. */
export function inviteTokenOf(hash) {
  const p = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const r = p.get("r") || "";
  return TOKEN.test(r) ? r : "";
}

/** The hash without its r= part ("" when nothing else was in it). */
export function hashWithoutToken(hash) {
  const p = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  p.delete("r");
  const rest = p.toString();
  return rest ? `#${rest}` : "";
}

/** Reads and removes #r= from the address, and reports the visit to `api` (lib/config.js API). Safe to call more than once. */
export function recordInviteVisit(api, loc = window.location, history = window.history, send = globalThis.fetch) {
  try {
    const r = inviteTokenOf(loc.hash);
    if (!r) return "";
    history.replaceState(history.state, "", loc.pathname + loc.search + hashWithoutToken(loc.hash));
    if (typeof send === "function") {
      send(`${api}/t/v`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ r }),
        credentials: "omit",
        keepalive: true,
      }).catch(() => {});
    }
    return r;
  } catch { return ""; } // never in the way of the app
}
