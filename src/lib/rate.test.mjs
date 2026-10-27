// "Rate the app" (src/lib/rate.js): where /rate sends each device, the survey's buttons, and neutral words only.
// Run: node --test src/lib/rate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { APP_STORE_REVIEW_URL, PLAY_STORE_REVIEW_URL, RATE_PROMPT, RATE_TEXT, rateLinks, rateTarget, showRatePrompt, storeParam } from "./rate.js";
import { osFrom } from "./pwaPlatform.js";

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

test("each device goes to its own store's review page; a computer sees both badges", () => {
  assert.equal(APP_STORE_REVIEW_URL, "https://apps.apple.com/app/id6820764803?action=write-review");
  assert.equal(PLAY_STORE_REVIEW_URL, "https://play.google.com/store/apps/details?id=com.atlaslinkmarkets.ttfc");
  assert.equal(rateTarget(osFrom(UA.iphone)), APP_STORE_REVIEW_URL);
  assert.equal(rateTarget(osFrom(UA.ipad, 5)), APP_STORE_REVIEW_URL); // iPadOS says it's a Mac; touch gives it away
  assert.equal(rateTarget(osFrom(UA.android)), PLAY_STORE_REVIEW_URL);
  assert.equal(rateTarget(osFrom(UA.mac)), "");
  assert.equal(rateTarget("desktop", "android"), PLAY_STORE_REVIEW_URL);
  assert.equal(rateTarget("android", "ios"), APP_STORE_REVIEW_URL);
  assert.equal(storeParam("?store=ios"), "ios");
  assert.equal(storeParam("?store=Play"), "android");
  assert.equal(storeParam("?store=evil"), "");
  assert.equal(storeParam(""), "");
});

test("the survey's thank-you: from the app or on a phone; this phone's store, both on a computer", () => {
  assert.equal(showRatePrompt({ os: "desktop" }), false);
  assert.equal(showRatePrompt({ os: "desktop", fromApp: true }), true);
  assert.equal(showRatePrompt({ os: "ios" }), true);
  assert.deepEqual(rateLinks("ios").map((l) => l.href), ["/rate?store=ios"]);
  assert.deepEqual(rateLinks("android").map((l) => l.label), ["Rate it on Google Play"]);
  assert.deepEqual(rateLinks("desktop").map((l) => l.store), ["ios", "android"]);
});

test("neutral words: never ask for five stars or a good rating (both stores reject that)", () => {
  for (const t of [RATE_TEXT, RATE_PROMPT, ...rateLinks("desktop").map((l) => l.label)]) {
    assert.doesNotMatch(t, /5[- ]?star|five|great|good|love|best|★/i, t);
  }
});
