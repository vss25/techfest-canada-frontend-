/* =========================================================
   The admin check-in page's result card (Oct 22 2026)
   ---------------------------------------------------------
   The organiser: "When I scan someone's pass from the check-in
   page on the admin panel, show me their colour of the pass
   (green, red, gold etc.) and their photo (image) as well as
   pass type (Connect etc.)." Door staff read it from arm's
   length on Oct 26–27.

   POST /api/checkin/scan answers (the backend's
   services/checkinCard.js):
     status    "success" | "already_checked_in" | "practice" (200),
               "invalid" (404)
     practice  (Oct 24 2026) a scan on a day that isn't Day 1 / Day 2:
               the same card, but NOTHING was checked in; with
               alreadyCheckedIn (collected before) and then its time
     badge     { key, label, bg, text }: the colour band, staff-facing
               (VIP gold > Media > Speaker > Staff > Volunteer > the
               pass, green); painted as sent, with the pass's name small
               beside any word that isn't it ("Media · Connect Pass")
     avatarUrl uploaded photo (/api/files/avatar/…, on the API's
               host), else a speaker photo (https), else ""
     passName, name, title, company, extras { cxo, lunch, gala,
     awards }, checkedInAt / time
   An older server sends no badge: the pass in green, as before.
   The networking QR (Oct 24 2026): a scan of someone's "My QR" (the
   apps' Connect code, "TTFC2026|C|…") checks in their pass on the
   server: the same answers, with `scanned: "networking_qr"`, and a
   `note` when they hold several passes (which one was used). When it
   can't: 404 { code: "networking_qr" (an old code: ask for the entry
   pass QR) | "bad_qr" (edited) | "no_pass", message }; the card shows
   the message, never the code's text as a "ticket".
   Pure; node --test src/lib/checkinCard.test.mjs
========================================================= */

/** The green band (any other pass holder), also the fallback when the server sends no badge. */
export const PASS_BADGE = Object.freeze({ key: "pass", bg: "#18A957", text: "#052E16" });
const HEX = /^#[0-9a-f]{6}$/i;
const str = (v) => (typeof v === "string" ? v.trim() : "");

/** The pass's name: "Power Pass" (the server's passName, else its ticket type), or "". */
export function passNameOf(r) {
  const name = str(r?.passName);
  if (name) return name;
  const type = str(r?.ticketType) || str(r?.type);
  return type ? `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()} Pass` : "";
}

/** The band to paint: the server's badge when it's whole, else green with the pass's name. */
export function badgeOf(r) {
  const b = r?.badge;
  if (b && HEX.test(String(b.bg)) && HEX.test(String(b.text)) && str(b.label)) {
    return { key: str(b.key) || "pass", label: str(b.label), bg: b.bg, text: b.text };
  }
  return { ...PASS_BADGE, label: passNameOf(r) || "Pass" };
}

/** The pass's name, shown small in the band beside its word ("Media · Connect Pass", Oct 23 2026: "Media yes is dark
    blue pass"), or "" when the band already says it (the green band is the pass's name). */
export function bandSub(badge, passName) {
  const name = str(passName);
  return name && str(badge?.label).toLowerCase() !== name.toLowerCase() ? name : "";
}

/** The apps' own codes ("TTFC2026|…": a networking / Connect QR), never a ticket ID to show. */
export const isAppQr = (raw) => str(raw).startsWith("TTFC2026|");

/** The networking QR refusals the server names (`code`), each its own outcome. */
const QR_CODES = new Set(["networking_qr", "bad_qr", "no_pass"]);

/**
 * The scan's outcome from the HTTP status (0 = no answer) and the server's body:
 *   "checked_in"  checked in now          "already"  already checked in (amber)
 *   "practice"    not an event day: the card, nothing checked in (neutral, Oct 24 2026)
 *   "not_found"   no such ticket (red)    "invalid"  the request was refused as bad (red)
 *   "networking_qr" | "bad_qr" | "no_pass"  a networking QR the server couldn't check in (red, its message)
 *   "error"       anything else: no connection, no check-in right, server error (red)
 * `raw`: what was scanned; a networking QR an older server didn't know is "networking_qr", never "not found".
 */
export function outcomeOf(status, body, raw = "") {
  if (status >= 200 && status < 300) {
    if (body?.status === "already_checked_in") return "already";
    if (body?.status === "success") return "checked_in";
    if (body?.status === "practice") return "practice";
    return "error";
  }
  if ((status === 404 || body?.status === "invalid") && QR_CODES.has(body?.code)) return body.code;
  if (status === 404 && isAppQr(raw)) return "networking_qr";
  if (status === 404 || body?.status === "invalid") return "not_found";
  if (status === 400) return "invalid";
  return "error";
}

/** The extras the pass includes, in the order the panel lists them (services/passExtras.js). */
export const MEALS = Object.freeze([
  Object.freeze({ key: "cxo", label: "CxO Breakfasts" }),
  Object.freeze({ key: "lunch", label: "Luncheons" }),
  Object.freeze({ key: "gala", label: "Gala Dinner" }),
  Object.freeze({ key: "awards", label: "Awards Night" }),
]);

/** Labels of the included extras ([] = none); null when the server didn't say (older server). */
export function mealsOf(r) {
  const x = r?.extras;
  if (x && typeof x === "object") return MEALS.filter((m) => x[m.key] === true).map((m) => m.label);
  if (typeof r?.cxoBreakfast === "boolean") return r.cxoBreakfast ? [MEALS[0].label] : null;
  return null;
}

/** The banner of a practice scan (a day that isn't Day 1 / Day 2): neutral, not a check-in and not an error. */
export const PRACTICE_TEXT = "Practice scan — not an event day, nothing was checked in";

/** When the pass was collected: now (checked_in), before (already: its time; practice: only when it was collected). */
function atOf(outcome, body) {
  if (outcome === "checked_in") return body?.checkedInAt || null;
  if (outcome === "already") return body?.time || body?.checkedInAt || null;
  if (outcome === "practice") return body?.alreadyCheckedIn ? body?.time || null : null;
  return null;
}

/**
 * Everything the card shows for one scan: { outcome, ticketId, name, title, company, badge, passName, bandSub, avatarUrl,
 * meals, at, collectedBefore, message, note? }. collectedBefore: the pass was collected before this scan (already; a practice
 * scan's alreadyCheckedIn). A practice scan carries the person's card like a check-in, and the server's message.
 */
export function cardFrom({ status = 0, body = null, ticketId = "" } = {}) {
  const outcome = outcomeOf(status, body, ticketId);
  const note = str(body?.note);
  const practice = outcome === "practice";
  const ok = outcome === "checked_in" || outcome === "already" || practice;
  const badge = ok ? badgeOf(body) : null;
  const passName = ok ? passNameOf(body) : "";
  return {
    outcome,
    ticketId: str(body?.ticketId) || (isAppQr(ticketId) ? "" : str(ticketId)),
    name: ok ? str(body?.name) : "",
    title: ok ? str(body?.title) : "",
    company: ok ? str(body?.company) : "",
    badge,
    passName,
    bandSub: ok ? bandSub(badge, passName) : "",
    avatarUrl: ok ? str(body?.avatarUrl) : "",
    meals: ok ? mealsOf(body) : null,
    at: atOf(outcome, body),
    collectedBefore: outcome === "already" || (practice && body?.alreadyCheckedIn === true),
    message: practice ? str(body?.message) : ok ? "" : str(body?.error) || str(body?.message),
    // A networking QR of someone with several passes: which one was checked in.
    ...(ok && note ? { note } : {}),
  };
}

/** The photo's URL to load: a server path (/api/files/avatar/…) on the API's host, an http(s) URL as it is, else "". */
export function avatarSrc(url, origin = "") {
  const u = str(url);
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/") && !u.startsWith("//")) return `${String(origin || "").replace(/\/+$/, "")}${u}`;
  return "";
}

/** "AB" from a name (two letters at most), "?" without one. */
export function initialsOf(name) {
  const parts = str(name).replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

const TZ = "America/Toronto";
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** When they were checked in, Toronto time: "9:42 AM" today, else "Mon, Oct 26, 9:42 AM"; "" without a time. */
export function checkinTime(at, now = new Date()) {
  const d = at ? new Date(at) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
  if (dayKey(d) === dayKey(now)) return time;
  const date = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" }).format(d);
  return `${date}, ${time}`;
}
