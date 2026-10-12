/* =========================================================
   "I'm attending TTFC 2026" image, drawn on a <canvas>
   ---------------------------------------------------------
   Used by the /attending page (src/pages/Attending.jsx). Everything
   runs in the browser: the photo is never uploaded anywhere.

   Formats: square 1200×1200 (the LinkedIn feed) and landscape
   1200×627 (LinkedIn's wide image size).

   Fonts: Orbitron and DM Sans come from @fontsource (imported in
   main.jsx). A canvas silently falls back to a system font when a
   web font isn't loaded yet, so loadCardAssets() / ensureGlyphs()
   wait for them before anything is drawn.

   Photo framing (`crop`) is { zoom, x, y }: zoom 1 = the photo just
   covers the circle; x / y move it, in circle diameters. The same
   framing works in both formats.
========================================================= */

export const CARD_FORMATS = {
  square: { w: 1200, h: 1200, label: "Square" },
  landscape: { w: 1200, h: 627, label: "Landscape" },
};

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
export const DEFAULT_CROP = Object.freeze({ zoom: 1, x: 0, y: 0 });

const C = {
  ink: "#06020f",
  purple: "#7a3fd1",
  magenta: "#e8458b",
  orange: "#f5a623",
  white: "#ffffff",
  soft: "#e9e2fa",
  muted: "#bfb1e0",
};
const ORBITRON = '"Orbitron", "DM Sans", system-ui, sans-serif';
const SANS = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const HEADLINE = "I’M ATTENDING";
export const DATE_LINE = "26–27 OCT 2026  ·  TORONTO";
export const SITE_LINE = "thetechfestival.com";

const LOGO_SRC = "/Tech_Festival_Canada_Logo_Dark_Transparent.png";
// Parts of the logo file (1500×938): the "C" mark and the wordmark, without the date under them
// (the card has its own date line).
const LOGO_MARK = { sx: 267, sy: 194, sw: 426, sh: 551 };
const LOGO_WORD = { sx: 753, sy: 246, sw: 481, sh: 326 };
const LOGO_GAP = 64; // between the two, in logo-file pixels

/* ---------- layout ---------- */

const LAYOUT = {
  square: {
    logo: { cx: 600, top: 78, h: 124 },
    photo: { cx: 600, cy: 468, r: 196 },
    headline: { cx: 600, y: 810, size: 80, spacing: 8 },
    name: { cx: 600, y: 900, max: 66, min: 40, width: 1000 },
    role: { cx: 600, y: 958, size: 32, width: 1000 },
    date: { cx: 600, cy: 1078, size: 25, spacing: 4.5 },
    site: { cx: 600, y: 1150, size: 25 },
  },
  landscape: {
    logo: { left: 600, top: 54, h: 84 },
    photo: { cx: 318, cy: 306, r: 168 },
    headline: { left: 600, y: 226, size: 50, spacing: 5 },
    name: { left: 600, y: 300, max: 54, min: 32, width: 540 },
    role: { left: 600, y: 346, size: 26, width: 540 },
    date: { left: 600, cy: 448, size: 19, spacing: 3.5 },
    site: { left: 600, y: 540, size: 21 },
  },
};

/** Where the photo circle sits in a format (for dragging): { cx, cy, r } in canvas pixels. */
export function photoCircle(format = "square") {
  const p = (LAYOUT[format] || LAYOUT.square).photo;
  return { cx: p.cx, cy: p.cy, r: p.r };
}

/* ---------- assets ---------- */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load ${src}`));
    img.src = src;
  });
}

const FONT_FACES = [
  `900 64px ${ORBITRON}`, `800 64px ${ORBITRON}`, `700 32px ${ORBITRON}`,
  `700 64px ${SANS}`, `600 32px ${SANS}`, `500 32px ${SANS}`,
];

/** Loads the glyphs of `text` in every card font (an accented name can need another subset). */
export async function ensureGlyphs(text = "") {
  const fonts = typeof document !== "undefined" ? document.fonts : null;
  if (!fonts?.load) return;
  const sample = `${HEADLINE} ${DATE_LINE} ${SITE_LINE} ${text}`;
  await Promise.all(FONT_FACES.map((f) => fonts.load(f, sample).catch(() => null)));
}

let assetsPromise = null;
/** Fonts + logo, once. Resolves to { logo } (logo null if it couldn't load: the card draws without it). */
export function loadCardAssets() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const [logo] = await Promise.all([loadImage(LOGO_SRC).catch(() => null), ensureGlyphs("Jane Doe")]);
      if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
      return { logo };
    })();
  }
  return assetsPromise;
}

/* ---------- small helpers ---------- */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Keeps the photo covering the circle at this zoom. `img` = { width, height }. */
export function clampCrop(crop, img) {
  const zoom = clamp(Number(crop?.zoom) || 1, ZOOM_MIN, ZOOM_MAX);
  if (!img?.width || !img?.height) return { zoom, x: 0, y: 0 };
  const base = 1 / Math.min(img.width, img.height); // cover scale for a circle of diameter 1
  const w = img.width * base * zoom; // drawn size, in diameters
  const h = img.height * base * zoom;
  const mx = Math.max(0, (w - 1) / 2);
  const my = Math.max(0, (h - 1) / 2);
  return { zoom, x: clamp(Number(crop?.x) || 0, -mx, mx), y: clamp(Number(crop?.y) || 0, -my, my) };
}

/** "Jane Doe" → "JD" (letters only; up to two). */
export function initialsFor(first = "", last = "") {
  const pick = (s) => (String(s || "").trim().match(/\p{L}|\p{N}/u) || [""])[0];
  const a = pick(first);
  const b = pick(last) || (!a ? "" : pick(String(first).trim().split(/\s+/)[1]));
  return (a + b).toUpperCase() || "TT";
}

/** Text drawn letter by letter with tracking (canvas letterSpacing isn't in every browser). */
function spacedWidth(ctx, text, spacing) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}
function drawSpaced(ctx, text, x, y, spacing, align = "center") {
  const total = spacedWidth(ctx, text, spacing);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
  return total;
}

/** Largest size (max → min) at which `text` fits `width`; null if not even at min. */
function fitSize(ctx, text, font, { max, min, width, step = 2 }) {
  for (let s = max; s >= min; s -= step) {
    ctx.font = font(s);
    if (ctx.measureText(text).width <= width) return s;
  }
  return null;
}

/** Cuts text to `width` with an ellipsis (font already set). */
function ellipsize(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Two lines, split at the space nearest the middle. */
function splitTwo(text) {
  const words = text.split(" ");
  if (words.length < 2) return [text, ""];
  let best = 1, diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < diff) { diff = d; best = i; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function brandLinear(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C.purple);
  g.addColorStop(0.55, C.magenta);
  g.addColorStop(1, C.orange);
  return g;
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(6,2,15,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

let grain = null;
/** A small tile of film grain, made once. */
function grainTile() {
  if (grain || typeof document === "undefined") return grain;
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  const data = g.createImageData(160, 160);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.round(rnd() * 255);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grain = c;
  return grain;
}

/* ---------- pieces ---------- */

function drawBackground(ctx, w, h, format) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, w, h);
  const s = Math.max(w, h);
  if (format === "landscape") {
    glow(ctx, 140, 40, 660, C.purple, 0.8);
    glow(ctx, 360, 600, 440, C.magenta, 0.38);
    glow(ctx, 1200, 660, 520, C.orange, 0.34);
    glow(ctx, 1160, -60, 460, C.magenta, 0.26);
  } else {
    glow(ctx, 120, 80, s * 0.66, C.purple, 0.85);
    glow(ctx, 1180, 560, s * 0.5, C.magenta, 0.42);
    glow(ctx, 260, 1260, s * 0.48, C.orange, 0.36);
    glow(ctx, 1120, 1240, s * 0.36, C.purple, 0.32);
  }

  // Aurora curtains: soft diagonal light.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const beams = format === "landscape"
    ? [[-120, 0.1, C.purple], [380, 0.06, C.magenta], [820, 0.05, C.orange]]
    : [[-200, 0.1, C.purple], [420, 0.06, C.magenta], [900, 0.05, C.orange]];
  for (const [x, a, col] of beams) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.transform(1, 0, -0.42, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 260, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 260, h);
    ctx.restore();
  }
  ctx.restore();

  // A faint dot grid, strongest in the middle.
  ctx.save();
  const step = 34;
  const cx = format === "landscape" ? w * 0.27 : w / 2;
  const cy = format === "landscape" ? h * 0.49 : h * 0.39;
  const reach = format === "landscape" ? 520 : 760;
  ctx.fillStyle = "#ffffff";
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const d = Math.hypot(x - cx, y - cy) / reach;
      if (d >= 1) continue;
      ctx.globalAlpha = 0.085 * (1 - d) * (1 - d);
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  ctx.restore();

  // Vignette.
  const v = ctx.createRadialGradient(w / 2, h / 2, s * 0.3, w / 2, h / 2, s * 0.8);
  v.addColorStop(0, "rgba(6,2,15,0)");
  v.addColorStop(1, "rgba(6,2,15,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  // Grain.
  const tile = grainTile();
  if (tile) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(tile, "repeat");
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function drawFrame(ctx, w, h) {
  const inset = 26;
  ctx.save();
  roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2 - 10, 34);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = brandLinear(ctx, 0, 0, w, h);
  ctx.stroke();
  ctx.restore();
  // The brand stripe along the bottom edge.
  ctx.fillStyle = brandLinear(ctx, 0, 0, w, 0);
  ctx.fillRect(0, h - 10, w, 10);
}

/** The logo as a horizontal lockup (mark + wordmark), `h` tall. Returns its width. */
function logoWidth(h) {
  const k = h / LOGO_MARK.sh;
  return (LOGO_MARK.sw + LOGO_GAP + LOGO_WORD.sw) * k;
}
function drawLogo(ctx, logo, { left, cx, top, h }) {
  const k = h / LOGO_MARK.sh;
  const w = logoWidth(h);
  const x = left ?? cx - w / 2;
  if (!logo) {
    ctx.save();
    ctx.fillStyle = C.white;
    ctx.font = `800 ${Math.round(h * 0.3)}px ${ORBITRON}`;
    ctx.textBaseline = "middle";
    drawSpaced(ctx, "TTFC 2026", left ?? cx, top + h / 2, 4, left != null ? "left" : "center");
    ctx.restore();
    return;
  }
  ctx.drawImage(logo, LOGO_MARK.sx, LOGO_MARK.sy, LOGO_MARK.sw, LOGO_MARK.sh, x, top, LOGO_MARK.sw * k, h);
  const wh = LOGO_WORD.sh * k;
  ctx.drawImage(logo, LOGO_WORD.sx, LOGO_WORD.sy, LOGO_WORD.sw, LOGO_WORD.sh,
    x + (LOGO_MARK.sw + LOGO_GAP) * k, top + (h - wh) / 2, LOGO_WORD.sw * k, wh);
}

function ringGradient(ctx, cx, cy, r) {
  if (typeof ctx.createConicGradient === "function") {
    const g = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    g.addColorStop(0, C.purple);
    g.addColorStop(0.33, C.magenta);
    g.addColorStop(0.62, C.orange);
    g.addColorStop(0.82, C.magenta);
    g.addColorStop(1, C.purple);
    return g;
  }
  return brandLinear(ctx, cx - r, cy - r, cx + r, cy + r);
}

function drawPhoto(ctx, { cx, cy, r }, { photo, crop, first, last }) {
  // Halo behind the circle.
  glow(ctx, cx, cy, r * 1.9, C.magenta, 0.32);
  glow(ctx, cx - r * 0.4, cy - r * 0.5, r * 1.4, C.purple, 0.3);

  // Orbit: a thin outer ring with three brand dots.
  const orbit = r + 44;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, orbit, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.stroke();
  for (const [deg, col, size] of [[-38, C.orange, 7], [148, C.purple, 6], [212, C.magenta, 4.5]]) {
    const a = (deg * Math.PI) / 180;
    const x = cx + Math.cos(a) * orbit, y = cy + Math.sin(a) * orbit;
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Gradient ring with glow.
  const ringW = Math.max(8, r * 0.07);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + ringW / 2 + 6, 0, Math.PI * 2);
  ctx.lineWidth = ringW;
  ctx.strokeStyle = ringGradient(ctx, cx, cy, r);
  ctx.shadowColor = "rgba(232,69,139,0.75)";
  ctx.shadowBlur = 46;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();

  // Inside: the photo, or initials on a brand gradient.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (photo?.width && photo?.height) {
    const { zoom, x, y } = clampCrop(crop, photo);
    const d = r * 2;
    const scale = (d / Math.min(photo.width, photo.height)) * zoom;
    const dw = photo.width * scale, dh = photo.height * scale;
    ctx.fillStyle = "#140a2a";
    ctx.fillRect(cx - r, cy - r, d, d);
    ctx.drawImage(photo, cx - dw / 2 + x * d, cy - dh / 2 + y * d, dw, dh);
  } else {
    ctx.fillStyle = brandLinear(ctx, cx - r, cy - r, cx + r, cy + r);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const hl = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, 0, cx - r * 0.35, cy - r * 0.45, r * 1.3);
    hl.addColorStop(0, "rgba(255,255,255,0.32)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const shade = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    shade.addColorStop(0.5, "rgba(6,2,15,0)");
    shade.addColorStop(1, "rgba(6,2,15,0.28)");
    ctx.fillStyle = shade;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const text = initialsFor(first, last);
    ctx.font = `800 ${Math.round(r * (text.length > 1 ? 0.74 : 0.9))}px ${ORBITRON}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(6,2,15,0.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fillText(text, cx, cy + r * 0.04);
  }
  ctx.restore();

  // A fine inner edge so photos sit crisply in the ring.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(6,2,15,0.6)";
  ctx.stroke();
  ctx.restore();
}

function drawHeadline(ctx, { cx, left, y, size, spacing }) {
  ctx.save();
  ctx.font = `900 ${size}px ${ORBITRON}`;
  ctx.textBaseline = "alphabetic";
  const w = spacedWidth(ctx, HEADLINE, spacing);
  const x0 = left ?? cx - w / 2;
  const g = ctx.createLinearGradient(x0, y - size, x0 + w, y);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#ffe1f0");
  g.addColorStop(1, "#ffc56b");
  ctx.shadowColor = "rgba(232,69,139,0.55)";
  ctx.shadowBlur = 34;
  ctx.fillStyle = g;
  drawSpaced(ctx, HEADLINE, x0, y, spacing, "left");
  ctx.restore();
  return w;
}

/** Name (1 line, or 2 when long). Returns the y of its last baseline. */
function drawName(ctx, name, { cx, left, y, max, min, width }, placeholder) {
  const font = (s) => `700 ${s}px ${SANS}`;
  ctx.save();
  ctx.textAlign = left != null ? "left" : "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = placeholder ? "rgba(255,255,255,0.42)" : C.white;
  const x = left ?? cx;
  let last = y;
  const one = fitSize(ctx, name, font, { max, min, width });
  if (one) {
    ctx.font = font(one);
    ctx.fillText(name, x, y);
  } else {
    const [a, b] = splitTwo(name);
    const size = Math.max(min, Math.round(max * 0.8));
    const s2 = fitSize(ctx, a.length > b.length ? a : b, font, { max: size, min, width }) || min;
    ctx.font = font(s2);
    const lh = Math.round(s2 * 1.12);
    ctx.fillText(ellipsize(ctx, a, width), x, y - lh * 0.55);
    ctx.fillText(ellipsize(ctx, b, width), x, y + lh * 0.45);
    last = y + lh * 0.45;
  }
  ctx.restore();
  return last;
}

/** Title and company: one line "Title · Company" if it fits, else two lines. Returns the last baseline. */
function drawRole(ctx, { title, company }, { cx, left, y, size, width }) {
  const t = title.trim(), co = company.trim();
  if (!t && !co) return y - size;
  ctx.save();
  ctx.textAlign = left != null ? "left" : "center";
  ctx.textBaseline = "alphabetic";
  const x = left ?? cx;
  const sep = "  ·  ";
  const fontT = `500 ${size}px ${SANS}`;
  const fontC = `600 ${size}px ${SANS}`;
  let last = y;
  ctx.font = fontT;
  const tw = t ? ctx.measureText(t + (co ? sep : "")).width : 0;
  ctx.font = fontC;
  const cw = co ? ctx.measureText(co).width : 0;
  if (tw + cw <= width) {
    // One line, drawn in two styles.
    let start = left != null ? x : x - (tw + cw) / 2;
    ctx.textAlign = "left";
    if (t) {
      ctx.font = fontT;
      ctx.fillStyle = C.muted;
      ctx.fillText(t + (co ? sep : ""), start, y);
      start += tw;
    }
    if (co) {
      ctx.font = fontC;
      ctx.fillStyle = C.soft;
      ctx.fillText(co, start, y);
    }
  } else {
    // Two lines; long ones shrink a little before they're cut short.
    const min = Math.round(size * 0.8);
    const fit = (text, weight) => (text ? fitSize(ctx, text, (s) => `${weight} ${s}px ${SANS}`, { max: size, min, width, step: 1 }) || min : size);
    const s2 = Math.min(fit(t, 500), fit(co, 600));
    const lh = Math.round(s2 * 1.3);
    ctx.font = `500 ${s2}px ${SANS}`;
    ctx.fillStyle = C.muted;
    if (t) ctx.fillText(ellipsize(ctx, t, width), x, y);
    ctx.font = `600 ${s2}px ${SANS}`;
    ctx.fillStyle = C.soft;
    if (co) ctx.fillText(ellipsize(ctx, co, width), x, t ? y + lh : y);
    last = t && co ? y + lh : y;
  }
  ctx.restore();
  return last;
}

function drawDatePill(ctx, { cx, left, cy, size, spacing }) {
  ctx.save();
  ctx.font = `700 ${size}px ${ORBITRON}`;
  const tw = spacedWidth(ctx, DATE_LINE, spacing);
  const padX = size * 1.25;
  const h = size * 2.5;
  const w = tw + padX * 2;
  const x = left ?? cx - w / 2;
  const y = cy - h / 2;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = brandLinear(ctx, x, y, x + w, y + h);
  ctx.shadowColor = "rgba(245,166,35,0.35)";
  ctx.shadowBlur = 22;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = C.orange;
  ctx.textBaseline = "middle";
  drawSpaced(ctx, DATE_LINE, x + padX, cy + size * 0.06, spacing, "left");
  ctx.restore();
}

function drawSite(ctx, { cx, left, y, size }) {
  ctx.save();
  ctx.font = `600 ${size}px ${SANS}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  const dot = size * 0.22;
  const tw = ctx.measureText(SITE_LINE).width;
  const total = dot * 2 + size * 0.5 + tw;
  const x = left ?? cx - total / 2;
  ctx.fillStyle = brandLinear(ctx, x, y - size, x + dot * 2, y);
  ctx.beginPath();
  ctx.arc(x + dot, y - size * 0.34, dot, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.textAlign = "left";
  ctx.fillText(SITE_LINE, x + dot * 2 + size * 0.5, y);
  ctx.restore();
}

/**
 * Draws the whole card on `canvas` (resized to the format).
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {"square"|"landscape"} o.format
 * @param {string} o.firstName
 * @param {string} o.lastName
 * @param {string} [o.title]
 * @param {string} [o.company]
 * @param {CanvasImageSource & {width:number,height:number}} [o.photo]  null → initials
 * @param {{zoom:number,x:number,y:number}} [o.crop]
 * @param {{logo: HTMLImageElement|null}} [o.assets]  from loadCardAssets()
 */
export function drawCard(canvas, { format = "square", firstName = "", lastName = "", title = "", company = "", photo = null, crop = DEFAULT_CROP, assets = {} } = {}) {
  const f = CARD_FORMATS[format] ? format : "square";
  const { w, h } = CARD_FORMATS[f];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  const L = LAYOUT[f];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  drawBackground(ctx, w, h, f);
  drawFrame(ctx, w, h);
  drawLogo(ctx, assets.logo || null, L.logo);
  drawPhoto(ctx, L.photo, { photo, crop, first: firstName, last: lastName });
  drawHeadline(ctx, L.headline);

  const full = `${String(firstName).trim()} ${String(lastName).trim()}`.replace(/\s+/g, " ").trim();
  const nameBase = drawName(ctx, full || "Your Name", L.name, !full);
  const shift = nameBase - L.name.y; // a two-line name pushes the role down
  drawRole(ctx, { title: String(title || ""), company: String(company || "") }, { ...L.role, y: L.role.y + shift });
  drawDatePill(ctx, L.date);
  drawSite(ctx, L.site);
  ctx.restore();
}

/** PNG of the canvas, synchronously (keeps the click's user activation for share / pop-ups). */
export function canvasPngBlob(canvas) {
  const url = canvas.toDataURL("image/png");
  const bin = atob(url.slice(url.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

/** Big photos are scaled down once (max 1600px), so dragging and redrawing stay smooth. */
export function prepareImage(img, max = 1600) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return null;
  const k = Math.min(1, max / Math.max(iw, ih));
  if (k === 1 && img instanceof HTMLCanvasElement) return img;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(iw * k));
  c.height = Math.max(1, Math.round(ih * k));
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** File name for the download. */
export const cardFileName = (format = "square") => `ttfc-2026-im-attending${format === "landscape" ? "-landscape" : ""}.png`;
