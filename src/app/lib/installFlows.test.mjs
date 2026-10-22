// Install steps by phone, browser and iOS version (Oct 22 2026: iOS 26 / 27 Safari moved Share).
// Run: node --test src/app/lib/installFlows.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { detectBrowser, detectOS, inAppName, iosVersion } from "../../lib/pwaPlatform.js";
import { flowFor } from "./installFlows.js";

const IOS = (os, tail) => `Mozilla/5.0 (iPhone; CPU iPhone OS ${os} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ${tail}`;
const UA = {
  safari27: IOS("18_7", "Version/27.0 Mobile/15E148 Safari/604.1"),
  safari26: IOS("18_6", "Version/26.4 Mobile/15E148 Safari/604.1"),
  safari18: IOS("18_5", "Version/18.5 Mobile/15E148 Safari/604.1"),
  safari17: IOS("17_4", "Version/17.4 Mobile/15E148 Safari/604.1"),
  chromeIOS: IOS("18_6", "CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1"),
  instagram: IOS("18_6", "Mobile/15E148 Instagram 400.0.0.32.110 (iPhone17,1; iOS 26_0; en_CA; en; scale=3.00; 1206x2622)"),
  linkedin: IOS("18_6", "Mobile/15E148 [LinkedInApp]/9.31.1645"),
  facebook: IOS("18_6", "Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0.40.97;FBBV/700000000;FBDV/iPhone17,1;FBMD/iPhone;FBSN/iOS;FBSV/26.0;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]"),
  webview: IOS("18_6", "Mobile/15E148"), // Gmail, WhatsApp and other apps' plain web views
  googleApp: IOS("18_6", "GSA/390.0.789 Mobile/15E148 Safari/604.1"),
  androidChrome: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  androidInstagram: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 Instagram 400.0.0.0 Android",
};

const flow = (ua) => flowFor({ os: detectOS(ua), browser: detectBrowser(ua), canPrompt: false, iv: iosVersion(ua), app: inAppName(ua) });
const ids = (f) => f.steps.map((s) => s.id).join(",");

test("iOS version comes from Safari's Version/ token (the OS token is frozen at 18_x)", () => {
  assert.equal(iosVersion(UA.safari27), 27);
  assert.equal(iosVersion(UA.safari26), 26.4);
  assert.equal(iosVersion(UA.safari18), 18.5);
  assert.equal(iosVersion(UA.chromeIOS), 18.6); // only the frozen token: "18 or later"
});

test("iOS 27 Safari: ≡ at the left of the address bar, then Share", () => {
  const f = flow(UA.safari27);
  assert.equal(f.kind, "ios-safari");
  assert.equal(ids(f), "share,add,find");
  assert.equal(f.steps[0].title, "Tap ≡ then Share");
  assert.match(f.steps[0].lead, /left end of the address bar/);
  assert.match(f.steps[0].hint, /Share button \(a square with an arrow\)/);
  assert.equal(f.steps[0].clip, undefined); // no recording for 27: the drawing only
  assert.match(f.steps[1].lead, /View More/);
});

test("iOS 26 Safari: ••• next to the address bar, then Share; View More in the sheet", () => {
  const f = flow(UA.safari26);
  assert.equal(f.steps[0].title, "Tap ••• then Share");
  assert.equal(f.steps[0].clip, "ios26-share");
  assert.equal(f.steps[1].clip, "ios26-add");
});

test("iOS 18 and earlier: the Share button, one step", () => {
  for (const ua of [UA.safari18, UA.safari17]) {
    const f = flow(ua);
    assert.equal(ids(f), "share,find");
    assert.equal(f.steps[0].title, "Tap Share, then Add to Home Screen");
  }
});

test("app browsers: open in Safari first, with Copy link, naming the app", () => {
  for (const [ua, app] of [[UA.instagram, "Instagram"], [UA.linkedin, "LinkedIn"], [UA.facebook, "Facebook"], [UA.googleApp, "the Google app"], [UA.webview, ""]]) {
    assert.equal(detectBrowser(ua), "inapp", ua);
    const f = flow(ua);
    assert.equal(f.kind, "inapp");
    assert.equal(f.title, "Open this page in Safari first");
    assert.equal(f.steps[0].action, "copy-link");
    assert.match(f.steps[0].lead, app ? new RegExp(`${app}'s built-in browser`) : /another app's built-in browser/);
  }
  const a = flow(UA.androidInstagram);
  assert.equal(a.title, "Open this page in Chrome first");
});

test("Chrome on iPhone: its own Share › Add to Home Screen, or copy the link for Safari", () => {
  const f = flow(UA.chromeIOS);
  assert.equal(f.kind, "ios-chrome");
  assert.equal(f.steps[0].secondary, "copy-link");
  assert.match(f.steps[0].lead, /Add to Home Screen/);
});

test("Android Chrome keeps its menu steps", () => {
  assert.equal(flow(UA.androidChrome).kind, "android-chrome");
});
