/* node --test src/checkin/lib/vocab.test.mjs: one word, one colour, one icon per state (Oct 24 2026, the organiser:
   "Arrived and admitted colour and CTA text should be clear and not ambiguous"). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STATE_COLORS, TONES, TONE_ICON, cta, mealName, permit, stateChip } from "./vocab.js";
import { GROUP_COLORS, contrast } from "./passColors.js";
import { MEAL_ITEMS } from "./stationTime.js";

const CSS = readFileSync(new URL("../checkin.css", import.meta.url), "utf8");
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
const at = "2026-10-26T13:02:00Z"; // 9:02 AM Toronto
const lunch = MEAL_ITEMS.lunch.day1;

test("the buttons say what they do, the undo what it undoes", () => {
  assert.deepEqual(cta("lobby"), { label: "Mark arrived", undo: "Undo arrived" });
  assert.deepEqual(cta("desk"), { label: "Check in & give pass", undo: "Undo check-in" });
  assert.equal(cta("desk", { noPass: true }).label, "Issue pass & check in");
  assert.deepEqual(cta("lunch", { item: lunch }), { label: "Admit to Lunch", undo: "Undo admit" });
  assert.equal(cta("breakfast", { item: MEAL_ITEMS.breakfast.day1 }).label, "Admit to CxO Breakfast");
  assert.equal(cta("evening", { item: MEAL_ITEMS.evening.day1 }).label, "Admit to Awards Night");
  assert.equal(cta("evening", { item: MEAL_ITEMS.evening.day2 }).label, "Admit to Gala Dinner");
  // No CTA says "Admitted", "Arrived" or "Checked in": that's a state, not a button.
  for (const st of ["lobby", "desk", "breakfast", "lunch", "evening", "media", "av", "exhibitor"]) assert.doesNotMatch(cta(st, { item: lunch }).label, /^(Admitted|Arrived|Checked in)\b/, st);
});

test("the states: Arrived (sky blue), Checked in · pass given / Admitted to Lunch (green), Already admitted (amber), Not on the list (STOP)", () => {
  assert.deepEqual(stateChip("arrived", { at }), { tone: "arrived", text: "Arrived · 9:02 AM" });
  assert.deepEqual(stateChip("arrived", { at, by: { name: "Val" } }, { by: true }), { tone: "arrived", text: "Arrived · 9:02 AM by Val" });
  assert.deepEqual(stateChip("checked_in", { at }), { tone: "done", text: "Checked in · pass given · 9:02 AM" });
  assert.deepEqual(stateChip("checked_in", { at }, { noPass: true }), { tone: "done", text: "Pass issued · checked in · 9:02 AM" });
  assert.deepEqual(stateChip("checked_in", { at }, { again: true }), { tone: "already", text: "Already checked in · 9:02 AM" });
  assert.deepEqual(stateChip("admitted", { at }, { item: lunch }), { tone: "done", text: "Admitted to Lunch · 9:02 AM" });
  assert.deepEqual(stateChip("admitted", { at }, { item: lunch, again: true }), { tone: "already", text: "Already admitted · 9:02 AM" });
  assert.equal(stateChip("admitted", { at, override: "not_included" }, { item: lunch }).text, "Admitted to Lunch · 9:02 AM · override");
  assert.equal(stateChip("arrived", { at, pending: true, practice: true }).text, "Arrived · 9:02 AM · pending · practice");
  assert.equal(stateChip("arrived", null), null);
  assert.deepEqual(permit({ item: lunch, included: true }), { ok: true, tone: "done", text: "On the list", reason: "Lunch included" });
  assert.deepEqual(permit({ item: lunch, included: false, passName: "Connect Pass" }), { ok: false, tone: "stop", text: "Not on the list", reason: "Connect Pass — lunch not included" });
  assert.equal(permit({ item: MEAL_ITEMS.breakfast.day1, included: false, passName: "Power Pass" }).reason, "Power Pass — CxO breakfast not included");
  assert.equal(permit({ item: lunch, included: false, noPass: true }).reason, "No pass on file — needs a pass for lunch");
  assert.equal(permit({ item: null }), null);
  assert.equal(mealName(MEAL_ITEMS.evening.day2), "Gala Dinner");
  for (const t of TONES) assert.ok(TONE_ICON[t], `${t} has an icon: never colour alone`);
});

test("the state colours: readable, and never a pass colour (the solid ones far from every band; amber / red are hollow pills)", () => {
  for (const theme of ["dark", "light"]) {
    const c = STATE_COLORS[theme];
    for (const t of ["arrived", "done"]) {
      assert.ok(contrast(c[t].bg, c[t].ink) >= 4.5, `${theme} ${t}: ${contrast(c[t].bg, c[t].ink).toFixed(2)}`);
      for (const [g, pc] of Object.entries(GROUP_COLORS)) assert.ok(dist(c[t].bg, pc.bg) >= 60, `${theme} ${t} vs ${g}: ${dist(c[t].bg, pc.bg).toFixed(0)}`);
    }
    for (const t of ["already", "stop"]) assert.ok(contrast(c[t].line, c.panel) >= 4.5, `${theme} ${t} on the panel: ${contrast(c[t].line, c.panel).toFixed(2)}`);
  }
  // The stylesheet's tokens are these colours.
  const block = (sel) => CSS.slice(CSS.indexOf(sel), CSS.indexOf("}", CSS.indexOf(sel)));
  const dark = block(':root, :root[data-theme="dark"] {');
  const light = block(':root[data-theme="light"] {');
  for (const [theme, b] of [["dark", dark], ["light", light]]) {
    const c = STATE_COLORS[theme];
    assert.ok(b.includes(`--st-arrived: ${c.arrived.bg};`) && b.includes(`--st-arrived-ink: ${c.arrived.ink};`), theme);
    assert.ok(b.includes(`--st-done: ${c.done.bg};`) && b.includes(`--st-done-ink: ${c.done.ink};`), theme);
    assert.ok(b.includes(`--st-already: ${c.already.line};`) && b.includes(`--st-stop: ${c.stop.line};`), theme);
  }
  assert.match(CSS, /\.ci-state-already \{ background: var\(--panel\); color: var\(--st-already\); border-color: var\(--st-already\); \}/, "hollow");
  assert.match(CSS, /\.ci-state-stop \{ background: var\(--panel\); color: var\(--st-stop\); border-color: var\(--st-stop\); \}/, "hollow");
});

test("no screen still says Admitted / Arrived / Checked in on a button (the old ambiguous labels)", () => {
  const files = ["Lobby.jsx", "Desk.jsx", "Meal.jsx", "Media.jsx", "Av.jsx", "Exhibitor.jsx"].map((f) => [f, readFileSync(new URL(`../screens/${f}`, import.meta.url), "utf8")]);
  for (const [f, src] of files) {
    assert.doesNotMatch(src, />\s*(Arrived|Admitted|Checked in|✓ Checked in|✓ Pass issued|Pass issued)\s*<\/button>/, f);
    assert.doesNotMatch(src, />Undo<\/button>/, `${f}: Undo says what it undoes`);
  }
});
