// Save / unsave sends the state the person sees, one request per session at a time, the latest tap winning
// (Oct 25 2026, "When I unsave a session my points stay").
// Run: node --test src/app/lib/bookmarkSync.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createBookmarkSync } from "./bookmarkSync.js";

/** A server that sets exactly what it's sent; each request waits until the test answers it (or fails it). */
function fakeServer(saved = new Set()) {
  const calls = [];
  const send = (key, wanted) => new Promise((resolve, reject) => {
    calls.push({
      key, wanted,
      answer() { if (wanted) saved.add(key); else saved.delete(key); resolve({ registered: saved.has(key) }); },
      fail() { reject(new Error("offline")); },
    });
  });
  return { calls, send, saved };
}

const tick = () => new Promise((r) => setImmediate(r));

test("an unsave sends saved: false, even when the server still had it saved", async () => {
  const srv = fakeServer(new Set(["s1"]));
  const sync = createBookmarkSync(srv.send);
  const done = sync.want("s1", false);
  assert.deepEqual(srv.calls.map((c) => [c.key, c.wanted]), [["s1", false]]);
  assert.equal(sync.wanted("s1"), false);
  srv.calls[0].answer();
  assert.deepEqual(await done, { registered: false });
  assert.equal(srv.saved.has("s1"), false);
  assert.equal(sync.wanted("s1"), undefined);
});

test("unsaving what the server never saved doesn't save it (the old toggle did)", async () => {
  const srv = fakeServer(new Set());
  const sync = createBookmarkSync(srv.send);
  const done = sync.want("s1", false);
  srv.calls[0].answer();
  assert.deepEqual(await done, { registered: false });
  assert.equal(srv.saved.size, 0);
});

test("rapid taps: one request at a time, then the latest wanted state", async () => {
  const srv = fakeServer();
  const sync = createBookmarkSync(srv.send);
  const a = sync.want("s1", true);
  const b = sync.want("s1", false);
  const c = sync.want("s1", true);
  const d = sync.want("s1", false);
  assert.equal(srv.calls.length, 1, "only one request out");
  assert.equal(a, d, "every tap in the burst gets the same answer");
  srv.calls[0].answer(); // saved
  await tick();
  assert.equal(srv.calls.length, 2, "sent again: what's wanted changed meanwhile");
  assert.equal(srv.calls[1].wanted, false);
  srv.calls[1].answer();
  for (const p of [a, b, c, d]) assert.deepEqual(await p, { registered: false });
  assert.equal(srv.saved.has("s1"), false);
  assert.equal(srv.calls.length, 2);
});

test("tapped back to what's already on its way: nothing more is sent", async () => {
  const srv = fakeServer(new Set(["s1"]));
  const sync = createBookmarkSync(srv.send);
  const a = sync.want("s1", false);
  sync.want("s1", true);
  sync.want("s1", false);
  srv.calls[0].answer();
  assert.deepEqual(await a, { registered: false });
  assert.equal(srv.calls.length, 1);
});

test("sessions don't wait for each other", () => {
  const srv = fakeServer();
  const sync = createBookmarkSync(srv.send);
  sync.want("s1", true);
  sync.want("s2", true);
  assert.deepEqual(srv.calls.map((c) => c.key), ["s1", "s2"]);
});

test("a failed request rejects, unless they tapped again meanwhile (then the new state goes)", async () => {
  const srv = fakeServer();
  const sync = createBookmarkSync(srv.send);
  const a = sync.want("s1", true);
  srv.calls[0].fail();
  await assert.rejects(a, /offline/);
  assert.equal(sync.wanted("s1"), undefined, "free for the next tap");

  const b = sync.want("s1", true);
  sync.want("s1", false);
  srv.calls[1].fail();
  await tick();
  assert.equal(srv.calls.length, 3);
  assert.equal(srv.calls[2].wanted, false);
  srv.calls[2].answer();
  assert.deepEqual(await b, { registered: false });
});

test("after a burst settles, the next tap starts a new request", async () => {
  const srv = fakeServer();
  const sync = createBookmarkSync(srv.send);
  const a = sync.want("s1", true);
  srv.calls[0].answer();
  await a;
  const b = sync.want("s1", false);
  assert.notEqual(a, b);
  assert.equal(srv.calls.length, 2);
  srv.calls[1].answer();
  assert.deepEqual(await b, { registered: false });
});
