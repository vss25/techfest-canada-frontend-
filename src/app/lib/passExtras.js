/* =========================================================
   What your pass includes, per day (Oct 24 2026, the organiser:
   "Anyone who has a breakfast, lunch, dinner included … indicate
   breakfast is present on the app too", "for both days"): small
   chips under the pass colour on your own Profile and on My pass.
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
   Same rules and words as iOS (Services/PassInclusions.swift) and
   Android (data/PassExtras.kt). Pure; node --test.
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

const ITEMS = {
  cxo: { key: "cxo", label: "CxO Breakfast" },
  lunch: { key: "lunch", label: "Lunch" },
  awards: { key: "awards", label: "Catalyst Awards" },
  gala: { key: "gala", label: "Gala Dinner" },
};

const DAYS = [
  { key: "day1", label: "Mon 26", spoken: "Monday 26 October", order: ["cxo", "lunch", "awards"] },
  { key: "day2", label: "Tue 27", spoken: "Tuesday 27 October", order: ["cxo", "lunch", "gala"] },
];

/**
 * { cxo, lunch, gala, awards } → the rows to show, in the order the day runs:
 *   [{ key, label: "Mon 26", aria: "Included on Monday 26 October: CxO Breakfast, Lunch, Catalyst Awards",
 *      items: [{ key, label }] }]
 * A day with nothing is left out; nothing at all → [].
 */
export function inclusionDays(extras = {}) {
  return DAYS.map((d) => {
    const items = d.order.filter((k) => extras?.[k] === true).map((k) => ITEMS[k]);
    return { key: d.key, label: d.label, aria: `Included on ${d.spoken}: ${items.map((i) => i.label).join(", ")}`, items };
  }).filter((d) => d.items.length > 0);
}
