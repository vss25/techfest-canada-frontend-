/* node --test src/checkin/lib/queue.test.mjs: taps are stored first (one storage key each), sent in order, kept through
   no connection and server errors, never lost across a restart, sent once (the same clientId), refusals kept for
   "Admit anyway", a 401 pauses the queue. Undo (contract C2): a tap that never left the device just goes; any other
   (sent with no answer, being sent, restored from storage, already recorded) gets an undo by reference after it,
   never dropped. Two tabs on one device never overwrite each other's taps; a tab that has gone has its taps sent by
   another. Storage failures are reported and written again. Each tap carries who made it (C3) and the server's time
   (C4); the queue's bookkeeping is never sent. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEM_PREFIX, OFFLINE_CHECK_MS, OFFLINE_PROBE_MS, QUEUE_KEY, createQueue, newClientId, retryable } from "./queue.js";

/** One device's localStorage, shared by the tabs made from it; each tab hears the others' changes (the storage event). */
function deviceStorage() {
  const m = new Map();
  const subs = new Set();
  let full = false;
  const tab = () => {
    const mine = new Set();
    const tell = (k, v) => { for (const fn of subs) if (!mine.has(fn)) fn(k, v); };
    return {
      get: (k) => (m.has(k) ? m.get(k) : null),
      set: (k, v) => { if (full) return false; m.set(k, v); tell(k, v); return true; },
      remove: (k) => { m.delete(k); tell(k, null); },
      keys: (p) => [...m.keys()].filter((k) => k.startsWith(p)),
      subscribe: (fn) => { mine.add(fn); subs.add(fn); return () => { subs.delete(fn); mine.delete(fn); }; },
    };
  };
  return { tab, raw: m, setFull: (v) => { full = v; } };
}
const onDisk = (dev) => [...dev.raw.entries()].filter(([k]) => k.startsWith(ITEM_PREFIX)).map(([, v]) => JSON.parse(v));
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
const offline = async () => { throw Object.assign(new Error("offline"), { status: 0 }); };
const okAll = (sent) => async (actions) => { sent?.push(...actions); return { results: actions.map((a) => ({ clientId: a.clientId, ok: true })) }; };
const mark = (key, extra = {}) => ({ kind: "mark", point: "arrived", key, station: "lobby", ...extra });

test("a tap is stored (its own key) before anything is sent, and survives a restart", async () => {
  const dev = deviceStorage();
  const timers = manualTimers();
  const q = createQueue({ storage: dev.tab(), send: offline, ...timers });
  const it = q.add(mark("g1"));
  assert.match(it.clientId, /^[A-Za-z0-9_-]{8,64}$/);
  assert.ok(dev.raw.has(ITEM_PREFIX + it.clientId), "on disk at once");
  await timers.run(1);
  // The app is closed while sending; a new queue (next launch) still has it, ready to send (and known to maybe be sent).
  const raw = JSON.parse(dev.raw.get(ITEM_PREFIX + it.clientId));
  dev.raw.set(ITEM_PREFIX + it.clientId, JSON.stringify({ ...raw, state: "sending" }));
  const again = createQueue({ storage: dev.tab(), send: async () => ({ results: [] }), ...manualTimers() });
  assert.equal(again.items().length, 1);
  assert.equal(again.items()[0].state, "pending");
  assert.equal(again.items()[0].sentOnce, true);
});

test("an older version's single list is moved over (nothing lost in the update)", () => {
  const dev = deviceStorage();
  dev.raw.set(QUEUE_KEY, JSON.stringify([
    { clientId: "told000001", kind: "mark", point: "arrived", key: "g1", state: "pending", tries: 0, addedAt: 1 },
    { clientId: "told000002", kind: "mark", point: "checked_in", key: "g2", state: "sending", tries: 1, addedAt: 2 },
  ]));
  const q = createQueue({ storage: dev.tab(), send: offline, ...manualTimers() });
  assert.deepEqual(q.items().map((x) => [x.clientId, x.state]), [["told000001", "pending"], ["told000002", "pending"]]);
  assert.equal(dev.raw.has(QUEUE_KEY), false, "the old list is gone once moved");
  assert.equal(onDisk(dev).length, 2);
});

test("sent in order, in batches; offline and server errors keep everything and retry with backoff", async () => {
  const timers = manualTimers();
  const sent = [];
  let mode = "offline";
  const q = createQueue({
    storage: deviceStorage().tab(), ...timers,
    send: async (actions) => {
      sent.push(actions.map((a) => a.clientId));
      if (mode === "offline") throw Object.assign(new Error("offline"), { status: 0 });
      if (mode === "500") throw Object.assign(new Error("server"), { status: 503 });
      return { results: actions.map((a) => ({ clientId: a.clientId, ok: true, events: [] })) };
    },
  });
  const a = q.add(mark("g1"));
  const b = q.add(mark("g2"));
  await timers.run(1);
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

test("each tap carries who made it (queuedBy) and the server's time (clientAt); the queue's bookkeeping isn't sent", async () => {
  const sent = [];
  const timers = manualTimers();
  const serverTime = Date.parse("2026-10-26T13:00:00Z");
  const q = createQueue({ storage: deviceStorage().tab(), send: okAll(sent), now: () => serverTime, tabId: () => "pA", ...timers });
  q.add(mark("g1", { queuedBy: { id: "u1", name: "Val Volunteer" } }));
  await timers.run(1);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].queuedBy, { id: "u1", name: "Val Volunteer" });
  assert.equal(sent[0].clientAt, "2026-10-26T13:00:00.000Z", "the corrected clock, not the device's");
  for (const k of ["state", "tries", "addedAt", "sentOnce", "ord", "owner", "sendingAt", "undoneBy"]) assert.ok(!(k in sent[0]), k);
});

test("refused taps are kept with the reason (Admit anyway retries them); retryable statuses aren't refusals", async () => {
  const timers = manualTimers();
  const results = [];
  const q = createQueue({
    storage: deviceStorage().tab(), ...timers,
    onResult: (it, r, outcome) => results.push([it.clientId, outcome]),
    send: async (actions) => ({ results: actions.map((a) => (a.override
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
  assert.deepEqual(results, [[it.clientId, "failed"], [it.clientId, "ok"]]);
  assert.deepEqual([0, 408, 429, 500, 503].map(retryable), [true, true, true, true, true]);
  assert.deepEqual([400, 403, 404, 409].map(retryable), [false, false, false, false]);
});

test("Admit anyway / Try again by someone else after a shift change: sent as theirs (queuedBy), the first tapper kept on the device only", async () => {
  const timers = manualTimers();
  const sent = [];
  let refuse = true;
  const q = createQueue({
    storage: deviceStorage().tab(), ...timers,
    send: async (actions) => {
      sent.push(...actions);
      return { results: actions.map((a) => (refuse ? { clientId: a.clientId, ok: false, status: 409, code: "outside_window", error: "closed" } : { clientId: a.clientId, ok: true })) };
    },
  });
  const it = q.add({ kind: "mark", point: "cxo", key: "g1", station: "breakfast", queuedBy: { id: "uA", name: "Alice" } });
  await timers.run(1);
  assert.equal(q.failed().length, 1);
  refuse = false;
  q.retry(it.clientId, { override: true, queuedBy: { id: "uB", name: "Bob" } });
  assert.deepEqual(q.items()[0].tappedBy, { id: "uA", name: "Alice" }, "who first tapped it, for the device's own list");
  await timers.run(1);
  const last = sent.at(-1);
  assert.deepEqual([last.override, last.queuedBy], [true, { id: "uB", name: "Bob" }], "Bob decided to admit: recorded as Bob");
  assert.ok(!("tappedBy" in last), "the queue's own field isn't sent");
  // The same person retrying keeps it as it was (nothing to remember).
  refuse = true;
  const it2 = q.add({ kind: "mark", point: "cxo", key: "g2", station: "breakfast", queuedBy: { id: "uB", name: "Bob" } });
  await timers.run(1);
  q.retry(it2.clientId, { queuedBy: { id: "uB", name: "Bob" } });
  assert.equal(q.items().find((x) => x.clientId === it2.clientId).tappedBy, undefined);
});

test("the device says it's offline: nothing is sent, so an Undo just drops the tap; sent once it's back; a try a minute anyway", async () => {
  const timers = manualTimers();
  let t = 1_000_000;
  let online = false;
  const sent = [];
  let attempts = 0;
  const q = createQueue({
    storage: deviceStorage().tab(), ...timers, clock: () => t, now: () => t, online: () => online,
    send: async (actions) => { attempts += 1; if (!online) throw Object.assign(new TypeError("Failed to fetch"), { status: 0 }); sent.push(...actions); return { results: actions.map((a) => ({ clientId: a.clientId, ok: true })) }; },
  });
  const it = q.add(mark("g1"));
  await timers.run(1);
  assert.equal(attempts, 0, "not even tried");
  assert.equal(timers.next()?.ms, OFFLINE_CHECK_MS, "looked at again later");
  assert.equal(q.items()[0].sentOnce, undefined);
  const u = q.undo(it.clientId);
  assert.equal(u.local, true, "never left the device: the Undo just drops it (no mark + undo pair on the server)");
  assert.equal(q.items().length, 0);
  // Still "offline" after a minute (the device may be wrong): one try anyway, then once a minute.
  q.add(mark("g2"));
  t += OFFLINE_PROBE_MS;
  await q.flush();
  assert.equal(attempts, 1, "one try after a minute offline");
  await q.flush();
  assert.equal(attempts, 1, "not again within the minute");
  // Back online (the online event resumes the queue): sent.
  online = true;
  q.resume();
  await timers.run(3);
  assert.deepEqual(sent.map((a) => a.key), ["g2"]);
  assert.equal(q.items().length, 0);
});

test("a device wrongly saying it's offline still sends: the minute's try gets an answer, so it's believed no more", async () => {
  const timers = manualTimers();
  let t = 5_000_000;
  const sent = [];
  const q = createQueue({ storage: deviceStorage().tab(), ...timers, clock: () => t, now: () => t, online: () => false, send: okAll(sent) });
  q.add(mark("g1"));
  await q.flush();
  assert.equal(sent.length, 0);
  t += OFFLINE_PROBE_MS;
  await q.flush();
  assert.deepEqual(sent.map((a) => a.key), ["g1"], "the minute's try went through");
  q.add(mark("g2"));
  await q.flush();
  assert.deepEqual(sent.map((a) => a.key), ["g1", "g2"], "and from then on taps go at once");
});

test("refused taps survive a reload (the Needs attention list) and can be dismissed", async () => {
  const dev = deviceStorage();
  const q = createQueue({ storage: dev.tab(), ...manualTimers(), send: async (a) => ({ results: a.map((x) => ({ clientId: x.clientId, ok: false, status: 409, code: "not_included", error: "Not on their pass." })) }) });
  const it = q.add(mark("g1"));
  await q.flush();
  const after = createQueue({ storage: dev.tab(), ...manualTimers(), send: offline });
  assert.deepEqual(after.failed().map((x) => [x.clientId, x.error]), [[it.clientId, "Not on their pass."]]);
  assert.equal(after.dismiss(it.clientId), true);
  assert.equal(onDisk(dev).length, 0);
});

test("undo of a tap that never left the device: both just go, nothing is sent", async () => {
  const timers = manualTimers();
  const sent = [];
  const q = createQueue({ storage: deviceStorage().tab(), ...timers, send: okAll(sent) });
  const it = q.add(mark("g1"));
  assert.deepEqual(q.undo(it.clientId), { local: true });
  await timers.run();
  assert.equal(sent.length, 0, "nothing reached the server");
  // A refused tap (the server recorded nothing) goes too.
  const r = createQueue({ storage: deviceStorage().tab(), ...manualTimers(), send: async (a) => ({ results: a.map((x) => ({ clientId: x.clientId, ok: false, status: 409, code: "not_included" })) }) });
  const f = r.add(mark("g2"));
  await r.flush();
  assert.equal(r.failed().length, 1);
  assert.deepEqual(r.undo(f.clientId), { local: true });
  assert.equal(r.items().length, 0);
});

test("undo of a tap already recorded: an undo by reference (target) is queued and sent", async () => {
  const timers = manualTimers();
  const sent = [];
  const q = createQueue({ storage: deviceStorage().tab(), ...timers, send: okAll(sent) });
  const it = q.add(mark("g2"));
  await timers.run();
  const u = q.undo(it.clientId, { station: "lobby" });
  assert.equal(u.local, false);
  assert.equal(u.item.target, it.clientId);
  assert.equal(u.item.ref, it.clientId, "also as ref (older servers)");
  await timers.run();
  assert.deepEqual(sent.map((a) => a.kind), ["mark", "undo"]);
  assert.equal(sent[1].target, it.clientId);
});

test("W1: the send threw after the server recorded the tap (answer lost): undo is never dropped, the server gets [mark, undo]", async () => {
  const timers = manualTimers();
  const server = new Map(); // clientId → recorded; tomb:<clientId> → an undo arrived first
  const batches = [];
  let drop = true;
  const q = createQueue({
    storage: deviceStorage().tab(), ...timers,
    send: async (actions) => {
      batches.push(actions.map((a) => a.kind));
      for (const a of actions) {
        if (a.kind === "mark" && !server.has(`tomb:${a.clientId}`)) server.set(a.clientId, true);
        if (a.kind === "undo") { if (server.has(a.target)) server.delete(a.target); else server.set(`tomb:${a.target}`, true); }
      }
      if (drop) { drop = false; throw Object.assign(new Error("connection reset"), { status: 0 }); }
      return { results: actions.map((a) => ({ clientId: a.clientId, ok: true })) };
    },
  });
  const it = q.add(mark("g1"));
  await timers.run(1);
  assert.equal(server.get(it.clientId), true, "the server has it");
  assert.equal(q.items()[0].state, "pending", "waiting to retry, as far as the device knows");
  // The volunteer taps Undo during the retry wait.
  const u = q.undo(it.clientId, { station: "lobby" });
  assert.equal(u.local, false, "might be on the server: undone there");
  assert.deepEqual(q.pending().map((x) => x.kind), ["mark", "undo"]);
  await q.flush();
  assert.deepEqual(batches.at(-1), ["mark", "undo"], "the tap first, then its undo, in one batch");
  assert.equal(server.has(it.clientId), false, "not marked on the server");
  assert.equal(q.items().length, 0);
});

test("W1: undo while the tap is being sent, and undo of a tap restored as 'sending' after a restart", async () => {
  let release = null;
  const sent = [];
  const q = createQueue({
    storage: deviceStorage().tab(), ...manualTimers(),
    send: (actions) => new Promise((r) => { sent.push(...actions); release = () => r({ results: actions.map((a) => ({ clientId: a.clientId, ok: true })) }); }),
  });
  const it = q.add(mark("g1"));
  const flushing = q.flush();
  await new Promise((r) => setImmediate(r));
  assert.equal(q.undo(it.clientId).local, false, "being sent: undone by reference");
  release();
  await flushing;
  const second = q.flush();
  await new Promise((r) => setImmediate(r));
  release();
  await second;
  assert.deepEqual(sent.map((a) => a.kind), ["mark", "undo"]);
  assert.equal(q.items().length, 0);

  // Restored from storage while it was being sent (the app was closed mid-send).
  const dev = deviceStorage();
  const q1 = createQueue({ storage: dev.tab(), ...manualTimers(), send: offline, tabId: () => "pA" });
  const t = q1.add(mark("g9"));
  const raw = JSON.parse(dev.raw.get(ITEM_PREFIX + t.clientId));
  dev.raw.set(ITEM_PREFIX + t.clientId, JSON.stringify({ ...raw, state: "sending" }));
  const q2 = createQueue({ storage: dev.tab(), ...manualTimers(), send: offline, tabId: () => "pA" });
  assert.equal(q2.undo(t.clientId).local, false, "it may have arrived: undone by reference");
});

test("an undo the server had nothing for (404: never reached it) is done, and its tap goes too; a refused tap that was undone just goes", async () => {
  const timers = manualTimers();
  const outcomes = [];
  let first = true;
  const q = createQueue({
    storage: deviceStorage().tab(), ...timers, onResult: (it, r, o) => outcomes.push([it.kind, o]),
    send: async (actions) => {
      if (first) { first = false; throw Object.assign(new Error("lost"), { status: 0 }); }
      return { results: actions.map((a) => (a.kind === "undo" ? { clientId: a.clientId, ok: false, status: 404, error: "Nothing to undo" } : { clientId: a.clientId, ok: false, status: 409, code: "outside_window" })) };
    },
  });
  const it = q.add(mark("g1"));
  await timers.run(1);
  q.undo(it.clientId);
  await q.flush();
  assert.equal(q.items().length, 0, "nothing left, nothing in Needs attention");
  assert.deepEqual(outcomes, [["mark", "dropped"], ["undo", "ok"]]);
});

test("signed out (401): the queue keeps everything and waits for a new sign-in", async () => {
  const timers = manualTimers();
  let authAsked = 0;
  let ok = false;
  const q = createQueue({
    storage: deviceStorage().tab(), ...timers, onAuth: () => { authAsked += 1; },
    send: async (actions) => { if (!ok) throw Object.assign(new Error("401"), { status: 401 }); return { results: actions.map((a) => ({ clientId: a.clientId, ok: true })) }; },
  });
  q.add(mark("g1"));
  await timers.run();
  assert.equal(authAsked, 1);
  assert.equal(q.isPaused(), true);
  assert.equal(q.items().length, 1);
  await q.flush();
  assert.equal(authAsked, 1, "paused: nothing sent");
  ok = true;
  q.resume();
  await timers.run();
  assert.equal(q.items().length, 0);
});

test("W3: two tabs on one device never overwrite each other's taps; a tab thrown away loses nothing", async () => {
  const dev = deviceStorage();
  const live = new Set(["pA", "pB"]);
  const alive = async () => new Set(live);
  const a = createQueue({ storage: dev.tab(), send: offline, tabId: () => "pA", alive, ...manualTimers() });
  const b = createQueue({ storage: dev.tab(), send: offline, tabId: () => "pB", alive, ...manualTimers() });
  const a1 = a.add(mark("g1"));
  const a2 = a.add(mark("g2"));
  const a3 = a.add(mark("g3"));
  const b1 = b.add({ kind: "mark", point: "media", key: "g4", station: "media" });
  await a.flush();
  await b.flush();
  // Each sees the other's taps (the storage event), and the storage has all four.
  assert.equal(a.items().length, 4);
  assert.equal(b.items().length, 4);
  assert.deepEqual(onDisk(dev).map((x) => x.clientId).sort(), [a1, a2, a3, b1].map((x) => x.clientId).sort());
  // Tab A goes (closed, crashed) while still offline: a new tab still has every tap.
  live.delete("pA");
  const c = createQueue({ storage: dev.tab(), send: offline, tabId: () => "pC", alive: async () => new Set(["pB", "pC"]), ...manualTimers() });
  assert.equal(c.items().length, 4, "nothing lost");
});

test("W3: a tab sends its own taps, never a live tab's; the taps of a tab that has gone are sent by another", async () => {
  const dev = deviceStorage();
  const live = new Set(["pA", "pB"]);
  const alive = async () => new Set(live);
  const sentA = [];
  const sentB = [];
  let online = false;
  const a = createQueue({ storage: dev.tab(), send: (x) => (online ? okAll(sentA)(x) : offline()), tabId: () => "pA", alive, ...manualTimers() });
  const b = createQueue({ storage: dev.tab(), send: (x) => (online ? okAll(sentB)(x) : offline()), tabId: () => "pB", alive, ...manualTimers() });
  const ta = a.add(mark("g1"));
  const tb = b.add(mark("g2"));
  online = true;
  await b.flush();
  assert.deepEqual(sentB.map((x) => x.clientId), [tb.clientId], "B sends its own only");
  assert.equal(a.items().length, 1, "A hears that B's tap went");
  // A goes before it gets a connection: B takes its tap over.
  live.delete("pA");
  await b.flush();
  assert.deepEqual(sentB.map((x) => x.clientId), [tb.clientId, ta.clientId]);
  assert.equal(onDisk(dev).length, 0);
  assert.equal(sentA.length, 0);
});

test("W3: an undo in one tab of a tap that tab didn't make is by reference (never a silent local drop)", () => {
  const dev = deviceStorage();
  const alive = async () => new Set(["pA", "pB"]);
  const a = createQueue({ storage: dev.tab(), send: offline, tabId: () => "pA", alive, ...manualTimers() });
  const b = createQueue({ storage: dev.tab(), send: offline, tabId: () => "pB", alive, ...manualTimers() });
  const t = a.add(mark("g1"));
  const u = b.undo(t.clientId);
  assert.equal(u.local, false);
  assert.equal(u.item.owner, "pA", "the tap's own tab sends it, after the tap");
});

test("W4: a tap that can't be stored is reported (not saved on this device), space is freed, and it is written again", async () => {
  const dev = deviceStorage();
  const timers = manualTimers();
  const persist = [];
  let freed = 0;
  const q = createQueue({ storage: dev.tab(), send: offline, onPersist: (ok) => persist.push(ok), onStorageFull: () => { freed += 1; }, ...timers });
  dev.setFull(true);
  const it = q.add(mark("g1"));
  assert.deepEqual(persist, [false], "said at once");
  assert.equal(q.persisted(), false);
  assert.ok(freed >= 1, "the cached list is dropped to make room");
  assert.equal(q.pending().length, 1, "still kept (and sent) from memory");
  dev.setFull(false);
  for (let i = 0; i < 6 && timers.count(); i++) await timers.run(1);
  assert.equal(q.persisted(), true, "written again");
  assert.equal(persist.at(-1), true);
  assert.ok(dev.raw.has(ITEM_PREFIX + it.clientId));
});

test("drain: sends this tab's taps now (sign-out with a connection)", async () => {
  const sent = [];
  const q = createQueue({ storage: deviceStorage().tab(), send: okAll(sent) });
  q.add(mark("g1"));
  q.add(mark("g2"));
  const left = await q.drain(1000);
  assert.equal(left, 0);
  assert.equal(sent.length, 2);
  q.pause();
  assert.equal(q.isPaused(), true);
});

test("tap ids are unique and the right shape", () => {
  const ids = new Set(Array.from({ length: 2000 }, () => newClientId()));
  assert.equal(ids.size, 2000);
  for (const id of [...ids].slice(0, 20)) assert.match(id, /^[A-Za-z0-9_-]{8,64}$/);
});
