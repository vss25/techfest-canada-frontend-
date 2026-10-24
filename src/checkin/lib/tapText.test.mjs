/* node --test src/checkin/lib/tapText.test.mjs: a refused tap in words (Needs attention), what can be done about it,
   and the sign-out question about taps still on the device (who they'll be recorded as). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeTap, signOutText, trayActions } from "./tapText.js";

const state = { byKey: new Map([["g1", { key: "g1", name: "Priya Sharma" }]]), boothByKey: new Map([["b-A12", { key: "b-A12", booth: "A12" }]]) };

test("who, what, where, by whom", () => {
  const t = describeTap({ kind: "mark", point: "cxo", key: "g1", station: "breakfast", queuedBy: { id: "u1", name: "Val" }, clientAt: "2026-10-26T12:00:00Z" }, { state });
  assert.deepEqual(t, { who: "Priya Sharma", what: "Admitted to the CxO Breakfast", where: "CxO Breakfast", by: "Val", at: "2026-10-26T12:00:00Z" });
  assert.equal(describeTap({ kind: "mark", point: "booth", key: "b-A12", station: "exhibitor" }, { state }).who, "Booth A12");
  const items = [{ clientId: "t1", kind: "mark", point: "arrived", key: "g1" }];
  assert.deepEqual([describeTap({ kind: "undo", target: "t1" }, { state, items }).who, describeTap({ kind: "undo", target: "t1" }, { state, items }).what], ["Priya Sharma", "Undo"]);
});

test("what a refused tap offers: Admit anyway outside the hours, Try again when it may work, Dismiss always", () => {
  assert.deepEqual(trayActions({ kind: "mark", code: "outside_window", status: 409 }), ["override", "dismiss"]);
  assert.deepEqual(trayActions({ kind: "mark", code: "not_included", status: 409 }), ["retry", "dismiss"]);
  assert.deepEqual(trayActions({ kind: "undo", code: "undo_refused", status: 403 }), ["dismiss"]);
});

test("sign-out: waiting taps are named with who made them; refused ones said apart", () => {
  assert.equal(signOutText([]), "");
  const text = signOutText([
    { state: "pending", queuedBy: { name: "Val" } }, { state: "sending", queuedBy: { name: "Val" } },
    { state: "failed", queuedBy: { name: "Val" } },
  ]);
  assert.match(text, /^2 taps haven't reached the server yet/);
  assert.match(text, /still recorded as made by Val\./);
  assert.match(text, /1 tap was not recorded \(refused\)/);
});
