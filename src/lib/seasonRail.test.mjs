// The season timeline under each hero. Run: node --test src/lib/seasonRail.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { seasonStops } from "./seasonRail.js";

const byCity = {
  van: { startDate: "2027-02-03" },
  mtl: { startDate: "2027-04-14" },
  tor: { startDate: "2027-10-26", endDate: "2027-10-27" },
};

test("Toronto 2026 is done, the first event that hasn't ended is next", () => {
  const s = seasonStops(byCity, "2026-11-25");
  assert.equal(s.length, 7);
  assert.deepEqual(s[0], { id: "past", name: "Toronto", when: "Oct 2026", state: "done" });
  assert.deepEqual(s[1], { id: "van", name: "Vancouver", when: "Feb 3 · Next", state: "next" });
  assert.deepEqual(s[2], { id: "mtl", name: "Montreal", when: "Apr 2027", state: "" });
  assert.equal(s[6].when, "Oct 2027 · National");
  assert.equal(s.filter((x) => x.state === "next").length, 1);
});

test("an event that has ended is done and the next one moves on", () => {
  const s = seasonStops(byCity, "2027-02-04");
  assert.equal(s[1].state, "done");
  assert.equal(s[1].when, "Feb 2027");
  assert.deepEqual(s[2], { id: "mtl", name: "Montreal", when: "Apr 14 · Next", state: "next" });
});

test("no records: the design's months, Vancouver next", () => {
  const s = seasonStops({}, "2026-11-25");
  assert.equal(s[1].when, "Feb 2027 · Next");
  assert.equal(s[3].when, "Jun 2027");
});
