/* node --test src/checkin/lib/timers.test.mjs: the on-the-way-up timer and its colours (amber from 60 s, red from 2 min),
   Toronto times, and the AV station's next session (within 60 minutes = highlighted). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { AMBER_AFTER_S, RED_AFTER_S, clock12, clockText, nextSession, secondsSince, timeText, timerLevel, torontoDate, untilText, weekday } from "./timers.js";

test("seconds since arrival, as the card shows it", () => {
  const at = "2026-10-26T13:00:00Z";
  assert.equal(secondsSince(at, Date.parse("2026-10-26T13:00:35Z")), 35);
  assert.equal(secondsSince(at, Date.parse("2026-10-26T12:59:00Z")), 0, "never negative (clock skew)");
  assert.equal(secondsSince(null), null);
  assert.deepEqual([0, 35, 65, 600, 3725].map(clockText), ["0:00", "0:35", "1:05", "10:00", "1 h 02"]);
  assert.equal(clockText(null), "");
});

test("the timer turns amber after 60 s and red after 2 minutes (boundaries included)", () => {
  assert.equal(AMBER_AFTER_S, 60);
  assert.equal(RED_AFTER_S, 120);
  assert.deepEqual([0, 59, 60, 119, 120, 900].map(timerLevel), ["ok", "ok", "amber", "amber", "red", "red"]);
  assert.equal(timerLevel(null), "ok");
});

test("Toronto times and days", () => {
  assert.equal(timeText("2026-10-26T14:42:00Z"), "10:42 AM");
  assert.equal(weekday("2026-10-26T14:42:00Z"), "Mon");
  assert.equal(torontoDate("2026-10-27T03:30:00Z"), "2026-10-26", "11:30 PM Monday in Toronto");
  assert.equal(clock12("17:30"), "5:30 PM");
  assert.equal(clock12("7:30"), "");
});

test("AV: the next session today, highlighted within 60 minutes, on now until it ends", () => {
  const sessions = [
    { day: "day1", start: "09:30", end: "10:00", title: "A", room: "Harbour Ballroom" },
    { day: "day1", start: "14:00", end: "14:30", title: "B", room: "Harbour Ballroom" },
    { day: "day2", start: "09:00", end: "09:25", title: "C", room: "Harbour Ballroom" },
  ];
  const at = (hhmm) => Date.parse(`2026-10-26T${hhmm}:00-04:00`);
  const n1 = nextSession(sessions, { eventDay: "day1", now: at("08:00") });
  assert.deepEqual([n1.session.title, n1.minutesUntil, n1.soon], ["A", 90, false]);
  const n2 = nextSession(sessions, { eventDay: "day1", now: at("08:30") });
  assert.deepEqual([n2.minutesUntil, n2.soon], [60, true]);
  const n3 = nextSession(sessions, { eventDay: "day1", now: at("09:45") });
  assert.deepEqual([n3.session.title, n3.live, n3.soon], ["A", true, true]);
  assert.equal(nextSession(sessions, { eventDay: "day1", now: at("10:00") }).session.title, "B");
  assert.equal(nextSession(sessions, { eventDay: "day1", now: at("15:00") }), null);
  assert.equal(nextSession(sessions, { eventDay: null, now: at("08:00") }), null);
  assert.deepEqual([-5, 0, 25, 70].map(untilText), ["on now", "on now", "in 25 min", "in 1 h 10"]);
});
