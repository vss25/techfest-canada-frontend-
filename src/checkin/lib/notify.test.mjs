/* node --test src/checkin/lib/notify.test.mjs: where a lobby arrival is announced, the banners' words, and the banner
   queue (newest on top, three at once, nothing dropped). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_VISIBLE, bannerParts, bannerText, createBanners, notifyStations } from "./notify.js";

const g = (marks = {}, extra = {}) => ({ key: "g1", name: "Priya Sharma", lastName: "Sharma", tier: "power", passName: "Power Pass", company: "Northwind",
  marks: { vip: false, media: false, speaker: false, exhibitor: false, ...marks }, ...extra });

test("every arrival to the pass desk; speakers also AV, exhibitors the exhibitor desk, media the media desk", () => {
  assert.deepEqual(notifyStations(g()), ["desk"]);
  assert.deepEqual(notifyStations(g({ speaker: true })), ["desk", "av"]);
  assert.deepEqual(notifyStations(g({ exhibitor: true })), ["desk", "exhibitor"]);
  assert.deepEqual(notifyStations(g({ media: true })), ["desk", "media"]);
  assert.deepEqual(notifyStations(g({ vip: true })), ["desk"]);
  assert.deepEqual(notifyStations(g({ speaker: true, media: true, exhibitor: true })), ["desk", "av", "exhibitor", "media"]);
});

test("the banners say who, what pass and which box; AV says when and where they speak", () => {
  assert.equal(bannerText(g(), "desk"), "Priya Sharma is on the way up · Power Pass · Box S");
  assert.equal(bannerText(g({ media: true }, { tier: "connect", passName: "Connect Pass" }), "desk"), "Priya Sharma is on the way up · Media · Connect Pass · Box S");
  const now = Date.parse("2026-10-26T09:45:00-04:00");
  const speaker = g({ speaker: true }, { sessions: [{ day: "day1", start: "10:30", end: "11:00", title: "Panel", room: "Harbour Ballroom" }] });
  assert.equal(bannerText(speaker, "av", { eventDay: "day1", now }), "Priya Sharma arrived · speaks 10:30 AM, Harbour Ballroom (in 45 min)");
  assert.equal(bannerText(g({ speaker: true }), "av", { eventDay: "day1", now }), "Priya Sharma arrived · no session today");
  assert.equal(bannerText(g({ exhibitor: true }, { booth: "a12" }), "exhibitor"), "Priya Sharma arrived · Northwind · Booth A12");
  assert.equal(bannerText(g({ media: true }), "media"), "Priya Sharma arrived · Media · Power Pass · Northwind");
});

test("a phone's two lines: the name, then the facts (pass type and box letter at the desk) that must never be cut", () => {
  const v = g({}, { name: "Victoria Gold", lastName: "Gold", tier: "connect", passName: "Connect Pass" });
  assert.deepEqual(bannerParts(v, "desk"), { name: "Victoria Gold", lead: "is on the way up", facts: ["Connect Pass", "Box G"] });
  assert.deepEqual(bannerParts(g({ media: true }), "desk").facts, ["Media · Power Pass", "Box S"]);
  assert.deepEqual(bannerParts(g({ exhibitor: true }, { booth: "a12" }), "exhibitor"), { name: "Priya Sharma", lead: "arrived", facts: ["Northwind", "Booth A12"] });
  // The one-line text is the same words.
  for (const st of ["desk", "media", "exhibitor", "av"]) {
    const p = bannerParts(v, st);
    assert.equal(bannerText(v, st), [`${p.name} ${p.lead}`, ...p.facts].join(" · "), st);
  }
});

test("the queue: newest first, three visible, +N more, cleared when checked in or Got it", () => {
  const b = createBanners();
  for (let i = 1; i <= 5; i++) b.add({ key: `g${i}`, text: `Guest ${i}` });
  let v = b.view();
  assert.equal(MAX_VISIBLE, 3);
  assert.deepEqual(v.visible.map((x) => x.key), ["g5", "g4", "g3"]);
  assert.equal(v.more, 2);
  b.add({ key: "g2", text: "again" });
  assert.deepEqual(b.view().visible.map((x) => x.key), ["g2", "g5", "g4"], "a repeat moves to the top, never twice");
  assert.equal(b.size(), 5);
  assert.equal(b.clear("g5"), true);
  assert.equal(b.clear("nope"), false);
  b.keep((x) => x.key !== "g4");
  v = b.view();
  assert.deepEqual(v.visible.map((x) => x.key), ["g2", "g3", "g1"]);
  assert.equal(v.more, 0);
});
