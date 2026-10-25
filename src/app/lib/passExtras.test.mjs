// What your pass includes (Oct 24 2026): the server's extras, else its wording; the line, its words and the day-by-day list.
// Run: node --test src/app/lib/passExtras.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { FALLBACK_TIMES, includedItems, inclusionAria, inclusionCaption, inclusionSchedule, personExtras, ticketExtras } from "./passExtras.js";

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

test("the line: icons in order, the caption, the spoken version", () => {
  assert.deepEqual(includedItems(ALL).map((i) => i.key), ["cxo", "lunch", "awards", "gala"]);
  assert.equal(inclusionCaption(ALL), "Breakfast · Lunch · Awards · Gala");
  assert.equal(inclusionAria(ALL),
    "Your pass includes: CxO Breakfast, both days; Networking Luncheon, both days; Catalyst Awards Night, Monday 26 October; Gala Dinner, Tuesday 27 October");
  assert.equal(inclusionCaption({ cxo: true }), "Breakfast");
  assert.equal(inclusionAria({ cxo: true }), "Your pass includes: CxO Breakfast, both days");
  assert.deepEqual(includedItems({ gala: true, lunch: true }).map((i) => i.short), ["Lunch", "Gala"]);
  assert.equal(inclusionCaption(NONE), "");
  assert.equal(inclusionAria(NONE), "");
  assert.deepEqual(includedItems(), []);
});

test("the list: per day, the agenda's time and room, else the published times", () => {
  const agenda = [
    { day: 1, title: "CxO Breakfast", startTime: "8:00 AM", start: 2, room: "Pier 5" },
    { day: 1, title: "Networking Lunch", startTime: "12:40 PM", start: 5, room: "" },
    { day: 1, title: "Catalyst Awards Evening", startTime: "5:45 PM", start: 9, room: "Harbour Ballroom" },
    { day: 2, title: "Keynote", startTime: "9:00 AM", start: 3 },
    { day: 2, title: "Gala Dinner and Networking Reception", startTime: "6:00 PM", start: 9, room: "Harbour Ballroom" },
    // Meals take the day's first match: a later lunch-titled session doesn't replace it.
    { day: 1, title: "Lunch & Learn", startTime: "1:30 PM", start: 7, room: "Pier 4" },
    // Evenings take the day's last match: an earlier awards-titled session doesn't win.
    { day: 1, title: "Awards nominees photo call", startTime: "10:00 AM", start: 4, room: "Pier 2" },
  ];
  assert.deepEqual(inclusionSchedule(ALL, agenda), [
    { day: 1, label: "Monday 26 October", items: [
      { key: "cxo", name: "CxO Breakfast", time: "8:00 AM", room: "Pier 5" },
      { key: "lunch", name: "Networking Luncheon", time: "12:40 PM", room: "" },
      { key: "awards", name: "Catalyst Awards Night", time: "5:45 PM", room: "Harbour Ballroom" },
    ] },
    { day: 2, label: "Tuesday 27 October", items: [
      { key: "cxo", name: "CxO Breakfast", time: "7:55 AM", room: "" },
      { key: "lunch", name: "Networking Luncheon", time: "12:00 PM", room: "" },
      { key: "gala", name: "Gala Dinner & Networking Reception", time: "6:00 PM", room: "Harbour Ballroom" },
    ] },
  ]);
  // No agenda: the published times.
  const plain = inclusionSchedule(ALL);
  assert.deepEqual(plain.map((d) => d.items.map((i) => i.time)), [["7:55 AM", "12:35 PM", "5:30 PM"], ["7:55 AM", "12:00 PM", "5:30 PM"]]);
  assert.equal(FALLBACK_TIMES[2].gala, "5:30 PM");
  // Breakfast only: both days; Awards only: Day 1; Gala only: Day 2; nothing: no sections.
  assert.deepEqual(inclusionSchedule({ cxo: true }).map((d) => [d.label, d.items.map((i) => i.name)]),
    [["Monday 26 October", ["CxO Breakfast"]], ["Tuesday 27 October", ["CxO Breakfast"]]]);
  assert.deepEqual(inclusionSchedule({ awards: true }).map((d) => d.day), [1]);
  assert.deepEqual(inclusionSchedule({ gala: true }).map((d) => d.day), [2]);
  assert.deepEqual(inclusionSchedule(NONE, agenda), []);
});
