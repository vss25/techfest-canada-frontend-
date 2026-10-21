// Free to meet: merged ranges, "All day" and places, same cases as the iOS and Android tests.
// Run: node --test src/app/lib/availability.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  availabilityDetail, availabilitySummary, blockLabel, cleanSlots, cleanSpots, dayRanges, rangeLabel, setPlaces, toggleAllDay, toggleBlock,
} from "./availability.js";

const day = (d, hours) => hours.map((h) => `d${d}-${String(h).padStart(2, "0")}`);
const lines = (slots, spots, spot) => availabilityDetail(slots, spots, spot).map((d) => [d.label, d.lines.map((l) => l.text)]);

test("range labels: the meridiem once when both ends share it", () => {
  assert.equal(rangeLabel(8, 10), "8–10 AM");
  assert.equal(rangeLabel(10, 12), "10 AM–12 PM");
  assert.equal(rangeLabel(12, 14), "12–2 PM");
  assert.equal(rangeLabel(12, 20), "12–8 PM");
  assert.equal(rangeLabel(8, 14), "8 AM–2 PM");
  assert.equal(rangeLabel(10, 16), "10 AM–4 PM");
  assert.equal(rangeLabel(14, 18), "2–6 PM");
  assert.equal(rangeLabel(18, 20), "6–8 PM");
  assert.deepEqual(day(1, [8, 10, 12, 14, 16, 18]).map(blockLabel), ["8–10 AM", "10 AM–12 PM", "12–2 PM", "2–4 PM", "4–6 PM", "6–8 PM"]);
});

test("touching blocks merge; a gap splits", () => {
  assert.equal(availabilitySummary(day(2, [12, 14, 16, 18])), "Oct 27: 12–8 PM");
  assert.equal(availabilitySummary(day(1, [8, 10, 12])), "Oct 26: 8 AM–2 PM");
  assert.equal(availabilitySummary(day(1, [8, 12])), "Oct 26: 8–10 AM, 12–2 PM");
  assert.equal(availabilitySummary(day(1, [10, 12, 14])), "Oct 26: 10 AM–4 PM");
  // Places never split the one-liner; a gap does.
  assert.equal(availabilitySummary(day(1, [12, 14, 18]), { "d1-12": "Coffee bar", "d1-14": "Expo floor" }, ""), "Oct 26: 12–4 PM, 6–8 PM");
  // Order doesn't matter.
  assert.equal(availabilitySummary(["d2-18", "d2-12", "d2-16", "d2-14"]), "Oct 27: 12–8 PM");
});

test("a whole day at one place is All day", () => {
  const all = day(1, [8, 10, 12, 14, 16, 18]);
  assert.equal(availabilitySummary([...all, ...day(2, [12, 14, 16, 18])]), "Oct 26: All day · Oct 27: 12–8 PM");
  assert.deepEqual(lines(all, {}, "Harbour Ballroom foyer"), [["Mon, Oct 26", ["All day · Harbour Ballroom foyer"]]]);
  assert.deepEqual(lines(all, {}, ""), [["Mon, Oct 26", ["All day"]]]);
  // Two places in the day: the one-liner is still "All day" (times only); the detail splits by place.
  const split = { "d1-16": "Expo floor", "d1-18": "Expo floor" };
  assert.equal(availabilitySummary(all, split, "Harbour Ballroom foyer"), "Oct 26: All day");
  assert.deepEqual(lines(all, split, "Harbour Ballroom foyer"), [["Mon, Oct 26", ["8 AM–4 PM · Harbour Ballroom foyer", "4–8 PM · Expo floor"]]]);
});

test("blocks only merge at the same place; the default fills the gaps", () => {
  const slots = day(2, [12, 14, 16, 18]);
  const spots = { "d2-16": "Expo floor", "d2-18": "Expo floor" };
  assert.deepEqual(lines(slots, spots, "Harbour Ballroom foyer"), [["Tue, Oct 27", ["12–4 PM · Harbour Ballroom foyer", "4–8 PM · Expo floor"]]]);
  // The one-liner merges by time only, without places.
  assert.equal(availabilitySummary(slots, spots, "Harbour Ballroom foyer"), "Oct 27: 12–8 PM");
  // An own place equal to the default is the same place.
  assert.deepEqual(lines(day(1, [12, 14]), { "d1-12": "Expo floor" }, "Expo floor"), [["Mon, Oct 26", ["12–4 PM · Expo floor"]]]);
  // No place at all: just the time.
  assert.deepEqual(lines(day(1, [12, 14]), {}, ""), [["Mon, Oct 26", ["12–4 PM"]]]);
  // A place only on some blocks.
  assert.deepEqual(lines(day(1, [12, 14]), { "d1-14": "Coffee bar" }, ""), [["Mon, Oct 26", ["12–2 PM", "2–4 PM · Coffee bar"]]]);
});

test("nothing picked", () => {
  assert.equal(availabilitySummary([]), "");
  assert.equal(availabilitySummary(undefined), "");
  assert.deepEqual(availabilityDetail([], {}, "Expo floor"), []);
  assert.deepEqual(dayRanges(1, ["d2-12"]), []);
});

test("what's saved: known blocks in order, places for picked blocks only", () => {
  assert.deepEqual(cleanSlots(["d2-12", "d1-08", "d1-08", "d3-10", "d1-09", "x"]), ["d1-08", "d2-12"]);
  assert.deepEqual(cleanSpots({ "d1-08": "  Expo floor ", "d1-10": "Coffee bar", "d1-12": "   ", "d9-99": "x", "d2-12": "a".repeat(80) }, ["d1-08", "d1-12", "d2-12"]),
    { "d1-08": "Expo floor", "d2-12": "a".repeat(60) });
  assert.deepEqual(cleanSpots(null, ["d1-08"]), {});
});

test("editing: blocks, All day, places", () => {
  assert.deepEqual(toggleBlock(["d1-12"], "d1-08"), ["d1-08", "d1-12"]);
  assert.deepEqual(toggleBlock(["d1-08", "d1-12"], "d1-08"), ["d1-12"]);
  const all = toggleAllDay(["d2-12"], 1);
  assert.deepEqual(all, ["d1-08", "d1-10", "d1-12", "d1-14", "d1-16", "d1-18", "d2-12"]);
  assert.deepEqual(toggleAllDay(all, 1), ["d2-12"]);
  assert.deepEqual(setPlaces({ "d1-08": "Hotel lobby" }, ["d1-10", "d1-12"], " Expo floor "), { "d1-08": "Hotel lobby", "d1-10": "Expo floor", "d1-12": "Expo floor" });
  assert.deepEqual(setPlaces({ "d1-08": "Hotel lobby", "d1-10": "Expo floor" }, ["d1-10"], ""), { "d1-08": "Hotel lobby" });
});
