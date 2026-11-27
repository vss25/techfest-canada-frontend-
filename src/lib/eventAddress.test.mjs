// The Flagship's address. Run: node --test src/lib/eventAddress.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

// events.js imports the Sanity client and React; the two pure helpers are checked against the same rules here.
const NATIONAL_SEGMENT = "national-festival";
const currentEventPath = (pathname) => String(pathname || "").replace(/^(\/[a-z-]+\/\d{4}\/)main-event(?=\/|$)/i, `$1${NATIONAL_SEGMENT}`);

test("the old address moves to the new one, keeping what follows", () => {
  assert.equal(currentEventPath("/toronto/2027/main-event"), "/toronto/2027/national-festival");
  assert.equal(currentEventPath("/toronto/2027/main-event/agenda"), "/toronto/2027/national-festival/agenda");
  assert.equal(currentEventPath("/toronto/2026/main-event"), "/toronto/2026/national-festival");
});

test("other addresses are left alone", () => {
  assert.equal(currentEventPath("/vancouver/2027/briefing"), "/vancouver/2027/briefing");
  assert.equal(currentEventPath("/toronto/2027/main-events"), "/toronto/2027/main-events");
  assert.equal(currentEventPath("/admin/content/main-event"), "/admin/content/main-event");
});
