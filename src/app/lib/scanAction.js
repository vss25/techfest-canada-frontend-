import { parseQR } from "./qr.js";

/* =========================================================
   Network › Scan: what a scanned code does (pure, tested in
   scanAction.test.mjs). "One QR for everything" (Oct 24 2026):
   • an ENTRY QR   → "Share your contact details", then connected
     ("TECHFEST:…")  with the pass holder (POST social/connections/
                     by-pass, contract C-PASS);
   • an older networking QR ("TTFC2026|C|…", people keep
                     screenshots) → the same sheet, then connected
                     in person (POST social/connections/in-person);
   • a session QR  → its live poll page.
   Staff and volunteers (the organiser, Oct 24 2026: "for staff it
   should default to checkin"; "make sure there is one and only
   code") are asked first, for an entry QR and a networking QR
   alike: "Check in …?" with Check in (the default), Share contact
   instead, Cancel. Check in sends the scanned text to POST
   /checkin/scan, which finds the pass of a networking QR's person
   too; checkinDisplay() turns its answer into the result.
   passOutcome() turns the by-pass answer into what the sheet or
   a toast says.
========================================================= */

/** Staff or volunteer account (iOS RemoteUser.isTeam), or the server's checkIn right: their scans ask before checking in. */
export function staffScanner({ user = null, me = null } = {}) {
  const team = !!user && (user.isAdmin === true || user.role === "admin" || user.role === "volunteer");
  return team || me?.rights?.checkIn === true;
}

/**
 * raw text → one of
 *   { type: "invalid", error }
 *   { type: "session", id }
 *   { type: "pass", ticketId }
 *   { type: "connect", userId, name, local }      local: a demo code kept on this device
 *   { type: "oldApp", error }                     a connect QR from an app too old to carry a user id
 *   staff (staffScanner):
 *   { type: "confirmPass", ticketId }             "Check in pass <id>?"
 *   { type: "confirmConnect", raw, name, share }  "Check in <name>?"; `share`: what Share contact instead does
 *                                                 (the connect / oldApp answer above)
 */
export function scanAction(raw, { demo = false, knows = () => false, staff = false } = {}) {
  const p = parseQR(raw);
  if (!p) return { type: "invalid", error: "That's not a TTFC code." };
  if (p.kind === "session") return { type: "session", id: p.id };
  if (p.kind === "pass") return staff ? { type: "confirmPass", ticketId: p.ticketId } : { type: "pass", ticketId: p.ticketId };
  // Demo mode keeps codes it can't look up (no user id, or someone outside the demo) on this device.
  const local = demo && (!p.userId || !knows(p.userId));
  const connect = !p.userId && !local
    ? { type: "oldApp", error: `${p.name} needs the latest TTFC app for in-person connect.` }
    : { type: "connect", userId: local ? "" : p.userId, name: p.name, local };
  if (staff) return { type: "confirmConnect", raw: String(raw).trim(), name: p.name, share: connect };
  return connect;
}

const CONFIRM_NOTE = "Nothing is recorded until you tap Check in. Their name and pass show after.";

/** The staff question before anything is sent: { title, message, options } for chooseDialog (Cancel is added there). */
export function checkinQuestion(action) {
  const options = [{ label: "Check in", value: "checkin", primary: true }, { label: "Share contact instead", value: "share" }];
  if (action?.type === "confirmConnect") {
    const name = String(action.name || "").trim();
    return { title: name ? `Check in ${name}?` : "Check in?", message: `From their networking QR. ${CONFIRM_NOTE}`, options };
  }
  const id = String(action?.ticketId || "").trim();
  return { title: `Check in pass ${id}?`, message: `Pass ${id}\n${CONFIRM_NOTE}`, options };
}

/** What POST /checkin/scan is sent: the pass ID, or a networking QR's whole text (the server finds that person's pass). */
export const checkinBody = (action) => (action?.type === "confirmConnect"
  ? { ticketId: action.raw, qr: action.raw }
  : { ticketId: String(action?.ticketId || "").trim() });

export const NETWORKING_QR_DEFAULT = "This is a networking code. Ask them to open their pass QR (Profile › My QR).";
const PRACTICE_DEFAULT = "Not an event day: nothing was checked in.";

/**
 * POST /checkin/scan's answer → { title, message, tone: "success" | "warning" | "neutral" | "error" } (iOS EntryScan.display).
 * `status`: the HTTP status (0 = no answer); `data`: its body; `scanned`: what was scanned, for "No TTFC pass matches …".
 */
export function checkinDisplay(status, data, scanned, { tierName = (t) => `${t.charAt(0).toUpperCase()}${t.slice(1)} Pass` } = {}) {
  const st = Number(status) || 0;
  if (!st) return { title: "Check-in failed", message: "Can't reach the TTFC server. Check the connection and try again.", tone: "error" };
  const a = data && typeof data === "object" ? data : {};
  const clean = (v) => String(v ?? "").trim();
  const words = clean(a.message) || clean(a.error);
  if (clean(a.code) === "networking_qr") return { title: "Networking QR", message: words || NETWORKING_QR_DEFAULT, tone: "warning" };
  if (st === 401 || st === 403) return { title: "Staff only", message: "Sign in with a staff or volunteer account to check people in.", tone: "error" };
  const who = clean(a.name) || "Attendee";
  const pass = clean(a.passName) || (clean(a.ticketType) ? tierName(clean(a.ticketType)) : "Pass");
  const id = clean(a.ticketId) || clean(scanned);
  const s = clean(a.status).toLowerCase();
  if (s === "practice") return { title: "Practice scan", message: `${who} · ${pass}\n\n${words || PRACTICE_DEFAULT}`, tone: "neutral" };
  if (st === 404 || s === "invalid") return { title: "Not a valid pass", message: `No TTFC pass matches ${id}. Send the attendee to the registration desk.`, tone: "error" };
  if (st >= 200 && st < 300) {
    if (s === "success") return { title: "Checked in ✓", message: `${who} · ${pass} · ${id}`, tone: "success" };
    if (s === "already_checked_in") return { title: "Already checked in", message: `${who} · ${pass}${clean(a.time) ? ` · ${clean(a.time)}` : ""}`, tone: "warning" };
  }
  return { title: "Check-in failed", message: words || "Try again.", tone: "error" };
}

const FRIENDLY = {
  not_found: { title: "Pass not found", message: "That isn't a TTFC pass we know." },
  not_on_app: { title: "Not on the app yet", message: "They haven't joined the TTFC app yet. You can connect once they sign in." },
  self: { title: "That's your pass", message: "That's your own pass. Scan someone else's to connect." },
  share_off: { title: "Contact sharing is off", message: "Contact sharing is off for your pass type, so you can't connect by scanning a pass." },
  rate_limited: { title: "Too many scans", message: "Wait a few minutes, then try again." },
};

/**
 * The by-pass answer → what to show.
 *   result  the connection (200), or null
 *   error   the thrown ApiError ({ status, message, data: { code, error } }), or null
 * → { ok: true, title, name, alreadyConnected, conn }           connected (the sheet closes)
 *   { ok: false, close: true, title, message, code }            a final answer (close the sheet, show a toast)
 *   { ok: false, close: false, message }                        worth another try (stays on the sheet)
 */
export function passOutcome({ result = null, error = null } = {}) {
  if (result && !error) {
    const name = String(result.user?.name || "").trim() || "them";
    const already = !!result.alreadyConnected;
    return { ok: true, name, alreadyConnected: already, conn: result, title: already ? `You're already connected with ${name}` : `You're connected with ${name}` };
  }
  const status = Number(error?.status) || 0;
  const code = String(error?.data?.code || "")
    || (status === 404 ? "not_found" : status === 409 ? "not_on_app" : status === 429 ? "rate_limited" : status === 403 ? "share_off" : "");
  const known = FRIENDLY[code];
  if (known) {
    // The server's own words when it sent them (they match), except for "self" and share_off, which say more here.
    const message = code === "self" || code === "share_off" ? known.message : String(error?.data?.error || "") || known.message;
    return { ok: false, close: true, code, title: known.title, message };
  }
  return { ok: false, close: false, message: error?.message || "Couldn't connect. Check your connection and try again." };
}
