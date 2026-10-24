/* node --test src/admin/checkin/deskLink.test.mjs (C5 / W19): the Admin card shows the desk link the server sends
   (GET /api/checkin/desk/info), and only a path of the desk's own shape. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { deskUrl, isDeskPath } from "./deskLink.js";

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
