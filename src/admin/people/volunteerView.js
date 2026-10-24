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
 * What a volunteer typed in the list's search → what the panel sends. Every volunteer search goes in the body of
 * POST /console/search, never in an address (Oct 23 2026, third round). The box is searched as they type, so a pause
 * sends the text as it is so far: "mara.secret" (an email before its "@") or "beefcafe" (the start of a ticket ID)
 * would otherwise land in GET /console/people?q=… in the hosting logs and the browser's network history, and from the
 * text alone the panel can't tell a name from the first half of an email.
 * → { text, send, tooShort }: `send` goes in the POST body ("" = nothing is sent); `tooShort`: something was typed but
 * it is under the server's 2 characters (or has no letters or digits), so nothing is sent yet.
 */
export function volunteerSearch(q) {
  const r = readQuery(q);
  return { text: r.text, send: r.tooShort ? "" : r.text, tooShort: !!r.text && r.tooShort };
}

/**
 * GET /console/people's query for a volunteer, from the address bar: only the allowed filters, sorts and the page.
 * A link with ?value=, ?code=, ?attending= or ?size=all (say, pasted from a staff member) is simply ignored, and so is
 * any search: q never goes in this address (a volunteer's search is a POST, see volunteerSearch).
 */
export function volunteerQuery(params) {
  const get = (k) => (typeof params?.get === "function" ? params.get(k) : params?.[k]) || "";
  const out = new URLSearchParams();
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

/**
 * The requests the volunteer list makes for what's in the search box (`typed`) and the address's filters (`params`):
 * → { search, get, post }. A search → only `post` (POST /console/search { q }), and the list isn't asked; no search →
 * only `get` (GET /console/people with the filters, sort and page). Nothing typed ever goes in `get`.
 */
export function volunteerRequests(typed, params) {
  const search = volunteerSearch(typed);
  if (search.text) return { search, get: null, post: search.send ? { q: search.send } : null };
  return { search, get: `/console/people?${volunteerQuery(params)}`, post: null };
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

/** A row of the volunteer list: only the allowed fields (anything that isn't an object draws as an empty row). */
export function volunteerRow(row) {
  const r = row && typeof row === "object" ? row : {};
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
 * POST /console/search's People results, for the volunteer list's search: [{ id, name, subtitle, badges, exact, link }],
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

/**
 * POST /console/search's whole answer, for the volunteer list's search → { ok, failed, tooShort, items, total, more,
 * exact }. `ok` false: not a search answer at all (say, a Wi-Fi sign-in page that answered instead of the server), so the
 * panel shows an error, not "No one found". `failed`: the server couldn't search People this time (its `failed` list).
 * `total` / `more`: how many match when the server sent only the closest few (it sends at most 5 per group).
 */
export function lookupAnswer(answer) {
  const ok = !!answer && typeof answer === "object" && Array.isArray(answer.groups);
  const items = ok ? lookupResults(answer) : [];
  const people = ok ? answer.groups.find((g) => g?.key === "people") : null;
  const failed = ok && !people && list(answer.failed).some((f) => f?.key === "people");
  const total = Number.isFinite(people?.total) ? Math.max(people.total, items.length) : items.length;
  return {
    ok, failed, tooShort: ok && answer.tooShort === true, items, total,
    more: total > items.length, exact: items.some((r) => r.exact),
  };
}

/** Is this GET /console/people answer a list (rows), and this GET /console/people/:id answer a person? */
export const isListAnswer = (data) => !!data && typeof data === "object" && Array.isArray(data.rows);
export const isProfileAnswer = (data) => !!data && typeof data === "object" && !!data.person && typeof data.person === "object";

const TRY_LATER = "This isn't working right now. Try again in a moment, and if it keeps happening, ask a staff member.";

/**
 * What a volunteer is told when the list, a profile or the search fails: the server's own words when they are meant
 * for people (a suspended account, too many look-ups, no connection), otherwise a plain "try again" (a server error, a
 * page that wasn't the server, anything unexpected), never a status code or a technical message.
 */
export function volunteerError(error) {
  const status = typeof error?.status === "number" ? error.status : -1;
  const msg = typeof error?.message === "string" ? error.message.trim().slice(0, 200) : "";
  if (status === 429 || error?.code === "rate_limited") return msg || "That's a lot of look-ups. Wait a minute and try again.";
  if (status === 0) return msg || "Can't reach the server. Check your connection and try again.";
  if (status === 404) return "No one with this link. Go back to People and search for them again.";
  if ((status === 400 || status === 403 || status === 409) && msg && !/^Request failed \(\d+\)$/.test(msg)) return msg;
  return TRY_LATER;
}
