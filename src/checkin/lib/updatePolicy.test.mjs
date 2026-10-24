/* node --test src/checkin/lib/updatePolicy.test.mjs (W7): a new version applies itself only while no station has run
   in this tab; a station once started (in front or hidden, the station picker open over it or not) shows "Update
   ready" instead and is never reloaded on its own. Applied by itself on the Start screen, it comes back there. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { autoUpdateAllowed, createUpdateController, updateScreen } from "./updatePolicy.js";

const controller = () => {
  const applied = [];
  const ready = [];
  const reloads = [];
  const u = createUpdateController({ activate: (w, o) => applied.push([w, o.resume]), reload: (o) => reloads.push(o.resume), onReady: (v) => ready.push(v) });
  return { u, applied, ready, reloads };
};

test("a running station is never reloaded by itself; the tap applies the update and comes back on its Start screen", () => {
  const { u, applied, ready } = controller();
  u.setScreen("station", { station: "desk" });
  u.found("v2");
  assert.deepEqual(applied, [], "the station keeps running (hidden or not)");
  assert.deepEqual(ready, [true], "Update ready shows");
  u.setScreen("station", { station: "desk" });
  assert.deepEqual(applied, []);
  u.applyNow({ station: "desk" });
  assert.deepEqual(applied, [["v2", "desk"]], "the tap: reload, then the desk's Start screen");
  u.applyNow({ station: "desk" });
  assert.deepEqual(applied, [["v2", "desk"]], "once");
});

test("the station picker opened over a running station (Switch station) never applies a waiting update by itself", () => {
  const { u, applied, ready } = controller();
  // The desk is running, an update is waiting.
  u.setScreen(updateScreen({ screen: "station", started: true, startedBefore: true }), { station: "desk" });
  u.found("v2");
  assert.deepEqual(ready, [true]);
  // The header's station button: the picker opens over the running desk (still started, still chiming).
  u.setScreen(updateScreen({ screen: "stations", started: true, startedBefore: true }), { station: "desk" });
  assert.deepEqual(applied, [], "no reload with the picker open");
  // Picked another station and back on a picker later (not started any more): a station has run in this tab, so still not.
  u.setScreen(updateScreen({ screen: "stations", started: false, startedBefore: true }), { station: "" });
  assert.deepEqual(applied, [], "the picker once a station has run here");
  // The lock screen of a running station: not either.
  u.setScreen(updateScreen({ screen: "locked", started: true, startedBefore: true }), { station: "desk" });
  assert.deepEqual(applied, []);
  // Leaving the picker for a Start screen after a station has run here: still not (the Undo of a tap made seconds
  // before the switch would be lost); "Update ready" stays up.
  u.setScreen(updateScreen({ screen: "start", started: false, startedBefore: true }), { station: "lobby" });
  assert.deepEqual(applied, [], "the Start screen once a station has run here");
  assert.equal(u.ready(), true);
  // The tap still applies it, back on that Start screen.
  u.applyNow({ station: "lobby" });
  assert.deepEqual(applied, [["v2", "lobby"]]);
});

test("sign-in, loading, the Start screen and the first pick (no station started in this tab yet) apply an update at once", () => {
  for (const [screen, station, resume] of [["login", "", ""], ["loading", "desk", ""], ["stations", "", ""], ["start", "desk", "desk"]]) {
    const { u, applied } = controller();
    u.setScreen(updateScreen({ screen, started: false, startedBefore: false }), { station });
    u.found("v2");
    assert.deepEqual(applied, [["v2", resume]], screen);
  }
  // Reaching an allowed screen later applies the waiting one.
  const { u, applied } = controller();
  u.setScreen("station", { station: "desk" });
  u.found("v2");
  u.setScreen(updateScreen({ screen: "login" }));
  assert.deepEqual(applied, [["v2", ""]], "signed out: nothing running");
});

test("what each screen counts as", () => {
  assert.equal(updateScreen({ screen: "stations", started: false, startedBefore: false }), "stations", "the first pick");
  assert.equal(updateScreen({ screen: "stations", started: true }), "station", "the picker over a running station");
  assert.equal(updateScreen({ screen: "stations", startedBefore: true }), "station", "a station has run in this tab");
  assert.equal(updateScreen({ screen: "locked" }), "station");
  assert.equal(updateScreen({ screen: "start", startedBefore: true }), "station", "a Start screen after a station ran here");
  assert.equal(updateScreen({ screen: "start" }), "start", "the first Start screen");
  assert.equal(updateScreen({}), "loading");
  assert.equal(autoUpdateAllowed("station"), false);
  // Nothing waiting: the tap is a plain reload (still back on the Start screen).
  const { u, reloads } = controller();
  u.setScreen("station", { station: "desk" });
  u.applyNow({ station: "desk" });
  assert.deepEqual(reloads, ["desk"]);
});
