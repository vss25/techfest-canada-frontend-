// Which phone is this? The device detection behind the store badges and the web app's "Get the TTFC app" sheet.
// Run: node --test src/lib/pwaPlatform.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { osFrom } from "./pwaPlatform.js";

const UA = Object.freeze({
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1",
  iphoneInstagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0",
  ipadOld: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  // iPadOS Safari asks for the desktop site by default: a Mac user agent (navigator.platform "MacIntel").
  ipadDesktopSite: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  androidPhone: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  androidSamsung: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  windowsChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  chromebook: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
});

test("iPhones are iOS, whatever the browser", () => {
  for (const u of [UA.iphoneSafari, UA.iphoneChrome, UA.iphoneInstagram]) assert.equal(osFrom(u, 5), "ios");
});

test("iPads are iOS, also when iPadOS sends a Mac user agent (MacIntel + touch points)", () => {
  assert.equal(osFrom(UA.ipadOld, 5), "ios");
  assert.equal(osFrom(UA.ipadDesktopSite, 5), "ios");
  assert.equal(osFrom(UA.ipadDesktopSite, 2), "ios");
  // A real Mac: no touch points (or one, from a stray touch-capable display driver) → a computer.
  assert.equal(osFrom(UA.ipadDesktopSite, 0), "desktop");
  assert.equal(osFrom(UA.ipadDesktopSite, 1), "desktop");
  assert.equal(osFrom(UA.macChrome, 0), "desktop");
  assert.equal(osFrom(UA.ipadDesktopSite, undefined), "desktop");
});

test("Android phones and tablets are Android", () => {
  for (const u of [UA.androidPhone, UA.androidSamsung, UA.androidTablet]) assert.equal(osFrom(u, 5), "android");
});

test("computers are desktops; anything unknown is other", () => {
  for (const u of [UA.windowsChrome, UA.macChrome, UA.chromebook, UA.linux]) assert.equal(osFrom(u, 0), "desktop");
  assert.equal(osFrom("", 0), "other");
  assert.equal(osFrom(undefined), "other");
  assert.equal(osFrom("SomeBot/1.0", 0), "other");
});
