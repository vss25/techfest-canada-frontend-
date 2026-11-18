import { test } from "node:test";
import assert from "node:assert/strict";
import { readinessFor, forEvent, isPastEvent } from "./readiness.js";

const NOW = new Date("2026-11-17T12:00:00Z");
const READY = { city: "Vancouver", theme: "Energy & Critical Infrastructure", tagline: "One line", citySkyline: "image-x", statusNote: "February 2027" };

test("required to go live: city, theme, description, city photo, date or date line", () => {
  const r = readinessFor({}, { ticketTypes: [], unsent: 1 }, NOW);
  assert.deepEqual([r.past, r.ready, r.total, r.done], [false, false, 5, 0]);
  assert.deepEqual(r.items.filter((i) => i.required).map((i) => i.key), ["city", "theme", "tagline", "photo", "dates"]);
});

test("those five are enough: no tickets, agenda, venue or unsent changes hold it back", () => {
  const r = readinessFor(READY, { ticketTypes: [], unsent: 3 }, NOW);
  assert.deepEqual([r.ready, r.pct], [true, 100]);
  for (const k of ["tickets", "agenda", "venue", "speakers", "partners", "about", "credit", "format", "audience", "sent"]) {
    assert.equal(r.items.find((i) => i.key === k).required, false, k);
  }
  assert.equal(r.items.find((i) => i.key === "sent").detail, "3 changes saved, not sent (won't be published)");
});

test("each required item missing blocks it; the day or the date line both count", () => {
  for (const k of ["city", "theme", "tagline", "citySkyline"]) assert.equal(readinessFor({ ...READY, [k]: "" }, {}, NOW).ready, false, k);
  assert.equal(readinessFor({ ...READY, statusNote: "" }, {}, NOW).ready, false);
  assert.equal(readinessFor({ ...READY, statusNote: "", startDate: "2027-02-03" }, {}, NOW).ready, true);
  assert.equal(readinessFor({ ...READY, citySkyline: "", citySkylineUrl: "https://cdn.sanity.io/x.jpg" }, {}, NOW).ready, true);
});

test("a past event (TTFC 2026) needs only its dates", () => {
  const ev = { startDate: "2026-10-26", endDate: "2026-10-27" };
  assert.equal(isPastEvent(ev, NOW), true);
  const r = readinessFor(ev, { unsent: 0 }, NOW);
  assert.deepEqual([r.past, r.ready, r.total], [true, true, 1]);
});

test("only content tagged with the event counts", () => {
  const list = [{ events: [{ _ref: "a" }] }, { events: [] }, {}, { events: [{ _ref: "b" }] }];
  assert.equal(forEvent(list, "a").length, 1);
});
