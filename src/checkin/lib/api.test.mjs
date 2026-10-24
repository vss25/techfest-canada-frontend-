/* node --test src/checkin/lib/api.test.mjs (W21, C1, C4): a call gives up when its body stops arriving (a stalled
   snapshot or POST never hangs the app), a slow but moving body is fine; a passwordless sign-in's 403
   password_required sends the app back to its sign-in screen; the server's time in an answer reaches the clock. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, PASSWORD_REQUIRED_TEXT, api, readBody, setAuthProblemHandler, setServerTimeObserver, setSession } from "./api.js";

const enc = new TextEncoder();
/** A response whose body sends `parts` with `gapMs` between them, then (if `stall`) never ends. */
function slowResponse(parts, { gapMs = 5, stall = false, status = 200 } = {}) {
  let cancelled = false;
  const body = new ReadableStream({
    async pull(ctl) {
      if (!parts.length) { if (stall) await new Promise(() => {}); ctl.close(); return; }
      await new Promise((r) => setTimeout(r, gapMs));
      if (!cancelled) ctl.enqueue(enc.encode(parts.shift()));
    },
    cancel() { cancelled = true; },
  });
  return new Response(body, { status, headers: { "Content-Type": "application/json" } });
}

test("readBody: a moving body is read whole; a stalled one gives up after the idle time (status 0)", async () => {
  assert.equal(await readBody(slowResponse(['{"a":', "1}"]), { idleMs: 200 }), '{"a":1}');
  const t0 = Date.now();
  let aborted = 0;
  await assert.rejects(readBody(slowResponse(['{"guests":['], { stall: true }), { idleMs: 80, abort: () => { aborted += 1; } }), (e) => e instanceof ApiError && e.status === 0);
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(aborted, 1, "the request underneath is cancelled");
  // Slow (40 ms between parts) but never idle for 80 ms: fine, however long in all.
  assert.equal(await readBody(slowResponse(["[1,", "2,", "3,", "4]"], { gapMs: 40 }), { idleMs: 80 }), "[1,2,3,4]");
});

test("api(): a stalled body rejects (the queue retries the tap, the live connection starts); serverTime is observed", async () => {
  const seen = [];
  setServerTimeObserver((t) => seen.push(t));
  await assert.rejects(api("/checkin/desk/snapshot", { token: "x", timeoutMs: 80, fetchFn: async () => slowResponse(['{"serverTime":"2026-10-26T13:00:00Z","guests":['], { stall: true }) }), (e) => e.status === 0);
  const ok = await api("/checkin/desk/clock", { token: "x", timeoutMs: 500, fetchFn: async () => slowResponse(['{"serverTime":"2026-10-26T13:00:00Z","ok":true}']) });
  assert.equal(ok.ok, true);
  assert.deepEqual(seen, ["2026-10-26T13:00:00Z"]);
  setServerTimeObserver(null);
});

test("C1: 403 password_required → the sign-in screen with the app's words", async () => {
  setSession({ token: "tok-ticket", user: { id: "u1" } });
  const problems = [];
  setAuthProblemHandler((code) => problems.push(code));
  const fetchFn = async () => new Response(JSON.stringify({ error: "Sign in with your password.", code: "password_required" }), { status: 403 });
  await assert.rejects(api("/checkin/desk/snapshot", { fetchFn }), (e) => e.status === 403 && e.code === "password_required" && e.message === PASSWORD_REQUIRED_TEXT);
  assert.deepEqual(problems, ["password_required"]);
  // Another 403 (no check-in right) is just an error.
  await assert.rejects(api("/checkin/desk/snapshot", { fetchFn: async () => new Response(JSON.stringify({ error: "No access" }), { status: 403 }) }), (e) => e.message === "No access");
  assert.deepEqual(problems, ["password_required"]);
  setAuthProblemHandler(null);
  setSession(null);
});
