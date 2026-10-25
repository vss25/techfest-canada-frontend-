/* node --test src/admin/checkin/deskLink.test.mjs (C5 / W19): the Admin card shows the desk link the server sends
   (GET /api/checkin/desk/info), and only a path of the desk's own shape. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STATION_LINKS, deskUrl, isDeskPath, stationUrl } from "./deskLink.js";
import { STATION_SLUGS, routeOf } from "../../checkin/lib/routes.js";

test("/checkin/ (and the older /checkin-<token>/ form) is a desk path; the link is the site's origin plus it", () => {
  assert.equal(isDeskPath("/checkin/"), true);
  assert.equal(isDeskPath("/checkin-abc123def456/"), true);
  for (const bad of ["", null, undefined, 42, "/checkin", "/Checkin/", "/check-in/", "/checkin//", "/checkin/x/", "/checkin-/", "/checkin-ABC/",
    "https://evil.example/checkin/", "https://evil.example/checkin-abc123def456/", "/checkin-abc123def456", "//evil.example/checkin/", "/admin/"]) {
    assert.equal(isDeskPath(bad), false, String(bad));
  }
  assert.equal(deskUrl("https://www.thetechfestival.com", "/checkin/"), "https://www.thetechfestival.com/checkin/");
  assert.equal(deskUrl("https://thetechfestival.com/", "/checkin/"), "https://thetechfestival.com/checkin/");
  assert.equal(deskUrl("https://thetechfestival.com/", "/checkin-abc123def456/"), "https://thetechfestival.com/checkin-abc123def456/");
  assert.equal(deskUrl("https://thetechfestival.com", "javascript:alert(1)"), "");
  assert.equal(deskUrl("https://thetechfestival.com", "/checkin"), "");
});

test("each station's link (Oct 24 2026): the desk app's own addresses, in the home's order", () => {
  assert.deepEqual(Object.fromEntries(STATION_LINKS.map((x) => [x.key, x.slug])), { ...STATION_SLUGS });
  for (const x of STATION_LINKS) assert.equal(routeOf(`/checkin/${x.slug}`).station, x.key, x.slug);
  assert.equal(stationUrl("https://www.thetechfestival.com", "/checkin/", "lobby"), "https://www.thetechfestival.com/checkin/lobby");
  assert.equal(stationUrl("https://www.thetechfestival.com", "/checkin/", "floor-1"), "https://www.thetechfestival.com/checkin/floor-1");
  assert.equal(stationUrl("https://www.thetechfestival.com", "/nope/", "lobby"), "");
});
