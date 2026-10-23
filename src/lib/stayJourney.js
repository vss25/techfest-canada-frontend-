/* =========================================================
   The TTFC 2027 journey across Canada (Oct 23 2026), for the
   /stay-updated page, the web app's /app/stay-updated and the
   admin editor (Sales & emails › 2027 waitlist › 2027 journey).

   The organiser: "for stay updated page, remove the programme type,
   and 5*5. Put canada's map and show cities to show the journey.
   Also, the 5 briefing are in this order February - Vancouver,
   April - Montreal, June - Calgary/Toronto, September - Ottawa,
   November - Toronto. Briefings would pick a sector and tech pillar
   and would be very focused. The briefing will be updated later.
   Put this in the admin panel." Confirmed: June has two briefings
   (Calgary and Toronto); November in Toronto is the main festival
   (two days); the briefings are one-day events; dates to be
   announced for every event; no attendee count.

   Stored as the stay.journey app content key: a JSON list of
   { city, month, kind: "briefing" | "festival", pillar, sector,
     date, venue, note }   ("" = to be announced / nothing).
   The lists and the rules mirror the backend's services/
   stayJourney.js, which checks every save (any staff, PUT
   /api/console/app-content/stay.journey); checkJourney() here
   gives the same answers so the editor can show them before
   saving. Pure and import-free: node --test src/lib/stayJourney.test.mjs.
========================================================= */

export const JOURNEY_KEY = "stay.journey";

export const PILLARS = Object.freeze([
  "AI & Machine Learning",
  "Quantum Computing",
  "Cybersecurity & Digital Trust",
  "Robotics & Automation",
  "CleanTech & Sustainability",
]);

export const SECTORS = Object.freeze([
  "Financial Services & Banking",
  "Healthcare & Life Sciences",
  "Energy & Critical Infrastructure",
  "Manufacturing, Supply Chain & Mobility",
  "Public Sector, National Defence & Security",
]);

export const KINDS = Object.freeze(["briefing", "festival"]);
export const KIND_LABEL = Object.freeze({ briefing: "One-day briefing", festival: "The Tech Festival Canada · Two days" });

/* The cities staff can pick (the backend's list, same coordinates). `label`: where the map prefers to put the
   city's label, best first (compass points; e.g. Vancouver's goes out over the Pacific). */
export const CITIES = Object.freeze([
  { name: "Vancouver", province: "BC", lat: 49.2827, lon: -123.1207, label: ["sw", "s", "w", "n", "nw"] },
  { name: "Victoria", province: "BC", lat: 48.4284, lon: -123.3656, label: ["sw", "w", "s", "nw"] },
  { name: "Calgary", province: "AB", lat: 51.0447, lon: -114.0719, label: ["s", "se", "n", "sw", "ne"] },
  { name: "Edmonton", province: "AB", lat: 53.5461, lon: -113.4938, label: ["n", "ne", "nw", "e"] },
  { name: "Saskatoon", province: "SK", lat: 52.1332, lon: -106.6700, label: ["n", "ne", "e", "nw"] },
  { name: "Regina", province: "SK", lat: 50.4452, lon: -104.6189, label: ["s", "se", "sw", "e"] },
  { name: "Winnipeg", province: "MB", lat: 49.8951, lon: -97.1384, label: ["s", "se", "sw", "n"] },
  { name: "Toronto", province: "ON", lat: 43.6532, lon: -79.3832, label: ["sw", "s", "w", "se"] },
  { name: "Waterloo", province: "ON", lat: 43.4643, lon: -80.5204, label: ["w", "sw", "nw", "s"] },
  { name: "Ottawa", province: "ON", lat: 45.4215, lon: -75.6972, label: ["n", "nw", "ne", "w"] },
  { name: "Montreal", province: "QC", lat: 45.5019, lon: -73.5674, label: ["ne", "e", "n", "se"] },
  { name: "Quebec City", province: "QC", lat: 46.8139, lon: -71.2080, label: ["n", "ne", "nw", "e"], aliases: ["quebec", "ville de quebec"] },
  { name: "Fredericton", province: "NB", lat: 45.9636, lon: -66.6431, label: ["se", "s", "e", "sw"] },
  { name: "Halifax", province: "NS", lat: 44.6488, lon: -63.5752, label: ["se", "e", "s", "ne"] },
  { name: "St. John's", province: "NL", lat: 47.5615, lon: -52.7126, label: ["s", "sw", "se", "w"], aliases: ["st johns", "saint john s", "saint johns"] },
].map((c) => Object.freeze({ ...c, aliases: Object.freeze(c.aliases || []), label: Object.freeze(c.label) })));

export const MAX_STOPS = 12;
export const MAX_LEN = Object.freeze({ month: 40, date: 60, venue: 120, note: 280 });
const FIELD_WORD = Object.freeze({ month: "month", date: "date", venue: "venue", note: "note" });

/** One stop in the stored shape. */
export const blankStop = (city = "Toronto", month = "", kind = "briefing") => ({ city, month, kind, pillar: "", sector: "", date: "", venue: "", note: "" });

/** The organiser's journey: five one-day briefings, then the festival in Toronto (the backend's DEFAULT_JOURNEY). */
export const DEFAULT_JOURNEY = Object.freeze([
  blankStop("Vancouver", "February 2027"),
  blankStop("Montreal", "April 2027"),
  blankStop("Calgary", "June 2027"),
  blankStop("Toronto", "June 2027"),
  blankStop("Ottawa", "September 2027"),
  blankStop("Toronto", "November 2027", "festival"),
].map(Object.freeze));
export const DEFAULT_JOURNEY_JSON = JSON.stringify(DEFAULT_JOURNEY);

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F\u2028\u2029]+/g;
const clean = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "").replace(CONTROL, " ").replace(/\s+/g, " ").trim();

/** The city's entry (case, accents and punctuation don't matter), or null. */
export function cityNamed(v) {
  const f = fold(v);
  if (!f) return null;
  return CITIES.find((c) => fold(c.name) === f || c.aliases.includes(f)) || null;
}
const fromList = (list, v) => list.find((x) => fold(x) === fold(v)) ?? null;

/**
 * The server's check (services/stayJourney.js validateJourney), word for word.
 * @returns {{ ok: true, stops, json } | { ok: false, error, index?, field? }}
 */
export function checkJourney(input) {
  let list = input;
  if (typeof input === "string") {
    if (input.length > 20000) return { ok: false, error: "The journey is too long. Use fewer or shorter stops." };
    try { list = JSON.parse(input); } catch { return { ok: false, error: "The journey couldn't be read. Reload the page and try again." }; }
  }
  if (!Array.isArray(list)) return { ok: false, error: "The journey must be a list of stops." };
  if (!list.length) return { ok: false, error: "Add at least one stop." };
  if (list.length > MAX_STOPS) return { ok: false, error: `The journey can have ${MAX_STOPS} stops at most.` };
  const stops = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const fail = (field, error) => ({ ok: false, index: i, field, error: `Stop ${i + 1}: ${error}` });
    if (!s || typeof s !== "object" || Array.isArray(s)) return fail("", "this isn't a stop.");
    const city = cityNamed(s.city);
    if (!city) return fail("city", "pick a city from the list.");
    const kind = clean(s.kind).toLowerCase() || "briefing";
    if (!KINDS.includes(kind)) return fail("kind", "the type must be a one-day briefing or the festival.");
    const pillar = clean(s.pillar) ? fromList(PILLARS, clean(s.pillar)) : "";
    if (pillar === null) return fail("pillar", "pick the technology pillar from the list, or “To be announced”.");
    const sector = clean(s.sector) ? fromList(SECTORS, clean(s.sector)) : "";
    if (sector === null) return fail("sector", "pick the sector from the list, or “To be announced”.");
    const text = {};
    for (const f of Object.keys(MAX_LEN)) {
      text[f] = clean(s[f]);
      if (text[f].length > MAX_LEN[f]) return fail(f, `the ${FIELD_WORD[f]} is too long (${MAX_LEN[f]} characters at most).`);
    }
    stops.push({ city: city.name, month: text.month, kind, pillar, sector, date: text.date, venue: text.venue, note: text.note });
  }
  return { ok: true, stops, json: JSON.stringify(stops) };
}

/** The stops to show for the saved stay.journey value: the organiser's journey when it's empty or can't be read. */
export function journeyFrom(value) {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_JOURNEY.map((s) => ({ ...s }));
  const r = checkJourney(value);
  return r.ok ? r.stops : DEFAULT_JOURNEY.map((s) => ({ ...s }));
}

/* ---------- words for one stop ---------- */

export const TBA = "To be announced";
export const kindLabel = (stop) => KIND_LABEL[stop?.kind] || KIND_LABEL.briefing;
export const isFestival = (stop) => stop?.kind === "festival";

/**
 * The focus line: "AI & Machine Learning × Healthcare & Life Sciences", one side "to be announced", or
 * "Focus to be announced". The festival covers everything: no focus line unless staff set one ("").
 */
export function focusText(stop) {
  const p = stop?.pillar || "";
  const s = stop?.sector || "";
  if (!p && !s) return isFestival(stop) ? "" : "Focus to be announced";
  return `${p || "Pillar to be announced"} × ${s || "sector to be announced"}`;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/**
 * The month for the map's labels: "February 2027" → "Feb" (short) or "February" (long); something else (e.g.
 * "Spring 2027") as typed, without the year; "" → "TBA".
 */
export function mapMonth(month, { short = false } = {}) {
  const m = clean(month);
  if (!m) return "TBA";
  const i = MONTHS.findIndex((x) => fold(m).startsWith(x.slice(0, 3)));
  if (i >= 0 && /^[A-Za-z]{3,9}\.?(\s+\d{4})?$/.test(m)) {
    const name = MONTHS[i][0].toUpperCase() + MONTHS[i].slice(1);
    return short ? name.slice(0, 3) : name;
  }
  const noYear = m.replace(/\s+\d{4}$/, "");
  return noYear.length > 14 ? `${noYear.slice(0, 13)}…` : noYear;
}

/** One sentence per stop, for the map's text description (screen readers): "1. February 2027, Vancouver: one-day briefing." */
export function stopSentence(stop, i) {
  const what = isFestival(stop) ? "The Tech Festival Canada, two days" : "one-day briefing";
  const focus = focusText(stop);
  return `${i + 1}. ${stop.month || TBA}, ${stop.city}: ${what}${focus && focus !== "Focus to be announced" ? `, focus ${focus}` : ""}.`;
}
