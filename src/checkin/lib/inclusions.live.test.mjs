/* node --test src/checkin/lib/inclusions.live.test.mjs (Oct 24 2026, the organiser: "The inclusion should update real
   time with pass types. If I update the inclusion on pass type as an admin, the sync should be real time."): an admin's
   change reaches an open desk as a live event carrying the guest's row with the SERVER's inclusions (the backend's
   test/checkin-desk-inclusions-db.test.js: through the real routes and the live stream, within seconds). Here, the
   device's side: the event changes the guest in place, so Floor 1's inclusion summary and the lunch door's answer
   ("On the list" / "Not on the list") follow at once, with nothing worked out on the device; an older event never
   undoes a newer one. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEvents, fromSnapshot } from "./state.js";
import { permit } from "./vocab.js";
import { MEAL_ITEMS } from "./stationTime.js";
import { noPassOf, passNameOf } from "./passColors.js";

const lunch = MEAL_ITEMS.lunch.day1;
const NONE = { cxo: false, lunch: false, gala: false, awards: false };
const cora = { key: "gc0ra000000000000000", keys: ["gc0ra000000000000000"], name: "Cora Connect", tier: "connect", passName: "Connect Pass", marks: {}, extras: { ...NONE } };
const snap = { cursor: 10, today: { date: "2026-10-26", eventDay: "day1", label: "Day 1" }, guests: [cora], marks: [], notes: {}, queries: [], booths: [], stations: [], windows: {}, stationStates: {} };
const answer = (s) => { const g = s.byKey.get(cora.key); return permit({ item: lunch, included: !noPassOf(g) && !!g.extras.lunch, noPass: noPassOf(g), passName: passNameOf(g) }); };

test("Lunch switched on for her pass (Admin › People): the inclusions event flips the door's answer and the summary", () => {
  const s = fromSnapshot(snap);
  assert.equal(answer(s).text, "Not on the list");
  assert.equal(answer(s).reason, "Connect Pass — lunch not included");
  // The event as the server sends it (services/checkinDeskLog.js deskInclusionsChanged → eventView).
  const r = applyEvents(s, [{ seq: 11, kind: "inclusions", key: cora.key, extras: { ...NONE, lunch: true }, guest: { ...cora, extras: { ...NONE, lunch: true } } }]);
  assert.equal(r.changed, true);
  assert.equal(r.refresh, false, "no reload needed: the row came with it");
  assert.equal(answer(s).text, "On the list");
  assert.deepEqual(s.byKey.get(cora.key).extras, { ...NONE, lunch: true });
  // An older event arriving late (out of order) never undoes it.
  applyEvents(s, [{ seq: 9, kind: "inclusions", key: cora.key, extras: { ...NONE }, guest: { ...cora } }]);
  assert.equal(answer(s).text, "On the list");
  // Switched off again: the next event says so.
  applyEvents(s, [{ seq: 12, kind: "inclusions", key: cora.key, extras: { ...NONE }, guest: { ...cora } }]);
  assert.equal(answer(s).text, "Not on the list");
});

test("her pass type changed (Connect → Power) or Media = Yes: the guest event's row brings the new pass and inclusions", () => {
  const s = fromSnapshot(snap);
  applyEvents(s, [{ seq: 13, kind: "guest", key: cora.key, guest: { ...cora, tier: "power", passName: "Power Pass", extras: { cxo: false, lunch: true, gala: true, awards: true } } }]);
  const g = s.byKey.get(cora.key);
  assert.equal(g.passName, "Power Pass");
  assert.equal(answer(s).text, "On the list");
  applyEvents(s, [{ seq: 14, kind: "guest", key: cora.key, guest: { ...g, marks: { media: true }, extras: { cxo: true, lunch: true, gala: true, awards: true } } }]);
  assert.deepEqual(s.byKey.get(cora.key).extras, { cxo: true, lunch: true, gala: true, awards: true });
  // A row-less guest event (the person couldn't be read): the device reads its list again.
  assert.equal(applyEvents(s, [{ seq: 15, kind: "guest", key: cora.key }]).refresh, true);
});
