/* =========================================================
   "Stay updated": the TTFC 2027 waitlist (Oct 23 2026).
   Shared by the website page (/stay-updated, src/pages/
   StayUpdated.jsx) and the web app screen (/app/stay-updated,
   src/app/screens/StayUpdated.jsx).

   The wording is the stay.* app content keys (backend services/
   waitlist.js STAY_DEFAULTS, served by GET /api/app/content and
   edited in Admin › Sales & emails › 2027 waitlist › Wording). The
   defaults below are the same text, used while that hasn't loaded
   or when a field is empty. The facts are the organiser's: Toronto,
   dates to be announced, the 5 × 5 framework, things true of TTFC
   2026, and always "1000+ attendees across 2 days".

   The form posts to POST {API}/stay-updated: { email, phone,
   interests, source, consent: true, _hp } → { ok, message }.
   No store badges here (lib/appStores.js storePlan decides those
   elsewhere). Kept free of imports: node --test src/lib/stayUpdated.test.mjs.
========================================================= */

export const STAY_DEFAULTS = Object.freeze({
  "stay.seo_title": "Stay updated: TTFC 2027 in Toronto | The Tech Festival Canada",
  "stay.seo_description": "TTFC 2027: two days in Toronto in November 2027, plus one-day briefing events in Ottawa, Montreal, Calgary and Vancouver. Dates to be announced. Join the waitlist.",
  "stay.eyebrow": "Stay updated",
  "stay.hero_title": "TTFC 2027 · Toronto · November 2027",
  "stay.hero_intro": "The Tech Festival Canada returns to Toronto for two days in November 2027, with one-day briefing events in Ottawa, Montreal, Calgary and Vancouver. Dates to be announced for every event. Join the waitlist and our team will keep you posted.",
  "stay.stat": "", // no attendee count on the 2027 page (the organiser, Oct 23 2026)
  "stay.program_title": "The 5 × 5 programme",
  "stay.program_intro": "TTFC is built around five technology pillars and the sectors adopting them. Every keynote, panel and award sits where the two meet.",
  "stay.pillars_title": "Five technology pillars",
  "stay.pillars": [
    "AI & Machine Learning",
    "Quantum Computing",
    "Cybersecurity & Digital Trust",
    "Robotics & Automation",
    "CleanTech & Sustainability",
  ].join("\n"),
  "stay.sectors_title": "Five applied sectors",
  "stay.sectors": [
    "Financial Services & Banking",
    "Healthcare & Life Sciences",
    "Energy & Critical Infrastructure",
    "Manufacturing, Supply Chain & Mobility",
    "Public Sector, National Defence & Security",
  ].join("\n"),
  // The 2027 events (the organiser, Oct 23 2026): the main festival in Toronto, two days in November 2027,
  // and one-day briefing events in Ottawa, Montreal, Calgary and Vancouver. Dates to be announced for every event.
  "stay.briefings_title": "TTFC 2027 events",
  "stay.briefings_intro": "A two-day festival in Toronto in November 2027, with one-day briefing events in four more cities. Dates to be announced for every event.",
  "stay.briefings": [
    "Toronto\nThe Tech Festival Canada: two days in November 2027. Dates to be announced.",
    "Ottawa\nOne-day briefing event. Date to be announced.",
    "Montreal\nOne-day briefing event. Date to be announced.",
    "Calgary\nOne-day briefing event. Date to be announced.",
    "Vancouver\nOne-day briefing event. Date to be announced.",
  ].join("\n\n"),
  "stay.expect_title": "What to expect",
  "stay.expect": [
    "Keynotes and executive panels\nLeaders from government, industry and research on the main stage, with fireside chats and panels across every sector.",
    "Catalyst Awards\nAn awards night celebrating the innovators, builders and leaders delivering real impact in frontier tech.",
    "The Expo\nCompanies from Canada and around the world showing what they build, with demos and conversations with the people behind them.",
    "CxO Breakfast\nAn invitation-only breakfast for CxOs and senior leaders: strategic conversations in a smaller setting.",
    "Gala Dinner and networking\nAn evening with speakers, exhibitors, partners and senior attendees, with networking luncheons and breaks during the days.",
    "Business meetings\nMeetings matched in advance between solution providers and the decision makers who need them.",
  ].join("\n\n"),
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
  "stay.email_intro": "Thank you for your interest in TTFC 2027: two days in Toronto in November 2027, plus one-day briefing events in Ottawa, Montreal, Calgary and Vancouver. Dates to be announced for every event.",
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

/** One item per line (blank lines and stray spaces dropped). */
export const lines = (text) => String(text ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

/** "What to expect": one item per paragraph, its first line the title, the rest the description. */
export function blocks(text) {
  return String(text ?? "").split(/\r?\n\s*\r?\n/).map((b) => lines(b)).filter((l) => l.length)
    .map(([title, ...rest]) => ({ title, body: rest.join(" ") }));
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
