/* node --test src/checkin/lib/queue.test.mjs: taps are stored first, sent in order, kept through no connection and
   server errors, never lost across a restart, sent once (the same clientId), refusals kept for "Admit anyway", a 401
   pauses the queue, and undoing a tap not sent yet just removes both. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createQueue, newClientId, retryable, QUEUE_KEY } from "./queue.js";

function memoryStorage() {
  const m = new Map();
  return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => { m.set(k, v); return true; }, raw: m };
}
/** Timers the test runs by hand. */
function manualTimers() {
  const pending = [];
  return {
    setTimer: (fn, ms) => { const t = { fn, ms }; pending.push(t); return t; },
    clearTimer: (t) => { const i = pending.indexOf(t); if (i !== -1) pending.splice(i, 1); },
    // Runs what's due now, at most `max` timers (a backoff schedules another: the test decides when to run it).
    run: async (max = 5) => { for (let i = 0; i < max && pending.length; i++) { const t = pending.shift(); await t.fn(); } },
    next: () => pending[0],
    count: () => pending.length,
  };
}
const tick = () => new Promise((r) => setImmediate(r));

test("a tap is stored before anything is sent, and survives a restart", async () => {
  const storage = memoryStorage();
  const timers = manualTimers();
  const q = createQueue({ storage, send: async () => { throw Object.assign(new Error("offline"), { status: 0 }); }, ...timers });
  const it = q.add({ kind: "mark", point: "arrived", key: "g1", station: "lobby" });
  assert.match(it.clientId, /^[A-Za-z0-9_-]{8,64}$/);
  assert.ok(JSON.parse(storage.get(QUEUE_KEY)).some((x) => x.clientId === it.clientId), "on disk at once");
  await timers.run(1);
  // The app is closed while sending; a new queue (next launch) still has it, ready to send.
  const raw = JSON.parse(storage.get(QUEUE_KEY));
  raw[0].state = "sending";
  storage.set(QUEUE_KEY, JSON.stringify(raw));
  const again = createQueue({ storage, send: async () => ({ results: [] }), ...manualTimers() });
  assert.equal(again.items().length, 1);
  assert.equal(again.items()[0].state, "pending");
});

test("sent in order, in batches; offline and server errors keep everything and retry with backoff", async () => {
  const storage = memoryStorage();
  const timers = manualTimers();
  const sent = [];
  let mode = "offline";
  const q = createQueue({
    storage, ...timers,
    send: async (actions) => {
      sent.push(actions.map((a) => a.clientId));
      if (mode === "offline") throw Object.assign(new Error("offline"), { status: 0 });
      if (mode === "500") throw Object.assign(new Error("server"), { status: 503 });
      return { results: actions.map((a) => ({ clientId: a.clientId, ok: true, events: [] })) };
    },
  });
  const a = q.add({ kind: "mark", point: "arrived", key: "g1", station: "lobby" });
  const b = q.add({ kind: "mark", point: "arrived", key: "g2", station: "lobby" });
  await timers.run(1);
  // Offline: both kept, retried after 1 s, then 2 s…
  assert.equal(q.items().length, 2);
  assert.deepEqual(sent[0], [a.clientId, b.clientId], "in the order tapped");
  mode = "500";
  await q.flush();
  assert.equal(q.items().length, 2);
  assert.ok(timers.next().ms >= 1000);
  mode = "ok";
  await q.flush();
  assert.equal(q.items().length, 0);
  assert.deepEqual(sent.at(-1), [a.clientId, b.clientId], "the same ids every time: the server does each once");
});

test("refused taps are kept with the reason (Admit anyway retries them); retryable statuses aren't refusals", async () => {
  const timers = manualTimers();
  const results = [];
  let override = false;
  const q = createQueue({
    storage: memoryStorage(), ...timers,
    onResult: (it, r) => results.push([it.clientId, r.ok]),
    send: async (actions) => ({ results: actions.map((a) => (a.override || override
      ? { clientId: a.clientId, ok: true }
      : { clientId: a.clientId, ok: false, status: 409, code: "outside_window", error: "Day 1 · CxO Breakfast · closed", window: { text: "closed" } })) }),
  });
  const it = q.add({ kind: "mark", point: "cxo", key: "g1", station: "breakfast" });
  await timers.run();
  assert.equal(q.failed().length, 1);
  assert.equal(q.failed()[0].code, "outside_window");
  assert.equal(q.pending().length, 0, "a refused tap isn't shown as pending");
  q.retry(it.clientId, { override: true });
  await timers.run();
  assert.equal(q.items().length, 0);
  assert.deepEqual(results, [[it.clientId, false], [it.clientId, true]]);
  assert.deepEqual([0, 408, 429, 500, 503].map(retryable), [true, true, true, true, true]);
  assert.deepEqual([400, 403, 404, 409].map(retryable), [false, false, false, false]);
  void override;
});

test("an undo of a tap still in the queue removes both; otherwise an undo is queued after it", async () => {
  const timers = manualTimers();
  const sent = [];
  const q = createQueue({ storage: memoryStorage(), ...timers, send: async (actions) => { sent.push(...actions); return { results: actions.map((a) => ({ clientId: a.clientId, ok: true })) }; } });
  const it = q.add({ kind: "mark", point: "arrived", key: "g1", station: "lobby" });
  assert.deepEqual(q.undo(it.clientId), { local: true });
  await timers.run();
  assert.equal(sent.length, 0, "nothing reached the server");
  const it2 = q.add({ kind: "mark", point: "arrived", key: "g2", station: "lobby" });
  await timers.run();
  const u = q.undo(it2.clientId, { station: "lobby" });
  assert.equal(u.local, false);
  assert.equal(u.item.ref, it2.clientId);
  await timers.run();
  assert.deepEqual(sent.map((a) => a.kind), ["mark", "undo"]);
});

test("signed out (401): the queue keeps everything and waits for a new sign-in", async () => {
  const timers = manualTimers();
  let authAsked = 0;
  let ok = false;
  const q = createQueue({
    storage: memoryStorage(), ...timers, onAuth: () => { authAsked += 1; },
    send: async (actions) => { if (!ok) throw Object.assign(new Error("401"), { status: 401 }); return { results: actions.map((a) => ({ clientId: a.clientId, ok: true })) }; },
  });
  q.add({ kind: "mark", point: "arrived", key: "g1", station: "lobby" });
  await timers.run();
  assert.equal(authAsked, 1);
  assert.equal(q.isPaused(), true);
  assert.equal(q.items().length, 1);
  await q.flush();
  assert.equal(authAsked, 1, "paused: nothing sent");
  ok = true;
  q.resume();
  await timers.run();
  await tick();
  assert.equal(q.items().length, 0);
});

test("tap ids are unique and the right shape", () => {
  const ids = new Set(Array.from({ length: 2000 }, () => newClientId()));
  assert.equal(ids.size, 2000);
  for (const id of [...ids].slice(0, 20)) assert.match(id, /^[A-Za-z0-9_-]{8,64}$/);
});
