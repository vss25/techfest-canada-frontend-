/* node --test src/lib/getApp.test.mjs: /get-app, the lobby QR code's page (Oct 24 2026). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getAppTarget } from "./getApp.js";
import { APP_STORE_URL, PLAY_STORE_URL } from "./appStores.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const MAC = IPAD;
const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

test("each phone to its own store; a computer to the badges page, `from` kept", () => {
  assert.deepEqual(getAppTarget({ ua: IPHONE, search: "?from=lobby-qr" }), { os: "ios", kind: "store", url: APP_STORE_URL, from: "lobby-qr" });
  assert.deepEqual(getAppTarget({ ua: IPAD, maxTouchPoints: 5, search: "?from=lobby-qr" }), { os: "ios", kind: "store", url: APP_STORE_URL, from: "lobby-qr" }, "an iPad's Safari says Macintosh");
  assert.deepEqual(getAppTarget({ ua: ANDROID, search: "?from=lobby-qr" }), { os: "android", kind: "store", url: PLAY_STORE_URL, from: "lobby-qr" });
  assert.deepEqual(getAppTarget({ ua: MAC, maxTouchPoints: 0, search: "?from=lobby-qr" }), { os: "desktop", kind: "page", url: "/app/install?from=lobby-qr", from: "lobby-qr" });
  assert.equal(getAppTarget({ ua: WIN }).url, "/app/install?from=qr");
  assert.equal(getAppTarget({ ua: WIN, search: "?from=<script>" }).url, "/app/install?from=script", "only a plain tag goes along");
  assert.equal(getAppTarget({ ua: "" }).kind, "page");
});

test("a store that isn't live: the badges page instead (never a broken link)", () => {
  assert.equal(getAppTarget({ ua: IPHONE }, { appstore: "", play: PLAY_STORE_URL }).url, "/app/install?from=qr");
  assert.equal(getAppTarget({ ua: ANDROID }, { appstore: APP_STORE_URL, play: "" }).kind, "page");
});
