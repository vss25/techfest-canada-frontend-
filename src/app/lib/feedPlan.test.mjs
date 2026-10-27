// The top of Home's feed (winners, survey), "People to meet" in the feed, the next free slot and the survey prompt.
// Run: node --test src/app/lib/feedPlan.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { PEOPLE_MAX, WINNERS_PIN_MS, meetMessage, nextFreeSlot, peopleToMeet, pinnedCards, surveyInFeed, winnersPinned, withPeopleToMeet } from "./feedPlan.js";
import { feedWithCtas } from "./feedCtas.js";
import { promptFrom, sheetDue, snoozeUntil, surveyHref } from "./surveyPrompt.js";

const T = (iso) => Date.parse(iso);
const ANNOUNCED = T("2026-10-26T17:00:00-04:00");
const W = [{ userId: "u1", name: "Daniel" }];
const posts = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));
const shape = (items) => items.map((x) => (x.type === "post" ? x.post.id : x.type === "cta" ? `cta:${x.key}` : x.key));

test("winners: pinned first for 24 h after the announcement, unless hidden here", () => {
  const on = { stage: "announced", winners: W, announcedAt: ANNOUNCED };
  assert.equal(winnersPinned({ ...on, now: ANNOUNCED + 1000 }), true);
  assert.equal(winnersPinned({ ...on, now: ANNOUNCED + WINNERS_PIN_MS - 1 }), true);
  assert.equal(winnersPinned({ ...on, now: ANNOUNCED + WINNERS_PIN_MS }), false);
  assert.equal(winnersPinned({ ...on, now: ANNOUNCED, hidden: true }), false);
  assert.equal(winnersPinned({ ...on, stage: "closed", now: ANNOUNCED }), false);
  assert.equal(winnersPinned({ ...on, winners: [], now: ANNOUNCED }), false);
  assert.equal(winnersPinned({ ...on, announcedAt: NaN, now: ANNOUNCED }), true);
});

test("the order at the top: winners, then the survey", () => {
  assert.deepEqual(pinnedCards({ winners: true, survey: true }), ["winners", "survey"]);
  assert.deepEqual(pinnedCards({ winners: false, survey: true }), ["survey"]);
  assert.deepEqual(pinnedCards({}), []);
  const now = T("2026-10-27T16:30:00-04:00");
  assert.equal(surveyInFeed({ data: { show: true }, now }), true);
  assert.equal(surveyInFeed({ data: { show: true }, snoozedUntil: snoozeUntil(now - 1000), now }), false);
  assert.equal(surveyInFeed({ data: { show: true }, snoozedUntil: snoozeUntil(now - 25 * 3600000), now }), true); // a day later
  assert.equal(surveyInFeed({ data: { show: false }, now }), false);
  assert.equal(surveyInFeed({ data: null, now }), false);
});

test("People to meet after the 2nd post and the 12th, with the Earn points cards where they were", () => {
  const items = withPeopleToMeet(feedWithCtas(posts(16), ["a", "b", "c"]), true);
  assert.deepEqual(shape(items), [
    "p1", "p2", "people-2", "p3", "cta:a", "p4", "p5", "p6", "p7", "p8", "p9", "cta:b", "p10", "p11", "p12", "people-12", "p13", "p14", "p15", "cta:c", "p16",
  ]);
  // Two posts: the Earn points card goes at the end, People to meet first.
  assert.deepEqual(shape(withPeopleToMeet(feedWithCtas(posts(2), ["a"]), true)), ["p1", "p2", "people-2", "cta:a"]);
  // Fewer than two posts (or none): once, at the end.
  assert.deepEqual(shape(withPeopleToMeet(feedWithCtas(posts(1), []), true)), ["p1", "people-end"]);
  assert.deepEqual(shape(withPeopleToMeet([], true)), ["people-end"]);
  // Guests or nobody to suggest: the feed as it was.
  const plain = feedWithCtas(posts(5), ["a"]);
  assert.equal(withPeopleToMeet(plain, false), plain);
});

test("the people: the first eight recommendations with an id", () => {
  const recs = Array.from({ length: 12 }, (_, i) => ({ person: { id: `x${i}` }, reasons: ["r"] }));
  assert.equal(peopleToMeet(recs).length, PEOPLE_MAX);
  assert.deepEqual(peopleToMeet([{ person: {} }, { person: { id: "a" } }]).map((r) => r.person.id), ["a"]);
  assert.deepEqual(peopleToMeet(null), []);
});

test("next free slot: the range on now, else the next one, with its place", () => {
  const p = {
    availabilitySlots: ["d1-10", "d1-12", "d1-16", "d2-12", "d2-14"],
    availabilitySpots: { "d1-16": "Expo floor" }, meetingSpot: "Harbour Ballroom foyer",
  };
  const at = (iso) => nextFreeSlot(p, T(iso));
  // Before the festival day starts: the first range, today.
  assert.equal(at("2026-10-26T08:30:00-04:00").text, "Free 10 AM–2 PM · Harbour Ballroom foyer");
  // During a range: on now, until it ends.
  const now = at("2026-10-26T11:15:00-04:00");
  assert.equal(now.isNow, true);
  assert.equal(now.text, "Free now until 2 PM · Harbour Ballroom foyer");
  // Between ranges: the next one, at its own place.
  assert.equal(at("2026-10-26T14:30:00-04:00").text, "Free 4–6 PM · Expo floor");
  // After the last one today: tomorrow's, with the day.
  assert.equal(at("2026-10-26T18:05:00-04:00").text, "Free Tue 12–4 PM · Harbour Ballroom foyer");
  // The day before the festival: Monday's, with the day.
  assert.equal(at("2026-10-25T20:00:00-04:00").when, "Mon 10 AM–2 PM");
  // All past, or nothing shared.
  assert.equal(at("2026-10-27T16:00:00-04:00"), null);
  assert.equal(nextFreeSlot({ availabilitySlots: [] }, T("2026-10-26T09:00:00-04:00")), null);
  assert.equal(nextFreeSlot({}, T("2026-10-26T09:00:00-04:00")), null);
  // No place anywhere: just the time.
  assert.equal(nextFreeSlot({ availabilitySlots: ["d2-08"] }, T("2026-10-26T09:00:00-04:00")).text, "Free Tue 8–10 AM");
});

test("the Book time message: what's said, then they send it themselves", () => {
  const p = { availabilitySlots: ["d1-16"], availabilitySpots: { "d1-16": "Expo floor" } };
  assert.equal(meetMessage("Maya", nextFreeSlot(p, T("2026-10-26T12:00:00-04:00"))), "Hi Maya, I'd like to meet at TTFC. Are you free 4–6 PM today (Expo floor)?");
  assert.equal(meetMessage("Maya", nextFreeSlot(p, T("2026-10-26T16:30:00-04:00"))), "Hi Maya, I'd like to meet at TTFC. Are you free before 6 PM today (Expo floor)?");
  assert.equal(meetMessage("Maya", nextFreeSlot({ availabilitySlots: ["d2-12"] }, T("2026-10-26T12:00:00-04:00"))), "Hi Maya, I'd like to meet at TTFC. Are you free Tue 12–2 PM?");
  assert.equal(meetMessage("", null), "Hi, I'd like to meet at TTFC. When suits you?");
});

test("the survey prompt: the server's words, our own links only, the sheet once from the opening", () => {
  const p = promptFrom({ show: true, opensAt: "2026-10-27T16:00:00-04:00", title: "How was it?", body: "", cta: "", url: "https://www.thetechfestival.com/survey?t=abc" });
  assert.equal(p.title, "How was it?");
  assert.equal(p.cta, "Take the survey");
  assert.equal(p.url, "https://www.thetechfestival.com/survey?t=abc");
  assert.equal(surveyHref("https://evil.example/survey"), "/survey");
  assert.equal(surveyHref("javascript:alert(1)"), "/survey");
  assert.equal(surveyHref("//evil.example/x"), "/survey");
  assert.equal(surveyHref("/survey?t=demo"), "/survey?t=demo");
  assert.equal(surveyHref("http://www.thetechfestival.com/survey"), "/survey");
  assert.equal(promptFrom(null).show, false);
  const opens = T("2026-10-27T16:00:00-04:00");
  assert.equal(sheetDue({ prompt: p, shown: false, now: opens - 1 }), false);
  assert.equal(sheetDue({ prompt: p, shown: false, now: opens }), true);
  assert.equal(sheetDue({ prompt: p, shown: true, now: opens }), false);
  assert.equal(sheetDue({ prompt: { ...p, show: false }, shown: false, now: opens }), false);
});
