/* node --test src/checkin/lib/appQr.test.mjs: the lobby's "Get the TTFC app" QR code (Oct 24 2026). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOBBY_QR_URL, QR_FULL_MS, qrCollapsed, qrPlacement, qrSize } from "./appQr.js";
import { getAppTarget } from "../../lib/getApp.js";

test("one short link, the phone's own store", () => {
  assert.equal(LOBBY_QR_URL, "https://www.thetechfestival.com/get-app?from=lobby-qr");
  assert.ok(LOBBY_QR_URL.length <= 62, "a version 4 code at level M: big modules, scans from across the desk");
  const u = new URL(LOBBY_QR_URL);
  assert.equal(getAppTarget({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1", search: u.search }).url, "https://apps.apple.com/ca/app/the-tech-festival-canada/id6820764803");
});

test("where it goes and how big: a column beside the list on an iPad / laptop (≥ 200 px), a chip on a phone (160 px)", () => {
  assert.equal(qrPlacement(1024), "side");
  assert.equal(qrPlacement(768), "side");
  assert.equal(qrPlacement(390), "inline");
  assert.equal(qrSize(1024, 768), 240);
  assert.equal(qrSize(1366, 1024), 240);
  assert.equal(qrSize(768, 1024), 200);
  assert.equal(qrSize(390, 844), 160);
  assert.equal(qrCollapsed(null, 1024), false, "open on an iPad");
  assert.equal(qrCollapsed(null, 390), true, "collapsed on a phone");
  assert.equal(qrCollapsed("1", 1024), true, "what this device chose wins");
  assert.equal(qrCollapsed("0", 390), false);
  assert.equal(QR_FULL_MS, 20000);
});

test("lobby only, never taking the focus, black on white with a quiet zone at level M", () => {
  const qr = readFileSync(new URL("../screens/AppQr.jsx", import.meta.url), "utf8");
  assert.match(qr, /level="M" marginSize=\{4\} bgColor="#FFFFFF" fgColor="#000000"/);
  assert.doesNotMatch(qr, /autoFocus|\.focus\(/, "never moves the focus");
  assert.match(qr, /onPointerDown=\{keepFocus\}/, "its buttons keep the search's focus");
  const screens = ["Desk.jsx", "Meal.jsx", "Media.jsx", "Av.jsx", "Exhibitor.jsx", "Stations.jsx"];
  for (const f of screens) assert.doesNotMatch(readFileSync(new URL(`../screens/${f}`, import.meta.url), "utf8"), /AppQr/, f);
  assert.match(readFileSync(new URL("../screens/Lobby.jsx", import.meta.url), "utf8"), /<AppQr /);
});
