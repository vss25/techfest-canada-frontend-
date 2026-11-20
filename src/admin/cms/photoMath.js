/* Uniform speaker photos and partner logos (Nov 19 2026): the pure maths, unit-tested
   (photoMath.test.mjs). The browser parts are in speakerPhoto.js and imageUpload.js.

   Speaker photos are 4:5 (the speaker cards on the website and in the apps), on the
   design's light purple, with the face at the same size and height in every photo. */

export const SPEAKER_BG = "#E8E5F1";
export const SPEAKER_RATIO = 4 / 5;          // width / height
export const SPEAKER_OUT = { width: 800, height: 1000 };
// The suggested framing: the face box is this share of the photo's height, its top this far down.
const FACE_SHARE = 0.3;
const FACE_TOP = 0.2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** The largest 4:5 box that fits the image. */
export function maxCrop(W, H) {
  const h = Math.min(H, W / SPEAKER_RATIO);
  return { w: h * SPEAKER_RATIO, h };
}

/** Keep a 4:5 crop { x, y, h } inside the image (shrinking it if it's too big). */
export function clampCrop(c, W, H) {
  const max = maxCrop(W, H);
  const h = clamp(Number(c.h) || max.h, Math.min(64, max.h), max.h);
  const w = h * SPEAKER_RATIO;
  return { x: clamp(Number(c.x) || 0, 0, W - w), y: clamp(Number(c.y) || 0, 0, H - h), h };
}

/**
 * The suggested head-and-shoulders crop. `face` = { x, y, width, height } in image pixels
 * (the detector's box), or null; `person` = the cut-out's bounding box, or null.
 * Without a face: the person's top, else the top centre of the image.
 */
export function suggestCrop(W, H, face, person) {
  if (face && face.width > 0 && face.height > 0) {
    const h = face.height / FACE_SHARE;
    const cx = face.x + face.width / 2;
    return clampCrop({ x: cx - (h * SPEAKER_RATIO) / 2, y: face.y - h * FACE_TOP, h }, W, H);
  }
  const max = maxCrop(W, H);
  if (person && person.width > 0) {
    const h = Math.min(max.h, Math.max(person.width / SPEAKER_RATIO, person.height * 0.8));
    return clampCrop({ x: person.x + person.width / 2 - (h * SPEAKER_RATIO) / 2, y: person.y - h * 0.05, h }, W, H);
  }
  return clampCrop({ x: (W - max.w) / 2, y: 0, h: max.h }, W, H);
}

/** Zoom (1 = the largest crop) ↔ crop height, keeping the crop's centre. */
export function zoomOf(c, W, H) { return maxCrop(W, H).h / c.h; }
export function withZoom(c, zoom, W, H) {
  const h = maxCrop(W, H).h / clamp(zoom, 1, 4);
  const cx = c.x + (c.h * SPEAKER_RATIO) / 2, cy = c.y + c.h / 2;
  return clampCrop({ x: cx - (h * SPEAKER_RATIO) / 2, y: cy - h / 2, h }, W, H);
}

/** The cut-out's confidence (0–1) → alpha, with soft but tidy edges. */
export function alphaCurve(p) { return clamp((p - 0.25) / 0.5, 0, 1); }

/** Bounding box of pixels whose alpha is ≥ min in an alpha array (w × h), or null. */
export function alphaBox(alpha, w, h, min = 0.5) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[y * w + x] >= min) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/* ---------------- Partner logos ----------------
   Every logo: a plain light background around it made transparent, empty margins trimmed,
   then centred in the same 2:1 frame with the same padding. */

export const LOGO_OUT = { width: 800, height: 400, pad: 0.08 };
const nearWhite = (d, i, tol) => d[i] >= 255 - tol && d[i + 1] >= 255 - tol && d[i + 2] >= 255 - tol;

/**
 * Makes a plain white (or near-white) background transparent, in place, but only the white
 * that touches the edges (white inside the logo stays). Only when all four corners are
 * near-white and opaque. RGBA data (w × h). Returns whether it changed anything.
 */
export function clearEdgeWhite(data, w, h, tol = 18) {
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  if (!corners.every((p) => data[p * 4 + 3] > 200 && nearWhite(data, p * 4, tol))) return false;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (p) => { if (!seen[p]) { seen[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    if (data[i + 3] === 0 || !nearWhite(data, i, tol)) continue;
    data[i + 3] = 0;
    const x = p % w, y = (p - x) / w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  return true;
}

/** The box around the visible pixels (alpha > 8) of RGBA data, or null when empty. */
export function opaqueBox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Where a logo of box size (bw × bh) goes in the standard frame: centred, padded, never enlarged past 3×. */
export function logoPlacement(bw, bh, out = LOGO_OUT) {
  const iw = out.width * (1 - 2 * out.pad), ih = out.height * (1 - 2 * out.pad);
  const s = Math.min(iw / bw, ih / bh, 3);
  const w = bw * s, h = bh * s;
  return { x: (out.width - w) / 2, y: (out.height - h) / 2, width: w, height: h, scale: s };
}

/** A note for logos that will look soft: the visible logo is under 240 px wide and under 120 px tall. */
export function logoWarning(box) {
  if (!box) return "That image looks empty.";
  if (box.width < 240 && box.height < 120) return "This logo is small and may look blurry. An SVG or a larger PNG works best.";
  return "";
}
