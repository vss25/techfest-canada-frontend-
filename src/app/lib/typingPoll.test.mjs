// The "is typing" poll never has two checks in flight, however slow the server is (Oct 22 2026).
// Run: node --test src/app/lib/typingPoll.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { startTypingPoll, CHECK_EVERY } from "./typingPoll.js";

/** A setInterval we step by hand. */
function manualTimers() {
  const t = { fn: null, cleared: false };
  return {
    t,
    timers: { setInterval: (fn) => { t.fn = fn; return 1; }, clearInterval: () => { t.cleared = true; } },
    run: async (n) => { for (let i = 0; i < n; i++) { t.fn(); await Promise.resolve(); } },
  };
}
const settle = () => new Promise((r) => setImmediate(r));

test("a slow server gets one check at a time: ticks go on, the next check waits for the last", async () => {
  const { timers, run } = manualTimers();
  const waiting = [];
  let ticks = 0;
  const seen = [];
  startTypingPoll({ check: () => new Promise((r) => waiting.push(r)), onNames: (n) => seen.push(n), onTick: () => { ticks += 1; }, timers });
  await run(CHECK_EVERY * 5); // about 12 s of ticks with the first check still waiting
  assert.equal(waiting.length, 1, "the old loop sent one request per tick here");
  assert.equal(ticks, CHECK_EVERY * 5 + 1, "the dots keep moving");
  waiting[0](["Ana"]);
  await settle();
  assert.deepEqual(seen, [["Ana"]]);
  await run(CHECK_EVERY);
  assert.equal(waiting.length, 2, "the next check goes on the next round");
});

test("a fast server is checked every 6th tick, and only while the page is visible", async () => {
  const { timers, run } = manualTimers();
  let checks = 0;
  let visible = true;
  startTypingPoll({ check: async () => { checks += 1; return []; }, onNames: () => {}, isVisible: () => visible, timers });
  await settle();
  assert.equal(checks, 1, "at once");
  for (let i = 0; i < 3; i++) { await run(CHECK_EVERY); await settle(); }
  assert.equal(checks, 4);
  visible = false;
  await run(CHECK_EVERY * 3);
  await settle();
  assert.equal(checks, 4);
});

test("a failed check frees the slot; after stop nothing is shown and the timer is cleared", async () => {
  const { t, timers, run } = manualTimers();
  let calls = 0;
  let late;
  const seen = [];
  const stop = startTypingPoll({
    check: () => { calls += 1; return calls === 1 ? Promise.reject(new Error("offline")) : new Promise((r) => { late = r; }); },
    onNames: (n) => seen.push(n),
    timers,
  });
  await settle();
  await run(CHECK_EVERY);
  await settle();
  assert.equal(calls, 2, "the failure didn't block the next check");
  stop();
  late(["Ben"]);
  await settle();
  assert.deepEqual(seen, []);
  assert.equal(t.cleared, true);
});
