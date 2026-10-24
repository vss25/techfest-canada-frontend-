/* node --test src/lib/programme.test.mjs: /programme's key times (from the live agenda, and the fallback), the agenda
   summary's helpers, the speaker search and the exhibitor list's parsing (a fake fetch: nothing leaves the machine). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEY_TIMES_FALLBACK, boothLabel, byZone, dayParts, exhibitorsFrom, initialOf, keyTimes, loadExhibitors, momentOf, partOfDay,
  peopleLine, sessionCount, sessionWhen, siteLabel, speakerMatches, timeRange,
} from "./programme.js";
import { PASS_FEATURES, PASS_FEATURE_MAP, passesWith } from "../data/passFeatures.js";
import { SESSIONS } from "../data/agenda.js";

/* The live agenda's meals and evenings as the CMS had them on Oct 24 2026 (useAgenda's toSession shape), plus a few
   sessions around them. */
const LIVE = [
  { id: "5834c02a", day: 1, time: "07:55", endTime: "08:55", title: "CxO Breakfast", type: "Break", format: "networking", isBreak: true, stage: "Pier 5", description: "Exclusive morning networking for VIP delegates." },
  { id: "d1-01", day: 1, time: "08:55", endTime: "09:00", title: "Opening Remarks + Land Acknowledgement", type: "Opening Remarks", format: "opening", speakers: [{ name: "Baldeep Singh Pahwa" }, { name: "Lubna Soni" }] },
  { id: "d1-07", day: 1, time: "10:30", endTime: "10:40", title: "AM Break", type: "Break", format: "break", isBreak: true },
  { id: "d1-x", day: 1, time: "11:55", endTime: "12:25", title: "Past the Pilot: AI, Identity and the Plumbing of Finance", type: "Panel Session", format: "panel", pillar: "ai", sector: "fintech",
    speakers: [{ name: "Joe Greenwood" }, { name: "Fatema Pirone" }, { name: "Peyman Pardis" }, { name: "Extra Person" }], moderator: { name: "Subramanian Viswanathan" } },
  { id: "d1-13", day: 1, time: "12:35", endTime: "13:20", title: "Networking Lunch", type: "Lunch Break", format: "networking", isBreak: true, stage: "Harbour Foyer" },
  { id: "d1-y", day: 1, time: "13:30", endTime: "14:00", title: "Lunch with the Regulators", type: "Panel Session", format: "panel" },   // a panel, not lunch
  { id: "d1-24", day: 1, time: "17:30", endTime: "18:30", title: "Awards Evening", type: "Awards", format: "awards", isBreak: true, featured: true },
  { id: "d2-yfql", day: 2, time: "07:55", endTime: "08:55", title: "CxO Breakfast", type: "Break", format: "networking", isBreak: true, stage: "Pier 5" },
  { id: "d2-11", day: 2, time: "12:00", endTime: "12:45", title: "Lunch", type: "Lunch Break", format: "networking", isBreak: true, stage: "Harbour Foyer" },
  { id: "d2-21", day: 2, time: "17:30", endTime: "19:30", title: "Gala Dinner", type: "Gala", format: "awards", isBreak: true, featured: true, stage: "Harbour Foyer" },
];
const summary = (r) => r.days.map((d) => [d.day, d.items.map((i) => `${i.name} ${i.when}${i.fallback ? " (fallback)" : ""}`)]);

test("key times from the live agenda: names, times, rooms, the session to open, what includes it", () => {
  const r = keyTimes(LIVE, { live: true });
  assert.equal(r.live, true);
  assert.deepEqual(summary(r), [
    [1, ["CxO Breakfast 7:55–8:55 AM", "Networking Lunch 12:35–1:20 PM", "Catalyst Awards Evening 5:30 PM"]],
    [2, ["CxO Breakfast 7:55–8:55 AM", "Lunch 12:00–12:45 PM", "Gala Dinner & Networking Reception 5:30–7:30 PM"]],
  ]);
  const [d1, d2] = r.days;
  assert.deepEqual([d1.label, d1.date, d2.label, d2.date], ["Day 1", "Oct 26", "Day 2", "Oct 27"]);
  const breakfast = d1.items[0];
  assert.deepEqual([breakfast.key, breakfast.label, breakfast.stage, breakfast.sessionId, breakfast.description],
    ["breakfast", "Breakfast", "Pier 5", "5834c02a", "Exclusive morning networking for VIP delegates."]);
  // "Included with": the Tickets page's public table, nothing invented.
  assert.deepEqual(breakfast.includedWith, ["Apex"]);
  assert.deepEqual(d1.items[1].includedWith, ["Influence", "Power", "Apex"]);
  assert.deepEqual(d1.items[2].includedWith, ["Power", "Apex"]);
  assert.deepEqual(d2.items[2].includedWith, ["Power", "Apex"]);
  assert.equal(d1.items[2].endTime, "");                                 // the awards evening: its start only
  assert.deepEqual([d2.items[2].time, d2.items[2].endTime, d2.items[2].stage], ["17:30", "19:30", "Harbour Foyer"]);
});

test("a session staff move moves here too; one renamed past recognition falls back to the known time", () => {
  const moved = LIVE.map((s) => (s.id === "d2-11" ? { ...s, time: "12:15", endTime: "13:00" } : s.id === "d1-24" ? { ...s, title: "Catalyst Awards Night", time: "18:00" } : s));
  const r = keyTimes(moved, { live: true });
  assert.deepEqual(r.days[1].items[1].when, "12:15–1:00 PM");
  assert.deepEqual([r.days[0].items[2].name, r.days[0].items[2].when], ["Catalyst Awards Night", "6:00 PM"]);
  const renamed = LIVE.map((s) => (s.id === "d2-21" ? { ...s, title: "Closing Reception", type: "Reception" } : s));
  const g = keyTimes(renamed, { live: true }).days[1].items[2];
  assert.deepEqual([g.key, g.name, g.when, g.fallback, g.sessionId], ["gala", "Gala Dinner & Networking Reception", "5:30–7:30 PM", true, ""]);
});

test("the live agenda can't be read: the fallback times (never the older bundled agenda's)", () => {
  for (const r of [keyTimes(SESSIONS, { live: false }), keyTimes([], { live: false }), keyTimes(undefined), keyTimes([], { live: true })]) {
    assert.equal(r.live, false);
    assert.deepEqual(summary(r), [
      [1, ["CxO Breakfast 7:55–8:55 AM (fallback)", "Networking Lunch 12:35–1:20 PM (fallback)", "Catalyst Awards Evening 5:30 PM (fallback)"]],
      [2, ["CxO Breakfast 7:55–8:55 AM (fallback)", "Lunch 12:00–12:45 PM (fallback)", "Gala Dinner & Networking Reception 5:30–7:30 PM (fallback)"]],
    ]);
    assert.ok(r.days.every((d) => d.items.every((i) => i.includedWith.length && i.sessionId === "")));
  }
  assert.equal(KEY_TIMES_FALLBACK[1].length + KEY_TIMES_FALLBACK[2].length, 6);
});

test("what counts as a key moment: meals, breaks and evening events only", () => {
  assert.deepEqual(LIVE.map(momentOf), ["breakfast", "", "", "", "lunch", "", "awards", "breakfast", "lunch", "gala"]);
  assert.equal(momentOf({ title: "Awards: Who Wins in AI?", format: "panel" }), "");
  assert.equal(momentOf({ title: "Networking Luncheon", format: "networking" }), "lunch");
  assert.equal(momentOf(null), "");
});

test("times: ranges in one AM/PM, across noon, start only", () => {
  assert.equal(timeRange("07:55", "08:55"), "7:55–8:55 AM");
  assert.equal(timeRange("11:30", "12:15"), "11:30 AM–12:15 PM");
  assert.equal(timeRange("17:30", "18:30", { startOnly: true }), "5:30 PM");
  assert.equal(timeRange("17:30", "17:30"), "5:30 PM");
  assert.equal(timeRange("17:30", ""), "5:30 PM");
  assert.equal(timeRange("", "10:00"), "");
  assert.deepEqual(LIVE.filter((x) => x.isBreak).map(sessionWhen), ["7:55–8:55 AM", "10:30–10:40 AM", "12:35–1:20 PM", "5:30 PM", "7:55–8:55 AM", "12:00–12:45 PM", "5:30–7:30 PM"]);
});

test("the shared pass table is the Tickets page's", () => {
  assert.equal(PASS_FEATURES.length, 10);
  for (const row of Object.values(PASS_FEATURE_MAP)) assert.equal(row.length, PASS_FEATURES.length);
  assert.deepEqual(passesWith("2x Day Conference Access"), ["Connect", "Influence", "Power", "Apex"]);
  assert.deepEqual(passesWith("2x CxO Breakfasts"), ["Apex"]);
  assert.deepEqual(passesWith("Nope"), []);
});

test("the agenda summary: parts of the day, people on one line, counts", () => {
  assert.deepEqual(["07:55", "11:59", "12:00", "16:59", "17:00", "", "x"].map(partOfDay), ["Morning", "Morning", "Afternoon", "Afternoon", "Evening", "Morning", "Morning"]);
  const parts = dayParts(LIVE, 1);
  assert.deepEqual(parts.map((p) => [p.part, p.sessions.map((s) => s.id)]), [
    ["Morning", ["5834c02a", "d1-01", "d1-07", "d1-x"]], ["Afternoon", ["d1-13", "d1-y"]], ["Evening", ["d1-24"]],
  ]);
  assert.deepEqual(dayParts([{ day: 1, time: "9:00", title: "No leading zero" }, { day: 1, time: "", title: "No time" }, { day: 1, time: "10:00", title: " " }], 1)[0].sessions.map((s) => s.title), ["No leading zero"]);
  assert.deepEqual(peopleLine(LIVE[3]), { names: ["Joe Greenwood", "Fatema Pirone", "Peyman Pardis"], more: 1, moderator: "Subramanian Viswanathan" });
  assert.deepEqual(peopleLine({}), { names: [], more: 0, moderator: "" });
  assert.equal(sessionCount(LIVE, 1), 3);
});

test("speaker search: name, organisation or title; accents and case don't matter", () => {
  const doc = { name: "Geneviève Decambra", company: "Deep Sky Robotics", title: "Chief Executive Officer" };
  for (const q of ["", "  ", "genevieve", "GENEVIÈVE", "deep sky", "chief exec"]) assert.equal(speakerMatches(doc, q), true, q);
  assert.equal(speakerMatches(doc, "xanadu"), false);
  assert.equal(speakerMatches({}, "x"), false);
});

test("exhibitors: well-formed entries only, safe links, by zone, labels", () => {
  const r = exhibitorsFrom({
    zones: [{ key: "A", name: "Zone A", area: "Harbour Ballroom Foyer", booths: "1–15" }, { key: "B", name: "Zone B", area: "Pier 4 & 5 Foyer", booths: "16–25" }],
    exhibitors: [
      { key: "acme", name: "Acme Robotics", booth: "7 & 8", booths: ["7", "8"], zone: "A", logo: "https://cdn.sanity.io/a.png", website: "https://acme.example/" },
      { key: "fab", name: "Fabrikam", booth: "21", booths: ["21"], zone: "B", logo: "http://insecure.example/f.png", website: "javascript:alert(1)" },
      { key: "con", name: "Contoso", booth: "Lounge", zone: "" },
      { key: "x", name: "", booth: "3" }, { key: "y", name: "No Booth", booth: "" }, null,
    ],
  });
  assert.deepEqual(r.exhibitors.map((x) => [x.name, x.booth, x.booths, x.zone, x.logo, x.website]), [
    ["Acme Robotics", "7 & 8", ["7", "8"], "A", "https://cdn.sanity.io/a.png", "https://acme.example/"],
    ["Fabrikam", "21", ["21"], "B", "", ""],
    ["Contoso", "Lounge", ["Lounge"], "", "", ""],
  ]);
  assert.deepEqual(byZone(r).map((g) => [g.key, g.name, g.items.map((x) => x.name)]), [
    ["A", "Zone A", ["Acme Robotics"]], ["B", "Zone B", ["Fabrikam"]], ["other", "Elsewhere at the venue", ["Contoso"]],
  ]);
  assert.deepEqual(byZone(exhibitorsFrom({})), []);
  assert.deepEqual(exhibitorsFrom(null).zones.map((z) => z.area), ["Harbour Ballroom Foyer", "Pier 4 & 5 Foyer"]);   // the venue's zones by default
  assert.deepEqual(r.exhibitors.map(boothLabel), ["Booths 7 & 8", "Booth 21", "Booth Lounge"]);
  assert.deepEqual(["Acme", "3M", "  élan", "", "—"].map(initialOf), ["A", "3", "É", "?", "?"]);
  assert.equal(siteLabel("https://www.acme.example/about"), "acme.example");
  assert.equal(siteLabel("not a url"), "");
});

test("exhibitors: the request (a fake fetch)", async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => { calls.push([url, opts.headers.Accept]); return { ok: true, json: async () => ({ exhibitors: [{ name: "Acme", booth: "1", zone: "A" }] }) }; };
  const r = await loadExhibitors("https://api.example.test/api/", { fetchImpl });
  assert.deepEqual(calls, [["https://api.example.test/api/app/exhibitors", "application/json"]]);
  assert.deepEqual(r.exhibitors.map((x) => x.name), ["Acme"]);
  await assert.rejects(loadExhibitors("https://api.example.test/api", { fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) }), /503/);
});
