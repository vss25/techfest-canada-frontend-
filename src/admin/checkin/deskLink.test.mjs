/* node --test src/admin/checkin/deskLink.test.mjs (C5 / W19): the Admin card shows the desk link the server sends
   (GET /api/checkin/desk/info), and only a path of the desk's own shape. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { deskUrl, isDeskPath } from "./deskLink.js";

test("only /checkin-<token>/ is a desk path; the link is the site's origin plus it", () => {
  assert.equal(isDeskPath("/checkin-abc123def456/"), true);
  for (const bad of ["", null, "/checkin-/", "/checkin-ABC/", "https://evil.example/checkin-abc123def456/", "/checkin-abc123def456", "/admin/"]) assert.equal(isDeskPath(bad), false, String(bad));
  assert.equal(deskUrl("https://thetechfestival.com/", "/checkin-abc123def456/"), "https://thetechfestival.com/checkin-abc123def456/");
  assert.equal(deskUrl("https://thetechfestival.com", "javascript:alert(1)"), "");
});
