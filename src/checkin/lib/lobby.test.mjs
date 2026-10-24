/* node --test src/checkin/lib/lobby.test.mjs: the organiser (Oct 23): "Make sure all the people whether media or
   exhibitor can be marked as arrived in lobby itself". Every group the backend sends is found by the lobby search and
   gets the same one-tap Arrived (connect, influence, power, apex, Speaker Pass, the speaker type on another pass, Media
   on any pass, VIP, an exhibitor, a pending pass, and on the list with no pass on file: ISSUE PASS); their own desk is
   told too; Arrived and Checked in never ask about hours on an event day (6:15 AM is one tap), only the meal and
   evening stations keep "Admit anyway". */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, search } from "./search.js";
import { deskStage, fromSnapshot, statusOf } from "./state.js";
import { badgeOf, chipsOf } from "./passColors.js";
import { notifyStations } from "./notify.js";
import { stationState, stationView, tapRule } from "./stationTime.js";
import { ISSUE_PASS } from "./special.js";

const marks = (m = {}) => ({ vip: false, media: false, speaker: false, exhibitor: false, ...m });
const G = [
  { key: "gc", name: "Cara Connect", tier: "connect", passName: "Connect Pass", marks: marks() },
  { key: "gi", name: "Ian Influence", tier: "influence", passName: "Influence Pass", marks: marks() },
  { key: "gp", name: "Pat Power", tier: "power", passName: "Power Pass", marks: marks() },
  { key: "ga", name: "Ada Apex", tier: "apex", passName: "Apex Pass", marks: marks() },
  { key: "gs", name: "Sam Speakerpass", tier: "speaker", passName: "Speaker Pass", marks: marks({ speaker: true }) },
  { key: "gt", name: "Tia Talker", tier: "power", passName: "Power Pass", marks: marks({ speaker: true }) },
  { key: "gm", name: "Mo Media", tier: "connect", passName: "Connect Pass", marks: marks({ media: true }) },
  { key: "gv", name: "Val Vip", tier: "power", passName: "Power Pass", marks: marks({ vip: true }) },
  { key: "ge", name: "Eve Exhibitor", tier: "connect", passName: "Connect Pass", company: "Boothco", booth: "A12", marks: marks({ exhibitor: true }) },
  { key: "gq", name: "Penny Pending", tier: "connect", passName: "Connect Pass", pending: true, marks: marks() },
  // On the list, no pass on file (contract C7): a speaker with no Speaker Pass row, Media with no pass, an exhibitor.
  { key: "pspk", name: "Nora Nopass", tier: null, passName: null, noPass: true, marks: marks({ speaker: true }) },
  { key: "pmed", name: "Mia Nopassmedia", tier: null, passName: null, noPass: true, marks: marks({ media: true }) },
  { key: "pexh", name: "Xan Nopassexhib", tier: null, passName: null, noPass: true, company: "Fabrikam", marks: marks({ exhibitor: true }) },
].map((g) => ({ keys: [g.key], extras: {}, rsvp: { options: [] }, ...g }));

const snap = (serverTime) => ({ serverTime, cursor: 1, today: { date: "2026-10-26", eventDay: "day1", phase: "event", label: "Day 1" }, user: { id: "v1", name: "Val Volunteer" }, guests: G, marks: [] });

test("every group is found by the lobby search and nothing is filtered out", () => {
  const idx = buildIndex(G);
  for (const g of G) assert.equal(search(idx, g.name)[0]?.key, g.key, g.name);
  for (const g of G) assert.ok(search(idx, g.name.split(" ")[1]).some((x) => x.key === g.key), `${g.name} by surname`);
  assert.equal(search(idx, "nora")[0].key, "pspk", "a no-pass speaker by first name");
  assert.equal(search(idx, "fabrikam")[0].key, "pexh", "a no-pass exhibitor by company");
});

test("one tap: a queued Arrived shows each guest as on the way up, a no-pass speaker included", () => {
  const s = fromSnapshot(snap("2026-10-26T10:15:00Z"));
  for (const g of G) {
    const tap = { clientId: `t-${g.key}`, kind: "mark", point: "arrived", key: g.key, clientAt: "2026-10-26T10:15:05Z", station: "lobby" };
    assert.equal(deskStage(statusOf(s, g, [tap])), "on_the_way", g.name);
  }
});

test("their own desk is told too: speakers AV, media the media desk, exhibitors the exhibitor desk; the pass desk always", () => {
  const by = Object.fromEntries(G.map((g) => [g.key, notifyStations(g)]));
  assert.deepEqual(by.gc, ["desk"]);
  assert.deepEqual(by.gs, ["desk", "av"]);
  assert.deepEqual(by.gt, ["desk", "av"]);
  assert.deepEqual(by.gm, ["desk", "media"]);
  assert.deepEqual(by.ge, ["desk", "exhibitor"]);
  assert.deepEqual(by.pspk, ["desk", "av"], "a no-pass speaker: AV too");
  assert.deepEqual(by.pmed, ["desk", "media"]);
  assert.deepEqual(by.pexh, ["desk", "exhibitor"]);
});

test("ISSUE PASS: their colour from the marks (Speaker red, Media dark blue, else neutral) and the ISSUE PASS badge", () => {
  const b = (k) => badgeOf(G.find((g) => g.key === k));
  assert.deepEqual([b("pspk").bg, b("pspk").full, b("pspk").noPass], ["#D01F2F", "Speaker · No pass on file", true]);
  assert.deepEqual([b("pmed").bg, b("pmed").full], ["#0B3D91", "Media · No pass on file"]);
  assert.deepEqual([b("pexh").neutral, b("pexh").full], [true, "No pass on file"]);
  for (const k of ["pspk", "pmed", "pexh"]) assert.equal(chipsOf(G.find((g) => g.key === k))[0].label, "ISSUE PASS");
  assert.equal(chipsOf(G.find((g) => g.key === "gc")).length, 0, "an ordinary pass holder has no ISSUE PASS");
  assert.equal(ISSUE_PASS.reading, "On the list · no pass on file");
});

test("a 6:15 AM arrival on an event day: the lobby, pass desk, media, AV and exhibitor desks are open all day (C9)", () => {
  const windows = { lobby: { day1: { open: "07:00", close: "23:00", source: "default", allDay: true } }, desk: { day1: { open: "07:00", close: "23:00", source: "default", allDay: true } },
    lunch: { day1: { open: "12:05", close: "13:50", source: "fallback", session: { start: "12:35", end: "13:20", title: "Networking Lunch" } } },
    exhibitor: { day1: { open: "06:30", close: "18:00", source: "default", allDay: true } } };
  const at = Date.parse("2026-10-26T10:15:00Z"); // 6:15 AM Toronto
  const lobby = stationState({ station: "lobby", at, windows });
  assert.deepEqual([lobby.code, lobby.open, lobby.allDay, lobby.text, lobby.detail], ["open", true, true, "Day 1 · Arrivals open all day", ""], "as the server says (checkinDeskTime.js)");
  for (const [st, text] of [["desk", "Pass desk open all day"], ["media", "Media desk open all day"], ["av", "AV station open all day"], ["exhibitor", "Exhibitor desk open all day"]]) {
    const x = stationState({ station: st, at, windows });
    assert.deepEqual([x.code, x.text], ["open", `Day 1 · ${text}`], st);
    assert.equal(tapRule(st, x), "tap", `${st}: never asks, never an override`);
  }
  assert.equal(tapRule("lobby", lobby), "tap");
  // A server from before C9 still sends the lobby's hours: shown open all day anyway, and never asked.
  const old = { ...lobby, open: false, allDay: undefined, code: "later", text: "Day 1 · Lobby · opens at 7:00 AM", opensAt: "07:00" };
  assert.deepEqual([stationView("lobby", old).text, stationView("lobby", old).code], ["Day 1 · Arrivals open all day", "open"]);
  assert.equal(tapRule("lobby", old), "tap");
  // Meals and the evening keep their hours and "Admit anyway"; even an old server's closed media desk is a plain tap.
  assert.equal(tapRule("lunch", stationState({ station: "lunch", at, windows })), "ask");
  assert.equal(tapRule("breakfast", { code: "closed", open: false, eventDay: "day1" }), "ask");
  assert.equal(tapRule("evening", { code: "closed", open: false, eventDay: "day2" }), "ask");
  assert.equal(tapRule("media", { code: "closed", open: false, eventDay: "day1" }), "tap");
  // A day that isn't an event day: practice marks, never asked (C6), and nothing is "all day".
  const before = stationState({ station: "lunch", at: Date.parse("2026-10-24T15:00:00Z"), windows });
  assert.equal(tapRule("lunch", before), "tap");
  assert.equal(stationView("lobby", stationState({ station: "lobby", at: Date.parse("2026-10-24T15:00:00Z"), windows })).code, "before", "only event days are all day");
});
