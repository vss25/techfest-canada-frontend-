// The web app's "Get the TTFC app" sheet: which store a device gets, where and when it may open.
// Run: node --test src/app/lib/storePrompt.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SNOOZE_MS, calmScreen, promptBlocker, promptStore, switchOn } from "./storePrompt.js";
import { osFrom } from "../../lib/pwaPlatform.js";
import { APP_STORE_URL, PLAY_STORE_URL, storePlan } from "../../lib/appStores.js";

// Real browsers' user agents (the same as pwaPlatform.test.mjs).
const UA = Object.freeze({
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1",
  ipadOld: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  ipadDesktopSite: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  androidPhone: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  androidSamsung: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  windowsChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  chromebook: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
});

const NOW = Date.parse("2026-10-24T12:00:00-04:00");
const OK = { values: { "flag.pwaPrompt": true }, os: "ios", nativeVisit: false, seen: false, snoozedUntil: 0, mode: "user", pathname: "/app/", now: NOW };

test("one store, this device's own: App Store on iPhone / iPad, Google Play on Android, nothing elsewhere", () => {
  const storeFor = (ua, touch) => promptStore(osFrom(ua, touch));
  assert.equal(storeFor(UA.iphoneSafari, 5), "appstore");
  assert.equal(storeFor(UA.iphoneChrome, 5), "appstore");
  assert.equal(storeFor(UA.ipadOld, 5), "appstore");
  assert.equal(storeFor(UA.ipadDesktopSite, 5), "appstore"); // iPadOS "MacIntel" + touch
  assert.equal(storeFor(UA.androidPhone, 5), "play");
  assert.equal(storeFor(UA.androidTablet, 10), "play");
  assert.equal(storeFor(UA.androidSamsung, 5), "play");
  for (const [ua, touch] of [[UA.windowsChrome, 0], [UA.macChrome, 0], [UA.ipadDesktopSite, 0], [UA.chromebook, 0], [UA.linux, 0], ["", 0]]) {
    assert.equal(storeFor(ua, touch), "", ua);
  }
  // The badge the sheet shows (StoreBadges → storePlan): exactly one, with the live link.
  assert.deepEqual(storePlan("ios").stores.map((s) => s.url), [APP_STORE_URL]);
  assert.deepEqual(storePlan("android").stores.map((s) => s.url), [PLAY_STORE_URL]);
  assert.equal(APP_STORE_URL, "https://apps.apple.com/ca/app/the-tech-festival-canada/id6820764803");
  assert.ok(PLAY_STORE_URL.endsWith("id=com.atlaslinkmarkets.ttfc"));
});

test("calm screens only: Home and the main tabs, never sign-in, forms, chats, live polls or the check-in desk", () => {
  for (const p of ["/app", "/app/", "/app/schedule", "/app/network", "/app/network/speakers", "/app/chats", "/app/chats/groups",
    "/app/profile", "/app/profile/", "/app/notifications", "/APP/Schedule"]) assert.equal(calmScreen(p), true, p);
  for (const p of ["/app/login", "/app/stay-updated", "/app/profile/edit", "/app/profile/availability", "/app/profile/pass",
    "/app/chat/u1", "/app/group/g1", "/app/discussion/d1", "/app/session/s1", "/app/session/s1/live", "/app/install",
    "/app/legal/privacy", "/app/staff/sos", "/app/post/p1", "/app/points",
    "/checkin-j0s8e5p4akvh/", "/checkin-j0s8e5p4akvh/app/", "/", "/stay-updated", "/tickets/checkout", "/rsvp", "/application", "", undefined]) {
    assert.equal(calmScreen(p), false, String(p));
  }
});

test("the staff switch (flag.pwaPrompt): only true / \"true\"; missing = off", () => {
  assert.equal(switchOn({ "flag.pwaPrompt": true }), true);
  assert.equal(switchOn({ "flag.pwaPrompt": "true" }), true);
  for (const v of [false, "false", undefined, null, 1, "yes"]) assert.equal(switchOn({ "flag.pwaPrompt": v }), false, String(v));
  assert.equal(switchOn(undefined), false);
});

test("when it may open, and every reason it doesn't", () => {
  assert.equal(promptBlocker(OK), "");
  assert.equal(promptBlocker({ ...OK, os: "android", pathname: "/app/schedule" }), "");
  assert.equal(promptBlocker({ ...OK, mode: "guest" }), ""); // guests browsing the web app on a phone
  assert.equal(promptBlocker({ ...OK, values: { "flag.pwaPrompt": "true" } }), "");
  assert.equal(promptBlocker({ ...OK, values: { "flag.pwaPrompt": false } }), "switch-off");
  assert.equal(promptBlocker({ ...OK, values: {} }), "switch-off");
  assert.equal(promptBlocker({ ...OK, os: "desktop" }), "device");
  assert.equal(promptBlocker({ ...OK, os: "other" }), "device");
  assert.equal(promptBlocker({ ...OK, nativeVisit: true }), "native-app"); // came from the iPhone / Android app
  assert.equal(promptBlocker({ ...OK, seen: true }), "seen"); // once per session
  assert.equal(promptBlocker({ ...OK, snoozedUntil: NOW + SNOOZE_MS }), "snoozed"); // "Not now" for 7 days
  assert.equal(promptBlocker({ ...OK, snoozedUntil: NOW - 1 }), ""); // the week is over
  assert.equal(promptBlocker({ ...OK, mode: "out" }), "signed-out"); // the sign-in screen
  assert.equal(promptBlocker({ ...OK, mode: undefined }), "signed-out");
  assert.equal(promptBlocker({ ...OK, pathname: "/app/stay-updated" }), "screen");
  assert.equal(promptBlocker({ ...OK, pathname: "/app/login" }), "screen");
  assert.equal(promptBlocker({ ...OK, pathname: "/checkin-j0s8e5p4akvh/" }), "screen");
  assert.equal(promptBlocker(), "switch-off");
  assert.equal(SNOOZE_MS, 7 * 24 * 3600 * 1000);
});

test("the website shows no store pop-up; the web app mounts the sheet", () => {
  const src = (p) => fileURLToPath(new URL(p, import.meta.url));
  assert.equal(existsSync(src("../../components/InstallAppPrompt.jsx")), false);
  const site = readFileSync(src("../../App.jsx"), "utf8");
  assert.doesNotMatch(site, /InstallAppPrompt|StorePrompt\s*\/>/);
  const app = readFileSync(src("../App.jsx"), "utf8");
  assert.match(app, /<StorePrompt \/>/);
});
