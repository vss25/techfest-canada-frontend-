// Scheduled broadcasts (src/admin/app/scheduled.js): quiet hours, Toronto times, the form's checks and the list.
// Run: node --test src/admin/app/scheduled.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  AUDIENCES, DEFAULT_QUIET, QUICK_LINKS, TEMPLATES, audienceOf, blankDraft, bodyFrom, checkDraft, clock12, draftFrom, inQuietHours, linkOk, quietFrom, quietLabel, reachText, sortItems,
  whenET,
} from "./scheduled.js";

const T = (iso) => Date.parse(iso);
const NOW = T("2026-10-27T15:00:00-04:00");

test("quiet hours run past midnight (10 PM to 8 AM Toronto by default)", () => {
  assert.equal(inQuietHours(T("2026-10-27T21:59:00-04:00")), false);
  assert.equal(inQuietHours(T("2026-10-27T22:00:00-04:00")), true);
  assert.equal(inQuietHours(T("2026-10-28T03:00:00-04:00")), true);
  assert.equal(inQuietHours(T("2026-10-28T07:59:00-04:00")), true);
  assert.equal(inQuietHours(T("2026-10-28T08:00:00-04:00")), false);
  assert.equal(inQuietHours(T("2026-11-05T23:00:00-05:00")), true); // after the clocks change
  assert.equal(inQuietHours(T("2026-10-27T13:00:00-04:00"), { from: "12:00", to: "14:00", tz: "America/Toronto" }), true);
  assert.deepEqual(quietFrom({ from: "x" }), DEFAULT_QUIET);
  assert.deepEqual(quietFrom(null), DEFAULT_QUIET);
  assert.equal(quietLabel(DEFAULT_QUIET), "10:00 PM to 8:00 AM, Toronto time");
  assert.equal(clock12("08:05"), "8:05 AM");
  assert.equal(clock12("00:00"), "12:00 AM");
});

test("Toronto times as people read them", () => {
  assert.equal(whenET("2026-10-27T19:00:00-04:00"), "Tue Oct 27, 7:00 PM ET");
  assert.equal(whenET(T("2026-11-03T09:30:00-05:00")), "Tue Nov 3, 9:30 AM ET");
  assert.equal(whenET(""), "");
});

test("the form: a new draft avoids the quiet hours; the checks; the body; editing", () => {
  const d = blankDraft(NOW);
  assert.equal(d.sendAt, "2026-10-27T16:00");
  assert.deepEqual([d.feedPost, d.banner, d.notify, d.audience], [true, false, true, "app"]);
  assert.equal(blankDraft(T("2026-10-27T21:10:00-04:00")).sendAt, "2026-10-28T08:00"); // not at 11 PM
  const ok = { ...d, title: "Closing remarks", body: "Join us at Centre Stage at 5 PM.", linkUrl: QUICK_LINKS[2].value };
  assert.deepEqual(checkDraft(ok, NOW), {});
  assert.match(checkDraft({ ...ok, sendAt: "2026-10-27T23:00" }, NOW).sendAt, /quiet hours \(10:00 PM to 8:00 AM, Toronto time\)/);
  assert.deepEqual(checkDraft({ ...ok, sendAt: "2026-10-27T23:00", notify: false }, NOW), {}); // no notification: no quiet hours
  assert.match(checkDraft({ ...ok, sendAt: "2026-10-27T14:00" }, NOW).sendAt, /at least a minute from now/);
  assert.equal(checkDraft({ ...ok, sendAt: "" }, NOW).sendAt, "Pick a date and time.");
  assert.deepEqual(Object.keys(checkDraft({ ...ok, title: " ", body: "", linkUrl: "javascript:alert(1)", feedPost: false, notify: false }, NOW)), ["title", "body", "linkUrl", "channels"]);
  assert.ok(checkDraft({ ...ok, body: "x".repeat(1001) }, NOW).body);
  assert.equal(linkOk("https://www.thetechfestival.com/rate"), true);
  assert.equal(linkOk("ttfc://tab/feed"), true);
  assert.equal(linkOk("http://x.com"), false);
  assert.equal(linkOk(""), true);
  assert.deepEqual(bodyFrom({ ...ok, audience: "checkedIn" }), {
    sendAt: "2026-10-27T16:00:00-04:00", title: "Closing remarks", body: "Join us at Centre Stage at 5 PM.", linkUrl: "ttfc://tab/feed",
    feedPost: true, banner: false, notify: true, audience: "checkedIn",
  });
  assert.deepEqual(draftFrom({ id: "b1", sendAt: "2026-10-27T19:00:00-04:00", title: "T", body: "B", linkUrl: "", feedPost: false, banner: true, notify: true, audience: "checkedIn" }),
    { id: "b1", sendAt: "2026-10-27T19:00", title: "T", body: "B", linkUrl: "", feedPost: false, banner: true, notify: true, audience: "checkedIn" });
  assert.deepEqual(QUICK_LINKS.map((l) => l.value), ["https://www.thetechfestival.com/stay-updated", "https://www.thetechfestival.com/rate", "ttfc://tab/feed", ""]);
});

test("the list: still to send first (soonest first), then the rest (newest first); who it reaches", () => {
  const items = [
    { id: "a", status: "sent", sendAt: "2026-10-27T09:00:00-04:00", recipients: 412 },
    { id: "b", status: "scheduled", sendAt: "2026-10-27T19:00:00-04:00", estimate: 600 },
    { id: "c", status: "cancelled", sendAt: "2026-10-27T12:00:00-04:00" },
    { id: "d", status: "scheduled", sendAt: "2026-10-27T17:00:00-04:00", estimate: 1 },
  ];
  assert.deepEqual(sortItems(items).map((x) => x.id), ["d", "b", "c", "a"]);
  assert.equal(reachText(items[0]), "Sent to 412 people");
  assert.equal(reachText(items[1]), "About 600 people");
  assert.equal(reachText(items[3]), "About 1 person");
  assert.equal(reachText(items[2]), "");
  assert.deepEqual(sortItems(null), []);
});

test("people on an older app version, and the Update the app template", () => {
  assert.deepEqual(AUDIENCES.map((a) => a.key), ["app", "checkedIn", "outdated"]);
  assert.equal(AUDIENCES[2].label, "People on an older app version");
  assert.equal(AUDIENCES[2].hint, "Use after a new version is live and App updates › newest is set");
  assert.equal(audienceOf("outdated"), "outdated");
  assert.equal(audienceOf("everyone"), "app");
  const t = TEMPLATES.find((x) => x.key === "update-app");
  assert.equal(t.label, "Update the app");
  assert.deepEqual({ ...t.fill }, {
    title: "Update the TTFC app",
    body: "A new version of the TTFC app is out. Update now to see today's top networkers, people to meet and more.",
    linkUrl: "https://www.thetechfestival.com/app/install", notify: true, feedPost: false, banner: false, audience: "outdated",
  });
  const NOW = Date.parse("2026-10-27T15:00:00-04:00");
  const d = { ...blankDraft(NOW), ...t.fill };
  assert.deepEqual(checkDraft(d, NOW), {});
  assert.equal(bodyFrom(d).audience, "outdated");
  assert.equal(draftFrom({ audience: "outdated" }).audience, "outdated");
});
