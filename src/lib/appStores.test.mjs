// The App Store and Google Play links and which badge a device gets first.
// Run: node --test src/lib/appStores.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { APP_STORE_URL, PLAY_STORE_URL, browserFallback, phoneAppUrl, storeNames, storePlan } from "./appStores.js";

test("both store apps are live", () => {
  assert.equal(APP_STORE_URL, "https://apps.apple.com/ca/app/the-tech-festival-canada/id6820764803");
  assert.equal(PLAY_STORE_URL, "https://play.google.com/store/apps/details?id=com.atlaslinkmarkets.ttfc");
  assert.equal(storeNames(), "the App Store or Google Play");
  // An iPhone never sees Google Play named (App Store guideline 2.3.10), nor an Android phone the App Store.
  assert.equal(storeNames(undefined, "ios"), "the App Store");
  assert.equal(storeNames(undefined, "android"), "Google Play");
  assert.equal(storeNames(undefined, "desktop"), "the App Store or Google Play");
});

test("a phone gets only its own store; a computer gets both, App Store first", () => {
  const ids = (p) => p.stores.map((s) => s.id).join(",");
  const ios = storePlan("ios");
  assert.deepEqual([ids(ios), ios.primary, ios.phone], ["appstore", "appstore", true]);
  assert.equal(ios.stores[0].url, APP_STORE_URL);
  const android = storePlan("android");
  assert.deepEqual([ids(android), android.primary], ["play", "play"]);
  for (const os of ["desktop", "other", undefined]) {
    const p = storePlan(os);
    assert.deepEqual([ids(p), p.primary, p.phone], ["appstore,play", "", false]);
  }
});

test("a store with no link never shows (no broken badge)", () => {
  const noIos = { appstore: "", play: PLAY_STORE_URL };
  const p = storePlan("ios", noIos);
  assert.deepEqual([p.stores.map((s) => s.id), p.primary], [["play"], ""]);
  assert.equal(storePlan("android", noIos).primary, "play");
  assert.equal(storeNames(noIos), "Google Play");
  assert.deepEqual(storePlan("desktop", { appstore: "", play: "" }).stores, []);
  assert.equal(storeNames({ appstore: "", play: "" }), "");
  assert.deepEqual(storePlan("ios", { appstore: "javascript:alert(1)", play: "" }).stores, []);
});

test("the desktop QR code opens the Get the TTFC app page on the phone", () => {
  assert.equal(phoneAppUrl(), "https://www.thetechfestival.com/app/install?source=desktop-qr");
  assert.equal(phoneAppUrl("/app/"), "https://www.thetechfestival.com/app/install?source=desktop-qr");
  assert.equal(phoneAppUrl("/tickets"), "https://www.thetechfestival.com/app/install?source=desktop-qr");
  assert.equal(phoneAppUrl("/app/session/x"), "https://www.thetechfestival.com/app/session/x?source=desktop-qr");
});

test("browserFallback: phones on the website get the web app line; computers, /app and in-app visits don't", () => {
  assert.deepEqual(browserFallback({ phone: true, pathname: "/" }),
    { text: "App not in your country's store?", linkText: "Use TTFC in your browser", href: "/app/?from=store-badges" });
  assert.ok(browserFallback({ phone: true, pathname: "/swag" }));
  assert.ok(browserFallback({ phone: true, pathname: "/application" }));
  assert.equal(browserFallback({ phone: false, pathname: "/" }), null);
  assert.equal(browserFallback({ phone: true, pathname: "/app" }), null);
  assert.equal(browserFallback({ phone: true, pathname: "/app/install" }), null);
  assert.equal(browserFallback({ phone: true, pathname: "/", native: true }), null);
  assert.equal(browserFallback(), null);
});
