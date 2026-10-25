/* node --test src/checkin/lib/home.test.mjs: the home's two days and More (Oct 24 2026). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { homeDays, moreTiles, nowState, tileTimes } from "./home.js";
import { stationStates } from "./stationTime.js";

const STATIONS = ["lobby", "desk", "breakfast", "lunch", "evening", "media", "av", "exhibitor"].map((key) => ({ key, label: { lobby: "Lobby", desk: "Floor 1", breakfast: "CxO Breakfast", lunch: "Lunch", evening: "Evening entry", media: "Media desk", av: "AV station", exhibitor: "Exhibitor desk" }[key], sub: "x", enabled: true }));
// The server's windows (services/checkinDeskTime.js resolveWindows with the Oct 23 agenda).
const agenda = (start, end, title, open, close) => ({ open, close, source: "agenda", session: { start, end, title } });
const WINDOWS = {
  lobby: { day1: { open: "07:00", close: "23:00", source: "default", allDay: true }, day2: { open: "07:00", close: "23:00", source: "default", allDay: true } },
  desk: { day1: { open: "07:00", close: "23:00", source: "default", allDay: true }, day2: { open: "07:00", close: "23:00", source: "default", allDay: true } },
  breakfast: { day1: agenda("07:55", "08:55", "CxO Breakfast", "07:25", "09:25"), day2: agenda("07:55", "08:55", "CxO Breakfast", "07:25", "09:25") },
  lunch: { day1: agenda("12:35", "13:20", "Networking Lunch", "12:05", "13:50"), day2: agenda("12:00", "12:45", "Lunch", "11:30", "13:15") },
  evening: { day1: agenda("17:30", "18:30", "Awards Evening", "17:00", "21:30"), day2: agenda("17:30", "19:30", "Gala Dinner", "17:00", "20:00") },
  media: {}, av: {}, exhibitor: {},
};
const stateAt = (iso, today) => ({ today, stations: STATIONS, windows: WINDOWS, stationStates: stationStates(WINDOWS, Date.parse(iso)) });

test("Day 1 at 8:00 AM: Day 1 first and highlighted with what's on now; Day 2's tiles off, 'Opens Tue 27 Oct'", () => {
  const days = homeDays(stateAt("2026-10-26T12:00:00Z", { date: "2026-10-26", eventDay: "day1", label: "Day 1" }));
  assert.deepEqual(days.map((d) => [d.key, d.title, d.today, d.off]), [["day1", "Day 1 · Mon 26 Oct", true, false], ["day2", "Day 2 · Tue 27 Oct", false, true]]);
  const [d1, d2] = days;
  assert.deepEqual(d1.tiles.map((t) => t.key), ["lobby", "desk", "breakfast", "lunch", "evening"], "only the five; media / AV / exhibitor are under More");
  const t = Object.fromEntries(d1.tiles.map((x) => [x.key, x]));
  assert.equal(t.lobby.time, "Open all day");
  assert.equal(t.desk.label, "Floor 1");
  assert.equal(t.breakfast.time, "CxO Breakfast 7:55–8:55 AM");
  assert.equal(t.breakfast.doors, "Doors 7:25–9:25 AM");
  assert.equal(t.breakfast.state, "Open now · until 9:25 AM");
  assert.equal(t.lunch.state, "Opens 12:05 PM");
  assert.equal(t.lunch.time, "Networking Lunch 12:35–1:20 PM");
  assert.equal(t.evening.sub, "Catalyst Awards Night", "Day 1's evening is the Awards Night");
  assert.equal(t.evening.time, "Awards Evening 5:30–6:30 PM");
  assert.ok(d1.tiles.every((x) => !x.disabled && x.today));
  assert.ok(d2.tiles.every((x) => x.disabled && x.state === "Opens Tue 27 Oct"));
  assert.equal(d2.tiles.find((x) => x.key === "evening").sub, "Gala Dinner", "Day 2's evening is the Gala, as the agenda says");
  assert.equal(d2.tiles.find((x) => x.key === "lunch").time, "Lunch 12:00–12:45 PM");
});

test("Day 2: Day 2 first; Day 1's tiles off, 'Ended Mon 26 Oct'", () => {
  const days = homeDays(stateAt("2026-10-27T16:20:00Z", { date: "2026-10-27", eventDay: "day2", label: "Day 2" }));
  assert.deepEqual(days.map((d) => d.key), ["day2", "day1"]);
  assert.ok(days[1].tiles.every((x) => x.disabled && x.state === "Ended Mon 26 Oct"));
  assert.equal(days[0].tiles.find((x) => x.key === "lunch").state, "Open now · until 1:15 PM");
});

test("not an event day: both days open, for practice", () => {
  const days = homeDays(stateAt("2026-10-24T22:00:00Z", { date: "2026-10-24", eventDay: null, label: "Before the event" }));
  assert.deepEqual(days.map((d) => d.key), ["day1", "day2"]);
  assert.ok(days.every((d) => !d.off && !d.today && d.note === "Practice"));
  assert.ok(days.flatMap((d) => d.tiles).every((x) => !x.disabled && x.state === "Practice"));
});

test("a station switched off by staff, a day staff closed; More", () => {
  const s = stateAt("2026-10-26T12:00:00Z", { date: "2026-10-26", eventDay: "day1", label: "Day 1" });
  s.stations = s.stations.map((x) => (x.key === "evening" ? { ...x, enabled: false } : x));
  s.windows = { ...s.windows, lunch: { ...s.windows.lunch, day1: null } };
  const d1 = homeDays(s)[0];
  assert.equal(d1.tiles.find((x) => x.key === "evening").disabled, true);
  assert.equal(d1.tiles.find((x) => x.key === "evening").state, "Switched off by staff");
  assert.equal(d1.tiles.find((x) => x.key === "lunch").time, "Closed this day");
  assert.equal(d1.tiles.find((x) => x.key === "lunch").disabled, true);
  assert.deepEqual(moreTiles(s).map((x) => [x.key, x.label, x.state, x.disabled]), [["media", "Media desk", "Open all day", false], ["av", "AV station", "Open all day", false], ["exhibitor", "Exhibitor desk", "Open all day", false]]);
  assert.equal(tileTimes("lunch", { open: "11:00", close: "14:00", source: "staff" }).time, "Open 11:00 AM–2:00 PM (set by staff)");
  assert.equal(nowState("lobby", { eventDay: "day1", allDay: true, code: "open" }).text, "Open now");
  assert.equal(nowState("lunch", { eventDay: "day1", code: "closed" }).text, "Closed for today");
  assert.equal(nowState("lunch", { eventDay: null }), null);
});
