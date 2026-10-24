/* node --test src/checkin/lib/desk.resume.test.mjs: "Update ready" tapped in a version from before the station
   addresses (Oct 24 2026) reloaded the home (/checkin/) with the station to resume: the new version opens that
   station's address, on its Start screen (one tap: sound back on). An address naming no station opens the home. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { go, json, net } from "./fakeBrowser.mjs";

const user = { id: "uV", name: "Val Volunteer" };
localStorage.setItem("ttfc.desk.session.v1", JSON.stringify({ token: "tok-v", user, identity: user, staff: false, email: "val@x", at: Date.now(), lastUse: Date.now() }));
sessionStorage.setItem("ttfc.desk.resume", "lobby");
net.route = (url) => (url.includes("/checkin/desk/stream") ? new Promise(() => {}) : url.includes("/checkin/desk/") ? json({ error: "no list in this test" }, 503) : null);
go("/checkin/?source=pwa");

const D = await import("./desk.js");
const { routeOf } = await import("./routes.js");

test("resumed from an older version's update: the Lobby's address, its Start screen", () => {
  D.boot();
  assert.equal(D.desk.station, "lobby");
  assert.equal(D.desk.picked, true);
  assert.equal(location.pathname, "/checkin/lobby");
  assert.equal(sessionStorage.getItem("ttfc.desk.resume"), null, "used once");
});

test("an address that names no station is the home", () => {
  for (const p of ["/checkin/", "/checkin", "/checkin/index.html", "/checkin/nope", "/checkin/lobby/extra", "/checkin/%E0%A4%A"]) assert.equal(routeOf(p).station, "", p);
  assert.equal(routeOf("/checkin/nope").canonical, "/checkin/");
});
