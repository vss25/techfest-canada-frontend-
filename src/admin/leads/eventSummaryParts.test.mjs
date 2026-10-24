// Admin › Event summary's pure parts (eventSummaryParts.js): the Toronto "as of" time, percentages, dietary chips and
// the CSV of the tables. Run: node --test src/admin/leads/eventSummaryParts.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { csvFileName, dietChips, pctText, summaryCsv, torontoTime } from "./eventSummaryParts.js";

const DIET = [{ key: "vegetarian", label: "Vegetarian" }, { key: "vegan", label: "Vegan" }, { key: "halal", label: "Halal" }, { key: "other", label: "Other" }];
const line = (o) => ({ people: 0, rsvpd: 0, notRsvpd: 0, day1: 0, day2: 0, bothDays: 0, pending: 0, pendingRsvpd: 0, pct: null, ...o });
const sample = () => ({
  builtAt: "2026-10-23T18:41:00.000Z",
  refundsChecked: true,
  days: [{ key: "day1", label: "Day 1", date: "2026-10-26" }, { key: "day2", label: "Day 2", date: "2026-10-27" }],
  totals: line({ people: 8, rsvpd: 6, notRsvpd: 2, day1: 4, day2: 4, bothDays: 2, pending: 1, pct: 75 }),
  passes: {
    rows: [
      { tier: "power", label: "Power Pass", ...line({ people: 2, rsvpd: 2, day1: 1, day2: 2, pct: 100 }) },
      { tier: "speaker", label: "Speaker Pass", ...line({ people: 1, pending: 1, pct: 0 }) },
    ],
    total: { tier: "total", label: "Total with a pass", ...line({ people: 8, rsvpd: 6, day1: 4, day2: 4, pending: 1, pct: 75 }) },
    marks: [{ key: "vip", label: "VIP (flag)", ...line({ people: 1, rsvpd: 1, day1: 1, pct: 100 }) }],
  },
  meals: {
    dietaryKeys: DIET,
    rows: [
      { key: "gala", label: "Day 2 dinner: Gala Dinner & Networking Reception", entitled: 5, entitledPending: 1, rsvpd: 3, outsidePass: 0, pct: 60, noNeeds: 1,
        dietary: { vegetarian: 1, vegan: 0, halal: 2, other: 1 } },
    ],
    allRsvps: { label: "Everyone who RSVP'd", rsvpd: 6, noNeeds: 3, dietary: { vegetarian: 1, vegan: 1, halal: 2, other: 1 } },
  },
  checkin: {
    checkedIn: 6, day1: 2, day2: 2, otherDay: 1, noTime: 1, notRsvpd: 1,
    byPass: [{ tier: "power", label: "Power Pass", people: 2, checkedIn: 1, day1: 1, day2: 0, otherDay: 0, noTime: 0, notRsvpd: 0 }],
  },
});

test("as of: the time in Toronto (EDT in October), whatever the computer's time zone", () => {
  assert.equal(torontoTime("2026-10-23T18:41:00.000Z"), "Fri 23 Oct, 2:41 PM");
  assert.equal(torontoTime("2026-10-27T03:30:00.000Z"), "Mon 26 Oct, 11:30 PM");
  assert.equal(torontoTime(null), "");
  assert.equal(torontoTime("nope"), "");
});

test("percentages", () => {
  assert.equal(pctText(75), "75%");
  assert.equal(pctText(0), "0%");
  assert.equal(pctText(null), "—");
  assert.equal(pctText(undefined), "—");
});

test("dietary chips: only the needs someone ticked, biggest first, ties in the RSVP page's order", () => {
  const s = sample();
  assert.deepEqual(dietChips(s.meals.rows[0], DIET), [
    { key: "halal", label: "Halal", count: 2 }, { key: "vegetarian", label: "Vegetarian", count: 1 }, { key: "other", label: "Other", count: 1 },
  ]);
  assert.deepEqual(dietChips({}, DIET), []);
  assert.deepEqual(dietChips(null, null), []);
});

test("CSV: every table, the dietary columns, the check-in caveat in its title, no names", () => {
  const csv = summaryCsv(sample());
  const rows = csv.trimEnd().split("\r\n");
  assert.equal(rows[0], "TTFC 2026 event summary");
  assert.equal(rows[1], "As of (Toronto time),\"Fri 23 Oct, 2:41 PM\"");
  assert.ok(rows.includes("Pass type,People,RSVP'd,% RSVP'd,Day 1,Day 2,Pending,Pending RSVP'd"));
  assert.ok(rows.includes("Power Pass,2,2,100%,1,2,0,0"));
  assert.ok(rows.includes("Speaker Pass,1,0,0%,0,0,1,0"));
  assert.ok(rows.includes("Total with a pass,8,6,75%,4,4,1,0"));
  assert.ok(rows.includes("VIP (flag),1,1,100%,1,0,0,0"));
  assert.ok(rows.includes("6,4,4,2"), "Of the RSVPs: Day 1, Day 2, both");
  assert.ok(rows.includes("Item,People entitled,Entitled (pending),RSVP'd,% RSVP'd,RSVP'd outside their pass,No dietary needs,Vegetarian,Vegan,Halal,Other"));
  assert.ok(rows.includes("Day 2 dinner: Gala Dinner & Networking Reception,5,1,3,60%,0,1,1,0,2,1"));
  assert.ok(rows.includes("Everyone who RSVP'd,,,6,,,3,1,1,2,1"));
  assert.ok(rows.includes('"Check-in (each person\'s first scan, Toronto time)"'));
  assert.ok(rows.includes("Power Pass,2,1,1,0,0,0,0"));
  assert.ok(rows.includes("Total,8,6,2,2,1,1,1"));
  assert.ok(!csv.includes("@"));
  assert.ok(!rows.some((r) => r.startsWith("Note,")), "no refund note when refunds were checked");
});

test("CSV: the refund caveat when Stripe couldn't be read, formula-looking text defused, nothing for no answer", () => {
  const s = sample();
  s.refundsChecked = false;
  s.passes.rows[0].label = "=HYPERLINK(\"x\")";
  const csv = summaryCsv(s);
  assert.match(csv, /^Note,"Refunds could not be checked/m);
  assert.match(csv, /^"'=HYPERLINK\(""x""\)",2,2,100%/m);
  assert.equal(summaryCsv(null), "");
});

test("CSV: attendance by day (the check-in desk's counts, C10) when the server sends them; nothing for an older one", () => {
  const s = sample();
  assert.ok(!summaryCsv(s).includes("Attendance by day"), "no attendance from this server: no section");
  const meal = (o) => ({ admitted: 0, entitled: 0, rsvpd: 0, admittedOfRsvpd: 0, noShows: 0, overrides: 0, notRsvpdAdmitted: 0, ...o });
  s.attendance = {
    builtAt: "2026-10-26T14:00:00Z",
    days: [{ day: "day1", date: "2026-10-26", label: "Day 1 · Mon Oct 26", arrived: 512, checkedIn: 498, passesCollectedToDate: 498,
      meals: { cxo: meal({ admitted: 41, entitled: 60, rsvpd: 45, admittedOfRsvpd: 38, noShows: 7, overrides: 2 }), lunch: meal({}), dinner: meal({ key: "awards" }) },
      byPass: { power: { arrived: 100, checkedIn: 99, cxo: 20, lunch: 90, dinner: 0 } }, issuePass: { arrived: 3, issued: 2 }, noDetails: { recorded: 4, sentToHelp: 1, passIssued: 2, left: 1 } }],
  };
  const rows = summaryCsv(s).trimEnd().split("\r\n");
  assert.ok(rows.some((r) => r.startsWith("Attendance by day")));
  assert.ok(rows.includes("Measure,Day 1 · Mon Oct 26 (2026-10-26),Day 2 · Tue Oct 27 (2026-10-27)"));
  assert.ok(rows.includes("Arrived (lobby),512,"), "a day with no counts yet is blank");
  assert.ok(rows.includes("CxO Breakfast: admitted,41,"));
  assert.ok(rows.includes("CxO Breakfast: % of RSVP'd admitted,84%,"));
  assert.ok(rows.includes("CxO Breakfast: overrides (Admit anyway),2,"));
  assert.ok(rows.includes("No details found: recorded,4,"));
  assert.ok(rows.includes("Day 1 · Mon Oct 26,Power Pass,,100,99,20,90,0"));
  assert.ok(!summaryCsv(s).includes("@"));
});

test("file name from the build time in Toronto", () => {
  assert.equal(csvFileName("2026-10-23T18:41:00.000Z"), "ttfc-event-summary-2026-10-23-1441.csv");
  assert.equal(csvFileName("2026-10-27T03:05:00.000Z"), "ttfc-event-summary-2026-10-26-2305.csv");
});
