/* =========================================================
   Admin → People for volunteer accounts (look-up only).
   What a volunteer may see about a person, and the list's
   columns, filters and sorting. The server already sends
   volunteers a safe projection (no email, phone, LinkedIn,
   ticket IDs, codes, prices, payment, email engagement, staff
   notes or settings); these helpers read only the allowed
   fields too, so nothing else is ever drawn even if a field
   came back. Pure: tested in volunteerView.test.mjs.
========================================================= */
import { EXTRAS, PASS_TIERS, RSVP_STATUS_LABELS, TYPE_FILTER_OPTIONS } from "./peopleMeta.js";
import { MEDIA_FILTER } from "./mediaMark.js";

const YES_NO = [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }];

/** The list's filters for volunteers: who they are, their pass and RSVP. Nothing about money, codes or emails. */
export const VOLUNTEER_FILTERS = [
  { key: "type", label: "Attendee Type", options: TYPE_FILTER_OPTIONS },
  { key: "pass", label: "Pass Type", options: PASS_TIERS },
  { key: "rsvp", label: "RSVP Status", options: ["attendee", "staff", "none"].map((k) => ({ key: k, label: RSVP_STATUS_LABELS[k] })) },
  { key: "exhibitor", label: "Is Exhibitor?", options: YES_NO },
  { key: "vip", label: "VIP?", options: YES_NO },
  MEDIA_FILTER,
];
export const VOLUNTEER_FILTER_KEYS = VOLUNTEER_FILTERS.map((f) => f.key);

/** The list's columns for volunteers (no Code, Ticket value, RSVP email or I'm attending). */
export const VOLUNTEER_COLUMNS = [
  { key: "name", label: "Name", sort: "name" },
  { key: "types", label: "Type", sort: "type" },
  { key: "company", label: "Company", sort: "company" },
  { key: "pass", label: "Pass", sort: "pass" },
  { key: "rsvp", label: "RSVP", sort: "rsvp" },
  { key: "arrival", label: "Arrived" },
  { key: "exhibitor", label: "Exhibitor", sort: "exhibitor" },
];
export const VOLUNTEER_SORTS = VOLUNTEER_COLUMNS.filter((c) => c.sort).map((c) => c.sort);

/**
 * GET /console/people's query for a volunteer, from the address bar: only the allowed filters, sorts and the page.
 * A link with ?value=, ?code=, ?attending= or ?size=all (say, pasted from a staff member) is simply ignored.
 */
export function volunteerQuery(params) {
  const get = (k) => (typeof params?.get === "function" ? params.get(k) : params?.[k]) || "";
  const out = new URLSearchParams();
  const q = String(get("q")).trim().slice(0, 120);
  if (q) out.set("q", q);
  for (const f of VOLUNTEER_FILTERS) {
    const v = String(get(f.key));
    if (v && f.options.some((o) => o.key === v)) out.set(f.key, v);
  }
  const sort = String(get("sort"));
  if (sort && sort !== "name" && VOLUNTEER_SORTS.includes(sort)) out.set("sort", sort);
  if (get("dir") === "desc") out.set("dir", "desc");
  const page = Math.max(0, Math.min(10000, Math.floor(Number(get("page")) || 0)));
  out.set("page", String(page));
  return out;
}

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v) => (Array.isArray(v) ? v : []);
const when = (v) => (v && !Number.isNaN(new Date(v).getTime()) ? v : null);

/** A pass's meals and events, effective Yes / No only (never who set them or how). */
export function inclusionsOf(pass) {
  if (!pass) return [];
  const ex = pass.extras || pass.inclusions || null;
  return EXTRAS.map((x) => {
    const e = ex?.[x.key];
    const included = typeof e === "boolean" ? e : e && typeof e === "object" ? !!e.included : x.key === "cxo" ? !!pass.cxoBreakfast : false;
    return { key: x.key, label: x.label, short: x.short, included };
  });
}

/** Pending (a pass staff made whose email hasn't gone yet) is the only pass status volunteers see. */
const isPending = (pass, status) => pass?.pending === true || pass?.status === "pending" || status === "pending";

/** Their pass for a volunteer: its name, Pending or not, and what it includes. */
function passView(pass, status) {
  if (!pass) return null;
  return {
    label: str(pass.label, 80) || str(pass.tierLabel, 80) || "Pass",
    tier: str(pass.tier, 20),
    pending: isPending(pass, status),
    inclusions: inclusionsOf(pass),
    checkedIn: !!pass.checkedIn,
    checkedInAt: when(pass.checkedInAt),
    booth: str(pass.booth, 20),
    exhibitorPass: !!pass.exhibitorPass,
  };
}

const has = (o, k) => !!o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);

/**
 * Arrived or not, and the first check-in time: the person's own fields or the earliest of their passes'.
 * `known` is false when the server sent nothing about check-in (shown as "—", not "Not yet").
 */
export function arrivalOf(p, passes = []) {
  const ps = passes.filter(Boolean);
  const times = [p?.checkedInAt, p?.arrival?.at, ...ps.map((t) => t.checkedInAt)].map(when).filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
  const checkedIn = !!p?.checkedIn || !!p?.arrival?.checkedIn || ps.some((t) => t.checkedIn) || times.length > 0;
  const known = checkedIn || has(p, "checkedIn") || has(p, "arrival") || ps.some((t) => has(t, "checkedIn"));
  return { known, checkedIn, at: checkedIn ? times[0] || null : null };
}

const RSVP_KEYS = ["attendee", "staff", "none"];

/** A row of the volunteer list: only the allowed fields. */
export function volunteerRow(r = {}) {
  const pass = passView(r.pass, r.passStatus);
  const rsvpStatus = RSVP_KEYS.includes(r.rsvp?.status) ? r.rsvp.status : "none";
  return {
    id: String(r.id || ""),
    name: str(r.name, 160) || "No name",
    types: list(r.types).filter((t) => typeof t === "string"),
    vip: !!r.vip,
    media: r.media,
    band: r.band && typeof r.band === "object" ? r.band : null,
    company: str(r.company, 160),
    jobTitle: str(r.jobTitle, 160),
    logoUrl: str(r.logoUrl, 600),
    pass,
    passCount: Number.isFinite(r.passCount) ? r.passCount : pass ? 1 : 0,
    rsvp: { status: rsvpStatus, days: list(r.rsvp?.days).filter((d) => typeof d === "string") },
    arrival: arrivalOf(r, pass ? [r.pass] : []),
    exhibitor: !!r.exhibitor,
    booth: str(r.booth, 20) || pass?.booth || "",
  };
}

/* The RSVP options that are meals and events (the rest, sessions, expo and breaks, come with every pass). */
const MEAL_LABELS = {
  cxo_d1: "CxO Breakfast (Day 1)", lunch_d1: "Networking Luncheon (Day 1)", awards: "Catalyst Awards Night (Day 1)",
  cxo_d2: "CxO Breakfast (Day 2)", lunch_d2: "Networking Luncheon (Day 2)", gala: "Gala Dinner & Networking Reception (Day 2)",
  meetings: "Two Pre-Matched Business Meetings", lounge: "Private Scotch & Cocktail Lounge (19+)",
};
export const MEAL_KEYS = Object.keys(MEAL_LABELS);
const DIETARY_LABELS = {
  none: "None", vegetarian: "Vegetarian", vegan: "Vegan", halal: "Halal", kosher: "Kosher", gluten_free: "Gluten-free",
  dairy_free: "Dairy-free", nut_allergy: "Nut allergy", shellfish_allergy: "Shellfish allergy", other: "Other",
};

/** "HH:MM" → "9:30 AM". */
export const clock = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m) return str(hhmm, 20);
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};
const dayOf = (d) => (d === 1 || d === "1" || d === "day1" ? "Day 1" : d === 2 || d === "2" || d === "day2" ? "Day 2" : str(d, 20));

/** Their speaking sessions: title, day, time and stage. */
function sessionsOf(data, p) {
  const raw = list(p.speakingSessions).length ? p.speakingSessions : list(data.speakingSessions).length ? data.speakingSessions : list(p.speaker?.sessions);
  return list(raw).filter((s) => s && str(s.title)).map((s, i) => ({
    key: String(s.id || s._id || i), title: str(s.title, 200), day: dayOf(s.day), time: clock(s.time), stage: str(s.stage || s.room, 80),
  }));
}

/**
 * GET /console/people/:id → what the volunteer profile shows. Absent fields are fine (the server leaves out
 * what volunteers may not see); nothing outside this list is read.
 */
export function volunteerProfile(data = {}) {
  const p = data.person || {};
  const passes = list(p.passes).filter((t) => t && !t.hidden).map((t) => passView(t, t.status));
  const main = passView(p.pass, p.passStatus);
  const rv = data.rsvp || {};
  const meals = list(rv.options).filter((k) => MEAL_KEYS.includes(k)).map((k) => MEAL_LABELS[k]);
  const dietary = list(rv.dietary).filter((k) => typeof k === "string" && k !== "none")
    .map((k) => (k === "other" ? (str(rv.dietaryOther, 200) ? `Other: ${str(rv.dietaryOther, 200)}` : "Other") : DIETARY_LABELS[k] || k));
  const rsvpStatus = RSVP_KEYS.includes(p.rsvp?.status) ? p.rsvp.status : "none";
  const events = list(p.specialEvents).length ? p.specialEvents : list(data.agenda?.specialEvents);
  return {
    id: String(p.id || data.canonicalId || ""),
    name: str(p.name, 160) || "No name",
    photoUrl: str(p.photoUrl, 600),
    types: list(p.types).filter((t) => typeof t === "string"),
    vip: !!p.vip,
    media: p.media,
    band: p.band && typeof p.band === "object" ? p.band : null,
    company: str(p.company, 160),
    jobTitle: str(p.jobTitle, 160),
    logoUrl: str(p.logoUrl, 600),
    pass: main,
    passes: passes.length ? passes : main ? [main] : [],
    arrival: arrivalOf(p, passes.length ? list(p.passes).filter((t) => t && !t.hidden) : p.pass ? [p.pass] : []),
    exhibitor: !!p.exhibitor,
    booth: str(p.booth, 20) || passes.find((t) => t.booth)?.booth || "",
    speaker: !!p.speaker || list(p.types).includes("speaker"),
    sessions: sessionsOf(data, p),
    rsvp: {
      status: rsvpStatus,
      at: rsvpStatus === "none" ? null : when(p.rsvp?.at),
      days: list(rv.days).length ? list(rv.days) : list(p.rsvp?.days),
      meals,
      dietary,
      accessibility: !!rv.hasAccessibility || (typeof rv.accessibility === "string" && rv.accessibility.trim() !== "") || rv.accessibility === true,
    },
    specialEvents: list(events).filter((e) => e && str(e.label)).map((e, i) => ({ key: String(e.key || i), label: str(e.label, 120), day: str(e.day, 40), time: str(e.time, 20) })),
  };
}
