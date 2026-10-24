/* node --test src/checkin/lib/desk.test.mjs (W13): a shared station iPad never keeps staff-only fields (emails,
   ticket IDs, person ids) in its cached guest list, and a staff sign-in left unused for 30 minutes locks. An arrival
   undone in the same batch of events is never announced. (Across sign-ins and reloads: desk.session.test.mjs,
   desk.boot.test.mjs.) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STAFF_IDLE_MS, cacheableSnapshot, identityOf, standingArrivals, staffIdle } from "./desk.js";
import { applyEvents, fromSnapshot } from "./state.js";

test("the cached list (localStorage) has no emails, ticket IDs or person ids; everything a station needs stays", () => {
  const snap = {
    staff: true, cursor: 5, today: { date: "2026-10-26" },
    guests: [{ key: "g1", keys: ["g1"], name: "Priya Sharma", company: "Northwind", tier: "power", email: "priya@example.com", ticketId: "pow100000001", ticketIds: ["pow100000001"], personId: "p1", extras: { cxo: true }, extrasView: { cxo: { included: true, ticketId: "pow100000001" } }, rsvp: { dietary: ["vegan"] } }],
    attendance: [{ day: "2026-10-26", point: "arrived", rows: 3 }],
  };
  const c = cacheableSnapshot(snap);
  const text = JSON.stringify(c);
  for (const s of ["priya@example.com", "pow100000001", '"personId"', '"email"', '"ticketIds"']) assert.ok(!text.includes(s), s);
  assert.deepEqual(Object.keys(c.guests[0]).sort(), ["company", "extras", "key", "keys", "name", "rsvp", "tier"]);
  assert.deepEqual(c.guests[0].rsvp, { dietary: ["vegan"] });
  assert.equal(snap.guests[0].email, "priya@example.com", "the live copy in memory keeps them (staff need them online)");
  assert.equal(c.cursor, 5);
});

test("a staff sign-in locks after 30 minutes unused; a volunteer's never does", () => {
  assert.equal(STAFF_IDLE_MS, 30 * 60 * 1000);
  assert.equal(staffIdle({ staff: true, lastUse: 0, now: STAFF_IDLE_MS - 1 }), false);
  assert.equal(staffIdle({ staff: true, lastUse: 0, now: STAFF_IDLE_MS }), true);
  assert.equal(staffIdle({ staff: false, lastUse: 0, now: 10 * STAFF_IDLE_MS }), false);
});

test("an arrival and its undo in one batch (an offline tap and its Undo, sent together) announce nothing", () => {
  const now = Date.now();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date(now));
  const at = new Date(now).toISOString();
  const s = fromSnapshot({ cursor: 1, today: { date: day, eventDay: "day1" }, guests: [{ key: "g1", keys: ["g1"], name: "Priya" }, { key: "g2", keys: ["g2"], name: "Sam", marks: { speaker: true } }], marks: [] });
  const arrived = (seq, key, ref) => ({ seq, kind: "mark", point: "arrived", key, at, station: "lobby", marks: [{ key, point: "arrived", day, at, rev: seq, ref }] });
  const undone = (seq, key) => ({ seq, kind: "undo", point: "arrived", key, at, station: "lobby", marks: [{ key, point: "arrived", day, at: null, rev: seq }] });
  const r = applyEvents(s, [arrived(2, "g1", "t1"), undone(3, "g1"), arrived(4, "g2", "t2"), arrived(5, "g2", "t3")], { live: true, now });
  assert.equal(r.arrivals.length, 3, "applyEvents saw three arrivals as they came");
  const out = standingArrivals(s, r.arrivals, []);
  assert.deepEqual(out.map((a) => [a.guest.key, a.stations]), [["g2", ["desk", "av"]]], "Priya's was undone; Sam once, for the desk and AV");
  // Undone on this device and not sent yet (an Undo in the queue): not announced either.
  const s2 = fromSnapshot({ cursor: 1, today: { date: day, eventDay: "day1" }, guests: [{ key: "g1", keys: ["g1"], name: "Priya" }], marks: [] });
  const r2 = applyEvents(s2, [arrived(2, "g1", "t9")], { live: true, now });
  assert.equal(standingArrivals(s2, r2.arrivals, [{ clientId: "u1", kind: "undo", target: "t9", ref: "t9", key: "g1", state: "pending" }]).length, 0);
  assert.equal(standingArrivals(s2, r2.arrivals, []).length, 1);
});

test("who a tap is recorded as: the sign-in's own identity (an older version's sign-in: its user)", () => {
  assert.deepEqual(identityOf({ identity: { id: 7, name: "Val" }, user: { id: 9, name: "Someone else" } }), { id: "7", name: "Val" });
  assert.deepEqual(identityOf({ user: { id: "u1", name: "Val" } }), { id: "u1", name: "Val" });
  assert.equal(identityOf(null), null);
});
