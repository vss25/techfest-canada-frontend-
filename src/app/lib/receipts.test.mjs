// Read receipts: which ticks a message gets, same cases as the iOS and Android tests.
// Run: node --test src/app/lib/receipts.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { RECEIPT_LABEL, receiptOf } from "./receipts.js";

const at = "2026-10-26T14:00:00.000Z";

test("only my messages get ticks", () => {
  assert.equal(receiptOf({ sentByMe: false, status: "approved", deliveredAt: at, readAt: at }), null);
  assert.equal(receiptOf(null), null);
});

test("sent, delivered, read", () => {
  assert.equal(receiptOf({ sentByMe: true, status: "approved", deliveredAt: null, readAt: null }), "sent");
  assert.equal(receiptOf({ sentByMe: true, status: "approved", deliveredAt: at, readAt: null }), "delivered");
  assert.equal(receiptOf({ sentByMe: true, status: "approved", deliveredAt: at, readAt: at }), "read");
  // Read implies delivered, even from a server that hasn't sent deliveredAt yet.
  assert.equal(receiptOf({ sentByMe: true, status: "approved", readAt: at }), "read");
  // An older server: no status, no deliveredAt.
  assert.equal(receiptOf({ sentByMe: true }), "sent");
});

test("held for review: a clock, never ticks; rejected: nothing", () => {
  assert.equal(receiptOf({ sentByMe: true, status: "held", deliveredAt: at, readAt: at }), "held");
  assert.equal(receiptOf({ sentByMe: true, status: "rejected", deliveredAt: at }), null);
  assert.deepEqual(RECEIPT_LABEL, { held: "Waiting for review", sent: "Sent", delivered: "Delivered", read: "Read" });
});
