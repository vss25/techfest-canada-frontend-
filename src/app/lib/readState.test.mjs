// Read state never goes backwards: "I am marking something read, but sometimes it shows up again" (Oct 23 2026).
// Run: node --test src/app/lib/readState.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { READ_CAP, addRead, applyActivity, createSeenGate, mergeNotifications, seenBody, unsyncedReads } from "./readState.js";

test("addRead: union in order, no repeats", () => {
  assert.deepEqual(addRead(["a", "b"], ["b", "c", "c"]), ["a", "b", "c"]);
  assert.deepEqual(addRead([], []), []);
});

test("addRead: past the cap, rows still listed are never dropped (the old 400 cap brought them back unread)", () => {
  // The old rule: [...read, ...ids].slice(-400). A row read on day one ("acc-first") went once 400 more were read.
  const old = (read, ids) => [...new Set([...read, ...ids])].slice(-400);
  const history = Array.from({ length: 400 }, (_, i) => `ses-${i}`);
  assert.equal(old(["acc-first", ...history.slice(0, 399)], ["ann-new"]).includes("acc-first"), false, "the bug");

  const many = Array.from({ length: READ_CAP }, (_, i) => `old-${i}`);
  const read = ["acc-first", ...many];
  const next = addRead(read, ["ann-new"], ["acc-first", "ann-new", "old-5"]);
  assert.equal(next.length, READ_CAP);
  assert.ok(next.includes("acc-first"), "still listed: kept");
  assert.ok(next.includes("old-5"), "still listed: kept");
  assert.ok(next.includes("ann-new"));
  assert.equal(next.includes("old-0"), false, "the oldest no-longer-listed id went");
});

test("mergeNotifications: a stale answer (asked before mark-read landed) never un-reads", () => {
  const prev = [{ id: "1", readAt: "2026-10-26T14:00:00Z" }, { id: "2", readAt: null }];
  const stale = [{ id: "3", readAt: null }, { id: "1", readAt: null }, { id: "2", readAt: null }];
  const merged = mergeNotifications(prev, stale, ["pn-2"], "NOW");
  assert.deepEqual(merged.map((n) => [n.id, n.readAt]), [["3", null], ["1", "2026-10-26T14:00:00Z"], ["2", "NOW"]]);
  // The server's own readAt is kept as is.
  assert.equal(mergeNotifications([], [{ id: "4", readAt: "S" }], [])[0].readAt, "S");
});

test("unsyncedReads: read here, unread on the server: send it again", () => {
  assert.deepEqual(unsyncedReads([{ id: "1", readAt: null }, { id: "2", readAt: "x" }, { id: "3", readAt: null }], ["pn-1", "pn-2", "acc-3"]), ["1"]);
});

test("seen gate: an activity answer asked before or during 'seen' can't bring the dot back (the race)", () => {
  const gate = createSeenGate();
  const prev = { feed: 3, discussions: 2, latest: { feed: "F1", discussions: "D1" } };
  const answer = { feed: 3, discussions: 2, latest: { feed: "F1", discussions: "D1" } };

  // A poll starts, then the person opens Discussions; the poll's (old) answer lands while the POST is in flight.
  const t1 = gate.begin();
  gate.seenStart("discussions");
  let a = applyActivity({ ...prev, discussions: 0 }, answer, (s) => gate.accepts(t1, s));
  assert.equal(a.discussions, 0, "stale count ignored");
  assert.equal(a.feed, 3, "the other section still updates");

  // A poll that starts while the POST is in flight and lands after it finished: still ignored.
  const t2 = gate.begin();
  gate.seenEnd("discussions");
  a = applyActivity(a, answer, (s) => gate.accepts(t2, s));
  assert.equal(a.discussions, 0);

  // A poll that starts after the server stored the mark: trusted, new replies show.
  const t3 = gate.begin();
  a = applyActivity(a, { feed: 3, discussions: 1, latest: { feed: "F1", discussions: "D2" } }, (s) => gate.accepts(t3, s));
  assert.deepEqual([a.discussions, a.latest.discussions], [1, "D2"]);
});

test("seenBody sends the newest counted event as upTo", () => {
  assert.deepEqual(seenBody("feed", { latest: { feed: "2026-10-26T14:00:00.000Z" } }), { section: "feed", upTo: "2026-10-26T14:00:00.000Z" });
  assert.deepEqual(seenBody("feed", { feed: 1 }), { section: "feed" });
});
