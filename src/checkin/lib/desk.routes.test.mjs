/* node --test src/checkin/lib/desk.routes.test.mjs (Oct 24 2026, the organiser: "Lobby, Floor 1, etc. should be
   thetechfestival.com/checkin/lobby etc."): the station is the page's address (lib/routes.js). A typed variant is put
   right in the address bar at boot; picking a station is a new history entry (its Start screen); the browser's back /
   forward switch stations straight away (as a reload does); Switch station is the home (/checkin/); nothing about the
   station is kept in the device's storage; a station that ran in this tab is never reloaded by an update on its own,
   even when this tab's storage is blocked. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { back, forward, go, historyLength, json, net, wait } from "./fakeBrowser.mjs";

const today = { date: "2026-10-26", eventDay: "day1", label: "Day 1" };
const stations = ["lobby", "desk", "breakfast", "lunch", "evening", "media", "av", "exhibitor"].map((key) => ({ key, label: { lobby: "Lobby", desk: "Floor 1", breakfast: "CxO Breakfast", lunch: "Lunch", evening: "Evening entry", media: "Media desk", av: "AV station", exhibitor: "Exhibitor desk" }[key], enabled: true }));
const user = { id: "uV", name: "Val Volunteer" };
const snap = {
  serverTime: new Date().toISOString(), cursor: 5, today, user, staff: false, stations, windows: {}, stationStates: {},
  guests: [{ key: "g1", keys: ["g1"], name: "Guest One" }], marks: [], notes: {}, queries: [], booths: [],
};
localStorage.setItem("ttfc.desk.session.v1", JSON.stringify({ token: "tok-v", user, identity: user, staff: false, email: "val@x", at: Date.now(), lastUse: Date.now() }));
// An older version's remembered station is ignored: the address decides.
localStorage.setItem("ttfc.desk.station", "media");
net.route = (url) => {
  if (url.includes("/checkin/desk/stream")) return new Promise(() => {});
  if (url.includes("/checkin/desk/snapshot")) return json(snap);
  if (url.includes("/checkin/desk/events")) return json({ events: [], cursor: 5, serverTime: new Date().toISOString() });
  if (url.includes("/checkin/desk/clock")) return json({ serverTime: new Date().toISOString(), today, stationStates: {}, stations, windows: {} });
  return null;
};
go("/checkin/Floor1/");

const D = await import("./desk.js");
const { appScreen, updateScreen } = await import("./updatePolicy.js");
const screen = () => {
  const d = D.desk;
  const info = d.state?.stations.find((x) => x.key === d.station);
  return appScreen({ signedIn: !!d.session?.token, hasList: !!d.state, station: d.station, stationOk: !!info, started: d.started, picked: d.picked, locked: d.locked });
};

test("boot: a typed variant of a station's address opens that station and the address is put right (no new history entry)", async () => {
  D.boot();
  await wait(40);
  assert.equal(D.desk.station, "desk", "/checkin/Floor1/ is Floor 1");
  assert.equal(location.pathname, "/checkin/floor-1");
  assert.equal(historyLength(), 1, "replaced, not pushed");
  assert.equal(D.desk.picked, false, "opened on its address: straight on the station, no Start screen");
  assert.equal(screen(), "station");
  assert.equal(localStorage.getItem("ttfc.desk.station"), "media", "the old remembered station is never read nor written");
  assert.match(document.title, /Floor 1 · TTFC Check-in$/, "the tab and the history entry say which station");
});

test("picking a station: its address (a new history entry), then its Start screen; back / forward switch stations at once; the home is /checkin/", () => {
  D.setStation("lunch");
  assert.equal(location.pathname, "/checkin/lunch");
  assert.equal(historyLength(), 2);
  assert.equal(D.desk.picked, true);
  assert.equal(screen(), "start", "just picked here: the Start screen (one tap: sound and the screen kept awake)");
  D.markStarted();
  assert.equal(screen(), "station");
  back();
  assert.equal(D.desk.station, "desk", "back: Floor 1 again");
  assert.equal(location.pathname, "/checkin/floor-1");
  assert.equal(screen(), "station", "straight on it, like a reload");
  forward();
  assert.equal(D.desk.station, "lunch");
  assert.equal(screen(), "station");
  D.goHome();
  assert.equal(location.pathname, "/checkin/");
  assert.equal(D.desk.station, "");
  assert.equal(screen(), "stations", "the home: the station picker");
  back();
  assert.equal(D.desk.station, "lunch", "back from the home: the station it came from");
  // The More stations follow the same addresses.
  for (const [key, path] of [["media", "/checkin/media"], ["av", "/checkin/av-station"], ["exhibitor", "/checkin/exhibitor-desk"], ["breakfast", "/checkin/cxo-breakfast"], ["evening", "/checkin/evening"], ["lobby", "/checkin/lobby"]]) {
    D.setStation(key);
    assert.equal(location.pathname, path, key);
  }
  // Something that isn't a station: the home.
  D.setStation("nope");
  assert.equal(location.pathname, "/checkin/");
  assert.equal(D.desk.station, "");
});

test("a station that ran in this tab counts as run even when this tab's storage is blocked: the home never applies an update by itself", () => {
  const real = sessionStorage.setItem;
  const realGet = sessionStorage.getItem;
  sessionStorage.setItem = () => { throw new Error("blocked"); };
  sessionStorage.getItem = () => { throw new Error("blocked"); };
  try {
    D.setStation("lobby");
    D.markShown();
    D.goHome();
    assert.equal(D.startedHere(), true);
    assert.equal(updateScreen({ screen: "stations", started: D.desk.started, startedBefore: D.startedHere() }), "station");
  } finally {
    sessionStorage.setItem = real;
    sessionStorage.getItem = realGet;
  }
});
