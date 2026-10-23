/* =========================================================
   "Stay updated": the TTFC 2027 waitlist (Oct 23 2026).
   Shared by the website page (/stay-updated, src/pages/
   StayUpdated.jsx) and the web app screen (/app/stay-updated,
   src/app/screens/StayUpdated.jsx).

   The wording is the stay.* app content keys (backend services/
   waitlist.js STAY_DEFAULTS, served by GET /api/app/content and
   edited in Admin › Sales & emails › 2027 waitlist › Wording). The
   defaults below are the same text, used while that hasn't loaded
   or when a field is empty. The facts are the organiser's (Oct 23
   2026): five one-day briefings (February Vancouver, April
   Montreal, June Calgary and Toronto, September Ottawa), each on
   one technology pillar and one sector, then the festival in
   Toronto, two days in November 2027; dates to be announced for
   every event; no attendee count on 2027 material. The journey
   itself is stay.journey (src/lib/stayJourney.js, edited in Admin ›
   … › 2027 journey). The 5 × 5 programme and "What to expect" were
   taken off the page the same day.

   The form posts to POST {API}/stay-updated: { email, phone,
   interests, source, consent: true, _hp } → { ok, message }.
   No store badges here (lib/appStores.js storePlan decides those
   elsewhere). Imports only the pure stayJourney.js: node --test src/lib/stayUpdated.test.mjs.
========================================================= */

import { DEFAULT_JOURNEY_JSON, JOURNEY_KEY } from "./stayJourney.js";

export const STAY_DEFAULTS = Object.freeze({
  "stay.seo_title": "Stay updated: TTFC 2027 in Toronto | The Tech Festival Canada",
  "stay.seo_description": "TTFC 2027 across Canada: one-day briefings in Vancouver, Montreal, Calgary, Toronto and Ottawa, then two days in Toronto in November 2027. Join the waitlist.",
  "stay.eyebrow": "Stay updated",
  "stay.hero_title": "TTFC 2027 · Toronto · November 2027",
  "stay.hero_intro": "TTFC 2027 travels across Canada: five focused one-day briefings in Vancouver, Montreal, Calgary, Toronto and Ottawa, then The Tech Festival Canada, two days in Toronto in November 2027. Dates to be announced for every event. Join the waitlist and our team will keep you posted.",
  "stay.journey_title": "TTFC 2027 across Canada",
  "stay.journey_intro": "Five focused one-day briefings, each on one technology pillar and one sector, lead to two days in Toronto in November 2027. Dates to be announced for every event.",
  [JOURNEY_KEY]: DEFAULT_JOURNEY_JSON,
  "stay.form_title": "Join the TTFC 2027 waitlist",
  "stay.form_intro": "Leave your email and phone number. Tick anything else you'd like to talk to us about.",
  "stay.field_email": "Email",
  "stay.field_phone": "Phone",
  "stay.interests_label": "I'm also interested in (optional)",
  "stay.interest_sponsorship": "Sponsorship",
  "stay.interest_exhibitor": "Exhibiting",
  "stay.interest_delegation": "Bringing a delegation",
  "stay.consent": "By joining, you agree The Tech Festival Canada can contact you about TTFC 2027.",
  "stay.button": "Join the waitlist",
  "stay.thanks_title": "You're on the TTFC 2027 waitlist",
  "stay.thanks": "Thank you for your interest. Someone from our team will reach out.",
  "stay.email_subject": "You're on the TTFC 2027 waitlist",
  "stay.email_heading": "You're on the TTFC 2027 waitlist.",
  "stay.email_intro": "Thank you for your interest in TTFC 2027: one-day briefings in Vancouver, Montreal, Calgary, Toronto and Ottawa, then The Tech Festival Canada, two days in Toronto in November 2027. Dates to be announced for every event.",
  "stay.email_next": "Someone from our team will reach out.",
  "stay.email_button": "See what's coming in 2027",
});
export const STAY_KEYS = Object.freeze(Object.keys(STAY_DEFAULTS));

/** The tick boxes, in this order (stored values; their labels are stay.interest_*). */
export const INTERESTS = Object.freeze(["sponsorship", "exhibitor", "delegation"]);

/** The page's wording: saved values (GET /api/app/content) over the defaults; empty = the default. */
export function stayFrom(values) {
  const out = { ...STAY_DEFAULTS };
  for (const k of STAY_KEYS) {
    const v = values?.[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

/** "TTFC 2027 · Toronto · Dates to be announced" → { lead: "TTFC 2027", rest: ["Toronto", "Dates to be announced"] }. */
export function heroParts(title) {
  const parts = String(title ?? "").split(/\s+[·•|]\s+/).map((x) => x.trim()).filter(Boolean);
  return { lead: parts[0] || "", rest: parts.slice(1) };
}

/* ---------- the form (the same rules as the server, so people see the problem before sending) ---------- */

const EMAIL = /^[^\s@<>"',;:()[\]]+@[^\s@<>"',;:()[\]]+\.[^\s@<>"',;:()[\].]{2,}$/;
export const PHONE_DIGITS = Object.freeze({ min: 7, max: 20 });

export const ERRORS = Object.freeze({
  emailMissing: "Enter your email address.",
  emailBad: "That email address doesn't look right. Check it and try again.",
  phoneMissing: "Enter your phone number.",
  phoneBad: "That phone number doesn't look right. Use digits, with + ( ) - or spaces if you like.",
  network: "We couldn't reach our server. Check your connection and try again.",
  failed: "Something went wrong. Please try again, or email enquire@thetechfestival.com.",
});

/** The digits of a phone number once + spaces dashes parens are taken out, or null when anything else is in it. */
export function phoneDigits(v) {
  const s = String(v ?? "").trim();
  if (!s || s.length > 40) return null;
  const d = s.replace(/[+\s\-()]/g, "");
  return /^\d+$/.test(d) ? d : null;
}

/** { email?: string, phone?: string } problems in plain words ({} = fine). */
export function checkForm({ email, phone }) {
  const errors = {};
  const e = String(email ?? "").trim();
  if (!e) errors.email = ERRORS.emailMissing;
  else if (e.length > 254 || !EMAIL.test(e)) errors.email = ERRORS.emailBad;
  const p = String(phone ?? "").trim();
  const d = phoneDigits(p);
  if (!p) errors.phone = ERRORS.phoneMissing;
  else if (d === null || d.length < PHONE_DIGITS.min || d.length > PHONE_DIGITS.max) errors.phone = ERRORS.phoneBad;
  return errors;
}

/** ?source=ios|android|webapp from the apps' links; anything else is the website. */
export function sourceFrom(search, fallback = "website") {
  let s = "";
  try { s = new URLSearchParams(search || "").get("source") || ""; } catch { s = ""; }
  s = s.trim().toLowerCase();
  return ["ios", "android", "webapp", "website"].includes(s) ? s : fallback;
}

/**
 * Sends the form. → { message } on success; throws an Error with `field` ("email" | "phone" | …) and a message in
 * plain words otherwise. `fetchImpl` for tests.
 */
export async function joinWaitlist(api, { email, phone, interests = [], source = "website", hp = "" }, { fetchImpl = globalThis.fetch } = {}) {
  let res;
  try {
    res = await fetchImpl(`${String(api).replace(/\/+$/, "")}/stay-updated`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: String(email ?? "").trim(), phone: String(phone ?? "").trim(),
        interests: INTERESTS.filter((k) => interests.includes(k)), source, consent: true, _hp: hp,
      }),
    });
  } catch {
    throw Object.assign(new Error(ERRORS.network), { field: "" });
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.ok) return { message: String(data.message || "").trim() || STAY_DEFAULTS["stay.thanks"] };
  const msg = data?.error === "maintenance" ? data.message : data?.error || data?.message;
  throw Object.assign(new Error(typeof msg === "string" && msg ? msg : ERRORS.failed), { field: data?.field || "", status: res.status });
}

/** Where the footer button lands: the waitlist form on /stay-updated. */
export const WAITLIST_FORM_URL = "/stay-updated#join";

/** Scrolls to the waitlist form (#join) and puts the cursor in its first field. Browser only; does nothing elsewhere. */
export function goToWaitlistForm() {
  if (typeof document === "undefined") return;
  const el = document.getElementById("join");
  if (!el) return;
  // An instant jump: a smooth scroll gets cancelled by the link's own navigation and by focusing the field.
  el.scrollIntoView({ behavior: "auto", block: "start" });
  el.querySelector("input")?.focus({ preventScroll: true });
}
