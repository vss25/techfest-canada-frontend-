/* node --test src/checkin/lib/desk.restore.test.mjs (S1): a station's address opened in a NEW session (a reload, a new
   tab, the Home Screen app relaunched on it: the sign-in and the list are kept on the device, the station is the
   address, lib/routes.js; this tab's own memory starts empty) opens straight on the station, without the Start screen,
   so its Start button is never pressed. It counts as a station that has run here the moment it shows: Switch station
   (the home) then never applies a waiting update by itself (the reload would lose the Undo of a tap made seconds
   before), and nor does the Start screen it leads to. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { go, json, net, wait } from "./fakeBrowser.mjs";

const today = { date: "2026-10-26", eventDay: "day1", label: "Day 1" };
const stations = [{ key: "lobby", label: "Lobby", enabled: true }, { key: "desk", label: "Pass desk", enabled: true }];
const user = { id: "uV", name: "Val Volunteer" };
const snap = {
  serverTime: new Date().toISOString(), cursor: 5, today, user, staff: false, stations, windows: {}, stationStates: {},
  guests: [{ key: "g1", keys: ["g1"], name: "Guest One" }], marks: [], notes: {}, queries: [], booths: [],
};
// Kept on the device from the last session: the sign-in and the list; the page opens on the Lobby's address. This tab's
// sessionStorage is empty.
localStorage.setItem("ttfc.desk.session.v1", JSON.stringify({ token: "tok-v", user, identity: user, staff: false, email: "val@x", at: Date.now(), lastUse: Date.now() }));
go("/checkin/lobby");
localStorage.setItem("ttfc.desk.snapshot.v1", JSON.stringify({ userId: user.id, snap }));
net.route = (url) => {
  if (url.includes("/checkin/desk/stream")) return new Promise(() => {});
  if (url.includes("/checkin/desk/snapshot")) return json(snap);
  if (url.includes("/checkin/desk/events")) return json({ events: [], cursor: 5, serverTime: new Date().toISOString() });
  if (url.includes("/checkin/desk/clock")) return json({ serverTime: new Date().toISOString(), today, stationStates: {}, stations, windows: {} });
  return null;
};

const D = await import("./desk.js");
const { appScreen, createUpdateController, stationShown, updateScreen } = await import("./updatePolicy.js");

/** What App.jsx shows and tells the update policy, from the desk as it is now. */
const screenOf = ({ picking = false } = {}) => {
  const d = D.desk;
  const info = d.state?.stations.find((x) => x.key === d.station);
  const screen = appScreen({
    signedIn: !!d.session?.token, needSignIn: d.needSignIn, hasList: !!d.state, station: d.station,
    stationOk: !!info && info.enabled !== false, picking, started: d.started, picked: d.picked, locked: d.locked,
  });
  return { screen, updateAs: updateScreen({ screen, started: d.started, startedBefore: D.startedHere(), picking }) };
};
/** App.jsx's effect on every screen shown. */
const shown = (screen) => { if (stationShown(screen)) D.markShown(); };

test("restored in a new session: straight on the station, never started with the Start button, yet counted as run here", async () => {
  D.boot();
  await wait(40);
  assert.equal(sessionStorage.getItem("ttfc.desk.startedHere"), null, "a new session: this tab's memory is empty");
  assert.equal(D.desk.station, "lobby", "the station the address names");
  assert.equal(D.desk.started, false, "the Start button was never pressed here");
  assert.equal(D.desk.picked, false, "not picked in this tab: no Start screen");
  const first = screenOf();
  assert.equal(first.screen, "station", "opens straight on the Lobby");
  assert.equal(first.updateAs, "station");
  shown(first.screen);
  assert.equal(D.startedHere(), true, "a station has shown in this tab");
  assert.equal(D.desk.started, false, "the sound isn't on until a tap (the sound bar still asks where there is one)");

  // An update arrives while the Lobby runs: "Update ready", no reload.
  const applied = [];
  const u = createUpdateController({ activate: (w, o) => applied.push([w, o.resume]) });
  u.setScreen(first.updateAs, { station: D.desk.station });
  u.found("v2");
  assert.deepEqual(applied, []);
  assert.equal(u.ready(), true);

  // A tap, then Switch station (the home, /checkin/): no reload by itself, the tap's Undo stays.
  D.goHome();
  assert.equal(location.pathname, "/checkin/");
  const picker = screenOf();
  assert.equal(picker.screen, "stations");
  assert.equal(picker.updateAs, "station", "the home after a relaunched station ran here");
  u.setScreen(picker.updateAs, { station: D.desk.station });
  assert.deepEqual(applied, [], "Switch station on a relaunched Lobby never reloads by itself");

  // Its own tile again: the Start screen it leads to waits too.
  D.setStation("lobby");
  assert.equal(location.pathname, "/checkin/lobby");
  const start = screenOf();
  assert.equal(start.screen, "start");
  assert.equal(start.updateAs, "station");
  u.setScreen(start.updateAs, { station: "lobby" });
  assert.deepEqual(applied, [], "nor the Start screen after it");
  u.applyNow({ station: "lobby" });
  assert.deepEqual(applied, [["v2", "lobby"]], "the tap applies it, back on the Lobby's Start screen");
});

test("the picker opened over a station counts as the station even when this tab can't remember (storage blocked)", () => {
  assert.equal(updateScreen({ screen: "stations", started: false, startedBefore: false, picking: true }), "station");
  assert.equal(updateScreen({ screen: "stations", started: false, startedBefore: false, picking: false }), "stations", "the first pick after signing in");
});
