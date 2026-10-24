/* =========================================================
   TTFC Check-in: what the home (/checkin/) shows (Oct 24 2026)
   ---------------------------------------------------------
   Two days, each with the five main stations (lib/routes.js
   DAY_STATIONS: Lobby, Floor 1, CxO Breakfast, Lunch, Evening entry)
   and their times as the server sends them (the snapshot's `windows`:
   the live agenda ± the doors' buffers, staff's own hours, else the
   Oct 23 agenda; services/checkinDeskTime.js): "Open all day" for the
   Lobby and Floor 1 (contract C9), the session and the doors for the
   meals and the evening (Day 1 the Catalyst Awards Night, Day 2 the
   Gala Dinner, as the agenda names them).
     Day 1 / Day 2 (Toronto): today's section first and highlighted, its
       tiles say what's on now ("Open until 9:25 AM", "Opens 12:05 PM");
       the other day's tiles are off ("Opens Tue 27 Oct" / "Ended Mon 26
       Oct"): every station records today.
     Any other day: both days open, for practice (practice marks).
   "More": the Media desk, the AV station and the Exhibitor desk, open
   all day on both days.
   Pure; node --test src/checkin/lib/home.test.mjs
========================================================= */

import { DAY_STATIONS, MORE_STATIONS } from "./routes.js";
import { MEAL_ITEMS, fmtClock, fmtRange } from "./stationTime.js";

export const HOME_DAYS = Object.freeze([
  Object.freeze({ key: "day1", date: "2026-10-26", title: "Day 1 · Mon 26 Oct", short: "Mon 26 Oct" }),
  Object.freeze({ key: "day2", date: "2026-10-27", title: "Day 2 · Tue 27 Oct", short: "Tue 27 Oct" }),
]);
/** The stations' names when the server's list doesn't have them yet. */
const LABELS = Object.freeze({
  lobby: ["Lobby", "Arrivals"], desk: ["Floor 1", "Pass desk"], breakfast: ["CxO Breakfast", "Breakfast entry"], lunch: ["Lunch", "Networking Luncheon"],
  evening: ["Evening entry", "Awards Night (Day 1) · Gala (Day 2)"], media: ["Media desk", "Media check-in and queries"], av: ["AV station", "Speakers' slides and mics"],
  exhibitor: ["Exhibitor desk", "Exhibitors and booths"],
});
const ALL_DAY = new Set(["lobby", "desk", "media", "av", "exhibitor"]);

const infoOf = (s, key) => {
  const i = (s?.stations || []).find((x) => x.key === key);
  return { key, label: i?.label || LABELS[key][0], sub: i?.sub || LABELS[key][1], enabled: i ? i.enabled !== false : true, known: !!i };
};

/** The times line(s) of a station on a day: { time, doors, closed }. */
export function tileTimes(key, w) {
  if (ALL_DAY.has(key)) return { time: "Open all day", doors: "", closed: false };
  if (w === null) return { time: "Closed this day", doors: "", closed: true };
  if (!w) return { time: "", doors: "", closed: false };
  if (w.session && (w.source === "agenda" || w.source === "fallback")) {
    return { time: `${w.session.title ? `${w.session.title} ` : ""}${fmtRange(w.session.start, w.session.end)}`.trim(), doors: `Doors ${fmtRange(w.open, w.close)}`, closed: false };
  }
  return { time: `Open ${fmtRange(w.open, w.close)}${w.source === "staff" ? " (set by staff)" : ""}`, doors: "", closed: false };
}

/** Today's word for a station from its state (the server's stationState, or the device's): { text, code }. */
export function nowState(key, st) {
  if (!st || !st.eventDay) return null;
  if (st.allDay || ALL_DAY.has(key)) return { text: "Open now", code: "open" };
  if (st.code === "open") return { text: st.closesAt ? `Open now · until ${fmtClock(st.closesAt)}` : "Open now", code: "open" };
  if (st.code === "later") return { text: st.opensAt ? `Opens ${fmtClock(st.opensAt)}` : "Opens later today", code: "later" };
  return { text: "Closed for today", code: "closed" };
}

/**
 * The home's day sections: [{ key, title, today, off, note, tiles: [{ key, label, sub, time, doors, state, stateCode,
 * disabled, today }] }], today's first on an event day. `s`: the device's state (today, stations, windows,
 * stationStates).
 */
export function homeDays(s) {
  const today = s?.today || null;
  const eventDay = today?.eventDay || null;
  const days = eventDay === "day2" ? [HOME_DAYS[1], HOME_DAYS[0]] : [...HOME_DAYS];
  return days.map((day) => {
    const isToday = eventDay === day.key;
    const off = !!eventDay && !isToday;
    const note = off ? (day.date > (today?.date || "") ? `Opens ${day.short}` : `Ended ${day.short}`) : !eventDay && today?.date ? "Practice" : "";
    const tiles = DAY_STATIONS.map((key) => infoOf(s, key)).filter((i) => i.known || !(s?.stations || []).length).map((i) => {
      const w = s?.windows?.[i.key]?.[day.key];
      const t = tileTimes(i.key, w);
      const sub = i.key === "evening" ? MEAL_ITEMS.evening[day.key].label : i.sub;
      let state = null;
      if (!i.enabled) state = { text: "Switched off by staff", code: "closed" };
      else if (off) state = { text: note, code: "off" };
      else if (isToday) state = nowState(i.key, s?.stationStates?.[i.key]);
      else if (!eventDay && today?.date) state = { text: "Practice", code: "before" };
      return {
        key: i.key, label: i.label, sub, time: t.time, doors: t.doors, state: state?.text || "", stateCode: state?.code || "",
        disabled: off || !i.enabled || (!!eventDay && t.closed), today: isToday,
      };
    });
    return { key: day.key, title: day.title, today: isToday, off, note, tiles };
  });
}

/** The More menu's stations (open all day): [{ key, label, sub, state, disabled }]. */
export function moreTiles(s) {
  const eventDay = s?.today?.eventDay || null;
  return MORE_STATIONS.map((key) => infoOf(s, key)).filter((i) => i.known || !(s?.stations || []).length).map((i) => ({
    key: i.key, label: i.label, sub: i.sub, disabled: !i.enabled,
    state: !i.enabled ? "Switched off by staff" : eventDay ? "Open all day" : s?.today?.date ? "Practice · open all day on Day 1 and Day 2" : "",
  }));
}
