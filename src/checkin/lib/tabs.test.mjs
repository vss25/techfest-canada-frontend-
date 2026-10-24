/* node --test src/checkin/lib/tabs.test.mjs: pages (tabs, windows) on one device: an id per tab kept across reloads,
   who's still open (Web Locks, else heartbeats), a duplicated tab gets its own id, and the same station open twice. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { TAB_GONE_MS, TAB_ID_KEY, TAB_PREFIX, createTabs, othersOnStation } from "./tabs.js";

function device() {
  const m = new Map();
  return {
    raw: m,
    storage: { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => { m.set(k, v); return true; }, remove: (k) => m.delete(k), keys: (p) => [...m.keys()].filter((k) => k.startsWith(p)) },
  };
}
const sessionOf = () => { const m = new Map(); return { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v), m }; };
/** navigator.locks for one device. */
function locksOf() {
  const held = new Map();
  return {
    request(name, fn) { if (held.has(name)) return new Promise(() => {}); held.set(name, true); return Promise.resolve(fn({ name })).finally(() => held.delete(name)); },
    query: async () => ({ held: [...held.keys()].map((name) => ({ name })) }),
    held,
  };
}
const noTimers = { setTimer: () => 1, clearTimer: () => {} };

test("who is open: Web Locks (released the moment a page goes); the same station twice is noticed", async () => {
  const dev = device();
  const locks = locksOf();
  let now = 1_000_000;
  const a = createTabs({ storage: dev.storage, session: sessionOf(), locks, now: () => now, ...noTimers });
  const b = createTabs({ storage: dev.storage, session: sessionOf(), locks, now: () => now, ...noTimers });
  await a.start();
  await b.start();
  assert.notEqual(a.id, b.id);
  a.setStation("lobby");
  b.setStation("lobby");
  assert.equal(a.othersOnStation("lobby"), 1, "Lobby is also open in another tab");
  assert.equal(a.othersOnStation("media"), 0);
  assert.deepEqual([...(await a.alive())].sort(), [a.id, b.id].sort());
  b.stop();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual([...(await a.alive())], [a.id], "gone at once");
  assert.equal(a.othersOnStation("lobby"), 0);
  now += 1;
});

test("an id per tab, kept across a reload; a duplicated tab (same sessionStorage) takes a new one", async () => {
  const dev = device();
  const locks = locksOf();
  const session = sessionOf();
  const a = createTabs({ storage: dev.storage, session, locks, ...noTimers });
  await a.start();
  assert.equal(session.get(TAB_ID_KEY), a.id);
  const dup = createTabs({ storage: dev.storage, session: { get: (k) => session.get(k), set: () => {} }, locks, ...noTimers });
  await dup.start();
  assert.notEqual(dup.id, a.id, "the original is still open");
  a.stop();
  await new Promise((r) => setImmediate(r));
  const reloaded = createTabs({ storage: dev.storage, session, locks, ...noTimers });
  await reloaded.start();
  assert.equal(reloaded.id, a.id, "a reload keeps the tab's id (its taps are still its own)");
});

test("without Web Locks: heartbeats; a page is gone 90 s after its last one", async () => {
  const dev = device();
  let now = 5_000_000;
  const a = createTabs({ storage: dev.storage, session: sessionOf(), now: () => now, ...noTimers });
  const b = createTabs({ storage: dev.storage, session: sessionOf(), now: () => now, ...noTimers });
  await a.start();
  await b.start();
  assert.ok((await a.alive()).has(b.id));
  now += TAB_GONE_MS + 1;
  a.setStation("desk"); // a beats, b doesn't
  assert.equal((await a.alive()).has(b.id), false);
  assert.ok(dev.raw.has(TAB_PREFIX + a.id));
  assert.equal(othersOnStation({ x: { at: now, station: "desk" }, y: { at: now - TAB_GONE_MS - 5, station: "desk" } }, { me: "z", station: "desk", now }), 1);
});
