// Visitors from the TTFC iPhone / Android app never get "Get the TTFC app" nudges in that browser session.
// Run: node --test src/lib/nativeVisit.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { NATIVE_VISIT_KEY, isAppDownloadLink, isNativeVisit, nativeAppSource, noteNativeVisit } from "./nativeVisit.js";

/** A sessionStorage stand-in. */
function memoryStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test("the store apps' links are recognised", () => {
  // What the apps send today: iOS Profile › Stay updated → ?source=ios, Android → ?source=android.
  assert.equal(nativeAppSource("?source=ios"), "ios");
  assert.equal(nativeAppSource("?source=android"), "android");
  assert.equal(nativeAppSource("?source=ios-app"), "ios");
  assert.equal(nativeAppSource("?source=android-app"), "android");
  assert.equal(nativeAppSource("?source=ttfc-app"), "app");
  // A future tag on every link the apps open.
  assert.equal(nativeAppSource("?from=ttfc-app"), "app");
  assert.equal(nativeAppSource("?from=ios-app&x=1"), "ios");
  assert.equal(nativeAppSource("tier=power&from=android-app"), "android");
  assert.equal(nativeAppSource("?source=IOS"), "ios");
  assert.equal(nativeAppSource(" ?source=%20android%20".trim()), "android");
  assert.equal(nativeAppSource(new URLSearchParams({ source: "ios" })), "ios");
});

test("other sources aren't the store apps", () => {
  for (const q of ["", "?", "?source=webapp", "?source=website", "?source=pwa", "?source=desktop-qr", "?from=drawer",
    "?from=app", "?from=link", "?utm_source=ios", "?source=iosx", "?source=", "?from=ios", "?from=android"]) {
    assert.equal(nativeAppSource(q), "", q);
  }
  assert.equal(nativeAppSource(undefined), "");
  assert.equal(nativeAppSource(null), "");
});

test("the visit is remembered for the browser session (the tab), page after page", () => {
  const s = memoryStore();
  assert.equal(noteNativeVisit("?source=ios", s), "ios");
  assert.equal(s.getItem(NATIVE_VISIT_KEY), "ios");
  assert.equal(isNativeVisit(s), true);
  // The next pages have no ?source=: still a visit from the app.
  assert.equal(noteNativeVisit("", s), "ios");
  assert.equal(noteNativeVisit("?source=webapp", s), "ios");
  assert.equal(isNativeVisit(s), true);
  // A new tab / session.
  const fresh = memoryStore();
  assert.equal(noteNativeVisit("?utm_source=newsletter", fresh), "");
  assert.equal(isNativeVisit(fresh), false);
  assert.equal(fresh.m.size, 0);
});

test("blocked storage: the page that came from the app still knows; nothing breaks", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(noteNativeVisit("?source=android", blocked), "android");
  assert.equal(noteNativeVisit("", blocked), "");
  assert.equal(isNativeVisit(blocked), false);
  assert.equal(noteNativeVisit("?source=ios", null), "ios");
  assert.equal(isNativeVisit(null), false);
});

test("app-download links (an announcement like that isn't shown to app visitors)", () => {
  for (const href of [
    "https://apps.apple.com/ca/app/the-tech-festival-canada/id6820764803",
    "https://itunes.apple.com/app/id6820764803",
    "https://play.google.com/store/apps/details?id=com.atlaslinkmarkets.ttfc",
    "https://www.thetechfestival.com/app/install?from=banner",
    "https://thetechfestival.com/app/install",
    "/app/install",
    "itms-apps://apps.apple.com/app/id6820764803",
    "market://details?id=com.atlaslinkmarkets.ttfc",
  ]) assert.equal(isAppDownloadLink(href), true, href);
  for (const href of [
    "", null, undefined, "https://www.thetechfestival.com/tickets", "https://www.thetechfestival.com/app/",
    "https://www.thetechfestival.com/app/installation-guide", "https://example.com/app/install",
    "https://play.google.com/books", "/stay-updated", "javascript:alert(1)",
  ]) assert.equal(isAppDownloadLink(href), false, String(href));
});
