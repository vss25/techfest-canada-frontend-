// The admin sidebar and who sees what (nav.js, access.js): no kill switch for anyone (the organiser, Oct 23 2026:
// "we don't need kill switch access as a website admin too. Remove that. Its risky."), and volunteer accounts
// get People only. Run: node --test src/admin/nav.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NAV, navItemFor, titleFor } from "./nav.js";
import {
  NOT_FOR_VOLUNTEERS, VOLUNTEER_ACCESS, VOLUNTEER_FORBIDDEN, VOLUNTEER_FORBIDDEN_TEXT, accountKind, isVolunteerAccount, navFor, searchGroupsFor,
  volunteerMayOpen, volunteerRecents,
} from "./access.js";

const src = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
const read = (rel) => readFileSync(src(rel), "utf8");
const allItems = (groups) => groups.flatMap((g) => g.items);
const KILLISH = /kill|maintenance|site live|offline|take.*down/i;

test("no kill switch anywhere in the sidebar, for management, staff or volunteers", () => {
  for (const it of allItems(NAV)) {
    assert.doesNotMatch(it.to, KILLISH, it.to);
    assert.doesNotMatch(it.label, KILLISH, it.label);
  }
  for (const who of [{ isManagement: true }, { isManagement: false }, { isVolunteer: true }]) {
    assert.ok(!allItems(navFor(who)).some((it) => KILLISH.test(it.to) || KILLISH.test(it.label)), JSON.stringify(who));
  }
  assert.equal(navItemFor("/admin/kill-switch"), null);
  assert.equal(titleFor("/admin/kill-switch"), "Overview");
});

test("the website build has no kill-switch page, header chip, banner, search entry or maintenance gate", () => {
  assert.equal(existsSync(src("admin/staff/KillSwitch.jsx")), false);
  assert.equal(existsSync(src("components/MaintenanceGate.jsx")), false);
  const admin = read("pages/Admin.jsx");
  assert.doesNotMatch(admin, /KillSwitch|kill-switch|console\/kill/);
  assert.doesNotMatch(admin, /setKill|reloadKill/);
  assert.doesNotMatch(read("admin/AdminShell.jsx"), /SiteStatusChip|\/admin\/kill-switch|Site OFFLINE|Site live"/);
  assert.doesNotMatch(read("admin/sections/Overview.jsx"), /kill/i);
  assert.doesNotMatch(read("admin/adminContext.js"), /kill/i);
  assert.doesNotMatch(read("admin/search/adminIndex.js"), /kill-switch/);
  assert.doesNotMatch(read("App.jsx"), /MaintenanceGate/);
  // Nothing on the website asks for the old status or switch any more.
  for (const f of ["App.jsx", "pages/Admin.jsx", "admin/AdminShell.jsx", "admin/sections/Overview.jsx"]) {
    assert.doesNotMatch(read(f), /["'`]\/status["'`]|\/api\/status|\/console\/kill-switch/, f);
  }
});

test("staff and management keep their sidebar: management-only items for management only", () => {
  const staff = allItems(navFor({ isManagement: false })).map((it) => it.to);
  const mgmt = allItems(navFor({ isManagement: true })).map((it) => it.to);
  for (const to of ["", "people", "issued-passes", "event-summary", "check-in", "content/agenda", "inventory", "app/rights", "app/audit"]) {
    assert.ok(staff.includes(to), `staff: ${to}`);
    assert.ok(mgmt.includes(to), `management: ${to}`);
  }
  for (const to of ["analytics", "staff", "awards/results"]) {
    assert.ok(!staff.includes(to), `staff must not see ${to}`);
    assert.ok(mgmt.includes(to), `management sees ${to}`);
  }
  // Hidden pages stay out of the sidebar for everyone.
  assert.ok(!mgmt.includes("account") && !mgmt.includes("content/home-sponsors"));
  // More still folds away for staff.
  assert.equal(navFor({ isManagement: true }).find((g) => g.title === "More")?.collapsible, true);
});

test("volunteers: the sidebar is People only", () => {
  const groups = navFor({ isVolunteer: true });
  assert.deepEqual(allItems(groups).map((it) => [it.to, it.label]), [["people", "People"]]);
  assert.ok(groups.every((g) => !g.collapsible));
  // Even if the access object claims management, a volunteer never gets more.
  assert.deepEqual(allItems(navFor({ isVolunteer: true, isManagement: true })).map((it) => it.to), ["people"]);
});

test("account kinds: staff (role admin), volunteer, or none", () => {
  assert.equal(accountKind({ role: "admin" }), "staff");
  assert.equal(accountKind({ role: "volunteer" }), "volunteer");
  // An app account that carries the volunteer TYPE is still an app account.
  assert.equal(accountKind({ role: "user", types: ["volunteer"] }), "none");
  assert.equal(accountKind(null), "none");
  assert.equal(isVolunteerAccount({ role: "volunteer" }), true);
  assert.equal(isVolunteerAccount({ role: "admin" }), false);
  assert.deepEqual({ ...VOLUNTEER_ACCESS }, { staffRole: "volunteer", isManagement: false, isVolunteer: true });
  assert.ok(Object.isFrozen(VOLUNTEER_ACCESS));
});

test("volunteers may open People and one person's profile, nothing else", () => {
  for (const p of ["/admin/people", "/admin/people/", "/admin/people/u-123", "/admin/people/a-abc%20def"]) assert.equal(volunteerMayOpen(p), true, p);
  for (const p of [
    "/admin", "/admin/", "/admin/kill-switch", "/admin/attendees", "/admin/analytics", "/admin/inventory", "/admin/content/settings", "/admin/app/text",
    "/admin/app/people", "/admin/app/people/u-1", "/admin/staff", "/admin/account", "/admin/marketing/attending", "/admin/marketing/rsvp-reminders",
    "/admin/people/u-1/delete", "/admin/people-export", "/admin/check-in", "/admin/app/audit", "/admin/app/rights",
  ]) assert.equal(volunteerMayOpen(p), false, p);
  assert.equal(NOT_FOR_VOLUNTEERS, "Not available for volunteer accounts");
  assert.equal(VOLUNTEER_FORBIDDEN, "volunteer_forbidden");
  assert.equal(VOLUNTEER_FORBIDDEN_TEXT, "Volunteer accounts can only look up people.");
});

test("the search for volunteers: People results only, no pages, no See all for an exact email or ticket ID", () => {
  const groups = [
    { key: "tickets", label: "Tickets", items: [{ id: "t1", link: "/admin/attendees?q=x" }] },
    { key: "people", label: "People", items: [{ id: "u-1", link: "/admin/people/u-1" }, { id: "x", link: "/admin/app/people/1" }],
      seeAll: { label: "See all in People", link: "/admin/people?q=jane" } },
    { key: "staff", label: "Staff accounts", items: [{ id: "s", link: "/admin/staff?highlight=s" }] },
  ];
  assert.equal(searchGroupsFor(groups), groups); // staff: unchanged
  const v = searchGroupsFor(groups, { isVolunteer: true });
  assert.deepEqual(v.map((g) => g.key), ["people"]);
  assert.deepEqual(v[0].items.map((it) => it.id), ["u-1"]);
  assert.equal(v[0].seeAll.link, "/admin/people?q=jane");
  assert.equal(searchGroupsFor(groups, { isVolunteer: true, exact: true })[0].seeAll, null);
  assert.deepEqual(volunteerRecents([{ link: "/admin/people/u-1" }, { link: "/admin/inventory" }, { link: "/admin/content/settings?highlight=k" }]), [{ link: "/admin/people/u-1" }]);
});
