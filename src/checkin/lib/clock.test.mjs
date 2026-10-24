/* node --test src/checkin/lib/clock.test.mjs: the server's clock on the device (contract C4): from a server time
   corrected by half the round trip, kept on the device for a start with no connection, never from nothing. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLOCK_KEY, createClock } from "./clock.js";

const mem = () => { const m = new Map(); return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => { m.set(k, v); return true; }, raw: m }; };

test("a slow device clock is corrected by the server's (half the round trip)", () => {
  let device = Date.parse("2026-10-26T13:00:00Z");
  const c = createClock({ storage: mem(), now: () => device });
  assert.equal(c.known(), false);
  assert.equal(c.now(), device, "nothing known yet: the device's own clock");
  // Sent at device 13:00:00, answered at 13:00:02; the server said 13:12:01 (the device is 12 minutes slow).
  c.observe("2026-10-26T13:12:01Z", device, device + 2000);
  device += 2000;
  assert.equal(c.offset(), 12 * 60 * 1000);
  assert.equal(new Date(c.now()).toISOString(), "2026-10-26T13:12:02.000Z");
  assert.equal(c.known(), true);
  assert.equal(c.observe("not a time"), false);
});

test("kept on the device: a start with no connection still stamps the corrected time; a slow answer doesn't move it", () => {
  const storage = mem();
  let device = 1_000_000;
  const a = createClock({ storage, now: () => device });
  a.observe(device + 5000, device, device);
  assert.ok(storage.raw.has(CLOCK_KEY));
  const b = createClock({ storage, now: () => device });
  assert.equal(b.offset(), 5000);
  assert.equal(b.known(), true);
  b.observe(device + 90_000, device, device + 9000); // 9 s round trip: not trusted once an offset is known
  assert.equal(b.offset(), 5000);
});
