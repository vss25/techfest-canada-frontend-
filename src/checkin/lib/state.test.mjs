/* node --test src/checkin/lib/state.test.mjs: a snapshot then events (in any order, twice), a person's status across
   their passes, the queue's taps on top (and an undo hiding them), lobby arrivals to announce (live, and recent ones
   after a reconnect), Day 2's "has pass", and the counters: each person once in the colour groups (the groups add up
   to the total), Media / VIP / Exhibitor as yes / no counts, and the meal station's admitted / entitled / RSVP'd. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEvents, boothStatus, checkedInToday, collectedBefore, counters, deskStage, fromSnapshot, heldInclusions, markedToday, onTheWay, rollDay, statusOf, toSnapshot, unknownCounts, unknownsOf } from "./state.js";

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

/* ---------- W5: a new day on the device (offline at the start of Day 2) ---------- */

const WINDOWS = {
  lobby: { day1: { open: "07:00", close: "23:00", source: "default" }, day2: { open: "07:00", close: "23:00", source: "default" } },
  desk: { day1: { open: "07:00", close: "23:00", source: "default" }, day2: { open: "07:00", close: "23:00", source: "default" } },
  lunch: { day1: { open: "12:05", close: "13:50", source: "fallback", session: { start: "12:35", end: "13:20", title: "Networking Lunch" } }, day2: { open: "11:30", close: "13:15", source: "fallback", session: { start: "12:00", end: "12:45", title: "Lunch" } } },
};

test("W5: a cached Day 1 list opened offline on Day 2: Day 1's marks go, returning guests can be marked; the pass collected stays", () => {
  const snapshot = { ...snap(), windows: WINDOWS, stations: [{ key: "lobby" }, { key: "desk" }, { key: "lunch" }],
    stationStates: { lobby: { open: false, code: "closed", text: "Day 1 · Lobby · closed" } } };
  const s = fromSnapshot(snapshot);
  const a = s.byKey.get("gA");
  const b = s.byKey.get("gB");
  b.passCollected = true;
  b.passCollectedAt = "2026-10-26T12:30:00Z";
  assert.ok(statusOf(s, a).arrived, "arrived on Day 1");
  // Tue Oct 27, 7:30 AM Toronto, no connection.
  const tue = Date.parse("2026-10-27T11:30:00Z");
  assert.equal(rollDay(s, tue), true);
  assert.equal(s.today.date, "2026-10-27");
  assert.equal(s.today.eventDay, "day2");
  assert.equal(statusOf(s, a).arrived, null, "Arrived can be tapped again");
  assert.equal(deskStage(statusOf(s, b)), "not_arrived", "Checked in can be tapped again");
  assert.equal(collectedBefore(b, s.today), true, "Has pass (collected Mon)");
  assert.equal(s.stationStates.lobby.open, true, "the lobby's Day 2 hours, worked out on the device");
  assert.equal(s.stationStates.lunch.code, "later");
  assert.match(s.stationStates.lunch.text, /^Day 2 · Networking Luncheon · opens at 11:30 AM/);
  assert.equal(s.stationStates.lunch.item.key, "lunch_d2");
  // Day 1 marks arriving late are not today's; the same day again changes nothing.
  applyEvents(s, [{ seq: 90, kind: "mark", key: "gF", marks: [mark("gF", "arrived", 3, "2026-10-26T20:00:00Z")] }]);
  assert.equal(statusOf(s, s.byKey.get("gF")).arrived, null);
  assert.equal(rollDay(s, tue + 60000), false);
  assert.equal(rollDay(s, Date.parse("2026-10-26T20:00:00Z")), false, "never back to an earlier day");
});

test("W5: a tap queued offline yesterday isn't today's mark; a mark held for another day never counts", () => {
  const s = fromSnapshot(snap());
  const f = s.byKey.get("gF");
  const yesterday = { clientId: "t-y", kind: "mark", point: "arrived", key: "gF", clientAt: "2026-10-25T21:00:00Z", station: "lobby" };
  assert.equal(statusOf(s, f, [yesterday]).arrived, null);
  s.marks.set("gF|lunch", { ...mark("gF", "lunch", 1, "2026-10-25T16:00:00Z"), day: "2026-10-25" });
  assert.equal(statusOf(s, f).lunch, null);
});

test("C3: a queued tap shows who made it (not whoever is signed in now)", () => {
  const s = fromSnapshot(snap());
  const t = { clientId: "t1", kind: "mark", point: "arrived", key: "gF", clientAt: "2026-10-26T13:05:00Z", station: "lobby", queuedBy: { id: "u9", name: "Vic Volunteer" } };
  assert.equal(statusOf(s, s.byKey.get("gF"), [t]).arrived.by.name, "Vic Volunteer");
});

/* ---------- W16: pass / note / inclusions only change for newer events ---------- */

test("W16: pass, note and inclusions events delivered out of order end on the newest; older than the snapshot never apply", () => {
  const s = fromSnapshot(snap()); // cursor 10
  const g = s.byKey.get("gA");
  const on = { seq: 50, kind: "inclusions", key: "gA", extras: { cxo: true, lunch: true, gala: true, awards: true } };
  const off = { seq: 51, kind: "inclusions", key: "gA", extras: { cxo: false, lunch: true, gala: true, awards: true } };
  applyEvents(s, [off]);
  applyEvents(s, [on]);
  assert.equal(g.extras.cxo, false, "51 is newer than 50");
  const collected = { seq: 60, kind: "mark", key: "gA", marks: [], pass: { key: "gA", collected: true, collectedAt: "2026-10-26T13:00:00Z" } };
  const given = { seq: 61, kind: "undo", key: "gA", marks: [], pass: { key: "gA", collected: false } };
  applyEvents(s, [given]);
  applyEvents(s, [collected]);
  assert.equal(g.passCollected, false);
  applyEvents(s, [{ seq: 71, kind: "note", key: "gA", note: "", at: "2026-10-26T13:02:00Z" }]);
  applyEvents(s, [{ seq: 70, kind: "note", key: "gA", note: "Old note", at: "2026-10-26T13:01:00Z" }]);
  assert.equal(s.notes.gA, undefined);
  // An event older than the snapshot's cursor (a late tail) doesn't undo what the snapshot says.
  applyEvents(s, [{ seq: 9, kind: "inclusions", key: "gB", extras: { cxo: false, lunch: false, gala: false, awards: false } }]);
  assert.equal(s.byKey.get("gB").extras.cxo, true);
});

test("W16: after staff change inclusions here, older events still on their way don't undo it", () => {
  const s = fromSnapshot(snap());
  applyEvents(s, [{ seq: 30, kind: "mark", key: "gF", marks: [] }]);
  const g = s.byKey.get("gA");
  g.extras = { ...g.extras, cxo: true };
  heldInclusions(s, "gA");
  applyEvents(s, [{ seq: 25, kind: "inclusions", key: "gA", extras: { cxo: false, lunch: true, gala: true, awards: true } }]);
  assert.equal(g.extras.cxo, true);
  applyEvents(s, [{ seq: 31, kind: "inclusions", key: "gA", extras: { cxo: false, lunch: true, gala: true, awards: true } }]);
  assert.equal(g.extras.cxo, false, "a newer change does");
});

test("W17: the checked-in list can be counted in full (the screen draws the latest 80)", () => {
  const s = fromSnapshot(snap());
  const many = Array.from({ length: 120 }, (_, i) => ({ key: `gm${i}`, keys: [`gm${i}`], name: `Guest ${i}`, tier: "connect", marks: {}, extras: {}, rsvp: { options: [] } }));
  s.guests = [...s.guests, ...many];
  for (const g of many) { s.byKey.set(g.key, g); s.marks.set(`${g.key}|checked_in`, mark(g.key, "checked_in", 1, "2026-10-26T13:00:00Z")); }
  assert.equal(checkedInToday(s, [], Infinity).length, 121);
  assert.equal(checkedInToday(s, [], 80).length, 80);
});

/* ---------- C7 ISSUE PASS, C8 NO DETAILS FOUND ---------- */

const noPass = (key, name, m = {}) => ({ ...guest(key, name, null, m), tier: null, passName: null, noPass: true });

test("C7: on the list with no pass on file: their own counter line, never a pass type's; groups + ISSUE PASS = total", () => {
  const sn = snap();
  sn.guests = [...sn.guests, noPass("pS", "Nora Nopass", { speaker: true }), noPass("pE", "Xan Exhib", { exhibitor: true })];
  sn.marks = [...sn.marks, mark("pS", "arrived", 1, "2026-10-26T12:59:00Z")];
  const s = fromSnapshot(sn);
  const c = counters(s, "lobby");
  assert.deepEqual([c.issuePass.total, c.issuePass.arrived], [2, 1]);
  assert.equal(c.groups.find((x) => x.group === "speaker").total, 1, "the no-pass speaker isn't in Speaker");
  assert.equal(c.groups.reduce((n, x) => n + x.total, 0) + c.issuePass.total, c.totals.total);
  assert.equal(c.marks.exhibitor.total, 2, "Exhibitor (all) still counts them");
});

const unk = (seq, clientId, extra = {}) => ({ seq, type: "unknown_arrival", key: `u:${clientId}`, name: "Jo Bloggs", company: "Acme", note: "says registered", at: "2026-10-26T13:01:00Z", byName: "Val", ...extra });

test("C8: an unknown_arrival event opens a NO DETAILS FOUND card (announced at the desk); done / link / undo close it", () => {
  const s = fromSnapshot(snap());
  const r = applyEvents(s, [unk(60, "c1")], { live: true, now: Date.parse("2026-10-26T13:01:05Z") });
  assert.equal(r.arrivals.length, 1);
  assert.equal(r.arrivals[0].unknown.key, "u:c1");
  assert.deepEqual(unknownsOf(s, [], { open: true }).map((u) => [u.key, u.name, u.company, u.note, u.byName]), [["u:c1", "Jo Bloggs", "Acme", "says registered", "Val"]]);
  applyEvents(s, [{ seq: 61, type: "unknown_done", key: "u:c1", outcome: "sent_to_help", at: "2026-10-26T13:03:00Z", byName: "Sam" }]);
  assert.equal(unknownsOf(s, [], { open: true }).length, 0);
  assert.equal(unknownsOf(s)[0].status, "sent_to_help");
  // Staff found them: the guest's arrived mark comes with the event; the card goes.
  applyEvents(s, [unk(62, "c2", { name: "Gus G" })]);
  applyEvents(s, [{ seq: 63, kind: "unknown_link", key: "u:c2", guestKey: "gF", marks: [mark("gF", "arrived", 1, "2026-10-26T13:04:00Z")] }]);
  assert.equal(unknownsOf(s).find((u) => u.key === "u:c2").status, "linked");
  assert.ok(statusOf(s, s.byKey.get("gF")).arrived);
  // Undone in the lobby.
  applyEvents(s, [unk(64, "c3")]);
  applyEvents(s, [{ seq: 65, kind: "undo", key: "u:c3", target: "c3" }]);
  assert.equal(unknownsOf(s).some((u) => u.key === "u:c3"), false);
  assert.deepEqual(unknownCounts(s), { total: 2, open: 0 }, "two today, none waiting (the undone one doesn't count)");
});

test("C8: out of order or twice ends the same; a card from another day or older than the snapshot never opens", () => {
  const s = fromSnapshot(snap()); // cursor 10
  applyEvents(s, [{ seq: 71, type: "unknown_done", key: "u:c9", outcome: "left" }]);
  applyEvents(s, [unk(70, "c9")]);
  assert.equal(unknownsOf(s, [], { open: true }).length, 0, "the close came first: stays closed");
  applyEvents(s, [unk(72, "c8"), unk(72, "c8")]);
  assert.equal(unknownsOf(s).filter((u) => u.key === "u:c8").length, 1);
  applyEvents(s, [unk(9, "c7")]);
  assert.equal(unknownsOf(s).some((u) => u.key === "u:c7"), false, "older than the snapshot's cursor");
  applyEvents(s, [unk(74, "c5", { at: "2026-10-26T23:59:00-04:00" })]);
  applyEvents(s, [{ seq: 75, type: "unknown_done", key: "u:c5", outcome: "left", at: "2026-10-27T00:01:00-04:00" }]);
  assert.equal(unknownsOf(s).find((u) => u.key === "u:c5").status, "left", "closed just after midnight: still closes it");
  applyEvents(s, [unk(73, "c6", { at: "2026-10-25T13:00:00Z" })]);
  assert.equal(unknownsOf(s).some((u) => u.key === "u:c6"), false, "yesterday's");
  // The snapshot's own list of today's cards; a new day clears them.
  const s2 = fromSnapshot({ ...snap(), unknowns: [{ key: "u:s1", name: "From Snap", at: "2026-10-26T12:00:00Z", status: "open" }] });
  assert.equal(unknownsOf(s2, [], { open: true })[0].name, "From Snap");
  rollDay(s2, Date.parse("2026-10-27T12:00:00Z"));
  assert.equal(unknownsOf(s2).length, 0);
});

test("C8: the queue on top: a lobby tap not answered yet shows at once; a queued close / link / undo hides the card", () => {
  const s = fromSnapshot(snap());
  const tap = { clientId: "q1", kind: "unknown_arrival", name: "Jo Bloggs", company: "", note: "", station: "lobby", clientAt: "2026-10-26T13:05:00Z", queuedBy: { id: "v1", name: "Val" } };
  assert.deepEqual(unknownsOf(s, [tap], { open: true }).map((u) => [u.key, u.pending, u.byName]), [["u:q1", true, "Val"]]);
  assert.equal(unknownsOf(s, [tap, { clientId: "q2", kind: "undo", target: "q1" }]).length, 0);
  applyEvents(s, [unk(80, "c1")]);
  assert.equal(unknownsOf(s, [{ clientId: "q3", kind: "unknown_done", target: "u:c1", outcome: "left" }], { open: true }).length, 0);
  const link = { clientId: "q4", kind: "unknown_link", target: "u:c1", guestKey: "gF", clientAt: "2026-10-26T13:06:00Z", station: "desk" };
  assert.equal(unknownsOf(s, [link], { open: true }).length, 0);
  assert.equal(statusOf(s, s.byKey.get("gF"), [link]).arrived.pending, true, "the found guest shows Arrived at once");
  assert.equal(counters(s, "desk", { pending: [tap] }).unknown.open, 2);
});

test("S4: the state written back as a snapshot reads back the same: what events changed since the load included", () => {
  const s = fromSnapshot(snap(), { clientNow: Date.parse("2026-10-26T13:00:00Z") });
  applyEvents(s, [
    { seq: 11, kind: "mark", point: "checked_in", key: "gA", marks: [mark("gA", "checked_in", 11, "2026-10-26T13:01:00Z")], pass: { key: "gA", collected: true, collectedAt: "2026-10-26T13:01:00Z" } },
    { seq: 12, kind: "note", key: "gE", note: "Booth power strip", at: "2026-10-26T13:02:00Z", by: { name: "Sam" } },
    { seq: 13, kind: "inclusions", key: "gG", extras: { cxo: true, lunch: false, gala: false, awards: false } },
    { seq: 14, kind: "unknown_arrival", clientId: "z1", key: "u:z1", name: "Walk In", at: "2026-10-26T13:03:00Z", day: DAY, byName: "Val" },
  ], { live: true, now: Date.parse("2026-10-26T13:03:00Z") });
  s.cursor = 14;
  const back = fromSnapshot(JSON.parse(JSON.stringify(toSnapshot(s))), { clientNow: Date.now() });
  assert.equal(back.cursor, 14);
  assert.equal(back.byKey.get("gA").passCollectedAt, "2026-10-26T13:01:00Z");
  assert.ok(statusOf(back, back.byKey.get("gA")).checked_in);
  assert.equal(back.notes.gE.text, "Booth power strip");
  assert.equal(back.byKey.get("gG").extras.cxo, true);
  assert.deepEqual(unknownsOf(back).map((u) => [u.key, u.status]), [["u:z1", "open"]]);
  assert.equal(back.byKey.get("gD").name, "Rae Speaker", "a guest under two keys");
  assert.equal(back.byKey.get("gD2"), back.byKey.get("gD"));
  // The same events again (a reconnect from that cursor, or from before it) change nothing.
  const before = JSON.stringify(toSnapshot(back));
  applyEvents(back, [{ seq: 12, kind: "note", key: "gE", note: "Booth power strip", at: "2026-10-26T13:02:00Z", by: { name: "Sam" } }], { live: false });
  assert.equal(JSON.stringify(toSnapshot(back)), before);
});

test("S6: a guest / inclusions event's row goes in place (a new main pass moves the key); newer pass / inclusions stay", () => {
  const s = fromSnapshot(snap(), { clientNow: Date.now() });
  s.notes.gF = { text: "VIP desk", by: "Sam", at: "x" };
  // Collected at seq 12; the row of a guest event numbered 11 (an earlier change, delivered late) keeps the newer state.
  applyEvents(s, [{ seq: 12, kind: "mark", point: "checked_in", key: "gF", marks: [mark("gF", "checked_in", 12, "2026-10-26T13:05:00Z")], pass: { key: "gF", collected: true, collectedAt: "2026-10-26T13:05:00Z" } }]);
  const r1 = applyEvents(s, [{ seq: 11, kind: "guest", key: "gF", guest: { ...guest("gF", "Gus Guest-Smith", "connect"), passCollected: false, passCollectedAt: null } }]);
  assert.equal(r1.refresh, false, "a row: no reload");
  assert.equal(s.byKey.get("gF").name, "Gus Guest-Smith");
  assert.equal(s.byKey.get("gF").passCollectedAt, "2026-10-26T13:05:00Z", "the newer pass collected stays");
  // Given a Power Pass that becomes the main one: the row's key is new, the old key is in its keys; one guest, same place.
  const idx = s.guests.findIndex((g) => g.key === "gF");
  const r2 = applyEvents(s, [{ seq: 13, kind: "guest", key: "gF9", guest: guest("gF9", "Gus Guest-Smith", "power", {}, { keys: ["gF9", "gF"] }) }]);
  assert.equal(r2.refresh, false);
  assert.equal(s.guests.filter((g) => g.name === "Gus Guest-Smith").length, 1);
  assert.equal(s.guests.findIndex((g) => g.key === "gF9"), idx, "in its place");
  assert.equal(s.byKey.get("gF").key, "gF9");
  assert.ok(statusOf(s, s.byKey.get("gF9")).checked_in, "marks under the old key still count");
  assert.equal(s.notes.gF9?.text, "VIP desk", "the desk note moves with them");
  // A brand-new guest (none of its keys known): added, and the list is read again (an ISSUE PASS row it replaces goes).
  const r3 = applyEvents(s, [{ seq: 14, kind: "guest", key: "gN", guest: guest("gN", "New Person", "connect") }]);
  assert.equal(r3.refresh, true);
  assert.ok(s.byKey.get("gN"));
  // Inclusions with the guest's row: guest-level extras; one older than a change made here never undoes it.
  heldInclusions(s, "gA", 20);
  applyEvents(s, [{ seq: 19, kind: "inclusions", key: "gA", extras: { cxo: true }, guest: { ...guest("gA", "Priya Sharma", "power"), extras: { cxo: true, lunch: false, gala: false, awards: false } } }]);
  assert.equal(s.byKey.get("gA").extras.lunch, true, "held: the older event's inclusions don't apply");
  applyEvents(s, [{ seq: 21, kind: "inclusions", key: "gA", extras: { cxo: true }, guest: { ...guest("gA", "Priya Sharma", "power"), extras: { cxo: true, lunch: false, gala: false, awards: false } } }]);
  assert.deepEqual(s.byKey.get("gA").extras, { cxo: true, lunch: false, gala: false, awards: false });
  // A guest event without a row (an older server): reload, as before.
  assert.equal(applyEvents(s, [{ seq: 22, kind: "guest", key: "gB" }]).refresh, true);
});
