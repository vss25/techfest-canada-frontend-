/* =========================================================
   TTFC Check-in: today and each station's state, worked out on the
   device (the backend's services/checkinDeskTime.js eventDayInfo /
   stationState, the same rules and words).
   The server sends both days' windows in every snapshot and /clock
   answer; the device uses them when it can't ask the server: offline
   across a station's opening or closing time, and offline at the start
   of Day 2 (so returning guests can be marked again: lib/state.js
   rollDay). While the server answers, its own stationStates are used.
   Today is Toronto's: Mon Oct 26 is Day 1, Tue Oct 27 is Day 2; any
   other date is before / between / after, never Day 1 by default.
   Pure; node --test src/checkin/lib/stationTime.test.mjs
========================================================= */

export const DESK_TZ = "America/Toronto";
const DAYS = [{ key: "day1", date: "2026-10-26" }, { key: "day2", date: "2026-10-27" }];
export const EVENT_DAY_KEYS = DAYS.map((d) => d.key);
const DAY_BY_DATE = Object.fromEntries(DAYS.map((d) => [d.date, d.key]));
const DATE_BY_DAY = Object.fromEntries(DAYS.map((d) => [d.key, d.date]));
export const DAY_LABELS = Object.freeze({ day1: "Day 1", day2: "Day 2" });
const DAY_SHORT = Object.freeze({ day1: "Mon Oct 26", day2: "Tue Oct 27" });
export const STATION_KEYS = Object.freeze(["lobby", "desk", "breakfast", "lunch", "evening", "media", "av", "exhibitor"]);
const STATION_LABELS = Object.freeze({
  lobby: "Lobby", desk: "Pass desk", breakfast: "CxO Breakfast", lunch: "Lunch", evening: "Evening entry", media: "Media desk", av: "AV station", exhibitor: "Exhibitor desk",
});
/** What a meal / evening station admits to on each event day (the backend's MEAL_ITEMS). */
export const MEAL_ITEMS = Object.freeze({
  breakfast: { day1: { key: "cxo_d1", extra: "cxo", label: "CxO Breakfast", short: "breakfast" }, day2: { key: "cxo_d2", extra: "cxo", label: "CxO Breakfast", short: "breakfast" } },
  lunch: { day1: { key: "lunch_d1", extra: "lunch", label: "Networking Luncheon", short: "lunch" }, day2: { key: "lunch_d2", extra: "lunch", label: "Networking Luncheon", short: "lunch" } },
  evening: { day1: { key: "awards", extra: "awards", label: "Catalyst Awards Night", short: "Awards Night" }, day2: { key: "gala", extra: "gala", label: "Gala Dinner", short: "Gala" } },
});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const isHHMM = (v) => HHMM.test(String(v || ""));
const toMin = (hhmm) => Number(String(hhmm).slice(0, 2)) * 60 + Number(String(hhmm).slice(3, 5));

/** "07:30" → "7:30 AM". */
export function fmtClock(hhmm) {
  if (!isHHMM(hhmm)) return "";
  const m = toMin(hhmm);
  return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m >= 720 ? "PM" : "AM"}`;
}
/** "7:55–8:55 AM", "11:30 AM–12:30 PM". */
export function fmtRange(a, b) {
  if (!isHHMM(a) || !isHHMM(b)) return "";
  const [ta, tb] = [fmtClock(a), fmtClock(b)];
  return ta.slice(-2) === tb.slice(-2) ? `${ta.slice(0, -3)}–${tb}` : `${ta}–${tb}`;
}

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: DESK_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
/** A moment in Toronto: { date: "2026-10-26", minutes: 0–1439 }. */
export function torontoParts(at = Date.now()) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(at)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}

/** Which event day a moment is (Toronto): { date, minutes, eventDay, phase, label } (the server's `today`). */
export function eventDayInfo(at = Date.now()) {
  const { date, minutes } = torontoParts(at);
  const eventDay = DAY_BY_DATE[date] || null;
  const phase = eventDay ? "event" : date < DAYS[0].date ? "before" : date > DAYS[DAYS.length - 1].date ? "after" : "between";
  const label = eventDay ? DAY_LABELS[eventDay] : phase === "before" ? "Before the event" : phase === "after" ? "After the event" : "Between event days";
  return { date, minutes, eventDay, phase, label };
}

export const mealItem = (station, eventDay) => (eventDay && MEAL_ITEMS[station]?.[eventDay]) || null;

/**
 * Contract C9 (the organiser, Oct 23): the Lobby (Arrived), the Pass desk (Checked in), the Media desk, the AV station
 * and the Exhibitor desk are open ALL DAY on an event day: never refused, asked or recorded as an override for the
 * time (an exhibitor arriving at 6:00 AM for booth setup is one tap). Their header says "Day 1 · Arrivals open all
 * day". "Admit anyway" stays for the CxO Breakfast, the Lunch and the evening (Awards Night / Gala) only. The same as
 * the backend's services/checkinDeskTime.js ALL_DAY_STATIONS / WINDOWED_STATIONS.
 */
export const ALL_DAY_STATIONS = Object.freeze(["lobby", "desk", "media", "av", "exhibitor"]);
export const ASKING_STATIONS = Object.freeze(["breakfast", "lunch", "evening"]);
const ALL_DAY_TEXT = Object.freeze({
  lobby: "Arrivals open all day", desk: "Pass desk open all day", media: "Media desk open all day", av: "AV station open all day",
  exhibitor: "Exhibitor desk open all day",
});

const SOURCE_WORD = { agenda: "agenda", fallback: "agenda as of Oct 23", staff: "set by staff", default: "default hours" };
function windowDetail(w) {
  if (!w) return "Closed today";
  if (w.session && (w.source === "agenda" || w.source === "fallback")) {
    return `${w.session.title} ${fmtRange(w.session.start, w.session.end)} (${SOURCE_WORD[w.source]}) · doors ${fmtRange(w.open, w.close)}`;
  }
  return `Open ${fmtRange(w.open, w.close)} (${SOURCE_WORD[w.source] || "default hours"})`;
}
const whatOn = (station, eventDay) => mealItem(station, eventDay)?.label || STATION_LABELS[station] || station;
/** "Lobby" → "lobby" mid-sentence; an acronym stays as it is ("AV station"). */
const lower = (s) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

/**
 * Where a station is at a moment (`windows`: the server's, both days) → the server's stationState shape:
 * { date, eventDay, phase, dayLabel, station, item, window, detail, open, opensAt, closesAt, next, text, code }
 */
export function stationState({ station, at = Date.now(), windows = {} } = {}) {
  const info = eventDayInfo(at);
  const item = mealItem(station, info.eventDay);
  const w = info.eventDay ? windows?.[station]?.[info.eventDay] || null : null;
  const base = { date: info.date, eventDay: info.eventDay, phase: info.phase, dayLabel: info.label, station, item, window: w, detail: info.eventDay ? windowDetail(w) : "" };
  const nextAfter = () => {
    for (const d of EVENT_DAY_KEYS) {
      if (DATE_BY_DAY[d] <= info.date) continue;
      const nw = windows?.[station]?.[d];
      if (nw) return { eventDay: d, dayLabel: DAY_LABELS[d], dayShort: DAY_SHORT[d], open: nw.open, close: nw.close, item: mealItem(station, d) };
    }
    return null;
  };
  const nextText = (n) => (n ? `next is ${n.dayLabel} ${n.item ? n.item.short : lower(STATION_LABELS[station])}, ${fmtClock(n.open)}` : "");
  if (!info.eventDay) {
    // Before Day 1, an all-day station (C9) says so ("… · lobby open all day"), never the hours saved for it.
    const allDay = ALL_DAY_STATIONS.includes(station);
    const firstDay = EVENT_DAY_KEYS.find((d) => DATE_BY_DAY[d] > info.date);
    const next = allDay ? (firstDay ? { eventDay: firstDay, dayLabel: DAY_LABELS[firstDay], dayShort: DAY_SHORT[firstDay], open: null, close: null, item: null, allDay: true } : null) : nextAfter();
    const what = (n) => (n.allDay ? `${lower(STATION_LABELS[station])} open all day` : `${n.item ? n.item.short : lower(STATION_LABELS[station])} opens ${fmtClock(n.open)}`);
    const text = info.phase === "after"
      ? "TTFC 2026 is over: no event today"
      : `${info.label} · ${next ? `${next.dayLabel} is ${next.dayShort} · ${what(next)}` : `Day 1 is ${DAY_SHORT.day1}`}`;
    return { ...base, open: false, opensAt: null, closesAt: null, next, text, code: info.phase === "after" ? "after" : "before" };
  }
  // Contract C9: open all day on an event day (whatever hours are saved for it).
  if (ALL_DAY_STATIONS.includes(station)) {
    return { ...base, detail: "", open: true, allDay: true, opensAt: null, closesAt: null, next: null, text: `${info.label} · ${ALL_DAY_TEXT[station]}`, code: "open" };
  }
  const label = `${info.label} · ${whatOn(station, info.eventDay)}`;
  if (!w) {
    const next = nextAfter();
    return { ...base, open: false, opensAt: null, closesAt: null, next, text: `${label} · closed today${next ? `: ${nextText(next)}` : ""}`, code: "closed" };
  }
  if (info.minutes < toMin(w.open)) return { ...base, open: false, opensAt: w.open, closesAt: w.close, next: null, text: `${label} · opens at ${fmtClock(w.open)}`, code: "later" };
  if (info.minutes < toMin(w.close)) return { ...base, open: true, opensAt: w.open, closesAt: w.close, next: null, text: `${label} · open until ${fmtClock(w.close)}`, code: "open" };
  const next = nextAfter();
  return { ...base, open: false, opensAt: null, closesAt: null, next, text: `${label} · closed${next ? `: ${nextText(next)}` : ""}`, code: "closed" };
}

/** What a station's header and picker tile show (a server from before contract C9 still sends the all-day stations'
    hours): open all day on an event day, as stationState says. */
export function stationView(station, st) {
  if (!st || !ALL_DAY_STATIONS.includes(station) || !st.eventDay) return st;
  return { ...st, open: true, allDay: true, code: "open", opensAt: null, closesAt: null, next: null, text: `${st.dayLabel || DAY_LABELS[st.eventDay] || ""} · ${ALL_DAY_TEXT[station]}`, detail: "" };
}

/* ---------- How a tap goes ---------- */

/**
 * How a tap at a station goes, from its state (the server's, or worked out here):
 *   "ask"  closed: "Admit anyway?" first, then recorded as an override (meal and evening stations, on an event day)
 *   "tap"  just recorded: open; the lobby, pass desk, media, AV and exhibitor desks at any hour (C9); any station on a
 *          day that isn't an event day, where every mark is a practice mark (contract C6)
 */
export function tapRule(station, st) {
  if (!st || st.open || !st.eventDay || !ASKING_STATIONS.includes(station)) return "tap";
  return "ask";
}

/** Every station's state at a moment, from the windows the device holds. */
export function stationStates(windows, at = Date.now(), stations = STATION_KEYS) {
  return Object.fromEntries(stations.map((k) => [k, stationState({ station: k, at, windows })]));
}
