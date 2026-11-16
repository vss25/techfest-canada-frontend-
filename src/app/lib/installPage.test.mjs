// /app/install, Oct 22 2026: "Get the TTFC app" from the App Store or Google Play; the web app keeps working.
// Run: node --test src/app/lib/installPage.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { INSTALL_URL, getAppPage } from "./installPage.js";
import { PLAY_STORE_URL } from "../../lib/appStores.js";

test("a phone: both stores named, its own store's search hint, no QR, a link to keep using the web app", () => {
  const ios = getAppPage({ os: "ios" });
  assert.equal(ios.phone, true);
  assert.match(ios.lead, /^Free on the App Store\./);
  assert.match(ios.search, /“The Tech Festival Canada” in the App Store/);
  assert.equal(ios.qr, "");
  assert.deepEqual(ios.keep, { text: "App not in your country's store? Use TTFC here in your browser.", link: true });
  assert.match(getAppPage({ os: "android" }).search, /in Google Play\.$/);
  assert.match(getAppPage({ os: "ios", standalone: true }).keep.text, /^You're using the TTFC web app/);
});

test("a computer: a QR code to this page on the phone, the web app line without a link", () => {
  const pc = getAppPage({ os: "desktop" });
  assert.equal(pc.phone, false);
  assert.equal(pc.qr, `${INSTALL_URL}?source=desktop-qr`);
  assert.equal(pc.search, "");
  assert.equal(pc.keep.link, false);
  assert.match(pc.keep.text, /thetechfestival\.com\/app/);
});

test("nothing about adding the web app to the Home Screen", () => {
  for (const os of ["ios", "android", "desktop"]) {
    const { lead, search, keep } = getAppPage({ os });
    assert.doesNotMatch([lead, search, keep.text].join(" "), /Home Screen|Add to|Safari|Chrome|install/i);
  }
});

test("a store with no link: the page names only the live one", () => {
  const onlyPlay = { appstore: "", play: PLAY_STORE_URL };
  const ios = getAppPage({ os: "ios" }, onlyPlay);
  assert.match(ios.lead, /^Free on Google Play\./);
  assert.equal(ios.search, "", "no App Store hint without an App Store link");
  assert.match(getAppPage({ os: "ios" }, { appstore: "", play: "" }).lead, /thetechfestival\.com\/app/);
});
