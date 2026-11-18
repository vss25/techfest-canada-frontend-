import { test } from "node:test";
import assert from "node:assert/strict";
import { readinessFor, forEvent, isPastEvent } from "./readiness.js";

const NOW = new Date("2026-11-17T12:00:00Z");

test("an empty upcoming event isn't ready: it needs a date and ticket types (and nothing unsent)", () => {
  const r = readinessFor({}, { ticketTypes: [], unsent: 1 }, NOW);
  assert.deepEqual([r.past, r.ready, r.total, r.done], [false, false, 3, 0]);
  assert.deepEqual(r.items.filter((i) => i.required).map((i) => i.key), ["dates", "tickets", "sent"]);
});

test("the bare minimum is enough: a date line (or day) and ticket types; the rest is recommended", () => {
  const r = readinessFor({ statusNote: "February 2027 · One day" }, { ticketTypes: [{ id: "t" }], unsent: 0 }, NOW);
  assert.deepEqual([r.ready, r.pct], [true, 100]);
  for (const k of ["theme", "tagline", "about", "photo", "format", "audience", "agenda", "venue", "speakers", "partners"]) {
    assert.equal(r.items.find((i) => i.key === k).required, false, k);
  }
});

test("no ticket types, an unknown ticket list, or unsent changes hold it back", () => {
  const ev = { startDate: "2027-02-03" };
  assert.equal(readinessFor(ev, { ticketTypes: [], unsent: 0 }, NOW).ready, false);
  assert.equal(readinessFor(ev, { ticketTypes: null, unsent: 0 }, NOW).items.find((i) => i.key === "tickets").detail, "Couldn't check");
  assert.equal(readinessFor(ev, { ticketTypes: [{}], unsent: 2 }, NOW).items.find((i) => i.key === "sent").detail, "2 changes saved, not sent");
});

test("a past event (TTFC 2026) needs only its dates and nothing unsent", () => {
  const ev = { startDate: "2026-10-26", endDate: "2026-10-27" };
  assert.equal(isPastEvent(ev, NOW), true);
  const r = readinessFor(ev, { unsent: 0 }, NOW);
  assert.deepEqual([r.past, r.ready, r.total], [true, true, 2]);
});

test("only content tagged with the event counts", () => {
  const list = [{ events: [{ _ref: "a" }] }, { events: [] }, {}, { events: [{ _ref: "b" }] }];
  assert.equal(forEvent(list, "a").length, 1);
});
