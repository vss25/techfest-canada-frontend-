// The hero loop MP4 writer. Run: node --test src/admin/cms/mp4Mux.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { muxMp4 } from "./mp4Mux.js";
import { frameTimes } from "./heroVideoPrep.js";

const read32 = (d, o) => ((d[o] << 24) >>> 0) + (d[o + 1] << 16) + (d[o + 2] << 8) + d[o + 3];
const type = (d, o) => String.fromCharCode(d[o + 4], d[o + 5], d[o + 6], d[o + 7]);
const find = (d, t) => { for (let i = 0; i < d.length - 4; i += 1) if (String.fromCharCode(d[i], d[i + 1], d[i + 2], d[i + 3]) === t) return i - 4; return -1; };

test("a plain fast-start MP4: ftyp, moov (with the real length) before mdat", () => {
  const samples = Array.from({ length: 90 }, (_, i) => ({ data: new Uint8Array([0, 0, 0, 2, i, i]), key: i % 30 === 0 }));
  const mp4 = muxMp4({ width: 1280, height: 720, fps: 30, avcC: new Uint8Array([1, 100, 0, 31, 255, 225, 0, 0, 1, 0, 0]), samples });
  const tops = [];
  for (let o = 0; o < mp4.length; o += read32(mp4, o)) tops.push(type(mp4, o));
  assert.deepEqual(tops, ["ftyp", "moov", "mdat"]);
  const mvhd = find(mp4, "mvhd");
  assert.equal(read32(mp4, mvhd + 20), 1000, "timescale");
  assert.equal(read32(mp4, mvhd + 24), 3000, "3 s");
  // stco points at the first sample inside mdat; keyframes 1, 31, 61.
  const stco = find(mp4, "stco");
  const first = read32(mp4, stco + 16);
  assert.deepEqual([...mp4.slice(first, first + 6)], [0, 0, 0, 2, 0, 0]);
  const stss = find(mp4, "stss");
  assert.deepEqual([read32(mp4, stss + 12), read32(mp4, stss + 16), read32(mp4, stss + 20), read32(mp4, stss + 24)], [3, 1, 31, 61]);
  assert.equal(read32(mp4, find(mp4, "stsz") + 16), 90, "frame count");
});

test("refuses an empty loop", () => {
  assert.throws(() => muxMp4({ width: 2, height: 2, avcC: new Uint8Array([1]), samples: [] }), /No frames/);
});

test("frame times: evenly spaced through the trimmed part at the chosen speed", () => {
  const t = frameTimes({ start: 10, end: 30, speed: 2, outSeconds: 10 });
  assert.equal(t.length, 300);
  assert.equal(t[0], 10);
  assert.ok(Math.abs(t[1] - (10 + 2 / 30)) < 1e-9);
  assert.ok(t[299] < 30);
  const slow = frameTimes({ start: 0, end: 5, speed: 0.5, outSeconds: 10 });
  assert.equal(slow.length, 300);
  assert.ok(Math.abs(slow[30] - 0.5) < 1e-9);
});
