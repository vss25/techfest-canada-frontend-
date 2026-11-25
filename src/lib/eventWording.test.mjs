// The website's names for its events. Run: node --test src/lib/eventWording.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { eventWording } from "./eventWording.js";

test("Briefing becomes City Briefing, Main Event becomes Flagship Event", () => {
  assert.equal(eventWording("Vancouver Briefing 2027"), "Vancouver City Briefing 2027");
  assert.equal(eventWording("Toronto 2026 · Main Event"), "Toronto 2026 · Flagship Event");
  assert.equal(eventWording("Toronto Main Event 2027"), "Toronto Flagship Event 2027");
  assert.equal(eventWording("Five Briefings, then the Main Event"), "Five City Briefings, then the Flagship Event");
});

test("already in the new wording, lower case prose and empty values are left alone", () => {
  assert.equal(eventWording("Vancouver City Briefing 2027"), "Vancouver City Briefing 2027");
  assert.equal(eventWording("city briefings through the year"), "city briefings through the year");
  assert.equal(eventWording(""), "");
  assert.equal(eventWording(undefined), "");
});
