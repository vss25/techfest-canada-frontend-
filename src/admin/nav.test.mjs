// The admin sidebar and who sees what (nav.js, access.js): no kill switch for anyone (the organiser, Oct 23 2026:
// "we don't need kill switch access as a website admin too. Remove that. Its risky."), and volunteer accounts
// get People only. Run: node --test src/admin/nav.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EVENT_TABS, NAV, WORKSPACES, menuHomeOf, navItemFor, titleFor, workspaceFor } from "./nav.js";
import { FIELD_HELP, HELP, START_HERE, fieldHelpFor } from "./help.js";
import {
  NOT_FOR_VOLUNTEERS, VOLUNTEER_ACCESS, VOLUNTEER_FORBIDDEN, VOLUNTEER_FORBIDDEN_TEXT, accountKind, isVolunteerAccount, navFor, searchGroupsFor,
  volunteerMayOpen, volunteerRecents, workspacesFor,
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
  // The one exception: an old bookmark to /admin/kill-switch lands on a "removed" notice (KillSwitchRemoved), which
  // only shows words and a link back to Overview: it calls nothing and switches nothing.
  const notice = admin.match(/function KillSwitchRemoved\(\) \{[\s\S]*?\n\}\n/)?.[0] || "";
  assert.match(notice, /The kill switch has been removed/);
  assert.doesNotMatch(notice, /fetch|api\.|adminFetch|post\(/);
  assert.match(admin, /<Route path="kill-switch" element={<KillSwitchRemoved \/>} \/>/);
  const rest = admin.replace(notice, "").replace(/<Route path="kill-switch" element={<KillSwitchRemoved \/>} \/>/, "")
    .replace(/\/\* The kill switch was removed for everyone[^\n]*\n/, "");
  assert.doesNotMatch(rest, /KillSwitch|kill-switch|console\/kill/);
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
  // Hidden pages stay out of the menu for everyone; My account is in Settings (the approved design).
  assert.ok(!mgmt.includes("content/home-sponsors"));
  assert.ok(mgmt.includes("account") && staff.includes("account"));
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

test("the search for volunteers: People results only, masked, no pages, never a See all (its link carries the search in an address)", () => {
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
  // "See all in People" would put the search in an address (and Ctrl / ⌘ Enter opens it with a full page load).
  assert.equal(v[0].seeAll, null);
  assert.equal(searchGroupsFor(groups, { isVolunteer: true, exact: true })[0].seeAll, null);
  assert.equal(searchGroupsFor(groups)[1].seeAll.link, "/admin/people?q=jane"); // staff keep it
  assert.deepEqual(volunteerRecents([{ link: "/admin/people/u-1", title: "Jane Doe" }, { link: "/admin/inventory" }, { link: "/admin/content/settings?highlight=k" }]),
    [{ link: "/admin/people/u-1", title: "Jane Doe", subtitle: "" }]);
  // Names that are an email (or its local part) and emails / phone numbers in a subtitle never show (volunteerMask.js).
  const masked = searchGroupsFor([{ key: "people", label: "People", items: [
    { id: "a-1", link: "/admin/people/a-1", title: "yara.leak@example.com", subtitle: "Call 416 555 0199 · Connect Pass" },
    { id: "u-2", link: "/admin/people/u-2", title: "noname.staffer", subtitle: "Account, no pass" },
  ] }], { isVolunteer: true })[0].items;
  assert.deepEqual(masked.map((it) => [it.title, it.subtitle]), [["No name", "Call (hidden) · Connect Pass"], ["No name", "Account, no pass"]]);
  // Staff see the server's results as they are.
  assert.equal(searchGroupsFor([{ key: "people", items: [{ id: "a-1", link: "/admin/people/a-1", title: "yara.leak@example.com" }] }])[0].items[0].title, "yara.leak@example.com");
});

// The approved admin design (Nov 2026): nine workspaces; every page that had a place in the old sidebar still has one,
// at the same address.
test("eight workspaces (Nov 26 2026: Today, Website…), Settings at the bottom of the rail", () => {
  assert.deepEqual(WORKSPACES.map((w) => w.label), ["Today", "Website", "Marketing", "Sales", "People", "Awards", "Event day", "Settings"]);
  assert.deepEqual(WORKSPACES.filter((w) => w.bottom).map((w) => w.id), ["settings"]);
  for (const w of WORKSPACES) assert.ok(w.rail && w.job && w.groups.length, w.id);
});

test("every admin page is in exactly one workspace, and every route in Admin.jsx is reachable", () => {
  const tos = WORKSPACES.flatMap((w) => w.groups.flatMap((g) => g.items.map((it) => it.to)));
  assert.equal(new Set(tos).size, tos.length, "no page twice");
  const routes = [...read("pages/Admin.jsx").matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1])
    .filter((p) => !p.includes(":") && p !== "*" && p !== "content" && p !== "kill-switch");
  for (const r of routes) assert.ok(tos.includes(r), `route ${r} has no place in a workspace`);
});

test("the workspace of a page: the longest match, Home when nothing matches", () => {
  assert.equal(workspaceFor("/admin").id, "home");
  assert.equal(workspaceFor("/admin/content/changes").id, "content");
  assert.equal(workspaceFor("/admin/content/agenda").id, "content");
  assert.equal(workspaceFor("/admin/app/people/123").id, "people");
  assert.equal(workspaceFor("/admin/app/activity").id, "day");
  assert.equal(workspaceFor("/admin/awards/jury").id, "awards");
  assert.equal(workspaceFor("/admin/inventory").id, "sales");
  assert.equal(workspaceFor("/admin/events").id, "content");
  assert.equal(workspaceFor("/admin/nowhere").id, "home");
  assert.equal(navItemFor("/admin/content/agenda").group.title, "Website › Events");
});

// Nov 26 2026: one screen per event. Its pages are tabs, not menu entries; they still open and are still searchable.
test("an event's pages are tabs of one menu entry, Events", () => {
  assert.deepEqual(EVENT_TABS.map((t) => t.label), ["Page", "Agenda", "Speakers", "Partners", "Tickets", "Settings"]);
  for (const to of ["content/agenda", "content/speakers", "content/partners", "content/sponsors", "content/tickets", "events", "content/events"]) {
    assert.equal(menuHomeOf(navItemFor(`/admin/${to}`).item), "content/events", to);
  }
  assert.equal(menuHomeOf(navItemFor("/admin/content/home").item), "content/home");
  const menu = workspacesFor({ isManagement: true }).find((w) => w.id === "content").groups.flatMap((g) => g.items.map((it) => it.to));
  assert.deepEqual(menu.slice(0, 4), ["content/home", "content/events", "content/site-copy", "content/changes"]);
  assert.ok(!menu.includes("content/agenda"));
  assert.ok(navFor({ isManagement: true }).flatMap((g) => g.items.map((it) => it.to)).includes("content/agenda"), "still in search");
});

test("workspaces per account: volunteers People only; staff without management's pages", () => {
  assert.deepEqual(workspacesFor({ isVolunteer: true }).map((w) => [w.id, w.groups.flatMap((g) => g.items.map((it) => it.to))]), [["people", ["people"]]]);
  const staff = workspacesFor({ isManagement: false }).flatMap((w) => w.groups.flatMap((g) => g.items.map((it) => it.to)));
  for (const to of ["analytics", "staff", "awards/results", "content/home-sponsors"]) assert.ok(!staff.includes(to), to);
  const mgmt = workspacesFor({ isManagement: true }).flatMap((w) => w.groups.flatMap((g) => g.items.map((it) => it.to)));
  for (const to of ["analytics", "staff", "awards/results"]) assert.ok(mgmt.includes(to), to);
  assert.ok(!mgmt.includes("content/home-sponsors"));
});

// Nov 2026: "a help section and how to use under each page". Every page in the menu has a guide (help.js), and
// no guide is left behind for a page that no longer exists.
test("every page in the menu has a how-to guide, and every guide belongs to a page", () => {
  const tos = WORKSPACES.flatMap((w) => w.groups.flatMap((g) => g.items.map((it) => it.to)));
  for (const to of tos) {
    const g = HELP[to];
    assert.ok(g, `no guide for ${to || "Overview"}`);
    assert.ok(g.what && g.what.length > 20, `${to}: what`);
    assert.ok(Array.isArray(g.steps) && Array.isArray(g.tips), `${to}: steps and tips`);
  }
  for (const key of Object.keys(HELP)) assert.ok(tos.includes(key), `guide for a page not in the menu: ${key}`);
  assert.ok(START_HERE.length >= 4 && START_HERE.every((s) => s.h && s.p));
});

test("field help: only for pages in the menu, every explanation a real sentence, unknown labels give nothing", () => {
  const tos = WORKSPACES.flatMap((w) => w.groups.flatMap((g) => g.items.map((it) => it.to)));
  for (const [to, fields] of Object.entries(FIELD_HELP)) {
    assert.ok(tos.includes(to), `field help for a page not in the menu: ${to}`);
    for (const [label, text] of Object.entries(fields)) assert.ok(text.length > 20 && /[.!?]$/.test(text), `${to} › ${label}`);
  }
  assert.match(fieldHelpFor("content/events", "City"), /address/);
  assert.equal(fieldHelpFor("content/events", "Nope"), "");
  assert.equal(fieldHelpFor(undefined, "City"), "");
});
