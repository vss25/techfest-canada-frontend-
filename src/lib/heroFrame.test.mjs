// Hero framing and height. Run: node --test src/lib/heroFrame.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { HERO_HEIGHTS, focusOf, heroHeights, heroPosition, previewAspect } from "./heroFrame.js";

test("unset keeps the design: standard heights and the city's own framing", () => {
  assert.deepEqual(heroHeights(undefined), { full: "540px", soon: "460px", phoneFull: "420px", phoneSoon: "380px" });
  assert.equal(heroPosition(undefined, "center 35%"), "center 35%");
  assert.equal(heroPosition("", "center"), "center");
});

test("focus 0–100 moves the crop; out of range is clamped", () => {
  assert.equal(heroPosition(0), "50% 0%");
  assert.equal(heroPosition(100), "50% 100%");
  assert.equal(heroPosition(72.4), "50% 72%");
  assert.equal(focusOf(140), 100);
  assert.equal(focusOf("x"), null);
});

test("taller and full screen", () => {
  assert.equal(heroHeights("tall").full, "680px");
  assert.equal(heroHeights("full").phoneFull, "calc(100svh - 64px)");
  assert.equal(heroHeights("huge").full, "540px");
  assert.deepEqual(HERO_HEIGHTS.map((h) => h.key), ["standard", "tall", "full"]);
  assert.ok(Math.abs(previewAspect("standard", "desktop") - 1280 / 540) < 1e-9);
  assert.ok(previewAspect("tall", "desktop") < previewAspect("standard", "desktop"));
  assert.ok(previewAspect("full", "phone") < previewAspect("tall", "phone"));
});
