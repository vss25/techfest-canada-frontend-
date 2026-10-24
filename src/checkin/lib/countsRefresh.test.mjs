/* node --test src/checkin/lib/countsRefresh.test.mjs: when the staff Counts screen reads the counts again. A burst of
   taps is read once it settles (longer than the server's 1 s shared copy), events during the wait or during a read are
   never dropped, at most one read every 3 s per device, and "Too many requests" (several iPads on one staff sign-in)
   is never an error: the last numbers stay with "updating…" and the read is retried quietly after a back-off. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKOFF_MS, MAX_WAIT_MS, MIN_GAP_MS, READ_AFTER_MS, createCountsRefresher } from "./countsRefresh.js";

/** A fake clock and timers, and a fake server: each read answers at once (or as the test says). */
function rig({ answer = () => ({ ok: true }) } = {}) {
  let t = 0;
  let id = 0;
  const timers = new Map();
  const reads = [];
  const data = [];
  const errors = [];
  const busy = [];
  const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
  const r = createCountsRefresher({
    read: async () => { reads.push(t); const a = answer(reads.length); if (a instanceof Error) throw a; return a; },
    onData: (x) => data.push([t, x]), onError: (e) => errors.push(e ? e.message : null), onBusy: (b) => busy.push([t, b]),
    now: () => t, random: () => 0,
    setTimer: (fn, ms) => { id += 1; timers.set(id, { at: t + ms, fn }); return id; },
    clearTimer: (k) => { timers.delete(k); },
  });
  /** Let `ms` pass, firing timers in order. */
  const advance = async (ms) => {
    const end = t + ms;
    for (;;) {
      await flush();
      const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      timers.delete(next[0]);
      t = next[1].at;
      next[1].fn();
    }
    t = end;
    await flush();
  };
  return { r, reads, data, errors, busy, advance, at: () => t };
}
const tooMany = () => Object.assign(new Error("Too many requests from this sign-in. Wait a minute and try again."), { status: 429 });

test("a burst of taps: one read once they settle, 2 s after the last (longer than the server's 1 s copy), not 1.5 s after the first", async () => {
  const x = rig();
  x.r.request();
  await x.advance(0);
  assert.deepEqual(x.reads, [0], "opening reads at once");
  await x.advance(10000);
  // Taps at 10.0, 10.5, 11.0, 11.5 s.
  for (let i = 0; i < 4; i++) { x.r.event(); await x.advance(500); }
  assert.deepEqual(x.reads, [0], "still coming in: no read yet");
  await x.advance(READ_AFTER_MS);
  assert.deepEqual(x.reads, [0, 11500 + READ_AFTER_MS], "one read, 2 s after the last tap");
  await x.advance(20000);
  assert.equal(x.reads.length, 2, "nothing more to read");
});

test("a tap during the wait re-arms it; a tap during a read is read again afterwards (never dropped)", async () => {
  let release = null;
  const x = rig({ answer: (n) => (n === 2 ? new Promise((res) => { release = () => res({ n }); }) : { n }) });
  x.r.request();
  await x.advance(5000);
  x.r.event();
  await x.advance(1500);
  x.r.event(); // during the wait
  await x.advance(1999);
  assert.deepEqual(x.reads, [0], "re-armed by the second tap");
  await x.advance(1);
  assert.deepEqual(x.reads, [0, 8500]);
  // The read is slow; a tap comes in meanwhile.
  await x.advance(300);
  x.r.event();
  await x.advance(100);
  release();
  await x.advance(0);
  assert.equal(x.data.length, 2);
  await x.advance(5000);
  assert.deepEqual(x.reads, [0, 8500, 8500 + MIN_GAP_MS], "the tap made during the read is read once it settles (3 s after the last read at most once)");
});

test("a read asked for now (every 30 s, the button) just after a tap: the tap is read again once the server's copy has it", async () => {
  const x = rig();
  x.r.request();
  await x.advance(10000);
  x.r.event();
  await x.advance(200);
  x.r.request(); // the 30 s tick, 0.2 s after the tap: the server's 1 s copy may predate it
  await x.advance(0);
  assert.deepEqual(x.reads, [0, 10200]);
  await x.advance(10000);
  assert.deepEqual(x.reads, [0, 10200, 10200 + MIN_GAP_MS], "read again (3 s apart at most once)");
});

test("never more than one read every 3 s on a device; a busy stretch still reads at least every 8 s", async () => {
  const x = rig();
  x.r.request();
  await x.advance(0);
  for (let i = 0; i < 5; i++) { x.r.request(); await x.advance(200); }
  assert.deepEqual(x.reads, [0, MIN_GAP_MS].filter((v) => v <= x.at()), "the button tapped over and over: 3 s apart");
  await x.advance(10000);
  assert.deepEqual(x.reads, [0, MIN_GAP_MS]);
  // Taps every second for 20 s: never settles, still read every MAX_WAIT_MS.
  const start = x.at();
  for (let i = 0; i < 20; i++) { x.r.event(); await x.advance(1000); }
  const during = x.reads.filter((v) => v > start);
  assert.ok(during.length >= 2 && during.length <= 3, `read ${during.length} times during 20 s of taps`);
  assert.equal(during[0] - start, MAX_WAIT_MS, "the first 8 s after the first tap");
  for (let i = 1; i < during.length; i++) assert.ok(during[i] - during[i - 1] >= MIN_GAP_MS);
});

test("429 (several iPads on one staff sign-in): no error, the numbers stay, 'updating…', a quiet retry after a back-off", async () => {
  let refuse = 0;
  const x = rig({ answer: (n) => (refuse-- > 0 ? tooMany() : { n }) });
  x.r.request();
  await x.advance(0);
  assert.equal(x.data.length, 1);
  await x.advance(10000);
  refuse = 2;
  x.r.event();
  await x.advance(READ_AFTER_MS);
  assert.equal(x.reads.length, 2);
  assert.deepEqual(x.errors.filter(Boolean), [], "never an error for a 429");
  assert.deepEqual(x.busy, [[10000 + READ_AFTER_MS, true]], "'updating…'");
  assert.equal(x.data.length, 1, "the last numbers stay");
  await x.advance(BACKOFF_MS[0] - 1);
  assert.equal(x.reads.length, 2, "backs off");
  await x.advance(1);
  assert.equal(x.reads.length, 3, "retried after 5 s: refused again");
  await x.advance(BACKOFF_MS[1]);
  assert.equal(x.reads.length, 4, "then after 10 s: works");
  assert.equal(x.data.length, 2);
  assert.deepEqual(x.busy.at(-1)[1], false, "'updating…' goes");
  assert.deepEqual(x.errors.filter(Boolean), []);
  await x.advance(60000);
  assert.equal(x.reads.length, 4, "nothing else owed");
});

test("another failure (no connection) is said, and retried the same quiet way; it clears once a read works", async () => {
  let fail = 1;
  const x = rig({ answer: () => (fail-- > 0 ? Object.assign(new Error("Can't reach the TTFC server. Check the Wi-Fi."), { status: 0 }) : { ok: 1 }) });
  x.r.request();
  await x.advance(0);
  assert.deepEqual(x.errors, ["Can't reach the TTFC server. Check the Wi-Fi."]);
  await x.advance(BACKOFF_MS[0]);
  assert.equal(x.reads.length, 2);
  assert.deepEqual(x.errors, ["Can't reach the TTFC server. Check the Wi-Fi.", null]);
  assert.equal(x.data.length, 1);
});

test("closed: nothing more is read", async () => {
  const x = rig();
  x.r.request();
  await x.advance(0);
  x.r.event();
  x.r.stop();
  await x.advance(30000);
  x.r.request();
  await x.advance(30000);
  assert.deepEqual(x.reads, [0]);
});
