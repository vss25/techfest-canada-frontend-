import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SWAG_DEFAULTS, fillSwagText, parseToronto, swagBannerLine, swagFrom, swagFromApi, swagHowTo, swagShort, swagWhen, torontoIso, torontoLocalInput,
} from "./swag.js";

const T3PM = Date.UTC(2026, 9, 27, 19, 0); // Oct 27, 3 PM EDT (date helpers)
const CUTOFF = Date.UTC(2026, 9, 26, 20, 0); // the default: Oct 26, 4 PM EDT
const ANNOUNCE = Date.UTC(2026, 9, 26, 21, 0); // 5 PM: the end of Day 1

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

test("defaults, stages and the filled rules", () => {
  const off = swagFrom({});
  assert.equal(off.enabled, false);
  assert.equal(off.stage, "off");
  assert.equal(off.kits, 3);
  assert.equal(off.cutoff, CUTOFF);
  assert.equal(off.title, "Win the TTFC swag kit");
  assert.match(off.rules, /^Only people using the TTFC app can win/);
  assert.match(off.rules, /The top 3 people on the leaderboard at 4:00 PM on Monday, October 26 each win/);
  assert.match(off.rules, /told in the app at the end of Day 1 \(5:00 PM on Monday, October 26\)/);
  assert.equal(off.pitch, "Only people using the TTFC app can win");

  const on = { ...SWAG_DEFAULTS, "swag.enabled": "true", "swag.kits": "5" };
  assert.equal(swagFrom(on, CUTOFF - 1).stage, "open");
  assert.equal(swagFrom(on, CUTOFF).stage, "closed");
  assert.equal(swagFrom(on, ANNOUNCE).stage, "announced");
  assert.equal(swagBannerLine(swagFrom(on, CUTOFF - 1)), "Only app users can win · Top 5 at Oct 26, 4 PM");
  assert.equal(swagBannerLine(swagFrom(on, CUTOFF + 1)), "Points are in. Winners at the end of Day 1");
  assert.equal(swagBannerLine(swagFrom(on, ANNOUNCE + 1)), "Winners announced — check your notifications");
  assert.equal(swagHowTo(swagFrom(on)).length, 3);
});

test("bad values fall back", () => {
  const s = swagFrom({ "swag.kits": "lots", "swag.cutoff": "soon", "swag.title": "  ", "swag.rules": "" });
  assert.equal(s.kits, 3);
  assert.equal(s.cutoff, CUTOFF);
  assert.equal(s.title, "Win the TTFC swag kit");
  assert.match(s.rules, /^Only people using the TTFC app can win/);
  assert.equal(fillSwagText("{kits} by {cutoff}", { kits: 2, cutoff: T3PM, announce: ANNOUNCE }), "2 by 3:00 PM on Tuesday, October 27");
});

test("the server's answer (GET /api/app/swag)", () => {
  const r = {
    enabled: true, title: "Win the TTFC swag kit", kits: 3, cutoff: "2026-10-26T16:00:00-04:00", announce: "2026-10-26T17:00:00-04:00",
    cutoffLabel: "4:00 PM on Monday, October 26", cutoffShort: "Oct 26, 4 PM", announceLabel: "5:00 PM on Monday, October 26",
    rules: "Filled rules.", phase: "closed", announced: false, rulesUrl: "https://www.thetechfestival.com/swag",
    appOnly: true, pitch: "Only people using the TTFC app can win.",
  };
  const s = swagFromApi(r);
  assert.equal(s.stage, "closed");
  assert.equal(s.cutoff, CUTOFF);
  assert.equal(s.rules, "Filled rules.");
  assert.equal(s.pitch, "Only people using the TTFC app can win");
  assert.equal(s.appOnly, true);
  assert.equal(swagBannerLine({ ...s, stage: "open" }), "Only app users can win · Top 3 at Oct 26, 4 PM");
  assert.equal(swagFromApi({ ...r, pitch: undefined }).pitch, "Only people using the TTFC app can win");
  assert.equal(swagFromApi({ ...r, enabled: false }).stage, "off");
  assert.equal(swagFromApi({ ...r, phase: "announced" }).stage, "announced");
  assert.equal(swagFromApi(null), null);
  assert.equal(swagFromApi({ error: "x" }), null);
});
