/* node --test src/checkin/lib/special.test.mjs (C7, C8): ISSUE PASS and NO DETAILS FOUND read and look different from
   each other and from every pass colour; the lobby's "No details found" form's limits; the queued action shapes. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ISSUE_PASS, NO_DETAILS, UNKNOWN_OUTCOMES, cleanUnknown, isUnknownKey, outcomeText, unknownArrivalAction, unknownDoneAction, unknownKey, unknownLinkAction } from "./special.js";
import { GROUPS, GROUP_COLORS, badgeOf } from "./passColors.js";
import { createQueue } from "./queue.js";

test("the two read differently: icon, badge, the lobby's line and the pass desk's card", () => {
  assert.equal(ISSUE_PASS.badge, "ISSUE PASS");
  assert.equal(ISSUE_PASS.reading, "On the list · no pass on file");
  assert.equal(ISSUE_PASS.card, "Issue pass: name is on the list, no pass on file");
  assert.equal(NO_DETAILS.badge, "NO DETAILS FOUND");
  assert.equal(NO_DETAILS.card, "No details found: check ID, send to help desk");
  assert.equal(NO_DETAILS.button, "No details found: record arrival");
  for (const k of ["icon", "badge", "reading", "card", "chip", "border", "pattern"]) assert.notEqual(ISSUE_PASS[k], NO_DETAILS[k], k);
  assert.deepEqual(UNKNOWN_OUTCOMES.map((o) => o.label), ["Sent to help desk", "Pass issued", "Left"]);
  assert.equal(outcomeText("pass_issued"), "pass issued");
});

test("they look different from each other and from every pass colour (outline / pattern, not colour alone)", () => {
  const css = readFileSync(new URL("../checkin.css", import.meta.url), "utf8");
  const rule = (sel) => (css.match(new RegExp(`${sel.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`)) || [])[1] || "";
  assert.match(rule(".ci-flag-issue"), /border:\s*2px dashed/);
  assert.match(rule(".ci-flag-unknown"), /border:\s*3px solid/);
  assert.match(css, /repeating-linear-gradient\(-45deg/, "the hatched pattern");
  assert.ok(!/repeating-linear-gradient/.test(rule(".ci-flag-issue")), "ISSUE PASS isn't hatched");
  // Neither badge uses a pass colour.
  const passColours = GROUPS.map((k) => GROUP_COLORS[k].bg.toLowerCase());
  for (const sel of [".ci-flag-issue", ".ci-flag-unknown", ".ci-schip-issue", ".ci-schip-unknown", ".ci-card-big.is-issue", ".ci-card-big.is-unknown"]) {
    for (const c of passColours) assert.ok(!rule(sel).toLowerCase().includes(c), `${sel} uses ${c}`);
  }
  // A no-pass guest with no Speaker / Media colour has no pass colour at all (not Other's grey).
  const neutral = badgeOf({ name: "Ed Exhibitor", noPass: true, tier: null, passName: null, marks: { exhibitor: true } });
  assert.deepEqual([neutral.neutral, neutral.bg, neutral.label], [true, "transparent", "No pass on file"]);
  assert.notEqual(neutral.bg, GROUP_COLORS.other.bg);
});

test("the lobby's form: the name as typed (1–80, required), company ≤ 80, note ≤ 200", () => {
  assert.deepEqual(cleanUnknown({ name: "  Jo   Bloggs ", company: " Acme ", note: "" }), { ok: true, value: { name: "Jo Bloggs", company: "Acme", note: "" } });
  assert.equal(cleanUnknown({ name: "   " }).field, "name");
  assert.equal(cleanUnknown({ name: "x".repeat(81) }).field, "name");
  assert.equal(cleanUnknown({ name: "x".repeat(80) }).ok, true);
  assert.equal(cleanUnknown({ name: "Jo", company: "c".repeat(81) }).field, "company");
  assert.equal(cleanUnknown({ name: "Jo", note: "n".repeat(201) }).field, "note");
  assert.equal(cleanUnknown({ name: "Jo", note: "n".repeat(200) }).ok, true);
});

test("the queued actions have the contract's shape (through the same offline queue)", async () => {
  const sent = [];
  const m = new Map();
  const storage = { get: (k) => m.get(k) ?? null, set: (k, v) => { m.set(k, v); return true; }, remove: (k) => m.delete(k), keys: (p) => [...m.keys()].filter((k) => k.startsWith(p)) };
  const q = createQueue({ storage, send: async (a) => { sent.push(...a); return { results: a.map((x) => ({ clientId: x.clientId, ok: true })) }; }, now: () => Date.parse("2026-10-26T13:00:00Z"), setTimer: () => 0, clearTimer: () => {} });
  const it = q.add({ ...unknownArrivalAction({ name: "Jo Bloggs", company: "Acme", note: "says registered" }), queuedBy: { id: "u1", name: "Val" } });
  const key = unknownKey(it.clientId);
  assert.equal(key, `u:${it.clientId}`);
  assert.equal(isUnknownKey(key), true);
  q.add({ station: "desk", ...unknownDoneAction(key, "sent_to_help") });
  q.add({ station: "desk", ...unknownLinkAction(key, "g0123456789abcdef0123") });
  await q.flush();
  assert.deepEqual(sent[0], { kind: "unknown_arrival", name: "Jo Bloggs", company: "Acme", note: "says registered", station: "lobby", queuedBy: { id: "u1", name: "Val" }, clientId: it.clientId, clientAt: "2026-10-26T13:00:00.000Z" });
  assert.deepEqual({ kind: sent[1].kind, target: sent[1].target, outcome: sent[1].outcome }, { kind: "unknown_done", target: key, outcome: "sent_to_help" });
  assert.deepEqual({ kind: sent[2].kind, target: sent[2].target, guestKey: sent[2].guestKey }, { kind: "unknown_link", target: key, guestKey: "g0123456789abcdef0123" });
  // Undo works like any lobby tap: by reference once sent.
  const u = q.undo(it.clientId, { station: "lobby" });
  assert.deepEqual([u.local, u.item.kind, u.item.target], [false, "undo", it.clientId]);
});
