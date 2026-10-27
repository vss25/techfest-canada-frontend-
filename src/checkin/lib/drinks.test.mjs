/* node --test src/checkin/lib/drinks.test.mjs: DRINK COUPONS (Oct 27 2026, Day 2). The organiser: "add the ability to
   collect drinks token in the pwa from registration desk … a soft indicator when someone has checked in", "for first
   time checkins, this option should exist in the checkin section for floor 1. For already checked in or pass holders
   people, this should exist as a separate option for drinks checkin", "default is 2 coupon per person".
   The device's side: the Drinks station's address and tile, the status (the server's mark with its count, a queued tap
   on top, staff's "Issue again" adding to it), the pass desk's rule (a first-time check-in only), coupons from the
   Drinks station never putting anyone "on the way up", the counters, the words, the counts tables and CSV. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DRINKS_DEFAULT, applyEvents, counters, deskDrinksDue, drinksSetting, fromSnapshot, markedToday, onTheWay, passDeskStage, statusOf, toSnapshot, wayArrival } from "./state.js";
import { STATION_SLUGS, routeOf, stationPath } from "./routes.js";
import { homeDays } from "./home.js";
import { stationState, stationView, tapRule } from "./stationTime.js";
import { couponsText, cta, drinksAgainText, drinksDoneText, issueDrinksLabel, stateChip } from "./vocab.js";
import { describeTap } from "./tapText.js";
import { attendanceCsvRows, attendanceView, drinksCell, hasDrinks } from "./attendance.js";

const DAY = "2026-10-27";
const guest = (key, name, tier, extra = {}) => ({
  key, keys: [key], name, tier, passName: "", marks: { vip: false, media: false, speaker: false, exhibitor: false },
  extras: { cxo: false, lunch: false, gala: false, awards: false }, rsvp: { rsvpd: false, options: [] }, passCollected: false, passCollectedAt: null, ...extra,
});
const mark = (key, point, rev, at, extra = {}) => ({ key, day: DAY, point, rev, at, by: at ? { id: "v1", name: "Val" } : null, station: "drinks", ref: `r-${key}-${point}`, ...extra });

function snap(extra = {}) {
  return {
    serverTime: "2026-10-27T14:00:00Z", cursor: 10, today: { date: DAY, eventDay: "day2", phase: "event" }, user: { id: "v1", name: "Val" }, staff: false,
    drinks: { perPerson: 2, min: 1, max: 5, default: 2 },
    stations: [{ key: "lobby", label: "Lobby" }, { key: "desk", label: "Floor 1", sub: "Pass desk" }, { key: "drinks", label: "Drinks", sub: "Drink coupons" }],
    guests: [
      // Dana collected her badge on Day 1; Fay never has; Sia has no pass on file.
      guest("gD", "Dana Dayone", "connect", { passCollected: true, passCollectedAt: "2026-10-26T13:05:00Z" }),
      guest("gF", "Fay Firsttime", "influence"),
      guest("gT", "Tia Today", "power", { passCollected: true, passCollectedAt: "2026-10-27T13:30:00Z" }),
      guest("nS", "Sia Nopass", null, { noPass: true }),
    ],
    marks: [],
    ...extra,
  };
}

test("the address and the home: /checkin/drinks, a tile on each day after Floor 1, open all day", () => {
  assert.equal(STATION_SLUGS.drinks, "drinks");
  assert.equal(stationPath("drinks"), "/checkin/drinks");
  assert.deepEqual(routeOf("/checkin/Drink-Coupons/"), { station: "drinks", canonical: "/checkin/drinks" });
  const s = fromSnapshot(snap({ stationStates: { drinks: { eventDay: "day2", dayLabel: "Day 2", allDay: true, open: true, code: "open" } } }));
  const day2 = homeDays(s).find((d) => d.key === "day2");
  assert.deepEqual(day2.tiles.map((t) => t.key), ["lobby", "desk", "drinks"], "only the stations the server lists");
  const tile = day2.tiles.find((t) => t.key === "drinks");
  assert.deepEqual([tile.label, tile.sub, tile.time, tile.state, tile.disabled], ["Drinks", "Drink coupons", "Open all day", "Open now", false]);
  // An older server (no Drinks station): no tile.
  const old = fromSnapshot(snap({ stations: [{ key: "lobby", label: "Lobby" }, { key: "desk", label: "Floor 1" }] }));
  assert.ok(!homeDays(old)[0].tiles.some((t) => t.key === "drinks"));
  // The device's own idea of the station (offline): all day, never "Admit anyway".
  const st = stationState({ station: "drinks", at: Date.parse("2026-10-27T07:30:00Z"), windows: {} });
  assert.equal(st.text, "Day 2 · Drink coupons all day");
  assert.equal(tapRule("drinks", { ...st, open: false }), "tap");
  assert.equal(stationView("drinks", { eventDay: "day2", dayLabel: "Day 2", open: false, code: "closed" }).open, true);
});

test("the setting: 2 per person by default, the server's number when it says, kept in range", () => {
  assert.equal(DRINKS_DEFAULT.perPerson, 2);
  assert.deepEqual(drinksSetting(undefined), { perPerson: 2, min: 1, max: 5 });
  assert.deepEqual(drinksSetting({ perPerson: 4, min: 1, max: 5 }), { perPerson: 4, min: 1, max: 5 });
  assert.deepEqual(drinksSetting({ perPerson: 9 }), { perPerson: 2, min: 1, max: 5 });
  const s = fromSnapshot(snap({ drinks: { perPerson: 3, min: 1, max: 5 } }));
  assert.equal(s.drinks.perPerson, 3);
  assert.equal(fromSnapshot(toSnapshot(s)).drinks.perPerson, 3, "kept with the device's copy");
});

test("status: the server's coupons with their count; a queued tap on top (it marks them arrived too); staff's Issue again adds", () => {
  const s = fromSnapshot(snap());
  const [dana, fay] = ["gD", "gF"].map((k) => s.byKey.get(k));
  // Queued (offline): 2 coupons, and arrived with them.
  const q = [{ clientId: "c1", kind: "mark", point: "drinks", key: "gD", station: "drinks", clientAt: "2026-10-27T14:01:00Z", count: 2 }];
  const st = statusOf(s, dana, q);
  assert.equal(st.drinks.count, 2);
  assert.equal(st.drinks.pending, true);
  assert.equal(st.arrived.station, "drinks");
  // …but not "on the way up" to the pass desk: they collected their pass on Day 1.
  assert.equal(wayArrival(st), null);
  assert.equal(passDeskStage(st), "not_arrived");
  assert.deepEqual(onTheWay(s, q).map((x) => x.g.key), []);
  assert.equal(counters(s, "desk", { pending: q }).totals.onTheWay, 0);
  assert.equal(counters(s, "desk", { pending: q }).totals.arrived, 1, "but arrived today, yes");
  // The server's answer: the coupons and the arrival (same ref).
  applyEvents(s, [{ seq: 11, kind: "mark", point: "drinks", key: "gD", marks: [mark("gD", "drinks", 1, "2026-10-27T14:01:00Z", { count: 2 }), mark("gD", "arrived", 1, "2026-10-27T14:01:00Z")] }]);
  assert.equal(statusOf(s, dana).drinks.count, 2);
  // Staff's Issue again, queued: 2 + 1.
  const again = [{ clientId: "c2", kind: "mark", point: "drinks", key: "gD", station: "drinks", clientAt: "2026-10-27T14:05:00Z", count: 1, again: true }];
  const st2 = statusOf(s, dana, again);
  assert.equal(st2.drinks.count, 3);
  assert.equal(st2.drinks.override, "issued_again");
  // An undo waiting in the queue hides the coupons.
  assert.equal(statusOf(s, dana, [{ clientId: "u1", kind: "undo", target: "r-gD-drinks" }]).drinks, null);
  // At the pass desk the lobby's arrival is still "on the way up".
  applyEvents(s, [{ seq: 12, kind: "mark", point: "arrived", key: "gF", station: "lobby", marks: [{ ...mark("gF", "arrived", 1, "2026-10-27T14:02:00Z"), station: "lobby" }] }]);
  assert.deepEqual(onTheWay(s).map((x) => x.g.key), ["gF"]);
  assert.equal(passDeskStage(statusOf(s, fay)), "on_the_way");
  // The Drinks station's list and counters.
  assert.deepEqual(markedToday(s, "drinks").map((x) => x.g.key), ["gD"]);
  const c = counters(s, "drinks", { pending: again });
  assert.equal(c.totals.done, 1);
  assert.equal(c.coupons, 3);
  assert.equal(c.totals.total, 4);
});

test("the pass desk offers coupons only to a first-time check-in (pass not collected on an earlier day), until issued", () => {
  const s = fromSnapshot(snap());
  const g = (k) => s.byKey.get(k);
  assert.equal(deskDrinksDue(g("gF"), statusOf(s, g("gF")), s.today), true, "never collected: first time");
  assert.equal(deskDrinksDue(g("gT"), statusOf(s, g("gT")), s.today), true, "collected today (this check-in, the door): still first time");
  assert.equal(deskDrinksDue(g("gD"), statusOf(s, g("gD")), s.today), false, "collected on Day 1: the Drinks station has theirs");
  assert.equal(deskDrinksDue(g("nS"), statusOf(s, g("nS")), s.today), true, "no pass on file: the desk issues the pass and the coupons");
  applyEvents(s, [{ seq: 11, kind: "mark", point: "drinks", key: "gF", marks: [mark("gF", "drinks", 1, "2026-10-27T14:01:00Z", { count: 2, station: "desk" })] }]);
  assert.equal(deskDrinksDue(g("gF"), statusOf(s, g("gF")), s.today), false, "issued: the quiet state instead");
});

test("the words: Issue 2 drink coupons, Drink coupons ✓ (2) 10:42 AM, Already issued today · … · by Sam · 2 coupons", () => {
  assert.equal(issueDrinksLabel(2), "Issue 2 drink coupons");
  assert.equal(issueDrinksLabel(1), "Issue 1 drink coupon");
  assert.equal(couponsText(3), "3 drink coupons");
  assert.deepEqual(cta("drinks", { count: 2 }), { label: "Issue 2 drink coupons", undo: "Undo coupons" });
  const m = { at: "2026-10-27T14:42:00Z", count: 2, by: { name: "Sam" } };
  assert.equal(drinksDoneText(m), "Drink coupons ✓ (2) 10:42 AM");
  assert.equal(drinksDoneText({ ...m, pending: true }), "Drink coupons ✓ (2) 10:42 AM · pending");
  assert.equal(drinksAgainText(m), "Already issued today · 10:42 AM · by Sam · 2 coupons");
  assert.equal(drinksAgainText({ ...m, count: 1 }), "Already issued today · 10:42 AM · by Sam · 1 coupon");
  assert.equal(drinksAgainText({ ...m, count: 3, override: "issued_again" }), "Already issued today · 10:42 AM · by Sam · 3 coupons · issued again");
  assert.deepEqual(stateChip("drinks", m, { again: true }), { tone: "already", text: "Already issued today · 10:42 AM · by Sam · 2 coupons" });
  assert.deepEqual(stateChip("drinks", m, { by: true }), { tone: "done", text: "Drink coupons (2) · 10:42 AM by Sam" });
  const state = fromSnapshot(snap());
  assert.equal(describeTap({ kind: "mark", point: "drinks", key: "gD", station: "drinks", count: 2 }, { state }).what, "Drink coupons issued (2)");
  assert.equal(describeTap({ kind: "mark", point: "drinks", key: "gD", station: "drinks", count: 1, again: true }, { state }).what, "Drink coupons issued again (+1)");
  assert.equal(describeTap({ kind: "mark", point: "drinks", key: "gD", station: "drinks" }, { state }).where, "Drinks");
});

test("counts (the desk's Counts and Admin › Event summary): a Drink coupons row, Drinks by pass type, the CSV; nothing from an older server", () => {
  const day = (d, drinks) => ({ day: d, date: d === "day1" ? "2026-10-26" : DAY, label: d === "day1" ? "Day 1" : "Day 2", arrived: 10, checkedIn: 8, meals: {},
    byPass: { connect: { label: "Connect Pass", people: 5, arrived: 3, checkedIn: 2, cxo: 0, lunch: 0, dinner: 0 }, vip: { label: "VIP", people: 1, arrived: 0, checkedIn: 0, cxo: 0, lunch: 0, dinner: 0 } },
    issuePass: {}, noDetails: {}, ...(drinks ? { drinks } : {}) });
  const dr = { people: 7, coupons: 13, issuedAgain: 1, byPass: { connect: { label: "Connect Pass", people: 2, coupons: 4 }, vip: { label: "VIP", people: 1, coupons: 3 } }, noPass: { people: 2, coupons: 4 } };
  const att = { days: [day("day1", { people: 0, coupons: 0, issuedAgain: 0, byPass: {}, noPass: { people: 0, coupons: 0 } }), day("day2", dr)] };
  assert.equal(hasDrinks(att), true);
  const v = attendanceView(att);
  const row = v.rows.find((r) => r.key === "drinks");
  assert.equal(row.label, "Drink coupons");
  assert.equal(row.cells[1].main, "7 people · 13 coupons");
  assert.equal(row.cells[1].sub, "1 issued again by staff · 2 people with a pass issued at the desk · each person once a day; also counted as arrived");
  assert.equal(drinksCell(null).main, "—");
  const d2 = v.byPass.find((x) => x.day === "day2");
  assert.deepEqual(d2.rows.map((r) => [r.key, r.drinks, r.coupons]), [["vip", 1, 3], ["connect", 2, 4]]);
  const csv = attendanceCsvRows(att);
  assert.deepEqual(csv.find((r) => r[0] === "Drink coupons: coupons issued"), ["Drink coupons: coupons issued", 0, 13]);
  assert.deepEqual(csv.find((r) => r[0] === "Drink coupons: people (each once a day; also counted as arrived)"), ["Drink coupons: people (each once a day; also counted as arrived)", 0, 7]);
  const header = csv.find((r) => r[0] === "Day" && r[1] === "Pass type");
  assert.deepEqual(header.slice(-2), ["Drink coupons: people", "Drink coupons"]);
  assert.ok(csv.some((r) => r[0] === "Day 2 · Tue Oct 27" && r[1] === "VIP" && r[8] === 1 && r[9] === 3));
  // An older server: no row, no columns.
  const old = { days: [day("day1"), day("day2")] };
  assert.equal(hasDrinks(old), false);
  assert.ok(!attendanceView(old).rows.some((r) => r.key === "drinks"));
  assert.ok(!("drinks" in attendanceView(old).byPass[0].rows[0]));
  assert.ok(!attendanceCsvRows(old).some((r) => String(r[0]).startsWith("Drink coupons")));
});
