/* =========================================================
   Event dates and order: pure rules, no Sanity client, so the admin's tests can import them
   under plain Node (Nov 2026). lib/events.js re-exports everything here.
========================================================= */

export const GRACE_DAYS = 7;

export const citySlugOf = (name) => String(name || "").trim().toLowerCase().replace(/\s+/g, "-");

const dayMs = 24 * 60 * 60 * 1000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** coming-up | live | just-ended | past — derived from dates alone. */
export function lifecycleOf(ev, now = new Date()) {
  if (!ev?.startDate) return ev && Number(ev.year) < now.getFullYear() ? "past" : "coming-up";
  const start = startOfDay(ev.startDate);
  const end = startOfDay(ev.endDate || ev.startDate);
  const today = startOfDay(now);
  if (today < start) return "coming-up";
  if (today <= end) return "live";
  if (today <= new Date(end.getTime() + GRACE_DAYS * dayMs)) return "just-ended";
  return "past";
}

export function formatDateRange(ev) {
  if (!ev?.startDate) return ev?.year ? String(ev.year) : "";
  const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  const a = fmt(ev.startDate);
  if (!ev.endDate || ev.endDate === ev.startDate) return a;
  return `${a} – ${fmt(ev.endDate)}`;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export function monthFromStatusNote(note) {
  const s = String(note || "").toLowerCase();
  const i = MONTH_NAMES.findIndex((m) => s.includes(m));
  return i >= 0 ? i + 1 : 0;
}

/** [year, month, day] ordering key, or null when the doc carries no usable
    date or year at all (e.g. an empty Studio shell — never "next"). */
export function eventSortKey(ev) {
  if (!ev) return null;
  if (ev.startDate) {
    const d = new Date(`${ev.startDate}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  }
  const year = Number(ev.year);
  if (!Number.isFinite(year) || year <= 0) return null;
  // Dateless: the statusNote month, day 1. No month named → month 13, so a
  // month-less event never jumps ahead of one whose month is announced.
  return [year, monthFromStatusNote(ev.statusNote) || 13, 1];
}

const keyTiebreak = (a, b) =>
  citySlugOf(a?.city).localeCompare(citySlugOf(b?.city))
  || String(a?.type || "").localeCompare(String(b?.type || ""))
  || String(a?.name || "").localeCompare(String(b?.name || ""));

/** Soonest first by eventSortKey; keyless docs always last. */
export function compareEvents(a, b) {
  const ka = eventSortKey(a);
  const kb = eventSortKey(b);
  if (!ka && !kb) return keyTiebreak(a, b);
  if (!ka) return 1;
  if (!kb) return -1;
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2] || keyTiebreak(a, b);
}

/** Most recent first by eventSortKey; keyless docs always last. */
export function compareEventsDesc(a, b) {
  const ka = eventSortKey(a);
  const kb = eventSortKey(b);
  if (!ka && !kb) return keyTiebreak(a, b);
  if (!ka) return 1;
  if (!kb) return -1;
  return kb[0] - ka[0] || kb[1] - ka[1] || kb[2] - ka[2] || keyTiebreak(a, b);
}
