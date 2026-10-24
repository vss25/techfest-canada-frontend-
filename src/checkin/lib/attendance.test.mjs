/* node --test src/checkin/lib/attendance.test.mjs (C10): attendance by day as the Event summary and the desk's staff
   Counts screen show it, and the Event summary CSV's lines. The server counts; this only words it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { attendanceCsvRows, attendanceDays, attendanceView, mealCell, passGroupLabel, pctOfRsvpd } from "./attendance.js";

const meal = (o) => ({ admitted: 0, entitled: 0, rsvpd: 0, admittedOfRsvpd: 0, noShows: 0, overrides: 0, notRsvpdAdmitted: 0, ...o });
const ATT = {
  builtAt: "2026-10-26T14:00:00Z",
  days: [
    // Day 2 first: the page still shows Day 1, then Day 2.
    { day: "day2", date: "2026-10-27", label: "Day 2 · Tue Oct 27", arrived: 0, checkedIn: 0, passesCollectedToDate: 410,
      meals: { cxo: meal({ label: "CxO Breakfast", entitled: 60, rsvpd: 40 }), lunch: meal({ label: "Networking Luncheon" }), dinner: meal({ key: "gala", label: "Gala Dinner & Networking Reception", entitled: 300 }) },
      byPass: {}, issuePass: { arrived: 0, issued: 0 }, noDetails: { recorded: 0, sentToHelp: 0, passIssued: 0, left: 0 } },
    { day: "day1", date: "2026-10-26", label: "Day 1 · Mon Oct 26", arrived: 512, checkedIn: 498, passesCollectedToDate: 498,
      meals: {
        cxo: meal({ label: "CxO Breakfast", admitted: 41, entitled: 60, rsvpd: 45, admittedOfRsvpd: 38, noShows: 7, overrides: 2, notRsvpdAdmitted: 3 }),
        lunch: meal({ label: "Networking Luncheon", admitted: 300, entitled: 520, rsvpd: 350, admittedOfRsvpd: 290, noShows: 60, overrides: 0, notRsvpdAdmitted: 10 }),
        dinner: meal({ key: "awards", label: "Catalyst Awards Night", admitted: 0, entitled: 280, rsvpd: 0 }),
      },
      // As the server sends it: every colour group, with its label and how many people are in it.
      byPass: { power: { label: "Power Pass", people: 120, arrived: 100, checkedIn: 99, cxo: 20, lunch: 90, dinner: 0 }, vip: { label: "VIP", people: 14, arrived: 12, checkedIn: 12, cxo: 10, lunch: 11, dinner: 0 },
        connect: { label: "Connect Pass", people: 350, arrived: 300, checkedIn: 290, cxo: 0, lunch: 150, dinner: 0 }, apex: { label: "Apex Pass", people: 0, arrived: 0, checkedIn: 0, cxo: 0, lunch: 0, dinner: 0 },
        mystery_group: { arrived: 1, checkedIn: 1, cxo: 0, lunch: 0, dinner: 0 } },
      issuePass: { people: 9, arrived: 3, issued: 2 }, noDetails: { recorded: 4, open: 0, sentToHelp: 1, passIssued: 2, left: 1, linked: 0 } },
  ],
};

test("each meal: admitted / entitled, then RSVP'd · % of RSVP'd · no-shows · overrides", () => {
  const c = mealCell(ATT.days[1].meals.cxo);
  assert.equal(c.main, "41 / 60");
  assert.equal(c.sub, "45 RSVP’d · 84% of RSVP’d · 7 no-shows · 2 overrides · 3 admitted without an RSVP");
  assert.equal(pctOfRsvpd({ rsvpd: 0, admittedOfRsvpd: 0 }), null, "no RSVPs: no percentage");
  assert.equal(mealCell(meal({ entitled: 5 })).sub, "0 RSVP’d · 0 no-shows · 0 overrides");
  assert.equal(mealCell(meal({ noShows: 1, overrides: 1 })).sub, "0 RSVP’d · 1 no-show · 1 override");
  assert.equal(mealCell(null).main, "—");
});

test("the table: Day 1 then Day 2; arrived, checked in, the three meals (the evening's own name), issue pass, no details", () => {
  const v = attendanceView(ATT);
  assert.deepEqual(v.days.map((d) => d.key), ["day1", "day2"]);
  assert.deepEqual(v.rows.map((r) => r.key), ["arrived", "checkedIn", "cxo", "lunch", "dinner", "issuePass", "noDetails"]);
  const row = (k) => v.rows.find((r) => r.key === k);
  assert.deepEqual(row("arrived").cells.map((c) => c.main), ["512", "0"]);
  assert.deepEqual(row("checkedIn").cells.map((c) => c.sub), ["498 passes collected to date", "410 passes collected to date"]);
  assert.deepEqual(row("dinner").cells.map((c) => c.label), ["Catalyst Awards Night", "Gala Dinner & Networking Reception"]);
  assert.equal(row("lunch").cells[0].main, "300 / 520");
  assert.equal(row("issuePass").cells[0].main, "3 arrived · 2 issued");
  assert.equal(row("issuePass").cells[0].sub, "of 9 people on the list with no pass; passes issued at the desk");
  assert.equal(row("noDetails").cells[0].main, "4");
  assert.equal(row("noDetails").cells[0].sub, "1 sent to the help desk · 2 pass issued · 1 left");
  assert.equal(v.empty, false);
  // By pass: the desk's colour group order (VIP, Media, Speaker, then the pass types), anything else after; a group
  // nobody is in is left out.
  assert.deepEqual(v.byPass.map((d) => d.day), ["day1"], "a day with no breakdown has no table");
  assert.deepEqual(v.byPass[0].rows.map((r) => r.label), ["VIP", "Connect Pass", "Power Pass", "Mystery group"]);
  assert.deepEqual(v.byPass[0].rows[0], { key: "vip", label: "VIP", people: 14, arrived: 12, checkedIn: 12, cxo: 10, lunch: 11, dinner: 0 });
  assert.equal(v.byPass[0].rows[3].people, null, "no head count sent: none shown");
  // The server's own percentage wins; the day's label gets its date.
  assert.equal(mealCell({ ...ATT.days[1].meals.cxo, pctOfRsvpd: 85 }).pct, 85);
  assert.equal(attendanceDays({ days: [{ day: "day1", label: "Day 1" }] })[0].label, "Day 1 · Mon Oct 26");
});

test("an older server (no attendance) or a missing day: shown empty, never a crash", () => {
  const v = attendanceView(undefined);
  assert.equal(v.empty, true);
  assert.deepEqual(v.days.map((d) => d.label), ["Day 1 · Mon Oct 26", "Day 2 · Tue Oct 27"]);
  assert.ok(v.rows.every((r) => r.cells.every((c) => c.main === "—")));
  const one = attendanceView({ days: [ATT.days[1]] });
  assert.deepEqual(one.rows[0].cells.map((c) => c.main), ["512", "—"]);
  assert.deepEqual(attendanceDays({ days: [{ day: "other" }, null] }).map((d) => d.data), [null, null]);
  assert.equal(passGroupLabel("media"), "Media");
  assert.equal(passGroupLabel("speaker"), "Speaker");
  assert.equal(passGroupLabel("mystery_group"), "Mystery group");
  assert.deepEqual(attendanceCsvRows(null), []);
});

test("the CSV lines: one row per measure with a column per day, then the by-pass breakdown", () => {
  const rows = attendanceCsvRows(ATT);
  const find = (label) => rows.find((r) => r[0] === label);
  assert.deepEqual(rows[1], ["Measure", "Day 1 · Mon Oct 26 (2026-10-26)", "Day 2 · Tue Oct 27 (2026-10-27)"]);
  assert.deepEqual(find("Arrived (lobby)"), ["Arrived (lobby)", 512, 0]);
  assert.deepEqual(find("CxO Breakfast: admitted"), ["CxO Breakfast: admitted", 41, 0]);
  assert.deepEqual(find("CxO Breakfast: % of RSVP'd admitted"), ["CxO Breakfast: % of RSVP'd admitted", "84%", "0%"]);
  assert.deepEqual(find("Dinner (Awards Night / Gala): entitled"), ["Dinner (Awards Night / Gala): entitled", 280, 300]);
  assert.deepEqual(find("No details found: left"), ["No details found: left", 1, 0]);
  assert.deepEqual(find("Issue pass: issued at the desk"), ["Issue pass: issued at the desk", 2, 0]);
  const header = rows.findIndex((r) => r[0] === "Day" && r[1] === "Pass type");
  assert.ok(header > 0);
  assert.deepEqual(rows[header + 1], ["Day 1 · Mon Oct 26", "VIP", 14, 12, 12, 10, 11, 0]);
  assert.deepEqual(find("Issue pass: people on the list with no pass"), ["Issue pass: people on the list with no pass", 9, ""]);
  // No names or emails anywhere.
  assert.ok(!JSON.stringify(rows).includes("@"));
});
