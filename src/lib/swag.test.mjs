// The leaderboard as appreciation (src/lib/swag.js): the settings, what shows when, the server's answer, and no prize
// words where people read them. Run: node --test src/lib/swag.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEADERBOARD_PAGE_TITLE, NETWORKERS_TITLE, SWAG_DEFAULTS, fillSwagText, leaderboardHowTo, networkersView, parseToronto, swagFrom, swagFromApi,
  swagShort, swagWhen, torontoIso, torontoLocalInput,
} from "./swag.js";

const T3PM = Date.UTC(2026, 9, 27, 19, 0); // Oct 27, 3 PM EDT (date helpers)
const ANNOUNCE = Date.UTC(2026, 9, 27, 21, 0); // the default: Tuesday Oct 27, 5 PM EDT

test("Toronto times: ISO, wall clock and back", () => {
  assert.equal(parseToronto("2026-10-27T15:00:00-04:00"), T3PM);
  assert.equal(parseToronto("2026-10-27 15:00"), T3PM);
  assert.equal(parseToronto("2026-10-27T15:00"), T3PM);
  assert.ok(Number.isNaN(parseToronto("")));
  assert.equal(torontoLocalInput(T3PM), "2026-10-27T15:00");
  assert.equal(torontoIso("2026-10-27T15:00"), "2026-10-27T15:00:00-04:00");
  // After DST ends (Nov 1): EST.
  assert.equal(torontoIso("2026-11-05T09:30"), "2026-11-05T09:30:00-05:00");
  assert.equal(swagWhen(T3PM), "3:00 PM on Tuesday, October 27");
  assert.equal(swagShort(T3PM), "Oct 27, 3 PM");
  assert.equal(swagShort(T3PM + 30 * 60000), "Oct 27, 3:30 PM");
});

test("appreciation, not a prize (Oct 27 2026): the defaults, the celebration switch and the filled text", () => {
  const s = swagFrom({}, T3PM);
  assert.equal(s.enabled, false); // the old apps' prize banner: off
  assert.equal(s.stage, "off");
  assert.equal(s.celebrate, true);
  assert.equal(s.phase, "open");
  assert.equal(s.kits, 3);
  assert.equal(s.announce, ANNOUNCE);
  assert.equal(s.title, NETWORKERS_TITLE);
  assert.match(s.rules, /appreciation for starting conversations and meeting people/);
  assert.match(s.rules, /At 5:00 PM on Tuesday, October 27 we'll celebrate the top 3 networkers/);
  assert.equal(swagFrom({}, ANNOUNCE).phase, "announced");
  assert.equal(swagFrom({ "swag.celebrate": "false" }).celebrate, false);
  assert.equal(swagFrom({ "swag.celebrate": false }).celebrate, false);
  assert.equal(SWAG_DEFAULTS["swag.celebrate"], true);
  assert.equal(leaderboardHowTo(s).length, 3);
  assert.match(leaderboardHowTo(s)[2], /The top 3 networkers are celebrated in the app/);
  assert.equal(LEADERBOARD_PAGE_TITLE, "How the leaderboard works");
});

test("what shows when: before the announce time, after it, and with the celebration off", () => {
  const before = networkersView(swagFrom({}, T3PM), T3PM);
  assert.equal(before.on, true);
  assert.equal(before.before, true);
  assert.equal(before.announced, false);
  assert.equal(before.line, "Start conversations and meet people. At 5:00 PM on Tuesday, October 27 we'll celebrate the top 3 networkers.");
  const after = networkersView(swagFrom({}, ANNOUNCE), ANNOUNCE + 1);
  assert.equal(after.before, false);
  assert.equal(after.announced, true);
  assert.deepEqual(after.winners, []); // nothing until the server sends them
  const off = networkersView(swagFrom({ "swag.celebrate": false }, T3PM), T3PM);
  assert.deepEqual([off.on, off.before, off.announced], [false, false, false]);
  const kits5 = networkersView(swagFrom({ "swag.kits": "5" }, T3PM), T3PM);
  assert.match(kits5.line, /the top 5 networkers/);
});

test("bad values fall back", () => {
  const s = swagFrom({ "swag.kits": "lots", "swag.announce": "soon", "swag.title": "  ", "swag.rules": "" });
  assert.equal(s.kits, 3);
  assert.equal(s.announce, ANNOUNCE);
  assert.equal(s.title, NETWORKERS_TITLE);
  assert.match(s.rules, /^The TTFC 2026 leaderboard is our appreciation/);
  assert.equal(fillSwagText("{kits} by {cutoff}", { kits: 2, cutoff: T3PM, announce: ANNOUNCE }), "2 by 3:00 PM on Tuesday, October 27");
});

test("the server's answer (GET /api/app/swag): celebrate (missing = true), mode, phase without the old banner", () => {
  const r = {
    enabled: false, title: "Top networkers of TTFC 2026", kits: 3, cutoff: "2026-10-27T17:00:00-04:00", announce: "2026-10-27T17:00:00-04:00",
    announceLabel: "5:00 PM on Tuesday, October 27", rules: "Appreciation text.", phase: "open", announced: false, mode: "appreciation",
  };
  const s = swagFromApi(r);
  assert.equal(s.stage, "off");
  assert.equal(s.phase, "open");
  assert.equal(s.celebrate, true);
  assert.equal(s.mode, "appreciation");
  assert.equal(s.rules, "Appreciation text.");
  assert.equal(networkersView(s, T3PM).before, true);
  assert.equal(swagFromApi({ ...r, celebrate: false }).celebrate, false);
  assert.equal(networkersView(swagFromApi({ ...r, celebrate: false }), T3PM).on, false);
  assert.equal(swagFromApi({ ...r, enabled: true, phase: "announced" }).stage, "announced");
  assert.equal(swagFromApi({ celebrate: true, phase: "open" }).celebrate, true);
  assert.equal(swagFromApi(null), null);
  assert.equal(swagFromApi({ error: "x" }), null);
});

test("the top networkers: only once announced (whatever the old banner), in rank order, tidied", async () => {
  const { swagWinnersFrom } = await import("./swag.js");
  const base = { enabled: false, kits: 3, cutoff: "2026-10-26T16:00:00-04:00", announce: "2026-10-26T17:00:00-04:00", phase: "announced", announced: true };
  const winners = [
    { rank: 2, name: " Maya Singh ", organization: "Aurora", avatarUrl: "/f/m.jpg", points: "410", userId: "u2" },
    { rank: 1, name: "Daniel Okafor", organization: "Lakeshore", points: 640, userId: "u1" },
    { rank: 3, name: "", points: 1, userId: "u3" },
    { rank: 4, name: "Again", points: 2, userId: "u1" },
    null,
  ];
  const s = swagFromApi({ ...base, winners });
  assert.deepEqual(s.winners.map((w) => [w.rank, w.name, w.points, w.userId]), [[1, "Daniel Okafor", 640, "u1"], [2, "Maya Singh", 410, "u2"]]);
  assert.equal(s.winners[1].avatarUrl, "/f/m.jpg");
  assert.equal(s.announcedAt, Date.parse("2026-10-26T17:00:00-04:00"));
  assert.equal(swagFromApi({ ...base, winners, announcedAt: "2026-10-26T17:12:00-04:00" }).announcedAt, Date.parse("2026-10-26T17:12:00-04:00"));
  assert.equal(swagFromApi({ ...base, winners, announced: { at: "2026-10-26T17:20:00-04:00" } }).announcedAt, Date.parse("2026-10-26T17:20:00-04:00"));
  assert.deepEqual(swagFromApi({ ...base, phase: "closed", winners }).winners, []);
  assert.deepEqual(swagWinnersFrom("x"), []);
  assert.equal(networkersView(s, Date.parse("2026-10-26T17:30:00-04:00")).winners.length, 2);
  assert.equal(networkersView({ ...s, celebrate: false }, Date.parse("2026-10-26T17:30:00-04:00")).winners.length, 0);
});

// Oct 27 2026, the organiser: the leaderboard is appreciation, not a prize. Nothing people read in the web app, the
// /swag page or the swag helper may promise a swag kit or talk about winning one (comments are left out).
test("no prize words in what people read: the web app, /swag and the swag helper", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|jsx)$/.test(name) && !/\.test\./.test(name)) files.push(full);
    }
  };
  walk(join(root, "app"));
  files.push(join(root, "lib", "swag.js"), join(root, "pages", "Swag.jsx"));
  const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  // "you won" but not "you won't".
  const bad = /swag kit|\byou won(?!['’])\b|\bwin a\b/i;
  const found = files.filter((f) => bad.test(stripComments(readFileSync(f, "utf8")))).map((f) => f.slice(root.length));
  assert.deepEqual(found, []);
});
