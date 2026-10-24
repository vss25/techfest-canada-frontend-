/* node --test src/checkin/lib/updatePolicy.test.mjs (W7): a new version applies itself only while no station is
   running; a running station (in front or hidden) shows "Update ready" instead and is never reloaded on its own. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { autoUpdateAllowed, createUpdateController } from "./updatePolicy.js";

test("a running station is never reloaded by itself; leaving it (or the tap) applies the update", () => {
  const applied = [];
  const ready = [];
  const u = createUpdateController({ activate: (w) => applied.push(w), onReady: (v) => ready.push(v) });
  u.setScreen("station");
  u.found("v2");
  assert.deepEqual(applied, [], "the station keeps running (hidden or not)");
  assert.deepEqual(ready, [true], "Update ready shows");
  u.setScreen("station");
  assert.deepEqual(applied, []);
  u.setScreen("stations");
  assert.deepEqual(applied, ["v2"], "on the station picker it applies");
  u.applyNow();
  assert.deepEqual(applied, ["v2"], "once");
});

test("on the sign-in, loading and Start screens an update applies at once; the tap applies it on a station", () => {
  for (const screen of ["login", "loading", "stations", "start"]) {
    const applied = [];
    const u = createUpdateController({ activate: (w) => applied.push(w) });
    u.setScreen(screen);
    u.found("v2");
    assert.deepEqual(applied, ["v2"], screen);
  }
  assert.equal(autoUpdateAllowed("station"), false);
  const applied = [];
  let reloaded = 0;
  const u = createUpdateController({ activate: (w) => applied.push(w), reload: () => { reloaded += 1; } });
  u.setScreen("station");
  u.applyNow();
  assert.equal(reloaded, 1, "nothing waiting: a plain reload");
  u.found("v3");
  u.applyNow();
  assert.deepEqual(applied, ["v3"]);
});
