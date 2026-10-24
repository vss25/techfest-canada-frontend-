/* node --test src/checkin/lib/desk.session.test.mjs: the running app (lib/desk.js) across sign-ins, on a fake network
   (lib/fakeBrowser.mjs: nothing leaves this process).
   • A list still downloading for the previous sign-in (a shift change on slow Wi-Fi) is never applied to the next one:
     not its staff fields, not its name; the next person's taps go out as theirs (C3).
   • A load asked for while one runs is never dropped: one more load follows (a walk-in added meanwhile shows up).
   • "Admit anyway" by the next person is recorded as theirs (the first tapper kept on the device only).
   • A device with no list yet loads it as soon as it's back online.
   • A staff sign-in's last use is kept with it (throttled; at once when the app is hidden), so a reload can lock it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fire, json, later, net, tokenOf, wait } from "./fakeBrowser.mjs";

const D = await import("./desk.js");

const USERS = { "alice@x": { id: "uA", name: "Alice Staff", staff: true }, "bob@x": { id: "uB", name: "Bob Volunteer", staff: false } };
const tokens = new Map();
const today = { date: "2026-10-26", eventDay: "day1", label: "Day 1" };
const stations = [{ key: "lobby", label: "Lobby", enabled: true }, { key: "breakfast", label: "CxO Breakfast", enabled: true }];
const snapFor = (u, guests = [{ key: "g1", keys: ["g1"], name: "Guest One" }], cursor = 5) => ({
  serverTime: new Date().toISOString(), cursor, today, user: { id: u.id, name: u.name }, staff: u.staff, stations, windows: {}, stationStates: {},
  // Staff get staff-only fields.
  guests: guests.map((g) => ({ ...g, ...(u.staff ? { email: `${g.key}@example.com`, ticketId: `TT-${g.key}` } : {}) })), marks: [], notes: {}, queries: [], booths: [],
});
/** The fake server. `snapshot(u)`: a Response (or promise) for that user's list; `act(a, u)`: one tap's result. */
const server = { snapshot: (u) => json(snapFor(u)), act: (a) => ({ clientId: a.clientId, ok: true }), sent: [] };
net.route = (url, opts) => {
  const u = tokens.get(tokenOf(opts));
  if (url.endsWith("/auth/login")) { const b = JSON.parse(opts.body); const t = `tok-${b.email}-${tokens.size}`; tokens.set(t, USERS[b.email]); return json({ token: t }); }
  if (!u) return json({ error: "signed out" }, 401);
  if (url.includes("/checkin/desk/me")) return json({ user: { id: u.id, name: u.name }, staff: u.staff });
  if (url.includes("/checkin/desk/snapshot")) return server.snapshot(u);
  if (url.includes("/checkin/desk/actions")) {
    const b = JSON.parse(opts.body);
    server.sent.push(...b.actions.map((a) => ({ ...a, token: tokenOf(opts) })));
    return json({ results: b.actions.map((a) => server.act(a, u)) });
  }
  if (url.includes("/checkin/desk/stream")) return new Promise(() => {});
  if (url.includes("/checkin/desk/events")) return json({ events: [], cursor: 5, serverTime: new Date().toISOString() });
  if (url.includes("/checkin/desk/clock")) return json({ serverTime: new Date().toISOString(), today, stationStates: {}, stations, windows: {} });
  return null;
};
D.boot();

test("a list still downloading for the previous sign-in is never applied to the next (shift change on slow Wi-Fi)", async () => {
  const slow = later();
  server.snapshot = (u) => (u.id === "uA" ? slow.promise : json(snapFor(u)));
  await D.signIn("alice@x", "pw");
  await wait();
  await D.signOut();
  server.snapshot = (u) => json(snapFor(u));
  await D.signIn("bob@x", "pw");
  await wait();
  slow.release(snapFor(USERS["alice@x"])); // Alice's list finally arrives
  await wait(60);
  assert.equal(D.desk.session.user.id, "uB");
  assert.equal(D.desk.session.staff, false, "never Alice's staff rights");
  assert.equal(D.desk.state.me.id, "uB");
  assert.equal(D.desk.state.guests[0].email, undefined, "never the staff-only fields of Alice's list");
  D.setStation("lobby");
  server.sent.length = 0;
  const it = D.tap({ kind: "mark", point: "arrived", key: "g1" });
  assert.deepEqual(it.queuedBy, { id: "uB", name: "Bob Volunteer" });
  await wait(60);
  assert.deepEqual(server.sent.map((a) => [a.queuedBy?.id, tokens.get(a.token)?.id]), [["uB", "uB"]]);
});

test("taps are stamped with who signed in (the server's answer then), whatever a list load says since", async () => {
  // A list whose name for the user differs (renamed meanwhile): the header shows the new name; taps keep the sign-in's.
  server.snapshot = (u) => json({ ...snapFor(u), user: { id: u.id, name: "Bob V. (renamed)" } });
  await D.load({ quiet: true });
  assert.equal(D.desk.session.user.name, "Bob V. (renamed)");
  assert.deepEqual(D.desk.session.identity, { id: "uB", name: "Bob Volunteer" });
  assert.deepEqual(D.tap({ kind: "mark", point: "arrived", key: "g1" }).queuedBy, { id: "uB", name: "Bob Volunteer" });
  // A list for someone else entirely is never applied.
  server.snapshot = () => json(snapFor(USERS["alice@x"]));
  await D.load({ quiet: true });
  assert.equal(D.desk.state.guests[0].email, undefined);
  assert.equal(D.desk.session.user.id, "uB");
  server.snapshot = (u) => json(snapFor(u));
  await wait(60);
});

test("a load asked for while one runs gets one more load after it (a walk-in added meanwhile shows up)", async () => {
  const first = later();
  let calls = 0;
  server.snapshot = (u) => { calls += 1; return calls === 1 ? first.promise : json(snapFor(u, [{ key: "g1", keys: ["g1"], name: "Guest One" }, { key: "g2", keys: ["g2"], name: "Walk In" }], 20)); };
  const a = D.load({ quiet: true }); // e.g. the 3-minute reload, built before the walk-in existed
  await wait();
  const b = D.load({ quiet: true }); // the walk-in's "guest" event asks for a reload
  const c = D.load({ quiet: true }); // and another: still just one more
  first.release(snapFor(USERS["bob@x"]));
  await Promise.all([a, b, c]);
  assert.equal(calls, 2, "the running one, then exactly one more");
  assert.ok(D.desk.state.byKey.get("g2"), "the walk-in is on the device");
  // A request with a full refresh merged into the follow-up keeps it.
  assert.deepEqual(D.mergeLoads({ quiet: true, refresh: false }, { quiet: false, refresh: true }), { quiet: false, refresh: true });
  assert.deepEqual(D.mergeLoads(null, { quiet: true }), { quiet: true, refresh: false });
  server.snapshot = (u) => json(snapFor(u));
});

test("Admit anyway after a shift change: recorded as the person deciding now (C3)", async () => {
  // Alice (staff) admits at the breakfast outside its hours: refused.
  await D.signOut();
  server.act = (a) => (a.override ? { clientId: a.clientId, ok: true } : { clientId: a.clientId, ok: false, status: 409, code: "outside_window", error: "closed" });
  await D.signIn("alice@x", "pw");
  await wait();
  D.setStation("breakfast");
  const it = D.tap({ kind: "mark", point: "cxo", key: "g1" });
  await wait(60);
  assert.equal(D.failedTaps().length, 1);
  assert.equal(D.failedTaps()[0].queuedBy.id, "uA");
  // Bob takes over and taps Admit anyway in Needs attention.
  await D.signOut();
  await D.signIn("bob@x", "pw");
  await wait();
  server.sent.length = 0;
  D.retryTap(it.clientId, { override: true });
  await wait(60);
  const sent = server.sent.find((a) => a.clientId === it.clientId);
  assert.deepEqual([sent.override, sent.queuedBy.id, tokens.get(sent.token).id], [true, "uB", "uB"]);
  assert.ok(!("tappedBy" in sent));
  assert.equal(D.failedTaps().length, 0);
  server.act = (a) => ({ clientId: a.clientId, ok: true });
});

test("no list on the device and back online: it loads by itself (no Try again needed)", async () => {
  await D.signOut();
  server.snapshot = () => Promise.reject(new TypeError("offline"));
  await D.signIn("bob@x", "pw");
  await wait(60);
  assert.equal(D.desk.state, null);
  assert.ok(D.desk.loadError, "the loading screen says why");
  server.snapshot = (u) => json(snapFor(u));
  fire("online");
  await wait(60);
  assert.equal(D.desk.state?.me?.id, "uB");
  assert.equal(D.desk.loadError, "");
});

test("a staff sign-in's last use is kept with it: throttled, and at once when the app is hidden or closed", async () => {
  await D.signOut();
  const realNow = Date.now;
  let skew = 0;
  Date.now = () => realNow() + skew;
  try {
    await D.signIn("alice@x", "pw");
    await wait();
    const stored = () => JSON.parse(localStorage.getItem("ttfc.desk.session.v1") || "null");
    const t0 = stored().lastUse;
    assert.ok(t0 > 0, "kept from the sign-in");
    skew = 10_000;
    fire("pointerdown");
    assert.equal(stored().lastUse, t0, "throttled: not every tap writes");
    skew = D.USE_SAVE_MS + 1000;
    fire("pointerdown");
    assert.ok(stored().lastUse >= t0 + D.USE_SAVE_MS, "written once a minute of use has gone by");
    skew += 5000;
    fire("keydown");
    fire("pagehide");
    assert.equal(stored().lastUse, Date.now(), "at once when the app closes");
    assert.equal(D.lastUseOf(stored()), stored().lastUse);
    assert.equal(D.lastUseOf({ at: 5 }), 5, "an older version's sign-in: when it was made");
  } finally {
    Date.now = realNow;
  }
  await D.signOut();
  assert.equal(localStorage.getItem("ttfc.desk.session.v1"), null, "signed out: nothing kept");
});
