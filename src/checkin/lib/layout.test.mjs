/* node --test src/checkin/lib/layout.test.mjs: the layouts for phones, iPads (portrait, landscape, split view) and
   laptops, and which key presses go to the search. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BREAKPOINTS, enterActs, isTypingKey, keyboardInset, layoutFor } from "./layout.js";

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

test("W11: the on-screen keyboard: iPad Safari (visual viewport shorter), Android (window shorter), a hardware keyboard (neither)", () => {
  // Landscape iPad, installed: 820 tall, the keyboard covers ~400.
  assert.deepEqual(keyboardInset({ innerHeight: 820, vvHeight: 420, vvTop: 0, maxInnerHeight: 820 }), { overlap: 400, top: 0, open: true });
  // Safari panned the page up 60 px to show the field.
  assert.deepEqual(keyboardInset({ innerHeight: 820, vvHeight: 420, vvTop: 60, maxInnerHeight: 820 }), { overlap: 340, top: 60, open: true });
  // iPad + Magic Keyboard: only the shortcut bar (~55 px).
  assert.equal(keyboardInset({ innerHeight: 820, vvHeight: 765, vvTop: 0, maxInnerHeight: 820 }).open, false);
  // Android Chrome (resizes-content): the window itself shrinks.
  assert.deepEqual(keyboardInset({ innerHeight: 420, vvHeight: 420, vvTop: 0, maxInnerHeight: 780 }), { overlap: 0, top: 0, open: true });
  assert.equal(keyboardInset({ innerHeight: 800 }).open, false, "no visualViewport: nothing known");
});

test("W12: Enter records only on a clear choice: ↑ ↓ picked a row, or a physical keyboard; never the on-screen Go", () => {
  assert.equal(enterActs({ navigated: false, softKeyboard: true }), false, "iPad keyboard's Go after typing 'chris'");
  assert.equal(enterActs({ navigated: true, softKeyboard: true }), true, "picked with the arrows");
  assert.equal(enterActs({ navigated: false, softKeyboard: false }), true, "laptop / iPad with a keyboard");
  assert.equal(enterActs({ navigated: true, softKeyboard: false, composing: true }), false, "still composing (IME)");
});
