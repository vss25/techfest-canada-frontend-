/* node --test src/checkin/lib/stationTime.test.mjs: today and the stations' states worked out on the device (the
   backend's checkinDeskTime.js rules and words; a scratch comparison over Oct 24–28 every 7 minutes, all 8 stations,
   matched it exactly): Toronto days, before / between / after the event, opens at / open until / closed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { eventDayInfo, fmtRange, stationState, stationStates } from "./stationTime.js";

const W = {
  lobby: { day1: { open: "07:00", close: "23:00", source: "default" }, day2: { open: "07:00", close: "23:00", source: "default" } },
  breakfast: { day1: { open: "07:25", close: "09:25", source: "agenda", session: { start: "07:55", end: "08:55", title: "CxO Breakfast" } }, day2: null },
};
const at = (iso) => Date.parse(iso);

test("Toronto days: Day 1 is Mon Oct 26, Day 2 Tue Oct 27; the day turns at Toronto's midnight", () => {
  assert.deepEqual(eventDayInfo(at("2026-10-26T13:00:00Z")), { date: "2026-10-26", minutes: 540, eventDay: "day1", phase: "event", label: "Day 1" });
  assert.equal(eventDayInfo(at("2026-10-27T03:59:00Z")).eventDay, "day1", "11:59 PM Monday in Toronto");
  assert.equal(eventDayInfo(at("2026-10-27T04:00:00Z")).eventDay, "day2");
  assert.equal(eventDayInfo(at("2026-10-25T15:00:00Z")).phase, "before");
  assert.equal(eventDayInfo(at("2026-10-28T15:00:00Z")).label, "After the event");
});

test("a station's state: opens at, open until, closed (next day), closed today, before the event", () => {
  const early = stationState({ station: "breakfast", at: at("2026-10-26T11:00:00Z"), windows: W });
  assert.deepEqual([early.code, early.open, early.text], ["later", false, "Day 1 · CxO Breakfast · opens at 7:25 AM"]);
  assert.equal(early.detail, "CxO Breakfast 7:55–8:55 AM (agenda) · doors 7:25–9:25 AM");
  assert.equal(early.item.key, "cxo_d1");
  const open = stationState({ station: "breakfast", at: at("2026-10-26T12:00:00Z"), windows: W });
  assert.deepEqual([open.code, open.open, open.text], ["open", true, "Day 1 · CxO Breakfast · open until 9:25 AM"]);
  assert.equal(stationState({ station: "breakfast", at: at("2026-10-26T14:00:00Z"), windows: W }).code, "closed");
  const day2 = stationState({ station: "breakfast", at: at("2026-10-27T12:00:00Z"), windows: W });
  assert.deepEqual([day2.code, day2.text], ["closed", "Day 2 · CxO Breakfast · closed today"]);
  const before = stationState({ station: "lobby", at: at("2026-10-24T14:00:00Z"), windows: W });
  // An all-day station (C9) before Day 1: "open all day", as the backend says (checkinDeskTime.js), never its saved hours.
  assert.deepEqual([before.code, before.open, before.text], ["before", false, "Before the event · Day 1 is Mon Oct 26 · lobby open all day"]);
  assert.equal(before.next.allDay, true);
  for (const [st, word] of [["desk", "pass desk"], ["media", "media desk"], ["av", "AV station"], ["exhibitor", "exhibitor desk"]]) {
    assert.equal(stationState({ station: st, at: at("2026-10-25T13:00:00Z"), windows: W }).text, `Before the event · Day 1 is Mon Oct 26 · ${word} open all day`, st);
  }
  // Even with no hours saved for it.
  assert.equal(stationState({ station: "lobby", at: at("2026-10-24T14:00:00Z"), windows: {} }).text, "Before the event · Day 1 is Mon Oct 26 · lobby open all day");
  // A windowed station keeps its opening time.
  assert.equal(stationState({ station: "breakfast", at: at("2026-10-24T14:00:00Z"), windows: W }).text, "Before the event · Day 1 is Mon Oct 26 · breakfast opens 7:25 AM");
  assert.equal(stationState({ station: "lobby", at: at("2026-10-28T14:00:00Z"), windows: W }).text, "TTFC 2026 is over: no event today");
  assert.deepEqual(Object.keys(stationStates(W, at("2026-10-26T12:00:00Z"), ["lobby", "breakfast"])), ["lobby", "breakfast"]);
  assert.equal(fmtRange("11:30", "12:30"), "11:30 AM–12:30 PM");
});
