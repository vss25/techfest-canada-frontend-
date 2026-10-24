/* =========================================================
   Admin → People for volunteer accounts (look-up only).
   What a volunteer may see about a person, and the list's
   columns, filters and sorting. The server already sends
   volunteers a safe projection (no email, phone, LinkedIn,
   ticket IDs, codes, prices, payment, email engagement, staff
   notes or settings); these helpers read only the allowed
   fields too, so nothing else is ever drawn even if a field
   came back, and mask any email address or phone number typed
   into a name, company, job title, pass name or dietary note
   (volunteerMask.js). They read the backend's volunteer answer
   (services/volunteerPanel.js volunteerRow / volunteerProfile):
   volunteerView.test.mjs feeds them answers captured from it
   (volunteerApi.fixture.json), so a renamed field fails a test.
========================================================= */
import { EXTRAS, PASS_TIERS, RSVP_STATUS_LABELS, TYPE_FILTER_OPTIONS } from "./peopleMeta.js";
import { MEDIA_FILTER } from "./mediaMark.js";
import { maskName, maskText } from "./volunteerMask.js";
import { readQuery } from "../search/match.js";

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
 * Is this search an exact email address or ticket ID (or an email being typed: anything with an "@")? Those are never
 * sent in an address (they would land in hosting logs and browser history): the list looks them up with
 * POST /console/search instead (ExactLookup in VolunteerPeople.jsx).
 */
export function exactLookup(q) {
  const text = String(q ?? "").trim();
  if (text.includes("@")) return true;
  const r = readQuery(text);
  return r.tooShort ? false : !!(r.email || r.ticket);
}

/**
 * GET /console/people's query for a volunteer, from the address bar: only the allowed filters, sorts and the page.
 * A link with ?value=, ?code=, ?attending= or ?size=all (say, pasted from a staff member) is simply ignored, and so is
 * a search for an exact email or ticket ID (it goes by POST, see exactLookup): only name and company words go in q.
 */
export function volunteerQuery(params) {
  const get = (k) => (typeof params?.get === "function" ? params.get(k) : params?.[k]) || "";
  const out = new URLSearchParams();
  const q = String(get("q")).trim().slice(0, 120);
  if (q && !exactLookup(q)) out.set("q", q);
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
    label: maskText(pass.label, 80) || maskText(pass.tierLabel, 80) || "Pass",
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

/** The door colour band: its key, colours and the pass name on it (masked like any pass name). */
const safeBand = (b) => (b && typeof b === "object"
  ? { key: str(b.key, 20), label: maskText(b.label, 60), bg: str(b.bg, 20), text: str(b.text, 20), passName: maskText(b.passName, 60) }
  : null);

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
    name: maskName(r.name) || "No name",
    types: list(r.types).filter((t) => typeof t === "string"),
    vip: !!r.vip,
    media: r.media,
    band: safeBand(r.band),
    company: maskText(r.company, 160),
    jobTitle: maskText(r.jobTitle, 160),
    logoUrl: str(r.logoUrl, 600),
    pass,
    passCount: Number.isFinite(r.passCount) ? r.passCount : pass ? 1 : 0,
    rsvp: { status: rsvpStatus, days: list(r.rsvp?.days).filter((d) => typeof d === "string") },
    arrival: arrivalOf(r, pass ? [r.pass] : []),
    exhibitor: !!r.exhibitor,
    booth: str(r.booth, 20) || pass?.booth || "",
  };
}

/* Dietary keys → labels, for an answer that sends keys only (the backend sends { key, label }). */
const DIETARY_LABELS = {
  vegetarian: "Vegetarian", vegan: "Vegan", halal: "Halal", kosher: "Kosher", gluten_free: "Gluten-free",
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

/**
 * Their speaking sessions, from the backend's person.sessions [{ day, start, end, title, format, role }]:
 * → [{ key, title, day: "Day 1", time: "10:00 AM – 10:30 AM", format: "Panel", role: "Panellist" }].
 */
export function sessionsOf(p = {}) {
  return list(p.sessions).filter((s) => s && str(s.title)).map((s, i) => ({
    key: `${str(String(s.day ?? ""), 4)}-${str(s.start, 5)}-${i}`,
    title: str(s.title, 200),
    day: dayOf(s.day),
    time: [clock(s.start), clock(s.end)].filter(Boolean).join(" – "),
    format: str(s.format, 40),
    role: str(s.role, 40),
  }));
}

/**
 * Their RSVP, from the backend's person.rsvp { status, days, events: [{ key, label, day, time }],
 * dietary: [{ key, label }], dietaryOther, accessibility: true | false }: the days, the special events and meals they
 * chose, what catering needs to know and whether they told us about accessibility needs (never what they are).
 */
export function rsvpOf(p = {}) {
  const rv = p.rsvp && typeof p.rsvp === "object" ? p.rsvp : {};
  const status = RSVP_KEYS.includes(rv.status) ? rv.status : "none";
  const other = maskText(rv.dietaryOther, 200);
  const dietary = list(rv.dietary)
    .map((d) => (typeof d === "string" ? { key: d } : d && typeof d === "object" ? d : null))
    .filter((d) => d && typeof d.key === "string" && d.key !== "none")
    .map((d) => (d.key === "other" ? (other ? `Other: ${other}` : "Other") : maskText(d.label, 60) || DIETARY_LABELS[d.key] || ""))
    .filter(Boolean);
  return {
    status,
    at: status === "none" ? null : when(rv.at),
    days: list(rv.days).filter((d) => typeof d === "string"),
    events: list(rv.events).filter((e) => e && str(e.label)).map((e, i) => ({
      key: str(e.key, 40) || String(i), label: str(e.label, 120), day: str(e.day, 40), time: str(e.time, 20),
    })),
    dietary,
    accessibility: rv.accessibility === true,
  };
}

/**
 * GET /console/people/:id → what the volunteer profile shows. Reads data.person only, in the backend's volunteer
 * shape; absent fields are fine (the server leaves out what volunteers may not see); nothing outside this list is read.
 */
export function volunteerProfile(data = {}) {
  const p = data?.person && typeof data.person === "object" ? data.person : {};
  const shown = list(p.passes).filter((t) => t && !t.hidden);
  const passes = shown.map((t) => passView(t, t.status));
  const main = passView(p.pass, p.passStatus);
  return {
    id: String(p.id || data?.canonicalId || ""),
    name: maskName(p.name) || "No name",
    photoUrl: str(p.photoUrl, 600),
    types: list(p.types).filter((t) => typeof t === "string"),
    vip: !!p.vip,
    media: p.media,
    band: safeBand(p.band),
    company: maskText(p.company, 160),
    jobTitle: maskText(p.jobTitle, 160),
    logoUrl: str(p.logoUrl, 600),
    pass: main,
    passes: passes.length ? passes : main ? [main] : [],
    arrival: arrivalOf(p, shown.length ? shown : p.pass ? [p.pass] : []),
    exhibitor: !!p.exhibitor,
    booth: str(p.booth, 20) || passes.find((t) => t.booth)?.booth || "",
    speaker: !!p.speaker || list(p.types).includes("speaker"),
    sessions: sessionsOf(p),
    rsvp: rsvpOf(p),
  };
}

/**
 * POST /console/search's People results, for the volunteer list's exact look-up: [{ id, name, subtitle, badges, exact, link }],
 * masked like everything else, profile links only.
 */
export function lookupResults(answer) {
  const people = list(answer?.groups).find((g) => g?.key === "people");
  return list(people?.items)
    .filter((it) => it && it.type === "person" && /^\/admin\/people\/[^/?#]+$/.test(String(it.link || "")))
    .map((it) => ({
      id: String(it.id || ""),
      name: maskName(it.title) || "No name",
      subtitle: maskText(it.subtitle, 200),
      badges: list(it.badges).filter((b) => typeof b === "string").map((b) => str(b, 40)).slice(0, 3),
      exact: it.exact === true,
      link: String(it.link),
    }));
}
