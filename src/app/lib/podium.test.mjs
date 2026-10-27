// The leaderboard's podium and the swag kit winners (lib/podium.js), and confetti once per device (lib/celebrate.js).
// Run: node --test src/app/lib/podium.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { fromBoard, fromWinner, ordinal, podiumLabel, podiumSlots, podiumSplit } from "./podium.js";
import { SEEN_KEY, celebrationKey, isWinner, rememberCelebration, seenBefore, seenKeys, shouldCelebrate, winnersSignature } from "./celebrate.js";

const board = [
  { rank: 1, user: { id: "p1", name: "Daniel Okafor", organization: "Lakeshore Insurance" }, points: 640, level: { name: "Connector" } },
  { rank: 2, user: { id: "p2", name: "Dr. Maya Singh", organization: "Aurora Financial", avatarUrl: "/f/m.jpg" }, points: 410 },
  { rank: 3, user: { id: "p3", name: "Priya Raman", organization: "DHL" }, points: 255 },
  { rank: 4, user: { id: "me", name: "Alex Morgan" }, points: 120 },
  { rank: 5, user: { id: "p5", name: "Tom Lee" }, points: 90 },
].map(fromBoard);

test("the podium: the first three stand 2–1–3, the rest stay a list", () => {
  const { podium, rest } = podiumSplit(board);
  assert.deepEqual(podium.map((p) => p.id), ["p1", "p2", "p3"]);
  assert.deepEqual(rest.map((p) => p.id), ["me", "p5"]);
  const slots = podiumSlots(podium);
  // Rank order in the markup; on screen: 2nd left, 1st middle, 3rd right.
  assert.deepEqual(slots.map((s) => [s.person.id, s.place, s.column, s.medal]), [["p1", 1, 2, "gold"], ["p2", 2, 1, "silver"], ["p3", 3, 3, "bronze"]]);
  assert.deepEqual(slots.map((s) => s.height), ["tall", "mid", "low"]);
  const left = [...slots].sort((a, b) => a.column - b.column).map((s) => s.place);
  assert.deepEqual(left, [2, 1, 3]);
  assert.equal(podiumLabel(slots[0]), "1st place: Daniel Okafor, Lakeshore Insurance, 640 points");
  assert.equal(podiumLabel(slots[1], { mine: true }), "2nd place: Dr. Maya Singh (you), Aurora Financial, 410 points");
  assert.equal(board[1].avatarUrl, "/f/m.jpg");
  assert.equal(board[0].level, "Connector");
});

test("short boards and ties", () => {
  assert.deepEqual(podiumSlots(board.slice(0, 1)).map((s) => [s.place, s.column]), [[1, 2]]);
  assert.deepEqual(podiumSlots(board.slice(0, 2)).map((s) => [s.place, s.column]), [[1, 2], [2, 1]]);
  assert.deepEqual(podiumSlots([]), []);
  assert.deepEqual(podiumSplit(undefined), { podium: [], rest: [] });
  // Two tied for 1st both get gold; the next is 3rd (bronze).
  const tied = podiumSlots([{ ...board[0], rank: 1 }, { ...board[1], rank: 1 }, { ...board[2], rank: 3 }]);
  assert.deepEqual(tied.map((s) => s.medal), ["gold", "gold", "bronze"]);
  // A rank the server didn't send: the position stands in.
  assert.deepEqual(podiumSlots([{ ...board[0], rank: 0 }, { ...board[1], rank: 9 }]).map((s) => s.place), [1, 2]);
  assert.equal(ordinal(4), "4th");
});

test("winners in the podium's shape", () => {
  const w = fromWinner({ rank: 1, name: "Daniel Okafor", organization: "Lakeshore", avatarUrl: "/a.jpg", points: 640, userId: "u1" });
  assert.deepEqual(w, { id: "u1", name: "Daniel Okafor", organization: "Lakeshore", avatarUrl: "/a.jpg", points: 640, rank: 1, level: "" });
});

/** A localStorage stand-in; `broken` throws like a blocked one. */
function memoryStorage({ broken = false } = {}) {
  const m = new Map();
  return {
    getItem: (k) => { if (broken) throw new Error("blocked"); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (broken) throw new Error("blocked"); m.set(k, String(v)); },
    map: m,
  };
}

const winners = [{ userId: "u1", name: "Daniel" }, { userId: "u2", name: "Maya" }, { userId: "u3", name: "Priya" }];

test("confetti the first time on this device, then never again for that announcement", () => {
  const storage = memoryStorage();
  assert.equal(winnersSignature(winners), "u1,u2,u3");
  assert.equal(shouldCelebrate({ storage, winners, myId: "me", reducedMotion: false }), true);
  assert.equal(seenBefore(storage, winners), false);
  rememberCelebration({ storage, winners, myId: "me" });
  assert.equal(shouldCelebrate({ storage, winners, myId: "me", reducedMotion: false }), false);
  assert.equal(seenBefore(storage, winners), true);
  // A winner signing in on the same device still gets their own (bigger) burst, once.
  assert.equal(isWinner(winners, "u2"), true);
  assert.equal(celebrationKey(winners, "u2"), "u1,u2,u3#u2");
  assert.equal(shouldCelebrate({ storage, winners, myId: "u2", reducedMotion: false }), true);
  rememberCelebration({ storage, winners, myId: "u2" });
  assert.equal(shouldCelebrate({ storage, winners, myId: "u2", reducedMotion: false }), false);
  // New winners (a different announcement): a new burst.
  assert.equal(shouldCelebrate({ storage, winners: winners.slice(0, 2), myId: "me", reducedMotion: false }), true);
  assert.deepEqual(seenKeys(storage), ["u1,u2,u3", "u1,u2,u3#u2"]);
});

test("Reduce Motion, no winners, blocked or odd storage: no burst, no error", () => {
  assert.equal(shouldCelebrate({ storage: memoryStorage(), winners, myId: "me", reducedMotion: true }), false);
  assert.equal(shouldCelebrate({ storage: memoryStorage(), winners: [], myId: "me", reducedMotion: false }), false);
  const broken = memoryStorage({ broken: true });
  assert.doesNotThrow(() => rememberCelebration({ storage: broken, winners, myId: "me" }));
  assert.deepEqual(seenKeys(broken), []);
  assert.equal(shouldCelebrate({ storage: broken, winners, myId: "me", reducedMotion: false }), true);
  const odd = memoryStorage();
  odd.setItem(SEEN_KEY, "{not json");
  assert.deepEqual(seenKeys(odd), []);
  odd.setItem(SEEN_KEY, JSON.stringify({ a: 1 }));
  assert.deepEqual(seenKeys(odd), []);
  assert.deepEqual(seenKeys(null), []);
  assert.equal(isWinner(winners, ""), false);
});

test("only the newest few announcements are kept", () => {
  const storage = memoryStorage();
  for (let i = 0; i < 20; i++) rememberCelebration({ storage, winners: [{ userId: `x${i}` }], myId: "me" });
  assert.equal(seenKeys(storage).length, 12);
  assert.equal(seenKeys(storage).at(-1), "x19");
});

test("hidden from the feed: this announcement only, never an error", async () => {
  const { hideWinnersIn, winnersHiddenIn } = await import("./celebrate.js");
  const storage = memoryStorage();
  assert.equal(winnersHiddenIn(storage, winners), false);
  hideWinnersIn(storage, winners);
  assert.equal(winnersHiddenIn(storage, winners), true);
  assert.equal(winnersHiddenIn(storage, winners.slice(0, 1)), false);
  assert.equal(winnersHiddenIn(storage, []), false);
  const broken = memoryStorage({ broken: true });
  assert.doesNotThrow(() => hideWinnersIn(broken, winners));
  assert.equal(winnersHiddenIn(broken, winners), false);
});
