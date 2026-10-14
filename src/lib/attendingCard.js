/* =========================================================
   "I'm attending TTFC 2026" image, drawn on a <canvas>
   ---------------------------------------------------------
   Used by the /attending page (src/pages/Attending.jsx). Everything
   runs in the browser: the photo is never uploaded anywhere.

   The design is the marketing team's artwork (public/attending/
   card-square.jpg and card-landscape.jpg, with the "Your Name"
   placeholder taken out). The card draws the person's photo in its
   circle and their name (plus title and company, when given) where
   "Your Name" was. New artwork: replace the two files, then update
   the circle and name positions in LAYOUT.

   Formats: square 1200×1200 (the LinkedIn feed) and landscape
   1200×627 (LinkedIn's wide image size).

   Font: Poppins, as in the artwork (@fontsource, imported below). A
   canvas silently falls back to a system font when a web font isn't
   loaded yet, so loadCardAssets() / ensureGlyphs() wait for it.

   Photo framing (`crop`) is { zoom, x, y }: zoom 1 = the photo just
   covers the circle; x / y move it, in circle diameters. The same
   framing works in both formats.
========================================================= */

import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";

export const CARD_FORMATS = {
  square: { w: 1200, h: 1200, label: "Square" },
  landscape: { w: 1200, h: 627, label: "Landscape" },
};

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
export const DEFAULT_CROP = Object.freeze({ zoom: 1, x: 0, y: 0 });

const C = {
  purple: "#7a3fd1",
  magenta: "#e8458b",
  orange: "#f5a623",
};
const POPPINS = '"Poppins", "DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const ARTWORK = {
  square: "/attending/card-square.jpg",
  landscape: "/attending/card-landscape.jpg",
};

/* ---------- layout (measured on the artwork, in canvas pixels) ---------- */

const LAYOUT = {
  square: {
    photo: { cx: 598, cy: 733, r: 181 },
    name: { cx: 598, y: 983, max: 38, min: 26, width: 860 },
    role: { gap: 38, size: 22, width: 860 },
  },
  landscape: {
    photo: { cx: 865, cy: 235.5, r: 138 },
    name: { cx: 865, y: 427, max: 30, min: 20, width: 470 },
    role: { gap: 28, size: 17, width: 470, lift: 6 },
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

const FONT_FACES = [`600 40px ${POPPINS}`, `500 24px ${POPPINS}`];

/** Loads the glyphs of `text` in the card fonts (an accented name can need another subset). */
export async function ensureGlyphs(text = "") {
  const fonts = typeof document !== "undefined" ? document.fonts : null;
  if (!fonts?.load) return;
  const sample = `Your Name ${text}`;
  await Promise.all(FONT_FACES.map((f) => fonts.load(f, sample).catch(() => null)));
}

let assetsPromise = null;
/** Fonts + artwork, once. Resolves to { art: { square, landscape } } (an image is null if it couldn't load). */
export function loadCardAssets() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const [square, landscape] = await Promise.all([
        loadImage(ARTWORK.square).catch(() => null),
        loadImage(ARTWORK.landscape).catch(() => null),
        ensureGlyphs("Jane Doe"),
      ]);
      if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
      return { art: { square, landscape } };
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

function brandLinear(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C.purple);
  g.addColorStop(0.55, C.magenta);
  g.addColorStop(1, C.orange);
  return g;
}

/* ---------- pieces ---------- */

function drawPhoto(ctx, { cx, cy, r }, { photo, crop, first, last }) {
  // 1px past the artwork's white circle, so no white edge shows inside the ring.
  const rr = r + 1;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (photo?.width && photo?.height) {
    const { zoom, x, y } = clampCrop(crop, photo);
    const d = rr * 2;
    const scale = (d / Math.min(photo.width, photo.height)) * zoom;
    const dw = photo.width * scale, dh = photo.height * scale;
    ctx.fillStyle = "#140a2a";
    ctx.fillRect(cx - rr, cy - rr, d, d);
    ctx.drawImage(photo, cx - dw / 2 + x * d, cy - dh / 2 + y * d, dw, dh);
  } else {
    // No photo yet: initials on the brand gradient.
    ctx.fillStyle = brandLinear(ctx, cx - rr, cy - rr, cx + rr, cy + rr);
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    const hl = ctx.createRadialGradient(cx - rr * 0.35, cy - rr * 0.45, 0, cx - rr * 0.35, cy - rr * 0.45, rr * 1.3);
    hl.addColorStop(0, "rgba(255,255,255,0.3)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    const text = initialsFor(first, last);
    ctx.font = `600 ${Math.round(rr * (text.length > 1 ? 0.78 : 0.95))}px ${POPPINS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(6,2,15,0.3)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    ctx.fillText(text, cx, cy + rr * 0.06);
  }
  ctx.restore();
}

/** The name, one line, centred where the artwork had "Your Name" (shrinks, then cuts, when long). */
function drawName(ctx, name, { cx, y, max, min, width }, placeholder) {
  const font = (s) => `600 ${s}px ${POPPINS}`;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = placeholder ? "rgba(255,255,255,0.5)" : "#ffffff";
  ctx.font = font(fitSize(ctx, name, font, { max, min, width, step: 1 }) || min);
  ctx.fillText(ellipsize(ctx, name, width), cx, y);
  ctx.restore();
}

/** "Title · Company" under the name, one line (shrinks a little, then cuts). */
function drawRole(ctx, text, { cx, y, size, width }) {
  const font = (s) => `500 ${s}px ${POPPINS}`;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = font(fitSize(ctx, text, font, { max: size, min: Math.round(size * 0.8), width, step: 1 }) || Math.round(size * 0.8));
  ctx.fillText(ellipsize(ctx, text, width), cx, y);
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
 * @param {{art: {square: HTMLImageElement|null, landscape: HTMLImageElement|null}}} [o.assets]  from loadCardAssets()
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

  const art = assets.art?.[f];
  if (art) {
    ctx.drawImage(art, 0, 0, w, h);
  } else {
    ctx.fillStyle = brandLinear(ctx, 0, 0, w, h);
    ctx.fillRect(0, 0, w, h);
  }
  drawPhoto(ctx, L.photo, { photo, crop, first: firstName, last: lastName });

  const full = `${String(firstName).trim()} ${String(lastName).trim()}`.replace(/\s+/g, " ").trim();
  const role = [String(title || "").trim(), String(company || "").trim()].filter(Boolean).join("  ·  ");
  const nameY = L.name.y - (role ? L.role.lift || 0 : 0);
  drawName(ctx, full || "Your Name", { ...L.name, y: nameY }, !full);
  if (role) drawRole(ctx, role, { ...L.role, cx: L.name.cx, y: nameY + L.role.gap });
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
