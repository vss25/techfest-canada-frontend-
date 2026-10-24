/* node --test src/checkin/lib/desk.test.mjs (W13): a shared station iPad never keeps staff-only fields (emails,
   ticket IDs, person ids) in its cached guest list, and a staff sign-in left unused for 30 minutes locks. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STAFF_IDLE_MS, cacheableSnapshot, staffIdle } from "./desk.js";

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
