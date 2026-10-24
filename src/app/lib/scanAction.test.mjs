// Network › Scan: what a scanned code does, and what the by-pass answer shows (contract C-PASS, Oct 24 2026).
// Run: node --test src/app/lib/scanAction.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { passOutcome, scanAction } from "./scanAction.js";
import { connectPayload, passPayload, sessionLivePayload } from "./qr.js";

test("an entry QR connects (every form), whoever scans it", () => {
  assert.deepEqual(scanAction(passPayload("a1b2c3d4e5f6")), { type: "pass", ticketId: "a1b2c3d4e5f6" });
  assert.deepEqual(scanAction("techfest:A1B2C3D4E5F6"), { type: "pass", ticketId: "A1B2C3D4E5F6" });
  assert.deepEqual(scanAction("  TECHFEST: a1b2c3d4e5f6 "), { type: "pass", ticketId: "a1b2c3d4e5f6" });
  // Demo mode too (the demo answers by-pass itself).
  assert.equal(scanAction(passPayload("a1b2c3d4e5f6"), { demo: true }).type, "pass");
  assert.equal(scanAction("TECHFEST:").type, "invalid");
});

test("a connect QR keeps working exactly as before", () => {
  const code = connectPayload({ name: "Ada Lovelace", title: "CTO", org: "Acme", linkedIn: "", email: "", userId: "u-ada" });
  assert.deepEqual(scanAction(code), { type: "connect", userId: "u-ada", name: "Ada Lovelace", local: false });
  const old = connectPayload({ name: "Ada Lovelace", title: "CTO", org: "Acme", linkedIn: "", email: "" });
  assert.deepEqual(scanAction(old), { type: "oldApp", error: "Ada Lovelace needs the latest TTFC app for in-person connect." });
  // Demo: a code without a user id, or someone outside the demo, stays on this device.
  assert.deepEqual(scanAction(old, { demo: true }), { type: "connect", userId: "", name: "Ada Lovelace", local: true });
  assert.deepEqual(scanAction(code, { demo: true, knows: () => false }), { type: "connect", userId: "", name: "Ada Lovelace", local: true });
  assert.deepEqual(scanAction(code, { demo: true, knows: (id) => id === "u-ada" }), { type: "connect", userId: "u-ada", name: "Ada Lovelace", local: false });
});

test("session codes and anything else", () => {
  assert.deepEqual(scanAction(sessionLivePayload("d1-5")), { type: "session", id: "d1-5" });
  assert.deepEqual(scanAction("https://example.com"), { type: "invalid", error: "That's not a TTFC code." });
  assert.equal(scanAction("").type, "invalid");
  // A connect QR with a bad check digit.
  assert.equal(scanAction("TTFC2026|C|Ada|x|y|z|w|u-ada|000000").type, "invalid");
});

test("connected, or already connected", () => {
  const o = passOutcome({ result: { id: "c1", status: "accepted", via: "pass", alreadyConnected: false, user: { id: "u-ada", name: "Ada Lovelace" } } });
  assert.equal(o.ok, true);
  assert.equal(o.title, "You're connected with Ada Lovelace");
  assert.equal(o.alreadyConnected, false);
  assert.equal(o.conn.id, "c1");
  const again = passOutcome({ result: { alreadyConnected: true, user: { name: "Ada Lovelace" } } });
  assert.equal(again.title, "You're already connected with Ada Lovelace");
  assert.equal(passOutcome({ result: { user: {} } }).title, "You're connected with them");
});

test("final answers close the sheet with the server's words", () => {
  const err = (status, code, error) => ({ status, message: error, data: code ? { code, error } : {} });
  assert.deepEqual(passOutcome({ error: err(404, "not_found", "That isn't a TTFC pass we know.") }),
    { ok: false, close: true, code: "not_found", title: "Pass not found", message: "That isn't a TTFC pass we know." });
  assert.deepEqual(passOutcome({ error: err(409, "not_on_app", "They haven't joined the TTFC app yet. You can connect once they sign in.") }),
    { ok: false, close: true, code: "not_on_app", title: "Not on the app yet", message: "They haven't joined the TTFC app yet. You can connect once they sign in." });
  const self = passOutcome({ error: err(400, "self", "That's your own pass.") });
  assert.equal(self.close, true);
  assert.equal(self.title, "That's your pass");
  const off = passOutcome({ error: err(403, "share_off", "Contact sharing is off for your pass type.") });
  assert.equal(off.code, "share_off");
  assert.match(off.message, /connect QR/);
  // An older server without codes: the status decides.
  assert.equal(passOutcome({ error: err(404, "", "Not found") }).code, "not_found");
  assert.equal(passOutcome({ error: err(429, "", "Too many") }).code, "rate_limited");
});

test("network trouble stays on the sheet to try again", () => {
  const o = passOutcome({ error: { status: 0, message: "Can't reach the TTFC server. Check your connection and try again.", data: undefined } });
  assert.deepEqual(o, { ok: false, close: false, message: "Can't reach the TTFC server. Check your connection and try again." });
  assert.equal(passOutcome({ error: { status: 500, message: "", data: {} } }).close, false);
});
