/* node --test src/checkin/lib/routes.test.mjs: every station's own address (Oct 24 2026). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY_STATIONS, MORE_STATIONS, STATION_SLUGS, routeOf, stationFromPath, stationPath } from "./routes.js";
import { STATION_KEYS } from "./stationTime.js";

test("the address map: the home, the five day stations, the three under More", () => {
  assert.equal(stationPath(""), "/checkin/");
  assert.deepEqual(Object.fromEntries(STATION_KEYS.map((k) => [k, stationPath(k)])), {
    lobby: "/checkin/lobby", desk: "/checkin/floor-1", breakfast: "/checkin/cxo-breakfast", lunch: "/checkin/lunch", evening: "/checkin/evening",
    media: "/checkin/media", av: "/checkin/av-station", exhibitor: "/checkin/exhibitor-desk",
  });
  assert.deepEqual([...DAY_STATIONS, ...MORE_STATIONS].sort(), [...STATION_KEYS].sort(), "every station is on the home");
  for (const k of STATION_KEYS) assert.deepEqual(routeOf(stationPath(k)), { station: k, canonical: null }, k);
  assert.deepEqual(routeOf("/checkin/"), { station: "", canonical: null });
  assert.equal(stationPath("nope"), "/checkin/");
});

test("typed variants are forgiven and put right; anything else is the home", () => {
  const cases = {
    "/checkin/Lobby": ["lobby", "/checkin/lobby"], "/checkin/lobby/": ["lobby", "/checkin/lobby"], "/checkin/LOBBY//": ["lobby", "/checkin/lobby"],
    "/checkin/floor1": ["desk", "/checkin/floor-1"], "/checkin/Floor-1": ["desk", "/checkin/floor-1"], "/checkin/floor%201": ["desk", "/checkin/floor-1"], "/checkin/pass-desk": ["desk", "/checkin/floor-1"],
    "/checkin/breakfast": ["breakfast", "/checkin/cxo-breakfast"], "/checkin/cxo": ["breakfast", "/checkin/cxo-breakfast"], "/checkin/CxO_Breakfast": ["breakfast", "/checkin/cxo-breakfast"],
    "/checkin/luncheon": ["lunch", "/checkin/lunch"], "/checkin/gala": ["evening", "/checkin/evening"], "/checkin/awards": ["evening", "/checkin/evening"], "/checkin/evening-entry": ["evening", "/checkin/evening"],
    "/checkin/av": ["av", "/checkin/av-station"], "/checkin/AV-Station": ["av", "/checkin/av-station"], "/checkin/exhibitor": ["exhibitor", "/checkin/exhibitor-desk"], "/checkin/media-desk": ["media", "/checkin/media"],
    "/checkin": ["", "/checkin/"], "/checkin/index.html": ["", "/checkin/"], "/checkin/nope": ["", "/checkin/"], "/checkin/lobby/x": ["", "/checkin/"], "/checkin/desk": ["desk", "/checkin/floor-1"],
  };
  for (const [p, [station, canonical]] of Object.entries(cases)) assert.deepEqual(routeOf(p), { station, canonical }, p);
  assert.equal(stationFromPath("/somewhere/else"), "");
  assert.equal(new Set(Object.values(STATION_SLUGS)).size, 8, "eight distinct addresses");
  for (const slug of Object.values(STATION_SLUGS)) assert.match(slug, /^[a-z0-9-]+$/);
});
