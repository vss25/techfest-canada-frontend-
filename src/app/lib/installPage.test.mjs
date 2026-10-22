// /app/install, batch 7: the device, the in-app browser card, at most 3 steps, the video and troubleshooting.
// Run: node --test src/app/lib/installPage.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { VIDEOS, defaultDevice, doneFor, pageFor, troubleFor } from "./installPage.js";

test("the device starts from the phone; ?device= wins", () => {
  assert.equal(defaultDevice("ios"), "iphone");
  assert.equal(defaultDevice("android"), "android");
  assert.equal(defaultDevice("desktop"), "computer");
  assert.equal(defaultDevice("ios", "android"), "android");
  assert.equal(defaultDevice("ios", "nonsense"), "iphone");
});

test("iPhone Safari: iOS 26 / 27 / 18, at most 3 steps, no find step", () => {
  const ids = (pg) => pg.steps.map((s) => s.id).join(",");
  const p26 = pageFor("iphone", { os: "ios", browser: "safari", canPrompt: false, iv: 26.4, app: "" });
  assert.equal(p26.inapp, null);
  assert.equal(ids(p26), "share,add");
  assert.equal(p26.steps[0].title, "Tap ••• then Share");
  assert.equal(pageFor("iphone", { os: "ios", browser: "safari", iv: 27 }).steps[0].title, "Tap ≡ then Share");
  assert.equal(ids(pageFor("iphone", { os: "ios", browser: "safari", iv: 18.5 })), "share");
  // Looking at the iPhone steps on Android or a computer: Safari on iOS 26.
  assert.equal(pageFor("iphone", { os: "desktop", browser: "chrome", iv: 0 }).steps[0].title, "Tap ••• then Share");
  for (const pg of [p26, pageFor("android", { os: "android", browser: "chrome" })]) assert.ok(pg.steps.length <= 3);
});

test("another app's browser: open in Safari / Chrome first, then the usual steps", () => {
  const ig = pageFor("iphone", { os: "ios", browser: "inapp", iv: 26, app: "Instagram" });
  assert.equal(ig.inapp.target, "Safari");
  assert.match(ig.inapp.lead, /Instagram/);
  assert.equal(ig.steps[0].title, "Tap ••• then Share");
  const an = pageFor("android", { os: "android", browser: "inapp", app: "LinkedIn" });
  assert.equal(an.inapp.target, "Chrome");
  assert.equal(an.kind, "android-chrome");
  // The other device's steps never get the card.
  assert.equal(pageFor("android", { os: "ios", browser: "inapp" }).inapp, null);
});

test("Android: Chrome's menu, or the install button when Chrome offers it", () => {
  const menu = pageFor("android", { os: "android", browser: "chrome", canPrompt: false });
  assert.deepEqual(menu.steps.map((s) => s.id), ["menu", "confirm"]);
  const prompt = pageFor("android", { os: "android", browser: "chrome", canPrompt: true });
  assert.equal(prompt.steps[0].action, "install-prompt");
  // canPrompt only counts on the phone itself.
  assert.notEqual(pageFor("android", { os: "desktop", browser: "chrome", canPrompt: true }).steps[0].action, "install-prompt");
});

test("video, done and troubleshooting for both phones", () => {
  for (const d of ["iphone", "android"]) {
    assert.ok(VIDEOS[d].src.startsWith("/app/guide/") && VIDEOS[d].transcript.length >= 4);
    assert.match(doneFor(d).title, /^Done\? Open TTFC from your Home [Ss]creen and sign in with your pass ID or email$/);
    assert.ok(troubleFor(d).length >= 4);
  }
  assert.ok(troubleFor("android").some(([, , link]) => link?.href?.includes("play.google.com")));
});
