import { test } from "node:test";
import assert from "node:assert/strict";
import { readinessFor, forEvent, isPastEvent } from "./readiness.js";

const NOW = new Date("2026-11-17T12:00:00Z");
const full = { startDate: "2027-02-03", theme: "Energy", tagline: "One line", description: "About", citySkyline: "image-x", photoCredit: "Photo: X", formatLine: "One day", audience: "150 delegates", venueName: "" };

test("an empty upcoming event is 0%, with every required item listed and Publish locked", () => {
  const r = readinessFor({}, { ticketTypes: [], unsent: 1 }, NOW);
  assert.equal(r.past, false);
  assert.equal(r.ready, false);
  // "Photo credit" is satisfied while there's no photo: only the rest are missing.
  assert.equal(r.done, 1);
  assert.equal(r.pct, Math.round((1 / r.total) * 100));
});

test("all required items done = 100% and ready; nice-to-haves don't hold it back", () => {
  const r = readinessFor(full, { sessions: [{ title: "S" }], ticketTypes: [{ id: "t" }], unsent: 0 }, NOW);
  assert.deepEqual([r.pct, r.ready], [100, true]);
  assert.equal(r.items.find((i) => i.key === "venue").ok, false);
  assert.equal(r.items.find((i) => i.key === "speakers").required, false);
});

test("a photo without its credit, no tickets, or unsent changes each block it", () => {
  const base = { sessions: [{ title: "S" }], ticketTypes: [{ id: "t" }], unsent: 0 };
  assert.equal(readinessFor({ ...full, photoCredit: "" }, base, NOW).ready, false);
  assert.equal(readinessFor(full, { ...base, ticketTypes: [] }, NOW).ready, false);
  assert.equal(readinessFor(full, { ...base, ticketTypes: null }, NOW).items.find((i) => i.key === "tickets").detail, "Couldn't check");
  assert.equal(readinessFor(full, { ...base, unsent: 2 }, NOW).items.find((i) => i.key === "sent").detail, "2 changes saved, not sent");
});

test("a past event (TTFC 2026) gets the archive checklist", () => {
  const ev = { startDate: "2026-10-26", endDate: "2026-10-27", venueName: "Westin", description: "About" };
  assert.equal(isPastEvent(ev, NOW), true);
  const r = readinessFor(ev, { sessions: [{}], speakers: [{ imageUrl: "x" }, {}], partners: [{ logoUrl: "y" }], unsent: 0 }, NOW);
  assert.deepEqual([r.past, r.ready, r.pct], [true, true, 100]);
  assert.equal(r.items.find((i) => i.key === "speakers").detail, "1 of 2 speakers");
});

test("only content tagged with the event counts", () => {
  const list = [{ events: [{ _ref: "a" }] }, { events: [] }, {}, { events: [{ _ref: "b" }] }];
  assert.equal(forEvent(list, "a").length, 1);
});
