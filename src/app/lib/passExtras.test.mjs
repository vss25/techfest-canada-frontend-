// What your pass includes, per day (Oct 24 2026): the server's extras, else its wording; same cases as iOS and Android.
// Run: node --test src/app/lib/passExtras.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { inclusionDays, personExtras, ticketExtras } from "./passExtras.js";

const ALL = { cxo: true, lunch: true, gala: true, awards: true };
const NONE = { cxo: false, lunch: false, gala: false, awards: false };

test("the server's extras win over the wording", () => {
  assert.deepEqual(ticketExtras({ ticketId: "a1", type: "connect", extras: { cxo: true, lunch: false, gala: false, awards: false }, inclusions: ["2× Luncheons"] }),
    { cxo: true, lunch: false, gala: false, awards: false });
  assert.deepEqual(ticketExtras({ ticketId: "a1", type: "connect", extras: ALL }), ALL);
});

test("an older server: read from the inclusions wording", () => {
  assert.deepEqual(ticketExtras({ ticketId: "a1", type: "influence", inclusions: ["2× Day Conference Access", "2× Luncheons", "Expo Floor Access"] }),
    { cxo: false, lunch: true, gala: false, awards: false });
  assert.deepEqual(ticketExtras({ ticketId: "a1", type: "apex", inclusions: ["2× CxO Breakfasts", "2× Luncheons", "1× Gala Dinner & Networking Reception", "1× Awards Night"] }), ALL);
  assert.deepEqual(ticketExtras({ ticketId: "a1", type: "connect" }), NONE);
  assert.deepEqual(ticketExtras(null), NONE);
});

test("booths never count; all real passes add up", () => {
  assert.deepEqual(ticketExtras({ ticketId: "BOOTH-GOLD", type: "booth-gold", extras: ALL }), NONE);
  assert.deepEqual(ticketExtras({ ticketId: "x1", type: "booth-standard", inclusions: ["2× Luncheons"] }), NONE);
  assert.deepEqual(personExtras([
    { ticketId: "c1", type: "connect", extras: { cxo: false, lunch: false, gala: false, awards: true } },
    { ticketId: "i1", type: "influence", inclusions: ["2× Luncheons"] },
    { ticketId: "BOOTH-GOLD", type: "booth-gold", extras: ALL },
    { ticketId: "", type: "apex", extras: ALL },
  ]), { cxo: false, lunch: true, gala: false, awards: true });
  assert.deepEqual(personExtras(), NONE);
});

test("per day: breakfast, lunch, then the evening; empty days and nothing at all left out", () => {
  const all = inclusionDays(ALL);
  assert.deepEqual(all.map((d) => [d.label, d.items.map((i) => i.label)]), [
    ["Mon 26", ["CxO Breakfast", "Lunch", "Catalyst Awards"]],
    ["Tue 27", ["CxO Breakfast", "Lunch", "Gala Dinner"]],
  ]);
  assert.equal(all[0].aria, "Included on Monday 26 October: CxO Breakfast, Lunch, Catalyst Awards");
  assert.equal(all[1].aria, "Included on Tuesday 27 October: CxO Breakfast, Lunch, Gala Dinner");
  assert.deepEqual(inclusionDays({ cxo: true }).map((d) => [d.label, d.items.map((i) => i.label)]), [["Mon 26", ["CxO Breakfast"]], ["Tue 27", ["CxO Breakfast"]]]);
  assert.deepEqual(inclusionDays({ awards: true }).map((d) => d.label), ["Mon 26"]);
  assert.deepEqual(inclusionDays({ gala: true }).map((d) => d.label), ["Tue 27"]);
  assert.deepEqual(inclusionDays(NONE), []);
  assert.deepEqual(inclusionDays(), []);
});
