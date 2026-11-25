// Settings › Staff activity: the tracker's rule, the page's helpers, and that only the super admin sees the page.
// Run: node --test src/admin/app/staffActivityRules.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ACTIVE_WINDOW_MS, formatDuration, heatLevel, hourLabel, hourSpan, rangeFor, shouldBeat, statusText, sumTotals } from "./staffActivityRules.js";
import { mayOpenItem, navFor, workspacesFor } from "../access.js";
import { NAV } from "../nav.js";

const read = (rel) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");
const tos = (groups) => groups.flatMap((g) => g.items).map((it) => it.to);
const wsTos = (ws) => ws.flatMap((w) => w.groups.flatMap((g) => g.items.map((it) => it.to)));

test("heartbeat only while the tab is visible and used in the last 5 minutes", () => {
  const now = 1_000_000_000;
  assert.equal(shouldBeat({ lastInputAt: now - 1000, now, visible: true }), true);
  assert.equal(shouldBeat({ lastInputAt: now - ACTIVE_WINDOW_MS, now, visible: true }), true);
  assert.equal(shouldBeat({ lastInputAt: now - ACTIVE_WINDOW_MS - 1, now, visible: true }), false, "open but nobody using it");
  assert.equal(shouldBeat({ lastInputAt: now - 1000, now, visible: false }), false, "hidden tab");
});

test("durations, hours, ranges and shading", () => {
  assert.equal(formatDuration(0), "0 min");
  assert.equal(formatDuration(20), "1 min");
  assert.equal(formatDuration(59 * 60), "59 min");
  assert.equal(formatDuration(3600), "1 h");
  assert.equal(formatDuration(3720), "1 h 2 min");
  assert.deepEqual([0, 9, 12, 23].map(hourLabel), ["12 AM", "9 AM", "12 PM", "11 PM"]);
  assert.deepEqual(hourSpan([{ hour: 11, activeSeconds: 60, pageViews: 1, edits: 0 }, { hour: 9, activeSeconds: 120, pageViews: 2, edits: 1 }]).map((h) => [h.hour, h.pageViews]),
    [[9, 2], [10, 0], [11, 1]]);
  assert.deepEqual(hourSpan([]), []);
  assert.deepEqual([0, 60, 900, 2000, 3600].map(heatLevel), [0, 1, 2, 3, 4]);
  assert.deepEqual(rangeFor("7", new Date(2026, 10, 24, 9)), { from: "2026-11-18", to: "2026-11-24" });
  assert.deepEqual(rangeFor("today", new Date(2026, 10, 24, 9)), { from: "2026-11-24", to: "2026-11-24" });
  assert.deepEqual(rangeFor("30", new Date(2026, 2, 5, 9)), { from: "2026-02-04", to: "2026-03-05" });
  assert.deepEqual(["active", "signout", "idle"].map((status) => statusText({ status })), ["Active now", "Signed out", "Went idle"]);
  assert.deepEqual(sumTotals([{ totals: { activeSeconds: 60, sessions: 1, pageViews: 2, edits: 3 } }, { totals: { activeSeconds: 40, sessions: 2, pageViews: 0, edits: 1 } }]),
    { activeSeconds: 100, sessions: 3, pageViews: 2, edits: 4 });
});

test("Staff activity is in the menu for the super admin only (not staff, management or volunteers)", () => {
  const item = NAV.flatMap((g) => g.items).find((it) => it.to === "app/staff-activity");
  assert.equal(item?.superAdmin, true);
  assert.ok(tos(navFor({ isManagement: true, isSuperAdmin: true })).includes("app/staff-activity"));
  assert.ok(wsTos(workspacesFor({ isManagement: true, isSuperAdmin: true })).includes("app/staff-activity"));
  for (const who of [{ isManagement: true }, { isManagement: false }, { isVolunteer: true }, { isVolunteer: true, isSuperAdmin: true }]) {
    assert.ok(!tos(navFor(who)).includes("app/staff-activity"), JSON.stringify(who));
    assert.ok(!wsTos(workspacesFor(who)).includes("app/staff-activity"), JSON.stringify(who));
    assert.equal(mayOpenItem(item, who), false);
  }
  // The audit log stays for all staff.
  assert.ok(tos(navFor({ isManagement: false })).includes("app/audit"));
});

test("the page, search and wiring: the super admin only, the tracker in the panel, sign-in and sign-out reported", () => {
  const page = read("admin/app/StaffActivity.jsx");
  assert.match(page, /isSuperAdmin \? `\/admin\/staff-activity/, "asks the server only for the super admin");
  assert.match(page, /Only the super admin can see staff activity/);
  assert.match(read("admin/search/adminIndex.js"), /if \(it\.superAdmin\) continue;/);
  const admin = read("pages/Admin.jsx");
  assert.match(admin, /<Route path="app\/staff-activity" element={<StaffActivity \/>} \/>/);
  assert.match(admin, /useStaffActivityTracker\(\{ enabled: kind === "staff"/);
  assert.match(admin, /isSuperAdmin: !!a\.isSuperAdmin/);
  assert.match(admin, /SIGNOUT_PATH/);
  assert.match(read("pages/AdminLogin.tsx"), /panel: "admin"/);
  for (const f of ["admin/WorkspaceNav.jsx", "admin/WorkspaceHub.jsx", "admin/HelpGuide.jsx"]) {
    assert.doesNotMatch(read(f), /workspacesFor\(\{ isManagement, isVolunteer \}\)/, f);
  }
});
