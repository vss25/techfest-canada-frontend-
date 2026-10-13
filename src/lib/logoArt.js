/* =========================================================
   Logo art for small inline use (speaker cards)
   ---------------------------------------------------------
   CMS logos come in every shape: huge padded canvases, white
   backgrounds, black lettering that vanishes on a dark card. This
   reads the image on a canvas and returns two clean versions:
     light  trimmed to the artwork, white background removed
     dark   the same, with black/grey lettering turned white and
            other dark colours lightened (bright colours stay)
   A logo that is all white (made for dark backgrounds) gets dark
   lettering in the light version instead. A logo on a solid dark or
   coloured block (a badge) is kept exactly as it is.
   Needs the image host to allow this origin (Sanity CORS:
   www.thetechfestival.com, localhost:5173). Resolves null when the
   image can't be read; callers then show the company name.
========================================================= */

const INK = [13, 5, 32];
const cache = new Map();

const isNearWhite = (r, g, b) => Math.min(r, g, b) >= 232;
const spread = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);
const luminance = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * Dark-card version of a pixel: grey/black (up to mid grey) → white, deep colours (navy, dark
 * green) → a lighter tint. Bright colours (flag red, brand pink) stay as they are.
 */
function forDark(r, g, b) {
  if (spread(r, g, b) < 40 && luminance(r, g, b) < 0.5) return [255, 255, 255];
  if (luminance(r, g, b) >= 0.35) return [r, g, b];
  if (Math.max(r, g, b) >= 180) return [r, g, b];
  return [r + (255 - r) * 0.6, g + (255 - g) * 0.6, b + (255 - b) * 0.6].map(Math.round);
}

function load(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * The flat colour the image sits on, read from its edges: { rgb, light } when every
 * edge point is the same opaque colour, else null (transparent or busy edges).
 */
function edgeBackground(d, w, h, box = { x0: 0, y0: 0, x1: w - 1, y1: h - 1 }, inset = 0) {
  const { x0, y0, x1, y1 } = box;
  const xm = (x0 + x1) >> 1, ym = (y0 + y1) >> 1;
  const xa = x0 + inset, xb = x1 - inset, ya = y0 + inset, yb = y1 - inset;
  const points = (inset ? [] : [[x0, y0], [x1, y0], [x0, y1], [x1, y1]])
    .concat([[xm, ya], [xm, yb], [xa, ym], [xb, ym]])
    .map(([x, y]) => (y * w + x) * 4);
  if (points.some((i) => d[i + 3] < 240)) return null;
  const rgb = [0, 1, 2].map((c) => points.reduce((sum, i) => sum + d[i + c], 0) / points.length);
  if (points.some((i) => Math.abs(d[i] - rgb[0]) + Math.abs(d[i + 1] - rgb[1]) + Math.abs(d[i + 2] - rgb[2]) > 36)) {
    // Not one colour: a light grey gradient (white to grey) still counts as a light background.
    const greyish = points.every((i) => spread(d[i], d[i + 1], d[i + 2]) < 20 && luminance(d[i], d[i + 1], d[i + 2]) > 0.72);
    return greyish ? { rgb: null, light: true } : null;
  }
  return { rgb, light: luminance(...rgb) > 0.78 };
}

function process(img, { crop, gap, recolor }) {
  const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;

  // 1. A light flat background (white, grey, tinted) is dropped, with a soft edge.
  //    A dark or coloured one is part of the mark (a badge): kept, and never recoloured.
  const bg = edgeBackground(d, w, h);
  let badge = !!bg && !bg.light;
  if (bg?.light && bg.rgb) {
    const [br, bgc, bb] = bg.rgb;
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.abs(d[i] - br) + Math.abs(d[i + 1] - bgc) + Math.abs(d[i + 2] - bb);
      if (dist <= 30) d[i + 3] = 0;
      else if (dist < 60) d[i + 3] = Math.round(d[i + 3] * (dist - 30) / 30);
    }
  } else if (bg?.light) {
    // Light grey gradient: drop the light greys, keep darker lettering and colour.
    for (let i = 0; i < d.length; i += 4) {
      if (spread(d[i], d[i + 1], d[i + 2]) >= 20) continue;
      const l = luminance(d[i], d[i + 1], d[i + 2]);
      if (l >= 0.72) d[i + 3] = 0;
      else if (l > 0.6) d[i + 3] = Math.round(d[i + 3] * (0.72 - l) / 0.12);
    }
  }

  // 2. Trim to the artwork, then (for emblem + small-text logos) to the emblem.
  const full = inkBox(d, w, { x0: 0, y0: 0, x1: w - 1, y1: h - 1 });
  if (!full) return null;
  let box = full;
  if (crop === "colour") {
    // The emblem is the coloured part (Doctors Without Borders' red figure).
    for (let i = 0; i < d.length; i += 4) if (spread(d[i], d[i + 1], d[i + 2]) < 60) d[i + 3] = 0;
    box = inkBox(d, w, full) || full;
  } else if (crop === "left" || crop === "top") {
    box = emblemBox(d, w, full, crop, gap) || full;
  }
  const { x0, y0, x1, y1 } = box;
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;

  // A dark or coloured block with transparent margins (rounded corners) is a badge too.
  if (!badge && cw > 8 && ch > 8) {
    const inner = edgeBackground(d, w, h, box, 2);
    badge = !!inner && !inner.light;
  }
  let solid = 0, white = 0, darkGrey = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] <= 128) continue;
      solid++;
      if (isNearWhite(d[i], d[i + 1], d[i + 2])) white++;
      else if (spread(d[i], d[i + 1], d[i + 2]) < 40 && luminance(d[i], d[i + 1], d[i + 2]) < 0.35) darkGrey++;
    }
  }
  const allWhite = solid > 0 && white / solid > 0.6;
  // Dark single-colour art with white details (Unified's octopus): invert it,
  // so the details stay visible instead of the whole mark turning white.
  const monoDark = solid > 0 && (darkGrey + white) / solid > 0.9 && darkGrey / solid > 0.5;

  const variant = (recolorPixel) => {
    const out = ctx.createImageData(cw, ch);
    const o = out.data;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = ((y + y0) * w + (x + x0)) * 4;
        const j = (y * cw + x) * 4;
        const [r, g, b] = recolorPixel(d[i], d[i + 1], d[i + 2]);
        o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = d[i + 3];
      }
    }
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    c.getContext("2d").putImageData(out, 0, 0);
    return c.toDataURL("image/png");
  };

  const keep = badge || recolor === false;
  const light = variant((r, g, b) => (!keep && allWhite && isNearWhite(r, g, b) ? INK : [r, g, b]));
  const dark = variant((r, g, b) => {
    if (keep || allWhite) return [r, g, b];
    if (monoDark && spread(r, g, b) < 40) return [255 - r, 255 - g, 255 - b];
    return forDark(r, g, b);
  });
  return { light, dark, aspect: cw / ch };
}

/** Bounding box of the visible pixels inside `box`, or null. */
function inkBox(d, w, box) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (d[(y * w + x) * 4 + 3] <= 24) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * The emblem of an "emblem + text" logo: everything before the first clear gap,
 * scanning columns from the left (flag, crest, shield) or rows from the top (OSFI).
 */
function emblemBox(d, w, box, from, nth = 1) {
  const along = from === "left" ? [box.x0, box.x1] : [box.y0, box.y1];
  const across = from === "left" ? [box.y0, box.y1] : [box.x0, box.x1];
  const minGap = Math.max(3, Math.round((along[1] - along[0]) * 0.025));
  const empty = (k) => {
    for (let a = across[0]; a <= across[1]; a++) {
      const i = from === "left" ? (a * w + k) * 4 : (k * w + a) * 4;
      if (d[i + 3] > 24) return false;
    }
    return true;
  };
  let run = 0;
  let seenInk = false;
  let gaps = 0;
  for (let k = along[0]; k <= along[1]; k++) {
    if (!empty(k)) { seenInk = true; run = 0; continue; }
    if (seenInk && ++run === minGap && ++gaps === nth) {
      const end = k - run;
      const part = from === "left" ? { ...box, x1: end } : { ...box, y1: end };
      return inkBox(d, w, part);
    }
  }
  return null;
}

/**
 * → Promise<{ light, dark, aspect } | null>, once per image + options per page load.
 * crop: "left" | "top" | "colour" keeps only the emblem (gap: which clear gap ends it);
 * recolor: false keeps its colours.
 */
export function logoArt(src, { crop = null, gap = 1, recolor = true } = {}) {
  if (!src) return Promise.resolve(null);
  const key = `${src}|${crop || ""}|${gap}|${recolor}`;
  if (!cache.has(key)) {
    cache.set(key, load(src).then((img) => process(img, { crop, gap, recolor })).catch(() => null));
  }
  return cache.get(key);
}
