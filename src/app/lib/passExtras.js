/* =========================================================
   What your pass includes (Oct 24 2026, the organiser: "Anyone who
   has a breakfast, lunch, dinner included … indicate breakfast is
   present on the app too", "for both days"; then "this is too
   clunky"): one quiet line under the pass colour on your own
   Profile and on My pass (icons, "Breakfast · Lunch · Awards ·
   Gala", a chevron), which opens the day-by-day list with times.
   • The server decides: GET /auth/me tickets[].extras
     { cxo, lunch, gala, awards } (true / false; staff's switch on
     the pass, else the pass and person rules, backend
     services/passExtras.js). An older server sends only the
     wording in tickets[].inclusions ("2× CxO Breakfasts",
     "2× Luncheons", "1× Gala Dinner & Networking Reception",
     "1× Awards Night"), which says the same.
   • Booths never count; all your real passes add up.
   • The days: the CxO Breakfast and lunch both days, the Catalyst
     Awards on Day 1's evening, the Gala Dinner on Day 2's.
   • Times and rooms: the agenda's session that day (the Schedule's
     CMS sessions) by title, else the published times.
   Same rules and words as iOS and Android. Pure; node --test.
========================================================= */

export const EXTRA_KEYS = Object.freeze(["cxo", "lunch", "gala", "awards"]);

const WORDING = { cxo: /cxo breakfast/i, lunch: /lunch/i, gala: /gala/i, awards: /awards/i };

const isBooth = (t) => /^BOOTH-/i.test(String(t?.ticketId || t?.id || "")) || /^booth/i.test(String(t?.type || t?.tier || ""));

/** One ticket → { cxo, lunch, gala, awards }: its `extras` when the server sent them, else read from its `inclusions`. */
export function ticketExtras(ticket) {
  const none = { cxo: false, lunch: false, gala: false, awards: false };
  if (!ticket || isBooth(ticket)) return none;
  const ex = ticket.extras;
  if (ex && typeof ex === "object" && !Array.isArray(ex) && EXTRA_KEYS.some((k) => typeof ex[k] === "boolean")) {
    return Object.fromEntries(EXTRA_KEYS.map((k) => [k, ex[k] === true]));
  }
  const lines = Array.isArray(ticket.inclusions) ? ticket.inclusions.filter((x) => typeof x === "string") : [];
  return Object.fromEntries(EXTRA_KEYS.map((k) => [k, lines.some((l) => WORDING[k].test(l))]));
}

/** All of a person's real passes (a ticket ID, not a booth) → what any of them includes. */
export function personExtras(tickets = []) {
  const out = { cxo: false, lunch: false, gala: false, awards: false };
  for (const t of Array.isArray(tickets) ? tickets : []) {
    if (!String(t?.ticketId || t?.id || "").trim()) continue;
    const ex = ticketExtras(t);
    for (const k of EXTRA_KEYS) if (ex[k]) out[k] = true;
  }
  return out;
}

/* ---------- The line and the list ---------- */

/** In the line's order: short word (the caption), full name (the list), the days it's on, the spoken days; the agenda
    session it takes that day: the meals the first matching one, the evenings the last (`last`). */
const ITEMS = [
  { key: "cxo", short: "Breakfast", name: "CxO Breakfast", days: [1, 2], spoken: "both days", match: /cxo breakfast/i, last: false },
  { key: "lunch", short: "Lunch", name: "Networking Luncheon", days: [1, 2], spoken: "both days", match: /lunch|luncheon/i, last: false },
  { key: "awards", short: "Awards", name: "Catalyst Awards Night", days: [1], spoken: "Monday 26 October", match: /award/i, last: true },
  { key: "gala", short: "Gala", name: "Gala Dinner & Networking Reception", speak: "Gala Dinner", days: [2], spoken: "Tuesday 27 October", match: /gala/i, last: true },
];

/** The published start times, when the agenda has no matching session. */
export const FALLBACK_TIMES = Object.freeze({
  1: { cxo: "7:55 AM", lunch: "12:35 PM", awards: "5:30 PM" },
  2: { cxo: "7:55 AM", lunch: "12:00 PM", gala: "5:30 PM" },
});

const DAY_NAMES = { 1: "Monday 26 October", 2: "Tuesday 27 October" };

/** { cxo, lunch, gala, awards } → the included ones, in the line's order (Breakfast, Lunch, Awards, Gala): [{ key, short, name, days }]. */
export function includedItems(extras = {}) {
  return ITEMS.filter((it) => extras?.[it.key] === true).map(({ key, short, name, days }) => ({ key, short, name, days }));
}

/** The line's caption: "Breakfast · Lunch · Awards · Gala" (included ones only; "" for none). */
export const inclusionCaption = (extras = {}) => includedItems(extras).map((i) => i.short).join(" · ");

/** The line, for screen readers: "Your pass includes: CxO Breakfast, both days; …; Gala Dinner, Tuesday 27 October" ("" for none). */
export function inclusionAria(extras = {}) {
  const parts = ITEMS.filter((it) => extras?.[it.key] === true).map((it) => `${it.speak || it.name}, ${it.spoken}`);
  return parts.length ? `Your pass includes: ${parts.join("; ")}` : "";
}

/**
 * The list the line opens: one section per day that has something, each item with its time (and room) from the
 * agenda when a session that day matches its title (the meals: the first one that day; the evenings: the last), else
 * the published time.
 * `sessions`: [{ day: 1 | 2, title, startTime: "7:55 AM", start?: ms, room?: "" }].
 * → [{ day, label: "Monday 26 October", items: [{ key, name, time, room }] }]
 */
export function inclusionSchedule(extras = {}, sessions = []) {
  const list = Array.isArray(sessions) ? sessions : [];
  return [1, 2].map((day) => {
    const items = ITEMS.filter((it) => extras?.[it.key] === true && it.days.includes(day)).map((it) => {
      const hits = list.filter((s) => Number(s?.day) === day && it.match.test(String(s?.title || "")) && String(s?.startTime || "").trim());
      hits.sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
      const s = it.last ? hits[hits.length - 1] : hits[0];
      return { key: it.key, name: it.name, time: s ? String(s.startTime).trim() : FALLBACK_TIMES[day][it.key], room: s ? String(s.room || "").trim() : "" };
    });
    return { day, label: DAY_NAMES[day], items };
  }).filter((d) => d.items.length > 0);
}
