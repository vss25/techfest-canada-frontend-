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

   The form posts to POST {API}/stay-updated: { name, company,
   email, phone, interests, source, consent: true, _hp } → { ok,
   message }. Name and company since Oct 24 2026 (the organiser:
   "On the waitlist page form, also add name and company name. For
   people who use this in the app, we should have the details
   prefilled since those details are required to be on the app"),
   then the same day: "Please only keep email mandatory in the stay
   updated form." So only the email is required; a name, company or
   phone that is given is checked with the server's rules (backend
   services/waitlist.js validateSignup). prefillFrom() reads a
   signed-in account (GET /api/auth/me) for the forms to start from.
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
  "stay.form_intro": "Only your email is needed; your name, company and phone number help our team reach out. Tick anything else you'd like to talk to us about.",
  "stay.field_name": "Your name",
  "stay.field_company": "Company or organisation",
  "stay.field_email": "Email",
  "stay.field_phone": "Phone",
  "stay.interests_label": "I'm interested in (optional)",
  "stay.interest_delegate": "Attending as a delegate",
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

/** The tick boxes, in this order (stored values; their labels are stay.interest_*). "delegate" (attending as a delegate)
    since Oct 27 2026, first. */
export const INTERESTS = Object.freeze(["delegate", "exhibitor", "sponsorship", "delegation"]);
/** Added Oct 27 2026: a server without it yet refuses it, so the form retries once without it (joinWaitlist). */
export const NEW_INTERESTS = Object.freeze(["delegate"]);

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
/** The name: 2–80 characters, letters in any language (with accents), spaces, hyphens, apostrophes (' ’) and dots. */
export const NAME_LENGTH = Object.freeze({ min: 2, max: 80 });
/** The company or organisation: up to 120 characters. */
export const MAX_COMPANY = 120;
const NAME_CHARS = /^[\p{L}\p{M} .'’‐-]+$/u;
const HAS_LETTER = /\p{L}/u;

/** Only the email is required; the name, company and phone are checked when given (the server's words). */
export const ERRORS = Object.freeze({
  nameLength: "Enter your name in 2 to 80 characters, or leave it empty.",
  nameBad: "Use letters for your name, with spaces, hyphens, apostrophes or dots if you like.",
  companyLong: "Keep your company or organisation to 120 characters.",
  emailMissing: "Enter your email address.",
  emailBad: "That email address doesn't look right. Check it and try again.",
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

/** "  Priya   Raman " → "Priya Raman": control characters out, spaces tidied (as the server stores it). */
// eslint-disable-next-line no-control-regex
export const tidy = (v) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

/** Fields that may be left empty (the form marks them "(optional)"). */
export const OPTIONAL = Object.freeze(["name", "company", "phone"]);

/** { name?, company?, email?, phone? } problems in plain words ({} = fine), the server's rules: only the email is
    required; a name, company or phone that is given must be right. */
export function checkForm({ name, company, email, phone }) {
  const errors = {};
  const n = tidy(name);
  if (n && (n.length < NAME_LENGTH.min || n.length > NAME_LENGTH.max)) errors.name = ERRORS.nameLength;
  else if (n && (!NAME_CHARS.test(n) || !HAS_LETTER.test(n))) errors.name = ERRORS.nameBad;
  if (tidy(company).length > MAX_COMPANY) errors.company = ERRORS.companyLong;
  const e = String(email ?? "").trim();
  if (!e) errors.email = ERRORS.emailMissing;
  else if (e.length > 254 || !EMAIL.test(e)) errors.email = ERRORS.emailBad;
  const p = String(phone ?? "").trim();
  const d = phoneDigits(p);
  if (p && (d === null || d.length < PHONE_DIGITS.min || d.length > PHONE_DIGITS.max)) errors.phone = ERRORS.phoneBad;
  return errors;
}

/** The form's fields in order: the first with a problem gets the cursor. */
export const FIELDS = Object.freeze(["name", "company", "email", "phone"]);
export const firstProblem = (errors) => FIELDS.find((k) => errors?.[k]) || "";

/**
 * What a signed-in account already tells us, for the form to start from (Oct 24 2026: the name and organisation are
 * required in the app, so people shouldn't type them again). `user`: GET /api/auth/me (name, organization, email,
 * contactItems, tickets[].details); `me`: GET /api/social/me (the web app's card: name, organization, email), used
 * where `user` has nothing. The phone: their contact card's phone (not the sign-in email's row), else the newest
 * pass's checkout answer. "" for anything unknown; nothing is checked here (the form checks on Join).
 * @returns {{ name: string, company: string, email: string, phone: string }}
 */
export function prefillFrom(user, me = null) {
  const u = user && typeof user === "object" ? (user.user && typeof user.user === "object" ? user.user : user) : {};
  const m = me && typeof me === "object" ? me : {};
  const pick = (...vals) => { for (const v of vals) { const t = tidy(typeof v === "string" ? v : ""); if (t) return t; } return ""; };
  const card = (Array.isArray(u.contactItems) ? u.contactItems : []).find((i) => i && i.kind === "phone" && !i.account && tidy(i.value));
  const time = (t) => new Date(t?.purchaseDate || t?.createdAt || 0).getTime() || 0;
  const passes = (Array.isArray(u.tickets) ? u.tickets : []).filter((t) => t && t.details && typeof t.details === "object").sort((a, b) => time(b) - time(a));
  const fromPass = passes.map((t) => t.details.phone).find((p) => typeof p === "string" && tidy(p));
  return {
    name: pick(u.name, m.name, [u.firstName, u.lastName].filter((x) => typeof x === "string").join(" ")).slice(0, NAME_LENGTH.max),
    company: pick(u.organization, u.organisation, u.company, m.organization, m.organisation, m.company).slice(0, MAX_COMPANY),
    email: pick(u.email, m.email).slice(0, 254),
    phone: pick(card?.value, fromPass).slice(0, 40),
  };
}

/** `values` with only its empty fields filled from `prefill` (what someone has typed is never replaced). */
export function fillEmpty(values, prefill) {
  const out = { ...values };
  for (const k of FIELDS) if (!String(out[k] ?? "").trim() && prefill?.[k]) out[k] = prefill[k];
  return out;
}

/** ?source=ios|android|webapp from the apps' links; anything else is the website. */
export function sourceFrom(search, fallback = "website") {
  let s = "";
  try { s = new URLSearchParams(search || "").get("source") || ""; } catch { s = ""; }
  s = s.trim().toLowerCase();
  return ["ios", "android", "webapp", "website"].includes(s) ? s : fallback;
}

/** A refusal of the interests themselves (an older server that doesn't know "delegate" yet). */
const interestsRefused = (status, data) => status === 400 && (data?.field === "interests" || /interest/i.test(String(data?.error || data?.message || "")));

/**
 * Sends the form. → { message } on success; throws an Error with `field` ("name" | "company" | "email" | "phone" | …) and a message in
 * plain words otherwise. A 400 about the interests while "delegate" is ticked is tried once more without it, so a
 * sign-up never fails while the server is catching up (Oct 27 2026). `fetchImpl` for tests.
 */
export async function joinWaitlist(api, { name, company, email, phone, interests = [], source = "website", hp = "" }, { fetchImpl = globalThis.fetch } = {}) {
  const send = async (picked) => {
    try {
      const res = await fetchImpl(`${String(api).replace(/\/+$/, "")}/stay-updated`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: tidy(name), company: tidy(company), email: String(email ?? "").trim(), phone: String(phone ?? "").trim(),
          interests: picked, source, consent: true, _hp: hp,
        }),
      });
      return { res, data: await res.json().catch(() => ({})) };
    } catch {
      throw Object.assign(new Error(ERRORS.network), { field: "" });
    }
  };
  const picked = INTERESTS.filter((k) => interests.includes(k));
  let { res, data } = await send(picked);
  if (interestsRefused(res.status, data) && picked.some((k) => NEW_INTERESTS.includes(k))) {
    ({ res, data } = await send(picked.filter((k) => !NEW_INTERESTS.includes(k))));
  }
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
