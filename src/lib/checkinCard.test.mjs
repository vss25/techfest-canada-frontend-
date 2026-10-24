// The admin check-in page's result card (checkinCard.js): the band as the server sends it, the outcome of a scan,
// the photo's URL, the meals and the time. Run: node --test src/lib/checkinCard.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  PASS_BADGE, PRACTICE_TEXT, avatarSrc, badgeOf, bandSub, cardFrom, checkinTime, initialsOf, mealsOf, outcomeOf, passNameOf,
} from "./checkinCard.js";

const VIP = { key: "vip", label: "VIP", bg: "#F5C400", text: "#3D2E00" };
const ORIGIN = "https://techfest-canada-backend.onrender.com";

test("outcome: checked in, already, not found, invalid, anything else", () => {
  assert.equal(outcomeOf(200, { status: "success" }), "checked_in");
  assert.equal(outcomeOf(200, { status: "already_checked_in" }), "already");
  assert.equal(outcomeOf(200, { status: "practice", practice: true }), "practice");
  assert.equal(outcomeOf(404, { status: "invalid", message: "Ticket not found" }), "not_found");
  assert.equal(outcomeOf(400, { error: "Ticket ID required" }), "invalid");
  for (const s of [0, 401, 403, 500, 503]) assert.equal(outcomeOf(s, {}), "error", String(s));
  assert.equal(outcomeOf(200, {}), "error");
});

test("band: the server's badge as sent; green with the pass name from an older server or a broken badge", () => {
  assert.deepEqual(badgeOf({ badge: VIP, passName: "Power Pass" }), VIP);
  assert.deepEqual(badgeOf({ passName: "Apex Pass" }), { ...PASS_BADGE, label: "Apex Pass" });
  assert.deepEqual(badgeOf({ badge: { key: "x", label: "X", bg: "red", text: "#FFFFFF" }, ticketType: "connect" }), { ...PASS_BADGE, label: "Connect Pass" });
  assert.deepEqual(badgeOf({ badge: { ...VIP, label: " " } }), { ...PASS_BADGE, label: "Pass" });
  assert.equal(passNameOf({ type: "influence" }), "Influence Pass");
  assert.equal(passNameOf({}), "");
});

test("card: a check-in, an already-checked-in pass (its time), a ticket that isn't one", () => {
  const now = cardFrom({
    status: 200, ticketId: "abc",
    body: {
      status: "success", ticketId: "abc", name: "Vera Vip", title: "Minister", company: "Government of Ontario", badge: VIP,
      passName: "Power Pass", avatarUrl: "/api/files/avatar/u1?v=3", extras: { cxo: true, lunch: true, gala: false, awards: true },
      checkedInAt: "2026-10-26T13:42:00Z",
    },
  });
  assert.deepEqual(now, {
    outcome: "checked_in", ticketId: "abc", name: "Vera Vip", title: "Minister", company: "Government of Ontario", badge: VIP,
    passName: "Power Pass", bandSub: "Power Pass", avatarUrl: "/api/files/avatar/u1?v=3", meals: ["CxO Breakfasts", "Luncheons", "Awards Night"],
    at: "2026-10-26T13:42:00Z", collectedBefore: false, message: "",
  });
  const again = cardFrom({ status: 200, ticketId: "abc", body: { status: "already_checked_in", name: "Vera Vip", time: "2026-10-26T13:42:00Z", badge: VIP } });
  assert.deepEqual([again.outcome, again.at, again.badge.label, again.meals, again.collectedBefore], ["already", "2026-10-26T13:42:00Z", "VIP", null, true]);
  const nope = cardFrom({ status: 404, ticketId: "zzz", body: { status: "invalid", message: "Ticket not found" } });
  assert.deepEqual(nope, { outcome: "not_found", ticketId: "zzz", name: "", title: "", company: "", badge: null, passName: "", bandSub: "", avatarUrl: "", meals: null, at: null, collectedBefore: false, message: "Ticket not found" });
  assert.equal(cardFrom({ status: 0, ticketId: "x", body: { error: "Can't reach the server." } }).message, "Can't reach the server.");
});

test("meals: the included extras in order; none; unknown on an older server", () => {
  assert.deepEqual(mealsOf({ extras: { cxo: false, lunch: false, gala: false, awards: false } }), []);
  assert.deepEqual(mealsOf({ extras: { awards: true, gala: true } }), ["Gala Dinner", "Awards Night"]);
  assert.deepEqual(mealsOf({ cxoBreakfast: true }), ["CxO Breakfasts"]);
  assert.equal(mealsOf({ cxoBreakfast: false }), null);
  assert.equal(mealsOf({}), null);
});

test("photo URL: server paths on the API's host, http(s) as they are, nothing else", () => {
  assert.equal(avatarSrc("/api/files/avatar/u1?v=3", ORIGIN), `${ORIGIN}/api/files/avatar/u1?v=3`);
  assert.equal(avatarSrc("/api/files/avatar/u1?v=3", `${ORIGIN}/`), `${ORIGIN}/api/files/avatar/u1?v=3`);
  const sanity = "https://cdn.sanity.io/images/021qtoci/production/a-800x800.jpg?w=256";
  assert.equal(avatarSrc(sanity, ORIGIN), sanity);
  for (const bad of ["", null, "javascript:alert(1)", "data:image/png;base64,AAAA", "//evil.example.com/x.png", "relative.png"]) {
    assert.equal(avatarSrc(bad, ORIGIN), "", String(bad));
  }
});

test("initials and the check-in time (Toronto)", () => {
  assert.equal(initialsOf("Vera Vip"), "VV");
  assert.equal(initialsOf("Dr. Raj K. Patel"), "DP");
  assert.equal(initialsOf("élodie"), "É");
  assert.equal(initialsOf(""), "?");
  const at = "2026-10-26T13:42:00Z";   // 9:42 AM in Toronto
  assert.equal(checkinTime(at, new Date("2026-10-26T20:00:00Z")), "9:42 AM");
  assert.equal(checkinTime(at, new Date("2026-10-27T14:00:00Z")), "Mon, Oct 26, 9:42 AM");
  assert.equal(checkinTime(null), "");
  assert.equal(checkinTime("nope"), "");
});

test("the band: the pass's name small beside Media (dark blue), VIP and the others; nothing extra on the green band", () => {
  const MEDIA = { key: "media", label: "Media", bg: "#0B3D91", text: "#FFFFFF" };
  const card = cardFrom({ status: 200, body: { status: "success", ticketId: "abc", name: "Mo Press", badge: MEDIA, passName: "Connect Pass" } });
  assert.deepEqual([card.badge.bg, card.badge.text, card.badge.label, card.bandSub], ["#0B3D91", "#FFFFFF", "Media", "Connect Pass"]);
  assert.equal(bandSub(VIP, "Power Pass"), "Power Pass");
  assert.equal(bandSub({ key: "pass", label: "Connect Pass" }, "Connect Pass"), "");
  assert.equal(bandSub({ key: "pass", label: "Exhibitor" }, "Connect Pass"), "Connect Pass");
  assert.equal(bandSub(MEDIA, ""), "");
  assert.equal(cardFrom({ status: 404, body: { status: "invalid" } }).bandSub, "");
});

test("practice scan (not an event day, Oct 24 2026): the person's card, nothing checked in, never an error or 'invalid'", () => {
  const MSG = "Not an event day: nothing was checked in.";
  const fresh = cardFrom({
    status: 200, ticketId: "TECHFEST:ABC",
    body: {
      status: "practice", practice: true, ticketId: "abc", alreadyCheckedIn: false, message: MSG, name: "Vera Vip", title: "Minister",
      company: "Government of Ontario", badge: VIP, passName: "Power Pass", avatarUrl: "/api/files/avatar/u1?v=3",
      extras: { cxo: true, lunch: true, gala: true, awards: true },
    },
  });
  assert.deepEqual(fresh, {
    outcome: "practice", ticketId: "abc", name: "Vera Vip", title: "Minister", company: "Government of Ontario", badge: VIP,
    passName: "Power Pass", bandSub: "Power Pass", avatarUrl: "/api/files/avatar/u1?v=3",
    meals: ["CxO Breakfasts", "Luncheons", "Gala Dinner", "Awards Night"], at: null, collectedBefore: false, message: MSG,
  });
  // Collected before (a scan before this change, or Day 1 seen after the event): the time it was collected.
  const before = cardFrom({ status: 200, body: { status: "practice", practice: true, ticketId: "gst1", alreadyCheckedIn: true, time: "2026-10-21T18:30:00Z", name: "Gus Guest", passName: "Connect Pass" } });
  assert.deepEqual([before.outcome, before.collectedBefore, before.at, before.badge, before.name], ["practice", true, "2026-10-21T18:30:00Z", { ...PASS_BADGE, label: "Connect Pass" }, "Gus Guest"]);
  // A stray time without alreadyCheckedIn isn't a collection.
  assert.equal(cardFrom({ status: 200, body: { status: "practice", alreadyCheckedIn: false, time: "2026-10-21T18:30:00Z" } }).at, null);
  assert.equal(PRACTICE_TEXT, "Practice scan — not an event day, nothing was checked in");
  // An unknown ticket is still "not found" on any day.
  assert.equal(cardFrom({ status: 404, body: { status: "invalid", message: "Ticket not found" } }).outcome, "not_found");
});
