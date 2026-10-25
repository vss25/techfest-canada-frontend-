/* =========================================================
   QR payloads, byte-identical to the apps (iOS QRPayload.swift):
   • pass: "TECHFEST:<ticketId>" (the door scanner and website wallet format)
   • connect: "TTFC2026|C|name|title|org|linkedIn|email|userId|<check>"
     fields percent-escaped, check = FNV-1a (+ salt), 6 hex chars.
========================================================= */

const TAG = "TTFC2026";
const SALT = "ttfc-2026-westin";

export const passPayload = (ticketId) => `TECHFEST:${ticketId}`;

/** ASCII letters/digits and " -_.@:/" stay as they are (same as the apps; see the Android QRPayloadTest vectors). */
function esc(s) {
  return Array.from(String(s || "")).map((ch) => (/[A-Za-z0-9 \-_.@:/]/.test(ch) ? ch : encodeURIComponent(ch).replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()))).join("");
}

function check(fields) {
  let h = 2166136261 >>> 0;
  for (const b of new TextEncoder().encode(fields.join("|") + SALT)) {
    h ^= b;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h & 0xffffff).toString(16).padStart(6, "0");
}

export function connectPayload({ name, title, org, linkedIn, email, userId }) {
  const fields = [TAG, "C", esc(name), esc(title), esc(org), esc(linkedIn), esc(email)];
  if (userId) fields.push(esc(userId));
  return [...fields, check(fields)].join("|");
}

/**
 * The one code you show (Oct 24 2026, the organiser: "make sure there is one and only code"): your pass's entry QR
 * whenever you have a pass, so the door and the people you meet scan the same thing; the older networking QR only when
 * you have no pass at all (`connect`: that code). → { kind: "pass" | "connect", value }
 */
export function shownCode({ ticketId = "", connect = "" } = {}) {
  const id = String(ticketId || "").trim();
  return id ? { kind: "pass", value: passPayload(id) } : { kind: "connect", value: connect };
}

export const sessionLivePayload = (id) => `ttfc://session/${id}/live`;

const unesc = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

/** Any TTFC code → { kind: "pass" | "connect" | "session", … } or null (bad check digit = null). */
export function parseQR(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const live = text.match(/^ttfc:\/\/session\/([^/]+)\/live/i);
  if (live) return { kind: "session", id: unesc(live[1]) };
  if (/^techfest:/i.test(text)) {
    const id = text.slice(9).trim();
    return id ? { kind: "pass", ticketId: id } : null;
  }
  const parts = text.split("|");
  if (parts.length < 3 || parts[0] !== TAG) return null;
  const body = parts.slice(0, -1);
  if (parts[parts.length - 1] !== check(body)) return null;
  if (parts[1] === "C" && (parts.length === 8 || parts.length === 9)) {
    return { kind: "connect", name: unesc(parts[2]), title: unesc(parts[3]), org: unesc(parts[4]), linkedIn: unesc(parts[5]), email: unesc(parts[6]), userId: parts.length === 9 ? unesc(parts[7]) : "" };
  }
  return null;
}
