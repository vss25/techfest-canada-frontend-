import { parseQR } from "./qr.js";

/* =========================================================
   Network › Scan: what a scanned code does (pure, tested in
   scanAction.test.mjs). "One QR for everything" (Oct 24 2026):
   • a connect QR  → "Share your contact details", then connected
                     in person (POST social/connections/in-person);
   • an ENTRY QR   → the same sheet, then connected with the pass
     ("TECHFEST:…")  holder (POST social/connections/by-pass,
                     contract C-PASS). The web app has no staff
                     check-in from a scan, so everyone connects;
   • a session QR  → its live poll page.
   passOutcome() turns the by-pass answer into what the sheet or
   a toast says.
========================================================= */

/**
 * raw text → one of
 *   { type: "invalid", error }
 *   { type: "session", id }
 *   { type: "pass", ticketId }
 *   { type: "connect", userId, name, local }      local: a demo code kept on this device
 *   { type: "oldApp", error }                     a connect QR from an app too old to carry a user id
 */
export function scanAction(raw, { demo = false, knows = () => false } = {}) {
  const p = parseQR(raw);
  if (!p) return { type: "invalid", error: "That's not a TTFC code." };
  if (p.kind === "session") return { type: "session", id: p.id };
  if (p.kind === "pass") return { type: "pass", ticketId: p.ticketId };
  // Demo mode keeps codes it can't look up (no user id, or someone outside the demo) on this device.
  const local = demo && (!p.userId || !knows(p.userId));
  if (!p.userId && !local) return { type: "oldApp", error: `${p.name} needs the latest TTFC app for in-person connect.` };
  return { type: "connect", userId: local ? "" : p.userId, name: p.name, local };
}

const FRIENDLY = {
  not_found: { title: "Pass not found", message: "That isn't a TTFC pass we know." },
  not_on_app: { title: "Not on the app yet", message: "They haven't joined the TTFC app yet. You can connect once they sign in." },
  self: { title: "That's your pass", message: "That's your own pass. Scan someone else's to connect." },
  share_off: { title: "Contact sharing is off", message: "Contact sharing is off for your pass type, so you can't connect by scanning a pass. Ask for their connect QR instead." },
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
