import { test } from "node:test";
import assert from "node:assert/strict";
import { doneLines, levelProgress, recommendedRules, ruleCap, ruleFinished, ruleStatus } from "./pointsPlan.js";

const R = (key, points, max = null, per = null, maxTotal = null) => ({ key, label: key, points, max, per, maxTotal });
const RULES = [
  R("profile.linkedin", 20, 1, "total"), R("profile.topics", 10, 1, "total"), R("session.saved", 5, 10, "total"),
  R("session.attended", 20, 40, "total"), R("live.vote", 5, 3, "session", 60), R("live.question", 10),
  R("live.upvoted", 2, 10, "question"), R("network.request", 5, 20, "total"), R("network.connection", 15),
  R("network.inPerson", 10, 30, "total"), R("feed.post", 10, 3, "day"), R("feed.comment", 3, 10, "day"),
  R("feed.likes", 1, 25, "post"), R("linkedin.attending", 50, 1, "total"), R("linkedin.share", 15, 5, "total"),
];
const keys = (list) => list.map((r) => r.key);
const none = () => 0;

test("before the event: the most important first, max 4, no event-day ones", () => {
  const rec = recommendedRules(RULES, none, false);
  assert.deepEqual(keys(rec), ["linkedin.attending", "profile.linkedin", "network.connection", "profile.topics"]);
  const all = recommendedRules(RULES, none, false, 99);
  for (const k of ["network.inPerson", "live.vote", "live.question", "session.attended"]) assert.ok(!keys(all).includes(k), k);
  // Nothing to open for likes and upvotes from others.
  assert.ok(!keys(all).includes("feed.likes") && !keys(all).includes("live.upvoted"));
});

test("on the event days: scan a badge, vote, ask first", () => {
  assert.deepEqual(keys(recommendedRules(RULES, none, true)), ["network.inPerson", "live.vote", "live.question", "linkedin.attending"]);
});

test("anything already done drops out (it's under Done), capped or not", () => {
  const counted = (k) => ({ "linkedin.attending": 1, "profile.linkedin": 1, "network.connection": 4, "session.saved": 2 }[k] || 0);
  assert.deepEqual(keys(recommendedRules(RULES, counted, false)), ["profile.topics", "network.request", "feed.post", "feed.comment"]);
  assert.equal(ruleFinished(R("session.saved", 5, 10, "total"), 10), true);
  assert.equal(ruleFinished(R("network.connection", 15), 50), false);
});

test("caps, status and done lines", () => {
  assert.equal(ruleCap(R("live.vote", 5, 3, "session", 60)), 60);
  assert.equal(ruleCap(R("feed.post", 10, 3, "day")), null);
  assert.equal(ruleStatus(R("session.saved", 5, 10, "total"), 2), "2 of 10");
  assert.equal(ruleStatus(R("profile.linkedin", 20, 1, "total"), 1), "Done");
  assert.equal(ruleStatus(R("network.connection", 15), 3), "3 so far");
  assert.equal(ruleStatus(R("network.connection", 15), 0), "");
  const done = doneLines([{ key: "a", points: 5 }, { key: "b", points: 0 }, { key: "c", points: 20 }]);
  assert.deepEqual(done.map((l) => l.key), ["c", "a"]);
  assert.deepEqual(doneLines(undefined), []);
});

test("level progress", () => {
  assert.equal(levelProgress({ total: 150, level: { min: 100 }, nextLevel: { min: 200 } }), 0.5);
  assert.equal(levelProgress({ total: 900, level: { min: 600 }, nextLevel: null }), 1);
  assert.equal(levelProgress({ total: 0, level: { min: 0 }, nextLevel: { min: 100 } }), 0);
});
