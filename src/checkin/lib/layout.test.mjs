/* node --test src/checkin/lib/layout.test.mjs: the layouts for phones, iPads (portrait, landscape, split view) and
   laptops, and which key presses go to the search. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BREAKPOINTS, isTypingKey, layoutFor } from "./layout.js";

test("breakpoints: phone, tablet, laptop", () => {
  const kind = (w, h) => layoutFor(w, h).kind;
  assert.deepEqual(BREAKPOINTS, { tablet: 640, laptop: 1100 });
  // Phones (and iPad split view at a third).
  assert.deepEqual([320, 375, 390, 430, 639].map((w) => kind(w)), ["phone", "phone", "phone", "phone", "phone"]);
  // iPads: portrait 820 / 1024, half split view 590 on an 11" landscape is a phone layout.
  assert.equal(kind(820, 1180), "tablet");
  assert.equal(kind(1024, 1366), "tablet");
  assert.equal(kind(590, 820), "phone");
  // iPad landscape (1180, 1366) and laptops: two columns side by side, the counters across the top.
  assert.deepEqual([1100, 1180, 1280, 1366, 1440, 1920].map((w) => kind(w)), ["laptop", "laptop", "laptop", "laptop", "laptop", "laptop"]);
  assert.equal(layoutFor(390).deskTabs, true, "a phone shows the desk's two lists as tabs");
  assert.equal(layoutFor(820).columns, 2);
  assert.equal(layoutFor(1440).columns, 2);
  assert.equal(layoutFor(1920).cardSize, "xl");
  assert.equal(layoutFor(844, 390).short, true, "a phone on its side");
});

test("typing anywhere goes to the search: letters and digits, never shortcuts", () => {
  assert.equal(isTypingKey({ key: "p" }), true);
  assert.equal(isTypingKey({ key: "É" }), true);
  assert.equal(isTypingKey({ key: "7" }), true);
  assert.equal(isTypingKey({ key: "Enter" }), false);
  assert.equal(isTypingKey({ key: "ArrowDown" }), false);
  assert.equal(isTypingKey({ key: "k", metaKey: true }), false);
  assert.equal(isTypingKey({ key: "r", ctrlKey: true }), false);
});
