// Network › Scan: what a scanned code does, and what the by-pass answer shows (contract C-PASS, Oct 24 2026).
// Run: node --test src/app/lib/scanAction.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { BAD_QR_DEFAULT, checkinBody, checkinDisplay, checkinQuestion, NETWORKING_QR_DEFAULT, NO_PASS_DEFAULT, passOutcome, scanAction, staffScanner } from "./scanAction.js";
import { connectPayload, passPayload, sessionLivePayload, shownCode } from "./qr.js";

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
  // One code (Oct 24 2026): never "ask for their connect QR".
  assert.doesNotMatch(off.message, /connect QR/i);
  // An older server without codes: the status decides.
  assert.equal(passOutcome({ error: err(404, "", "Not found") }).code, "not_found");
  assert.equal(passOutcome({ error: err(429, "", "Too many") }).code, "rate_limited");
});

test("network trouble stays on the sheet to try again", () => {
  const o = passOutcome({ error: { status: 0, message: "Can't reach the TTFC server. Check your connection and try again.", data: undefined } });
  assert.deepEqual(o, { ok: false, close: false, message: "Can't reach the TTFC server. Check your connection and try again." });
  assert.equal(passOutcome({ error: { status: 500, message: "", data: {} } }).close, false);
});

/* ---------- One and only code (Oct 24 2026) ---------- */

test("the code you show: your pass's entry QR, the networking QR only without a pass", () => {
  const connect = connectPayload({ name: "Ada Lovelace", title: "CTO", org: "Acme", linkedIn: "", email: "", userId: "u-ada" });
  assert.deepEqual(shownCode({ ticketId: "a1b2c3d4e5f6", connect }), { kind: "pass", value: "TECHFEST:a1b2c3d4e5f6" });
  assert.deepEqual(shownCode({ ticketId: " a1b2c3d4e5f6 ", connect }), { kind: "pass", value: "TECHFEST:a1b2c3d4e5f6" });
  assert.deepEqual(shownCode({ ticketId: "", connect }), { kind: "connect", value: connect });
  assert.deepEqual(shownCode({ connect }), { kind: "connect", value: connect });
});

test("who is asked before checking in: staff, volunteers, or the checkIn right", () => {
  assert.equal(staffScanner({ user: { role: "admin" } }), true);
  assert.equal(staffScanner({ user: { isAdmin: true } }), true);
  assert.equal(staffScanner({ user: { role: "volunteer" } }), true);
  assert.equal(staffScanner({ user: { role: "user" }, me: { rights: { checkIn: true } } }), true);
  assert.equal(staffScanner({ user: { role: "user" }, me: { rights: { checkIn: false } } }), false);
  assert.equal(staffScanner({ user: { role: "user" } }), false);
  assert.equal(staffScanner(), false);
});

test("staff: an entry QR and an older networking QR both ask first; attendees connect as before", () => {
  const code = connectPayload({ name: "Ada Lovelace", title: "CTO", org: "Acme", linkedIn: "", email: "", userId: "u-ada" });
  assert.deepEqual(scanAction(passPayload("a1b2c3d4e5f6"), { staff: true }), { type: "confirmPass", ticketId: "a1b2c3d4e5f6" });
  assert.deepEqual(scanAction(` ${code} `, { staff: true }),
    { type: "confirmConnect", raw: code, name: "Ada Lovelace", share: { type: "connect", userId: "u-ada", name: "Ada Lovelace", local: false } });
  const old = connectPayload({ name: "Ada Lovelace", title: "CTO", org: "Acme", linkedIn: "", email: "" });
  assert.equal(scanAction(old, { staff: true }).share.type, "oldApp");
  assert.equal(scanAction(code).type, "connect");
  assert.equal(scanAction(passPayload("a1b2c3d4e5f6")).type, "pass");
  assert.equal(scanAction(sessionLivePayload("d1-5"), { staff: true }).type, "session");
  assert.equal(scanAction("nope", { staff: true }).type, "invalid");
});

test("the staff question and what Check in sends", () => {
  const code = connectPayload({ name: "Ada Lovelace", title: "CTO", org: "Acme", linkedIn: "", email: "", userId: "u-ada" });
  const c = scanAction(code, { staff: true });
  const q = checkinQuestion(c);
  assert.equal(q.title, "Check in Ada Lovelace?");
  assert.equal(q.message, "From their networking QR. Nothing is recorded until you tap Check in. Their name and pass show after.");
  assert.deepEqual(q.options.map((o) => [o.label, o.value, !!o.primary]), [["Check in", "checkin", true], ["Share contact instead", "share", false]]);
  assert.deepEqual(checkinBody(c), { ticketId: code, qr: code });
  const p = scanAction("TECHFEST:a1b2c3d4e5f6", { staff: true });
  assert.equal(checkinQuestion(p).title, "Check in pass a1b2c3d4e5f6?");
  assert.deepEqual(checkinBody(p), { ticketId: "a1b2c3d4e5f6" });
});

test("the check-in answer, including a networking QR the server won't take", () => {
  assert.deepEqual(checkinDisplay(200, { status: "success", name: "Ada Lovelace", passName: "Power Pass", ticketId: "a1b2c3d4e5f6" }, "x"),
    { title: "Checked in ✓", message: "Ada Lovelace · Power Pass · a1b2c3d4e5f6", tone: "success" });
  assert.deepEqual(checkinDisplay(200, { status: "already_checked_in", name: "Ada", ticketType: "power", time: "9:02 AM" }, "x"),
    { title: "Already checked in", message: "Ada · Power Pass · 9:02 AM", tone: "warning" });
  assert.equal(checkinDisplay(200, { status: "practice", name: "Ada", passName: "Power Pass" }, "x").title, "Practice scan");
  assert.match(checkinDisplay(200, { status: "practice" }, "x").message, /Not an event day/);
  assert.deepEqual(checkinDisplay(422, { code: "networking_qr", error: "That's a networking QR. Ask for their pass QR." }, "x"),
    { title: "Networking QR", message: "That's a networking QR. Ask for their pass QR.", tone: "warning" });
  assert.equal(checkinDisplay(400, { code: "networking_qr" }, "x").message, NETWORKING_QR_DEFAULT);
  assert.equal(checkinDisplay(404, { error: "Ticket not found" }, "Ada Lovelace's networking QR").message,
    "No TTFC pass matches Ada Lovelace's networking QR. Send the attendee to the registration desk.");
  assert.equal(checkinDisplay(403, {}, "x").title, "Staff only");
  assert.equal(checkinDisplay(0, null, "x").title, "Check-in failed");
  assert.equal(checkinDisplay(500, { error: "Boom" }, "x").message, "Boom");
});

test("a networking QR at check-in: the server's refusals and its answers (backend main 6b68b1d)", () => {
  const refuse = (code, message) => checkinDisplay(404, { status: "invalid", code, message, error: message }, "Ada Lovelace's networking QR");
  assert.deepEqual(refuse("networking_qr", "Staff scanned a networking QR. Ask for the entry pass QR."),
    { title: "Networking QR", message: "Staff scanned a networking QR. Ask for the entry pass QR.", tone: "warning" });
  assert.deepEqual(refuse("networking_qr", ""), { title: "Networking QR", message: NETWORKING_QR_DEFAULT, tone: "warning" });
  assert.deepEqual(refuse("bad_qr", "That QR code isn't valid."), { title: "Not a valid code", message: "That QR code isn't valid.", tone: "error" });
  assert.deepEqual(refuse("bad_qr", ""), { title: "Not a valid code", message: BAD_QR_DEFAULT, tone: "error" });
  assert.deepEqual(refuse("no_pass", "Ada has no TTFC pass."), { title: "No pass found", message: "Ada has no TTFC pass.", tone: "error" });
  assert.deepEqual(refuse("no_pass", ""), { title: "No pass found", message: NO_PASS_DEFAULT, tone: "error" });
  // A 404 without one of those codes is still "Not a valid pass".
  assert.equal(checkinDisplay(404, { status: "invalid", error: "Ticket not found" }, "a1b2c3d4e5f6").title, "Not a valid pass");

  // Success: the usual line, then the server's note for several passes after a blank line.
  const ok = { status: "success", scanned: "networking_qr", passCount: 2, name: "Ada Lovelace", passName: "Power Pass", ticketId: "a1b2c3d4e5f6",
    note: "Ada has 2 passes: checked in on Power Pass." };
  assert.deepEqual(checkinDisplay(200, ok, "x"),
    { title: "Checked in ✓", message: "Ada Lovelace · Power Pass · a1b2c3d4e5f6\n\nAda has 2 passes: checked in on Power Pass.", tone: "success" });
  assert.equal(checkinDisplay(200, { ...ok, note: "", passCount: 1 }, "x").message, "Ada Lovelace · Power Pass · a1b2c3d4e5f6");
  // Practice and already checked in: the usual answers.
  assert.equal(checkinDisplay(200, { ...ok, status: "practice", message: "Not an event day: nothing was checked in." }, "x").title, "Practice scan");
  assert.deepEqual(checkinDisplay(200, { ...ok, status: "already_checked_in", time: "9:02 AM" }, "x"),
    { title: "Already checked in", message: "Ada Lovelace · Power Pass · 9:02 AM", tone: "warning" });
});
