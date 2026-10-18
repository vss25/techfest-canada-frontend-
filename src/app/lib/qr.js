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

export const sessionLivePayload = (id) => `ttfc://session/${id}/live`;
