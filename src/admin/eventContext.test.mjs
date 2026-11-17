// The event switcher's rules (approved admin design, board 17): tags, date lines, order, which event to start on.
// Run: node --test src/admin/eventContext.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { eventTag, eventWhen, pickStart, splitEvents } from "./eventContext.js";

const NOW = Date.parse("2026-11-17T17:00:00Z");
const van = { _id: "van", name: "Vancouver Briefing 2027", year: 2027, startDate: "2027-02-03", endDate: "2027-02-03" };
const mtl = { _id: "mtl", name: "Montreal Briefing 2027", year: 2027, statusNote: "April 2027 · One day" };
const tor26 = { _id: "tor26", name: "The Tech Festival Canada 2026", year: 2026, startDate: "2026-10-26", endDate: "2026-10-27" };

test("tags: on sale from the server's status, coming soon otherwise, read only 7+ days after, draft before publishing", () => {
  assert.equal(eventTag(van, { status: "live" }, NOW).label, "On sale");
  assert.equal(eventTag(van, { status: "announced" }, NOW).label, "Coming soon");
  assert.equal(eventTag(mtl, null, NOW).label, "Coming soon");
  assert.equal(eventTag(tor26, null, NOW).label, "Read only");
  assert.equal(eventTag({ ...van, unpublished: true }, null, NOW).label, "Draft");
  assert.equal(eventTag(tor26, null, Date.parse("2026-10-30T12:00:00Z")).label, "Just ended");
});

test("date lines: the dates, the month while the day isn't fixed, and how long ago a past event ended", () => {
  assert.equal(eventWhen(van, NOW), "Feb 3, 2027");
  assert.equal(eventWhen(mtl, NOW), "April 2027");
  assert.equal(eventWhen(tor26, NOW), "Oct 26, 2026 – Oct 27, 2026 · ended 21 days ago");
});

test("order and start: upcoming first by date, past apart; start on the remembered event, else the next one", () => {
  const { upcoming, past } = splitEvents([mtl, tor26, van], NOW);
  assert.deepEqual(upcoming.map((e) => e._id), ["van", "mtl"]);
  assert.deepEqual(past.map((e) => e._id), ["tor26"]);
  assert.equal(pickStart([mtl, tor26, van], "", NOW)._id, "van");
  assert.equal(pickStart([mtl, tor26, van], "mtl", NOW)._id, "mtl");
  assert.equal(pickStart([mtl, tor26, van], "gone", NOW)._id, "van");
  assert.equal(pickStart([], "", NOW), null);
});
