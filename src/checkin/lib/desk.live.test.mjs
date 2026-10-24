/* node --test src/checkin/lib/desk.live.test.mjs: the running app (lib/desk.js) on its live stream, frame by frame as
   the server sends them (lib/fakeBrowser.mjs: nothing leaves this process).
   • An arrival undone (or the guest checked in) in a LATER frame within a moment never chimes, flashes or shows a
     banner; one still standing after the hold does (S3).
   • What live events change (a Day-1 check-in after the last full list load) is written into the device's copy, so a
     reopen offline on Day 2 says "Has pass"; never with staff-only fields (S4).
   • A staff inclusion switch: the switch goes to the pass that decides it, and the guest's inclusions come from the
     server's event (guest-level, any counting pass), never from the one pass the PATCH answered with; a guest event's
     row is applied as it comes, without reloading the list (S6). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fire, json, liveStream, net, tokenOf, wait } from "./fakeBrowser.mjs";

const D = await import("./desk.js");
const S = await import("./state.js");

const SNAPSHOT_KEY = "ttfc.desk.snapshot.v1";
const now = Date.now();
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date(now));
const today = { date: day, eventDay: "day1", label: "Day 1" };
const stations = [{ key: "lobby", label: "Lobby", enabled: true }, { key: "desk", label: "Pass desk", enabled: true }, { key: "breakfast", label: "CxO Breakfast", enabled: true }];
const guests = () => [
  { key: "g1", keys: ["g1"], name: "Priya Sharma", tier: "power", passName: "Power Pass", marks: {}, extras: { cxo: true }, email: "priya@example.com", ticketId: "T1", personId: "p1" },
  { key: "g2", keys: ["g2"], name: "Sam Lee", tier: "connect", passName: "Connect Pass", marks: {}, extras: {}, email: "sam@example.com", ticketId: "T2", personId: "p2" },
  // Two passes: the Connect Pass is the main one, the Power Pass (another counting pass) includes the CxO Breakfast.
  { key: "g3", keys: ["g3", "g3b"], name: "Ana Diaz", tier: "connect", passName: "Connect Pass", marks: {}, extras: { cxo: true, lunch: false }, email: "ana@example.com", ticketId: "T3A", ticketIds: ["T3A", "T3B"], personId: "p3",
    extrasView: { cxo: { override: null, auto: true, included: true, ticketId: "T3B" }, lunch: { override: null, auto: false, included: false, ticketId: "T3A" } },
    passExtras: [{ ticketId: "T3A", passName: "Connect Pass", extrasView: {} }, { ticketId: "T3B", passName: "Power Pass", extrasView: {} }] },
];
const snap = () => ({ serverTime: new Date().toISOString(), cursor: 5, today, user: { id: "uS", name: "Sam Staff" }, staff: true, stations, windows: {}, stationStates: {}, guests: guests(), marks: [], notes: {}, queries: [], booths: [] });

const stream = liveStream();
const server = { snapshots: 0, patches: [] };
net.route = (url, opts = {}) => {
  if (url.endsWith("/auth/login")) return json({ token: "tok-sam" });
  if (tokenOf(opts) !== "tok-sam") return json({ error: "signed out" }, 401);
  if (url.includes("/checkin/desk/me")) return json({ user: { id: "uS", name: "Sam Staff" }, staff: true });
  if (url.includes("/checkin/desk/snapshot")) { server.snapshots += 1; return json(snap()); }
  if (url.includes("/checkin/desk/stream")) return stream.response();
  if (url.includes("/checkin/desk/events")) return json({ events: [], cursor: 5, serverTime: new Date().toISOString() });
  if (url.includes("/checkin/desk/clock")) return json({ serverTime: new Date().toISOString(), today, stationStates: {}, stations, windows: {} });
  if (url.includes("/checkin/desk/actions")) { const b = JSON.parse(opts.body); return json({ results: b.actions.map((a) => ({ clientId: a.clientId, ok: true })) }); }
  if (url.includes("/console/people/") && opts.method === "PATCH") {
    server.patches.push({ url, body: JSON.parse(opts.body) });
    // The one pass's switches only (as Admin › People answers): never the guest's inclusions.
    return json({ ok: true, person: { id: "p3", passes: [{ ticketId: "T3A", extras: { cxo: { override: null, auto: false, included: false }, lunch: { override: true, auto: false, included: true } } }] } });
  }
  return null;
};

let seq = 5;
const at = () => new Date().toISOString();
const arrived = (key, ref) => ({ seq: ++seq, kind: "mark", point: "arrived", key, day, at: at(), station: "lobby", by: { name: "Val" }, clientId: ref, marks: [{ key, point: "arrived", day, at: at(), rev: seq, ref }] });
const undone = (key, ref) => ({ seq: ++seq, kind: "undo", point: "arrived", key, day, at: at(), station: "lobby", ref, target: ref, marks: [{ key, point: "arrived", day, at: null, rev: seq }] });
const checkedIn = (key, ref) => ({ seq: ++seq, kind: "mark", point: "checked_in", key, day, at: at(), station: "desk", clientId: ref,
  marks: [{ key, point: "checked_in", day, at: at(), rev: seq, ref }, { key, point: "arrived", day, at: at(), rev: seq, ref }], pass: { key, collected: true, collectedAt: at() } });
const send = async (events) => { stream.frame("events", { events, cursor: seq, serverTime: at() }); await wait(30); };

D.boot();
await D.signIn("sam@x", "pw");
for (let i = 0; i < 50 && !(D.desk.state && stream.open); i++) await wait(20);
stream.frame("hello", { serverTime: at(), cursor: 5 });
await wait(30);
D.setStation("desk");

test("an arrival undone in a later frame within the hold: no chime / flash, no banner; one still standing: both", async () => {
  assert.equal(D.ANNOUNCE_HOLD_MS, 1500);
  assert.ok(D.desk.state && stream.open, "signed in, live");
  await send([arrived("g1", "a1")]);
  await send([undone("g1", "a1")]); // the server sends the undo on its own, a moment later
  await wait(D.ANNOUNCE_HOLD_MS + 250);
  assert.equal(D.desk.flash, null, "no flash (and so no chime) for an arrival that was undone");
  assert.equal(D.desk.banners.desk.size(), 0, "no banner");
  // Arrived, then checked in at the desk (came straight up) before the hold ran out: nothing to announce either.
  await send([arrived("g2", "a2")]);
  await send([checkedIn("g2", "c2")]);
  await wait(D.ANNOUNCE_HOLD_MS + 250);
  assert.equal(D.desk.flash, null);
  assert.equal(D.desk.banners.desk.size(), 0);
  // An arrival that stands: announced once the hold is over (not before), with the banner's two-line parts.
  await send([arrived("g3", "a3")]);
  assert.equal(D.desk.flash, null, "held, not yet");
  await wait(D.ANNOUNCE_HOLD_MS + 250);
  assert.ok(D.desk.flash?.seq > 0, "the desk flashes (and chimes)");
  const b = D.desk.banners.desk.view().visible[0];
  assert.equal(b.key, "g3");
  assert.equal(b.text, "Ana Diaz is on the way up · Connect Pass · Box D");
  assert.deepEqual(b.parts, { name: "Ana Diaz", lead: "is on the way up", facts: ["Connect Pass", "Box D"] });
  // Its undo afterwards takes the banner down (as before).
  await send([undone("g3", "a3")]);
  assert.equal(D.desk.banners.desk.size(), 0);
});

test("a Day-1 check-in after the last list load is in the device's copy: offline on Day 2 it says Has pass", async () => {
  const loadsBefore = server.snapshots;
  await send([checkedIn("g1", "c1")]);
  assert.equal(server.snapshots, loadsBefore, "no full reload needed");
  const cachedG1 = () => JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null")?.snap?.guests?.find((g) => g.key === "g1");
  assert.ok(!cachedG1()?.passCollected, "not written on every event");
  await wait(D.PERSIST_MS + 300);
  assert.equal(cachedG1()?.passCollected, true, "written a few seconds later");
  const c = JSON.parse(localStorage.getItem(SNAPSHOT_KEY));
  const text = JSON.stringify(c);
  for (const x of ["priya@example.com", '"ticketId"', '"personId"', '"extrasView"', '"passExtras"']) assert.ok(!text.includes(x), `no ${x} in the copy`);
  // The device reopens offline the next day: Day 1's marks go, the pass collected stays ("Has pass (collected …)").
  const s = S.fromSnapshot(c.snap, { clientNow: Date.now() });
  assert.ok(S.statusOf(s, s.byKey.get("g1")).checked_in, "the check-in itself is in the copy");
  assert.equal(S.rollDay(s, Date.now() + 26 * 3600e3), true);
  const g1 = s.byKey.get("g1");
  assert.equal(S.statusOf(s, g1).checked_in, null);
  assert.equal(S.collectedBefore(g1, s.today), true, "Has pass");
  // Hidden or closed: written at once.
  await send([{ seq: ++seq, kind: "note", key: "g2", note: "Collect at VIP desk", at: at(), by: { name: "Sam" } }]);
  fire("pagehide");
  assert.equal(JSON.parse(localStorage.getItem(SNAPSHOT_KEY)).snap.notes.g2?.text, "Collect at VIP desk");
});

test("staff inclusions: the pass that decides it, the guest's inclusions from the server's event, a guest row without a reload", async () => {
  const g3 = () => D.desk.state.byKey.get("g3");
  // An inclusions event from before the change, still on its way (another instance's, late): its number is taken.
  const late = ++seq;
  await send([{ seq: ++seq, kind: "note", key: "g1", note: "", at: at(), by: { name: "Sam" } }]);
  // Breakfast comes from her Power Pass: switching it off goes to that pass, not the main one.
  await D.setInclusion(g3(), "cxo", false);
  assert.match(server.patches.at(-1).url, /\/console\/people\/p3\/passes\/T3B$/);
  assert.deepEqual(server.patches.at(-1).body, { extras: { cxo: false } });
  assert.equal(g3().extras.cxo, true, "unchanged until the server says (another pass could still include it)");
  assert.equal(g3().extrasView.cxo.override, false, "the switch shows the choice");
  // Lunch on (main pass): the reply's one pass says cxo not included; the guest's own inclusions are kept, lunch on.
  await D.setInclusion(g3(), "lunch", true);
  assert.match(server.patches.at(-1).url, /\/passes\/T3A$/);
  assert.deepEqual(g3().extras, { cxo: true, lunch: true }, "never one pass's extras");
  // The server's inclusions event: guest-level extras and the row (here: breakfast off on both passes now).
  const loads = server.snapshots;
  const row = { ...guests()[2], extras: { cxo: false, lunch: true }, extrasView: { cxo: { override: false, auto: true, included: false, ticketId: "T3A" }, lunch: { override: true, auto: false, included: true, ticketId: "T3A" } } };
  await send([{ seq: ++seq, kind: "inclusions", key: "g3", at: at(), extras: row.extras, extrasView: row.extrasView, guest: row }]);
  assert.deepEqual(g3().extras, { cxo: false, lunch: true });
  assert.equal(g3().extrasView.cxo.ticketId, "T3A");
  // An older inclusions event still on its way (from before the change) doesn't undo it.
  await send([{ seq: late, kind: "inclusions", key: "g3", at: at(), extras: { cxo: true, lunch: false }, guest: { ...row, extras: { cxo: true, lunch: false } } }]);
  assert.ok(D.desk.state.seen.has(late), "it was applied (not skipped as seen)");
  assert.deepEqual(g3().extras, { cxo: false, lunch: true });
  // A guest event with the row (Media = Yes, a new name): applied in place, no reload.
  await send([{ seq: ++seq, kind: "guest", key: "g2", at: at(), guest: { ...guests()[1], name: "Sam Lee-Park", marks: { media: true } } }]);
  assert.equal(D.desk.state.byKey.get("g2").name, "Sam Lee-Park");
  assert.equal(D.desk.state.byKey.get("g2").marks.media, true);
  assert.equal(D.desk.state.guests.findIndex((g) => g.key === "g2"), 1, "in its place in the list");
  await wait(1700);
  assert.equal(server.snapshots, loads, "no list reload for a row the event carried");
  // A guest event without a row (an older server): the list is read again.
  await send([{ seq: ++seq, kind: "guest", key: "g1", at: at() }]);
  await wait(1700);
  assert.equal(server.snapshots, loads + 1);
});

test("signed out: nothing held is announced afterwards, nothing written into a copy", async () => {
  await send([arrived("g2", "a9")]);
  await D.signOut();
  await wait(D.ANNOUNCE_HOLD_MS + 250);
  assert.equal(D.desk.flash, null);
  assert.equal(localStorage.getItem(SNAPSHOT_KEY), null);
  stream.close();
});
