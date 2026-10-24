/* node --test src/checkin/lib/device.test.mjs (W10): the chime played through an <audio> element (iOS plays it with
   the Silent switch on) is a real, short WAV made on the device. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chimeWav } from "./device.js";

test("the chime is a valid 16-bit mono WAV, under a second, loud enough and never clipped", () => {
  const b = chimeWav({ rate: 22050 });
  const dv = new DataView(b.buffer);
  const text = (o, n) => String.fromCharCode(...b.slice(o, o + n));
  assert.equal(text(0, 4), "RIFF");
  assert.equal(text(8, 4), "WAVE");
  assert.equal(text(36, 4), "data");
  assert.equal(dv.getUint16(22, true), 1, "mono");
  assert.equal(dv.getUint32(24, true), 22050);
  assert.equal(dv.getUint16(34, true), 16);
  const n = dv.getUint32(40, true) / 2;
  assert.equal(dv.getUint32(4, true), 36 + n * 2);
  assert.ok(n / 22050 > 0.5 && n / 22050 < 1, "under a second");
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(dv.getInt16(44 + i * 2, true)));
  assert.ok(peak > 0.3 * 32767 && peak < 32767, `peak ${peak}`);
  assert.ok(Math.abs(dv.getInt16(44 + (n - 1) * 2, true)) < 500, "fades out (no click at the end)");
});
