/* node --test src/checkin/lib/desk.boot.test.mjs (W13): a staff sign-in left unused for 30 minutes stays locked
   across a reload or a Home Screen relaunch. The app opens (boot) with the sign-in kept on the device whose last use
   was 31 minutes ago: it's locked before anything shows, and using the lock screen doesn't count as use. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fire, json, net } from "./fakeBrowser.mjs";

const KEY = "ttfc.desk.session.v1";
const now = Date.now();
localStorage.setItem(KEY, JSON.stringify({ token: "tok-a", user: { id: "uA", name: "Alice Staff" }, identity: { id: "uA", name: "Alice Staff" }, staff: true, email: "alice@x", at: now - 2 * 3600e3, lastUse: now - 31 * 60e3 }));
net.route = (url) => (url.includes("/checkin/desk/stream") ? new Promise(() => {}) : url.includes("/checkin/desk/") ? json({ error: "no list in this test" }, 503) : null);

const D = await import("./desk.js");

test("reopened 31 minutes after the last use: locked before the station shows", () => {
  assert.equal(D.desk.locked, false, "nothing decided before boot");
  D.boot();
  assert.equal(D.desk.locked, true);
  assert.equal(D.desk.session.token, "tok-a", "still signed in (arrivals still come in on the lock screen)");
  // Typing on the lock screen isn't use: its last use stays where it was (a reload is still locked).
  fire("pointerdown");
  fire("pagehide");
  assert.equal(JSON.parse(localStorage.getItem(KEY)).lastUse, now - 31 * 60e3);
});
