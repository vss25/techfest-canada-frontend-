// "Earn points" cards in the feed: which, in what order, where (Oct 22 2026).
// Run: node --test src/app/lib/feedCtas.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { ctaSlots, eligibleCtas, feedWithCtas, seededShuffle, torontoDay } from "./feedCtas.js";

const posts = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));
const shape = (list) => list.map((x) => (x.type === "post" ? x.post.id : `[${x.key}]`)).join(" ");

test("never first: after the 3rd post, then every 6; at the end with 1–2 posts; none in an empty feed", () => {
  assert.deepEqual(ctaSlots(20, 5), [3, 9, 15]);
  assert.deepEqual(ctaSlots(2, 5), [2]);
  assert.deepEqual(ctaSlots(0, 5), []);
  assert.equal(shape(feedWithCtas(posts(10), ["a", "b", "c"])), "p1 p2 p3 [a] p4 p5 p6 p7 p8 p9 [b] p10");
  assert.equal(shape(feedWithCtas(posts(1), ["a"])), "p1 [a]");
  assert.equal(shape(feedWithCtas([], ["a"])), "");
  assert.notEqual(feedWithCtas(posts(5), ["a"])[0].type, "cta");
});

test("the order is random per person and day, and stable within the day", () => {
  const keys = ["attending", "linkedin", "topics", "availability", "sessions", "reachout"];
  const a = seededShuffle(keys, "u1|2026-10-22");
  assert.deepEqual(seededShuffle(keys, "u1|2026-10-22"), a);
  assert.deepEqual([...a].sort(), [...keys].sort());
  const others = ["u2|2026-10-22", "u1|2026-10-23", "u3|2026-10-22"].map((s) => seededShuffle(keys, s).join());
  assert.ok(others.some((o) => o !== a.join()));
  assert.equal(torontoDay(Date.UTC(2026, 9, 23, 3)), "2026-10-22"); // 11 PM in Toronto
});

test("each card only while it isn't done, dismissed for 3 days", () => {
  const now = Date.UTC(2026, 9, 22, 15);
  const base = { counted: () => 0, activity: () => 0, topics: [], availabilitySlots: [], saved: 0, requestsSent: 0, now };
  assert.deepEqual(eligibleCtas(base), ["attending", "linkedin", "topics", "availability", "sessions", "reachout"]);
  const counted = { "linkedin.attending": 1, "profile.linkedin": 1, "profile.topics": 1 };
  const activity = { "session.saved": 3, "network.request": 2, "profile.topics": 2 };
  assert.deepEqual(eligibleCtas({ ...base, counted: (k) => counted[k] || 0, activity: (k) => activity[k] || 0, availabilitySlots: ["d1-08"] }), []);
  // Two topics picked is a raw count, not the rule: the topics card stays.
  assert.ok(eligibleCtas({ ...base, activity: (k) => activity[k] || 0 }).includes("topics"));
  assert.deepEqual(eligibleCtas({ ...base, attendingPosted: true, dismissed: { linkedin: now + 1000, topics: now - 1 } }),
    ["topics", "availability", "sessions", "reachout"]);
  // Points not loaded yet: the profile and this device decide.
  assert.deepEqual(eligibleCtas({ ...base, counted: null, activity: null, linkedinUrl: "x", topics: ["a", "b", "c"], saved: 4, requestsSent: 1 }), ["attending", "availability"]);
  // Event days: the scanner, and a poll when a session you saved is live.
  assert.deepEqual(eligibleCtas({ ...base, festivalDay: true, liveSession: { id: "d1-06", title: "T" } }).slice(-2), ["scan", "poll"]);
});
