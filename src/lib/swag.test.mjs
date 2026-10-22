import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SWAG_DEFAULTS, fillSwagText, parseToronto, swagBannerLine, swagFrom, swagFromApi, swagHowTo, swagShort, swagWhen, torontoIso, torontoLocalInput,
} from "./swag.js";

const CUTOFF = Date.UTC(2026, 9, 27, 19, 0); // 3 PM EDT
const ANNOUNCE = Date.UTC(2026, 9, 27, 20, 0);

test("Toronto times: ISO, wall clock and back", () => {
  assert.equal(parseToronto("2026-10-27T15:00:00-04:00"), CUTOFF);
  assert.equal(parseToronto("2026-10-27 15:00"), CUTOFF);
  assert.equal(parseToronto("2026-10-27T15:00"), CUTOFF);
  assert.ok(Number.isNaN(parseToronto("")));
  assert.equal(torontoLocalInput(CUTOFF), "2026-10-27T15:00");
  assert.equal(torontoIso("2026-10-27T15:00"), "2026-10-27T15:00:00-04:00");
  // After DST ends (Nov 1): EST.
  assert.equal(torontoIso("2026-11-05T09:30"), "2026-11-05T09:30:00-05:00");
  assert.equal(swagWhen(CUTOFF), "3:00 PM on Tuesday, October 27");
  assert.equal(swagShort(CUTOFF), "Oct 27, 3 PM");
  assert.equal(swagShort(CUTOFF + 30 * 60000), "Oct 27, 3:30 PM");
});

test("defaults, stages and the filled rules", () => {
  const off = swagFrom({});
  assert.equal(off.enabled, false);
  assert.equal(off.stage, "off");
  assert.equal(off.kits, 3);
  assert.equal(off.cutoff, CUTOFF);
  assert.equal(off.title, "Win the TTFC swag kit");
  assert.match(off.rules, /The top 3 people on the leaderboard at 3:00 PM on Tuesday, October 27 each win/);
  assert.match(off.rules, /told in the app at 4:00 PM on Tuesday, October 27/);

  const on = { ...SWAG_DEFAULTS, "swag.enabled": "true", "swag.kits": "5" };
  assert.equal(swagFrom(on, CUTOFF - 1).stage, "open");
  assert.equal(swagFrom(on, CUTOFF).stage, "closed");
  assert.equal(swagFrom(on, ANNOUNCE).stage, "announced");
  assert.equal(swagBannerLine(swagFrom(on, CUTOFF - 1)), "Top 5 at Oct 27, 3 PM win");
  assert.equal(swagBannerLine(swagFrom(on, ANNOUNCE + 1)), "Winners announced — check your notifications");
  assert.equal(swagHowTo(swagFrom(on)).length, 3);
});

test("bad values fall back", () => {
  const s = swagFrom({ "swag.kits": "lots", "swag.cutoff": "soon", "swag.title": "  ", "swag.rules": "" });
  assert.equal(s.kits, 3);
  assert.equal(s.cutoff, CUTOFF);
  assert.equal(s.title, "Win the TTFC swag kit");
  assert.match(s.rules, /^Earn points in the TTFC app/);
  assert.equal(fillSwagText("{kits} by {cutoff}", { kits: 2, cutoff: CUTOFF, announce: ANNOUNCE }), "2 by 3:00 PM on Tuesday, October 27");
});

test("the server's answer (GET /api/app/swag)", () => {
  const r = {
    enabled: true, title: "Win the TTFC swag kit", kits: 3, cutoff: "2026-10-27T15:00:00-04:00", announce: "2026-10-27T16:00:00-04:00",
    cutoffLabel: "3:00 PM on Tuesday, October 27", cutoffShort: "Oct 27, 3 PM", announceLabel: "4:00 PM on Tuesday, October 27",
    rules: "Filled rules.", phase: "closed", announced: false, rulesUrl: "https://www.thetechfestival.com/swag",
  };
  const s = swagFromApi(r);
  assert.equal(s.stage, "closed");
  assert.equal(s.cutoff, CUTOFF);
  assert.equal(s.rules, "Filled rules.");
  assert.equal(swagBannerLine({ ...s, stage: "open" }), "Top 3 at Oct 27, 3 PM win");
  assert.equal(swagFromApi({ ...r, enabled: false }).stage, "off");
  assert.equal(swagFromApi({ ...r, phase: "announced" }).stage, "announced");
  assert.equal(swagFromApi(null), null);
  assert.equal(swagFromApi({ error: "x" }), null);
});
