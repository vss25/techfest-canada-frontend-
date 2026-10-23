/* node --test src/checkin/lib/state.test.mjs: a snapshot then events (in any order, twice), a person's status across
   their passes, the queue's taps on top (and an undo hiding them), lobby arrivals to announce (live, and recent ones
   after a reconnect), Day 2's "has pass", and the counters: each person once in the colour groups (the groups add up
   to the total), Media / VIP / Exhibitor as yes / no counts, and the meal station's admitted / entitled / RSVP'd. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEvents, boothStatus, checkedInToday, collectedBefore, counters, deskStage, fromSnapshot, markedToday, onTheWay, statusOf } from "./state.js";

const DAY = "2026-10-26";
const guest = (key, name, tier, marks = {}, extra = {}) => ({
  key, keys: [key], name, tier, passName: "", marks: { vip: false, media: false, speaker: false, exhibitor: false, ...marks },
  extras: { cxo: false, lunch: false, gala: false, awards: false }, rsvp: { rsvpd: false, options: [] }, passCollected: false, passCollectedAt: null, ...extra,
});
const mark = (key, point, rev, at, by = "Val", extra = {}) => ({ key, day: DAY, point, rev, at, by: at ? { id: "v1", name: by } : null, station: "lobby", ref: `r-${key}-${point}-${rev}`, ...extra });

function snap() {
  return {
    serverTime: "2026-10-26T13:00:00Z", cursor: 10, today: { date: DAY, eventDay: "day1", phase: "event" }, user: { id: "v1", name: "Val" }, staff: false,
    guests: [
      guest("gA", "Priya Sharma", "power", {}, { extras: { cxo: false, lunch: true, gala: true, awards: true }, rsvp: { rsvpd: true, options: ["lunch_d1"] } }),
      guest("gB", "Mo Media", "connect", { media: true }, { extras: { cxo: true, lunch: true, gala: true, awards: true } }),
      guest("gC", "Vera Vip", "power", { vip: true, media: true }),
      guest("gD", "Rae Speaker", "speaker", { speaker: true }, { keys: ["gD", "gD2"], extras: { cxo: true, lunch: true, gala: true, awards: true }, rsvp: { rsvpd: true, options: ["cxo_d1", "lunch_d1"] } }),
      guest("gE", "Eve Exhibitor", "connect", { exhibitor: true }, { booth: "A12", boothKey: "b-A12" }),
      guest("gF", "Gus Guest", "connect", {}, { passCollected: true, passCollectedAt: "2026-10-25T14:00:00Z" }),
      guest("gG", "Dot Discover", "other", {}, { passName: "Other: Discover" }),
    ],
    marks: [mark("gA", "arrived", 1, "2026-10-26T12:58:00Z"), mark("gB", "checked_in", 2, "2026-10-26T12:30:00Z"), mark("gB", "arrived", 1, "2026-10-26T12:29:00Z"),
      { ...mark("gA", "arrived", 9, "2026-10-25T12:00:00Z"), day: "2026-10-25" }],
    booths: [{ key: "b-A12", booth: "A12", companies: ["Boothco"], guests: ["gE"] }],
    queries: [{ id: "q1", rev: 1, status: "new", request: "Press kit" }],
  };
}

test("a snapshot: today's marks only, a person's status is the earliest across their passes", () => {
  const s = fromSnapshot(snap(), { clientNow: Date.parse("2026-10-26T12:59:58Z") });
  assert.equal(s.serverOffset, 2000);
  assert.equal(s.marks.size, 3, "yesterday's mark isn't today's");
  const [a, b, d] = ["gA", "gB", "gD"].map((k) => s.byKey.get(k));
  assert.equal(deskStage(statusOf(s, a)), "on_the_way");
  assert.equal(deskStage(statusOf(s, b)), "checked_in");
  assert.equal(deskStage(statusOf(s, d)), "not_arrived");
  assert.equal(s.byKey.get("gD2").name, "Rae Speaker", "every pass of hers finds her");
  applyEvents(s, [{ seq: 11, kind: "mark", point: "arrived", key: "gD2", marks: [mark("gD2", "arrived", 1, "2026-10-26T13:01:00Z")] },
    { seq: 12, kind: "mark", point: "arrived", key: "gD", marks: [mark("gD", "arrived", 1, "2026-10-26T13:00:30Z")] }]);
  assert.equal(statusOf(s, d).arrived.at, "2026-10-26T13:00:30Z");
});

test("events: out of order and twice end the same; older revs never win", () => {
  const s = fromSnapshot(snap());
  const arrive = { seq: 21, kind: "mark", point: "arrived", key: "gF", station: "lobby", at: "2026-10-26T13:00:00Z", marks: [mark("gF", "arrived", 1, "2026-10-26T13:00:00Z")] };
  const undo = { seq: 22, kind: "undo", point: "arrived", key: "gF", marks: [mark("gF", "arrived", 2, null)] };
  applyEvents(s, [undo, arrive]);
  assert.equal(statusOf(s, s.byKey.get("gF")).arrived, null);
  applyEvents(s, [arrive, undo]);
  assert.equal(statusOf(s, s.byKey.get("gF")).arrived, null, "seen events are skipped");
  // The same row from another event with an older rev: ignored.
  applyEvents(s, [{ seq: 23, kind: "mark", key: "gF", marks: [mark("gF", "arrived", 1, "2026-10-26T13:00:00Z")] }]);
  assert.equal(statusOf(s, s.byKey.get("gF")).arrived, null);
  // The pass collected, desk notes, inclusions, queries.
  applyEvents(s, [
    { seq: 24, kind: "mark", point: "checked_in", key: "gA", marks: [mark("gA", "checked_in", 1, "2026-10-26T13:01:00Z")], pass: { key: "gA", collected: true, collectedAt: "2026-10-26T13:01:00Z" } },
    { seq: 25, kind: "note", key: "gC", note: "Collect at VIP desk", by: { name: "Sam" }, at: "2026-10-26T13:02:00Z" },
    { seq: 26, kind: "inclusions", key: "gA", extras: { cxo: true, lunch: true, gala: true, awards: true } },
    { seq: 27, kind: "query", query: { id: "q1", rev: 2, status: "done" } },
    { seq: 28, kind: "query", query: { id: "q1", rev: 1, status: "new" } },
  ]);
  assert.equal(s.byKey.get("gA").passCollected, true);
  assert.equal(s.notes.gC.text, "Collect at VIP desk");
  assert.equal(s.byKey.get("gA").extras.cxo, true);
  assert.equal(s.queries.get("q1").status, "done");
  assert.equal(applyEvents(s, [{ seq: 29, kind: "guest", key: "gA" }]).refresh, true);
  assert.equal(applyEvents(s, [{ seq: 30, kind: "mark", key: "gNEW", marks: [] }]).refresh, true, "someone this list doesn't have yet");
});

test("arrivals to announce: live ones still on the way up; after a reconnect only recent ones; never QR scans", () => {
  const s = fromSnapshot(snap());
  const now = Date.parse("2026-10-26T13:10:00Z");
  const ev = (seq, key, at, extra = {}) => ({ seq, kind: "mark", point: "arrived", key, station: "lobby", at, by: { name: "Val" }, marks: [mark(key, "arrived", 1, at)], ...extra });
  const live = applyEvents(s, [ev(31, "gF", "2026-10-26T13:09:50Z")], { live: true, now });
  assert.deepEqual(live.arrivals.map((a) => a.guest.name), ["Gus Guest"]);
  const caught = applyEvents(s, [ev(32, "gG", "2026-10-26T13:06:00Z"), ev(33, "gE", "2026-10-26T12:50:00Z")], { live: false, now });
  assert.deepEqual(caught.arrivals.map((a) => a.guest.name), ["Dot Discover"], "20 minutes ago isn't news any more");
  const scanned = applyEvents(s, [ev(34, "gC", "2026-10-26T13:09:59Z", { station: "scanner" })], { live: true, now });
  assert.equal(scanned.arrivals.length, 0);
});

test("the queue's taps show as pending; an undo in the queue hides what it undoes", () => {
  const s = fromSnapshot(snap());
  const f = s.byKey.get("gF");
  const tap = { clientId: "t1", kind: "mark", point: "checked_in", key: "gF", clientAt: "2026-10-26T13:05:00Z", station: "desk" };
  const st = statusOf(s, f, [tap]);
  assert.equal(st.checked_in.pending, true);
  assert.equal(st.arrived.pending, true, "a desk check-in means they arrived");
  assert.equal(statusOf(s, f, [tap, { clientId: "t2", kind: "undo", ref: "t1" }]).checked_in, null);
  // Undo of a tap the server already has (its mark carries the tap's ref).
  const a = s.byKey.get("gA");
  assert.ok(statusOf(s, a).arrived);
  assert.equal(statusOf(s, a, [{ clientId: "u1", kind: "undo", ref: "r-gA-arrived-1" }]).arrived, null);
  // A staff reset in the queue.
  const b = s.byKey.get("gB");
  assert.equal(statusOf(s, b, [{ clientId: "x1", kind: "reset", key: "gB", point: "arrived" }]).checked_in, null);
  const booth = s.booths[0];
  assert.equal(boothStatus(s, booth), null);
  assert.equal(boothStatus(s, booth, [{ clientId: "b1", kind: "mark", point: "booth", key: "b-A12", clientAt: "2026-10-26T13:00:00Z" }]).pending, true);
});

test("Day 2: has pass (collected on an earlier day)", () => {
  const s = fromSnapshot(snap());
  assert.equal(collectedBefore(s.byKey.get("gF"), s.today), true);
  assert.equal(collectedBefore(s.byKey.get("gA"), s.today), false);
  assert.equal(collectedBefore({ passCollected: true, passCollectedAt: "2026-10-26T15:00:00Z" }, s.today), false, "today isn't before");
});

test("lists: on the way up (newest first), checked in (latest first), today's taps at a point", () => {
  const s = fromSnapshot(snap());
  applyEvents(s, [{ seq: 40, kind: "mark", key: "gF", marks: [mark("gF", "arrived", 1, "2026-10-26T13:03:00Z")] }]);
  assert.deepEqual(onTheWay(s).map((x) => x.g.name), ["Gus Guest", "Priya Sharma"]);
  assert.deepEqual(checkedInToday(s).map((x) => x.g.name), ["Mo Media"]);
  assert.deepEqual(markedToday(s, "arrived").map((x) => x.g.name), ["Gus Guest", "Priya Sharma", "Mo Media"]);
});

test("counters: each person once in the colour groups (they add up), yes / no marks counted on their own", () => {
  const s = fromSnapshot(snap());
  const c = counters(s, "desk");
  assert.equal(c.totals.total, 7);
  assert.deepEqual(c.groups.map((x) => [x.group, x.total]), [["vip", 1], ["media", 1], ["speaker", 1], ["connect", 2], ["power", 1], ["other", 1]]);
  assert.equal(c.groups.reduce((n, x) => n + x.total, 0), c.totals.total, "groups add up to the total");
  assert.equal(c.totals.checkedIn, 1);
  assert.equal(c.totals.onTheWay, 1);
  assert.equal(c.totals.arrived, 2);
  assert.equal(c.totals.collected, 1);
  // Media = Yes on a Connect Pass is counted once, in Media, not in Connect.
  assert.deepEqual([c.groups.find((x) => x.group === "media").checkedIn, c.groups.find((x) => x.group === "connect").total], [1, 2]);
  // Yes / no: Media includes the VIP who is also media (she's in the VIP group).
  assert.deepEqual([c.marks.media.total, c.marks.media.checkedIn, c.marks.vip.total, c.marks.exhibitor.total], [2, 1, 1, 1]);
});

test("meal counters: admitted / entitled / RSVP'd for today's item, by colour", () => {
  const s = fromSnapshot(snap());
  applyEvents(s, [{ seq: 50, kind: "mark", key: "gD", marks: [mark("gD", "cxo", 1, "2026-10-26T12:00:00Z")] }]);
  const c = counters(s, "breakfast", { item: { key: "cxo_d1", extra: "cxo" } });
  assert.deepEqual([c.totals.admitted, c.totals.entitled, c.totals.rsvpd], [1, 2, 1]);
  assert.deepEqual(c.groups.find((x) => x.group === "speaker"), { group: "speaker", total: 1, collected: 0, checkedIn: 0, arrived: 0, onTheWay: 0, entitled: 1, rsvpd: 1, admitted: 1, done: 0 });
  const l = counters(s, "lunch", { item: { key: "lunch_d1", extra: "lunch" } });
  assert.deepEqual([l.totals.admitted, l.totals.entitled, l.totals.rsvpd], [0, 3, 2]);
});

test("media, exhibitor and AV counters cover their own guests", () => {
  const s = fromSnapshot(snap());
  s.byKey.get("gD").sessions = [{ day: "day1", start: "10:00", end: "10:30", title: "T", room: "R" }];
  const m = counters(s, "media");
  assert.equal(m.totals.total, 2);
  assert.equal(m.queriesOpen, 1);
  const e = counters(s, "exhibitor");
  assert.deepEqual([e.totals.total, e.booths.total, e.booths.setUp], [1, 1, 0]);
  assert.equal(counters(s, "av").totals.total, 1);
});
