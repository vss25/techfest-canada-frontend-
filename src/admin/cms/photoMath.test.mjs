import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SPEAKER_RATIO, alphaBox, alphaCurve, clampCrop, clearEdgeWhite, logoPlacement, logoWarning, maxCrop, opaqueBox, suggestCrop, withZoom, zoomOf,
} from "./photoMath.js";

const close = (a, b, eps = 0.5) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test("speaker crop: the face sets the size and height, always 4:5 and inside the photo", () => {
  const c = suggestCrop(2000, 3000, { x: 900, y: 600, width: 300, height: 300 }, null);
  close(c.h, 1000);                       // face = 30% of the height
  close(c.y, 600 - 200);                  // face top 20% down
  close(c.x + (c.h * SPEAKER_RATIO) / 2, 1050); // centred on the face
  // A face near the edge: the crop moves inside rather than leaving the photo.
  const e = suggestCrop(1000, 1000, { x: 0, y: 0, width: 200, height: 200 }, null);
  assert.ok(e.x >= 0 && e.y >= 0 && e.x + e.h * SPEAKER_RATIO <= 1000 && e.y + e.h <= 1000);
  // A huge face: the crop is the largest that fits.
  const big = suggestCrop(800, 800, { x: 100, y: 100, width: 600, height: 600 }, null);
  close(big.h, maxCrop(800, 800).h);
});

test("speaker crop without a face: the person's box, else the top centre", () => {
  const p = suggestCrop(1000, 1500, null, { x: 300, y: 200, width: 400, height: 1200 });
  assert.ok(p.y < 200 && p.x + p.h * SPEAKER_RATIO / 2 > 450 && p.x + p.h * SPEAKER_RATIO / 2 < 550);
  const n = suggestCrop(1000, 1000, null, null);
  close(n.y, 0); close(n.h, 1000); close(n.x, 100);
});

test("zoom keeps the centre and stays within the photo", () => {
  const c = clampCrop({ x: 100, y: 100, h: 500 }, 1000, 1000);
  const z = withZoom(c, zoomOf(c, 1000, 1000) * 2, 1000, 1000);
  close(z.h, 250);
  close(z.x + z.h * SPEAKER_RATIO / 2, c.x + c.h * SPEAKER_RATIO / 2);
  close(withZoom(c, 1, 1000, 1000).h, 1000);
  close(withZoom(c, 99, 1000, 1000).h, 250); // at most 4×
});

test("cut-out edges: low confidence is background, high is the person", () => {
  assert.equal(alphaCurve(0.1), 0); assert.equal(alphaCurve(0.9), 1); close(alphaCurve(0.5), 0.5, 0.01);
  const a = new Float32Array(16); a[5] = 1; a[10] = 0.8;
  assert.deepEqual(alphaBox(a, 4, 4), { x: 1, y: 1, width: 2, height: 2 });
  assert.equal(alphaBox(new Float32Array(4), 2, 2), null);
});

/** RGBA image w × h, white, with a black square (and a white hole in it) in the middle. */
function logo(w, h, bg = [255, 255, 255, 255]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) d.set(bg, p * 4);
  for (let y = 2; y < 8; y++) for (let x = 3; x < 9; x++) d.set([0, 0, 0, 255], (y * w + x) * 4);
  d.set([255, 255, 255, 255], (5 * w + 5) * 4); // white inside the logo
  return d;
}

test("logos: white touching the edges goes; white inside the logo stays; then trimmed", () => {
  const d = logo(12, 10);
  assert.equal(clearEdgeWhite(d, 12, 10), true);
  assert.equal(d[3], 0);                      // corner cleared
  assert.equal(d[(5 * 12 + 5) * 4 + 3], 255); // the hole inside stays
  assert.deepEqual(opaqueBox(d, 12, 10), { x: 3, y: 2, width: 6, height: 6 });
  // A coloured background is left alone.
  const blue = logo(12, 10, [20, 40, 200, 255]);
  assert.equal(clearEdgeWhite(blue, 12, 10), false);
  assert.equal(blue[3], 255);
});

test("logos: centred in the same padded frame; small ones get a note", () => {
  const wide = logoPlacement(1000, 200);
  close(wide.width, 800 * 0.84); close(wide.x, 64);
  const tall = logoPlacement(100, 100);
  close(tall.height, 300); close(tall.y, 50); close(tall.scale, 3); // never more than 3×
  assert.match(logoWarning({ width: 120, height: 40 }), /small/);
  assert.equal(logoWarning({ width: 600, height: 200 }), "");
  assert.match(logoWarning(null), /empty/);
});
