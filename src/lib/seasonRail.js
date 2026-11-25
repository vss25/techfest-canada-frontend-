/* The season timeline under each page's hero (the "new look", Nov 25 2026, approved by the owner):
   Toronto 2026 (done), then the six 2027 events in date order. The first one that hasn't ended is "next"
   (pink, the only pink on the rail); earlier ones are "done" (grey). Pure and unit-tested (seasonRail.test.mjs). */

export const SEASON_IDS = ["van", "mtl", "cgy", "tob", "ott", "tor"];

const NAMES = { van: "Vancouver", mtl: "Montreal", cgy: "Calgary", tob: "Toronto", ott: "Ottawa", tor: "Toronto" };
// The design's months, used until an event record has a start date.
const FALLBACK = { van: "2027-02", mtl: "2027-04", cgy: "2027-06", tob: "2027-06", ott: "2027-09", tor: "2027-10" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ymd = (d) => String(d || "").slice(0, 10);
const label = (d, withDay) => {
  const [y, m, day] = ymd(d).split("-");
  const mon = MONTHS[Number(m) - 1] || "";
  return withDay && day ? `${mon} ${Number(day)}` : `${mon} ${y}`;
};

/** byCity = { van: event, … } (startDate / endDate "YYYY-MM-DD"); today = "YYYY-MM-DD".
    → [{ id, name, when, state: "done" | "next" | "" }], Toronto 2026 ("past") first. */
export function seasonStops(byCity, today) {
  const t = ymd(today);
  const stops = SEASON_IDS.map((id) => {
    const ev = (byCity || {})[id] || {};
    const start = ymd(ev.startDate) || FALLBACK[id];
    const end = ymd(ev.endDate) || ymd(ev.startDate);
    const exact = ymd(ev.startDate).length === 10;
    return { id, name: NAMES[id], start, exact, done: !!(end && end.length === 10 && end < t), main: id === "tor" };
  });
  let nextSet = false;
  const out = [{ id: "past", name: "Toronto", when: "Oct 2026", state: "done" }];
  for (const s of stops) {
    let state = s.done ? "done" : "";
    if (!state && !nextSet) { state = "next"; nextSet = true; }
    const when = state === "next" ? `${label(s.start, s.exact)} · Next` : label(s.start, false) + (s.main ? " · Main" : "");
    out.push({ id: s.id, name: s.name, when, state });
  }
  return out;
}
