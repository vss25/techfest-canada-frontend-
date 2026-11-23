/* =========================================================
   Templated social post images (Nov 23 2026), drawn on a <canvas> in the staff member's browser: nothing to
   run on a server, nothing to pay for. The look is TTFC's own LinkedIn posts (the owner: "match these"), with a
   library of designs per kind of post (the owner: "template library for each type of post"):

     keynote   one speaker
                 keynote-light  white, purple dots, logo | date and venue, grey tag, two-colour title, the speaker
                                cut out big at the bottom right, name / title / organisation on a purple band
                 keynote-night  the same on deep purple
                 newspaper      the "TTFC Series · Special Edition" newspaper page (the Christy Clark post)
     session   a session and its people
                 session-light  white, the same header, tag and title; rounded purple cards with each person cut
                                out; under each MODERATOR / SPEAKER, the name in purple, title, organisation
                 session-night  the same on deep purple
     partner     partner-blue   deep blue, two soft circles, the TTFC logo × the partner's logo, date and venue
                 partner-white  the white post: header, "Partnership" tag, "Welcome, …", the logo on a card
     event       event-city     the city photo under a purple wash, the logo, headline, date and venue
                 event-white    the white post: header, tag, two-colour headline, the city photo in a rounded card

   Photos and logos can be moved and resized per channel (the owner: "edit the placement of images, logos or
   individuals"): spec.adjust = { <key>: { dx, dy, s } }, dx / dy a share of the image's width / height, s a size
   multiplier. Keys: "brand" (the TTFC logo), "person0"…"person5", "logo" (the partner's), "photo" (the event's).
   renderPost returns the canvas with `boxes` (where each of them was drawn) for dragging them in the preview.

   The logo files carry the 2026 dates; they're always cropped off (the owner). Dates come only from the event.
========================================================= */

import "@fontsource/poppins/500.css";
import "@fontsource/poppins/500-italic.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import { placePeople } from "./templateLayout";

const LIGHT = {
  bg: "#FFFFFF", ink: "#141414", sub: "#3A3A3A", accent: "#7B3B9E", card: "#6D3A97", tag: "#E6E6EA", tagInk: "#141414",
  dots: "#D9D2E9", rule: "#B9B4C6", band1: "#6A2C91", band2: "#A57FCB", logo: "dark",
};
const NIGHT = {
  bg: "#1B0B3D", ink: "#FFFFFF", sub: "#D8CCEE", accent: "#C79BFF", card: "#6D3A97", tag: "rgba(255,255,255,0.14)", tagInk: "#FFFFFF",
  dots: "rgba(199,155,255,0.22)", rule: "rgba(255,255,255,0.35)", band1: "#D6308C", band2: "#7B3B9E", logo: "white",
};
const C = { blue1: "#2410C8", blue2: "#0A0A63", night: "#1B0B3D", magenta: "#E0409A", white: "#FFFFFF", paper: "#EFECE6", news: "#1E1E1E" };
const FONT = '"Poppins", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';
const LOGO_DARK = "/app/brand/logo-dark.webp";            // dark words, the white posts' logo
const LOGO_DARK_KEEP = 0.735;                              // the share of its height above its 2026 date
const LOGO_WHITE = "/updatednavlogotranswhite.png";        // white words on a black square, no date
const LOGO_WHITE_BOX = [85, 265, 870, 465];

/** The library: designs per kind of post, the first is the default. */
export const DESIGNS = {
  keynote: [
    { key: "keynote-light", label: "Featured speaker", hint: "White, big cut-out photo, purple name band" },
    { key: "keynote-night", label: "Featured speaker, night", hint: "The same on deep purple" },
    { key: "newspaper", label: "TTFC Series newspaper", hint: "Special Edition front page with their bio" },
  ],
  session: [
    { key: "session-light", label: "Featured session", hint: "White, a purple card per person" },
    { key: "session-night", label: "Featured session, night", hint: "The same on deep purple" },
  ],
  partner: [
    { key: "partner-blue", label: "TTFC × partner", hint: "Deep blue, both logos" },
    { key: "partner-white", label: "Partner welcome", hint: "White post with their logo on a card" },
  ],
  event: [
    { key: "event-city", label: "City at night", hint: "The city photo under a purple wash" },
    { key: "event-white", label: "White announcement", hint: "Two-colour headline, the city photo in a card" },
  ],
};
export const designsFor = (kind) => DESIGNS[kind] || DESIGNS.event;

/** Pixel size of a design on a channel. */
export function sizeFor(kind, channel, design = "") {
  if (channel === "x") return [1600, 900];
  if (channel === "instagram") return [1080, 1350];
  if (design === "newspaper") return [1080, 1350];
  return kind === "session" ? [1200, 995] : [1200, 1200];
}

/** An image that can be drawn and exported (Sanity's CDN allows our sites). Data and blob URLs work too. */
export function loadImg(url) {
  return new Promise((resolve, reject) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    if (!/^(data|blob):/.test(url)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("An image couldn't be loaded."));
    img.src = url;
  });
}

let assets = null;
/** Both logos and the Poppins weights, once per page. A font that fails leaves the system font; the image is still made. */
export function loadArtAssets() {
  if (!assets) {
    assets = Promise.all([
      loadImg(LOGO_DARK), loadImg(LOGO_WHITE),
      ...["500", "600", "700", "italic 500"].map((w) => (document.fonts?.load(`${w} 40px Poppins`) || Promise.resolve()).catch(() => null)),
    ]).then(([dark, white]) => ({ dark, white })).catch((err) => { assets = null; throw err; });
  }
  return assets;
}

/* ---------- drawing helpers ---------- */
const font = (ctx, weight, size, italic = false, family = FONT) => { ctx.font = `${italic ? "italic " : ""}${weight} ${size}px ${family}`; };

function wrap(ctx, text, width) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const out = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width <= width || !line) line = t;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}
/** Text in at most maxLines lines of width, shrinking from size to min; "…" when it still doesn't fit. */
function fit(ctx, text, { width, size, min, maxLines, weight = 700, italic = false, family = FONT }) {
  for (let s = size; s >= min; s -= 1) {
    font(ctx, weight, s, italic, family);
    const l = wrap(ctx, text, width);
    if (l.length <= maxLines && l.every((x) => ctx.measureText(x).width <= width)) return { lines: l, size: s, family };
  }
  font(ctx, weight, min, italic, family);
  const all = wrap(ctx, text, width);
  const l = all.slice(0, maxLines);
  if (all.length > maxLines) {
    let last = l[l.length - 1] || "";
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    l[l.length - 1] = `${last.trim()}…`;
  }
  return { lines: l, size: min, family };
}
/** Draws lines (top-aligned at y); returns the y under them. */
function lines(ctx, f, x, y, color, { weight = 700, italic = false, lead = 1.22, align = "left" } = {}) {
  font(ctx, weight, f.size, italic, f.family || FONT);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  f.lines.forEach((l, i) => ctx.fillText(l, x, y + i * f.size * lead));
  ctx.textAlign = "left";
  return y + f.lines.length * f.size * lead;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** An image in a box: "cover" fills it (cropping, `focusY` 0 top … 1 bottom), "contain" fits it whole. */
function drawImage(ctx, img, x, y, w, h, { mode = "cover", focusY = 0.3, alignX = 0.5, alignY = 0.5 } = {}) {
  if (!img) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = mode === "cover" ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  const dx = x + (w - dw) * alignX;
  const dy = mode === "cover" ? y + (h - dh) * focusY : y + (h - dh) * alignY;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Where a movable image goes after the person's adjustments: the box moved by (dx, dy) of the canvas and resized by
 * s around its centre. Records the box (or `hit`, the area to grab it by) for dragging in the preview.
 */
function place(ctx, spec, key, x, y, w, h, hit = null) {
  const a = spec.adjust?.[key] || {};
  const s = Math.max(0.3, Math.min(3, Number(a.s) || 1));
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const nw = w * s, nh = h * s;
  const box = { x: x + (w - nw) / 2 + (Number(a.dx) || 0) * W, y: y + (h - nh) / 2 + (Number(a.dy) || 0) * H, w: nw, h: nh };
  (ctx.canvas.boxes ||= []).push({ key, ...(hit || box) });
  return box;
}

/** The halftone in the top right corner of the white posts: dots shrinking toward the bottom left. */
function dots(ctx, W, H, color) {
  const step = Math.round(Math.min(W, H) * 0.024);
  const x0 = W * 0.4, y1 = H * 0.6;
  ctx.fillStyle = color;
  for (let y = step; y < y1; y += step) {
    for (let x = W - step / 2; x > x0; x -= step) {
      const t = Math.min(1, ((W - x) / (W - x0)) * 0.7 + (y / y1) * 0.6);
      const r = step * 0.2 * (1 - t);
      if (r < 0.6) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The logo (dark words or white words), its 2026 date cropped off, movable as "brand". Returns its width before moving. */
function logo(ctx, spec, a, which, x, y, h) {
  if (which === "dark") {
    if (!a.dark) return 0;
    const sw = a.dark.naturalWidth, sh = a.dark.naturalHeight * LOGO_DARK_KEEP;
    const w = (h * sw) / sh;
    const b = place(ctx, spec, "brand", x, y, w, h);
    ctx.drawImage(a.dark, 0, 0, sw, sh, b.x, b.y, b.w, b.h);
    return w;
  }
  if (!a.white) return 0;
  const w = (h * LOGO_WHITE_BOX[2]) / LOGO_WHITE_BOX[3];
  const b = place(ctx, spec, "brand", x, y, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighten";   // the file's black square disappears on a dark background
  ctx.drawImage(a.white, LOGO_WHITE_BOX[0], LOGO_WHITE_BOX[1], LOGO_WHITE_BOX[2], LOGO_WHITE_BOX[3], b.x, b.y, b.w, b.h);
  ctx.restore();
  return w;
}

/** Logo | date (bold) over venue (accent), as on every white post. Returns the y under it. */
function header(ctx, spec, a, P, x, y, u) {
  const lh = Math.round(u * 0.088);
  const lw = logo(ctx, spec, a, P.logo, x, y, lh);
  const lx = x + lw + Math.round(u * 0.022);
  ctx.fillStyle = P.rule;
  ctx.fillRect(lx, y + lh * 0.1, Math.max(1, Math.round(u * 0.0018)), lh * 0.8);
  const tx = lx + Math.round(u * 0.022);
  font(ctx, 600, Math.round(u * 0.021));
  ctx.textBaseline = "middle";
  ctx.fillStyle = P.ink;
  if (spec.header?.when) ctx.fillText(spec.header.when, tx, y + lh * 0.36);
  ctx.fillStyle = P.accent;
  if (spec.header?.venue) ctx.fillText(spec.header.venue, tx, y + lh * 0.68);
  ctx.textBaseline = "alphabetic";
  return y + lh;
}

/** The rounded tag ("Featured Session"). Returns the y under it. */
function tag(ctx, text, P, x, y, u) {
  if (!text) return y;
  const fs = Math.round(u * 0.022);
  font(ctx, 500, fs);
  const padX = Math.round(fs * 0.75), h = Math.round(fs * 1.75);
  const w = ctx.measureText(text).width + padX * 2;
  ctx.fillStyle = P.tag;
  roundRect(ctx, x, y, w, h, h * 0.3);
  ctx.fill();
  ctx.fillStyle = P.tagInk;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  ctx.textBaseline = "alphabetic";
  return y + h;
}

/** The two-colour title: `accent` first, then `rest`, wrapped together. Returns the y under it. */
function title(ctx, spec, P, x, y, width, { size, min, maxLines }) {
  const t = spec.title || { accent: "", rest: spec.headline || "" };
  const accent = String(t.accent || "").trim().split(/\s+/).filter(Boolean);
  const rest = String(t.rest || "").trim().split(/\s+/).filter(Boolean);
  const colors = [...accent.map(() => P.accent), ...rest.map(() => P.ink)];
  const f = fit(ctx, [...accent, ...rest].join(" "), { width, size, min, maxLines, weight: 700 });
  font(ctx, 700, f.size);
  ctx.textBaseline = "top";
  const lead = f.size * 1.18;
  let i = 0;
  f.lines.forEach((line, li) => {
    let cx = x;
    const parts = line.split(" ");
    parts.forEach((p, pi) => {
      const tx = pi < parts.length - 1 ? `${p} ` : p;
      ctx.fillStyle = colors[i] || P.ink;
      ctx.fillText(tx, cx, y + li * lead);
      cx += ctx.measureText(tx).width;
      i += 1;
    });
  });
  ctx.textBaseline = "alphabetic";
  return y + f.lines.length * lead;
}

function initials(ctx, name, x, y, w, h, color = "rgba(255,255,255,0.9)") {
  const ini = String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  font(ctx, 700, Math.round(w * 0.3));
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ini, x + w / 2, y + h * 0.52);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/* ---------- keynote ---------- */
function drawKeynote(ctx, spec, a, W, H, P) {
  const u = Math.min(W, H), m = Math.round(u * 0.055);
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  dots(ctx, W, H, P.dots);
  const p = spec.people?.[0] || {};
  const landscape = W / H > 1.3;
  let y = header(ctx, spec, a, P, m, m, u) + Math.round(u * 0.07);
  y = tag(ctx, spec.tag, P, m, y, u) + Math.round(u * 0.035);
  title(ctx, spec, P, m, y, landscape ? W * 0.5 : W - m * 2, { size: Math.round(u * 0.058), min: Math.round(u * 0.036), maxLines: landscape ? 3 : 2 });
  // The band with the name: fades left to right.
  const bh = Math.round(u * (landscape ? 0.25 : 0.21));
  const by = landscape ? H - bh - m * 1.1 : H - bh - u * 0.13;
  const bw = landscape ? W * 0.5 : W * 0.56;
  const g = ctx.createLinearGradient(0, 0, bw, 0);
  g.addColorStop(0, P.band1); g.addColorStop(1, P.band2);
  ctx.fillStyle = g;
  ctx.fillRect(0, by, bw, bh);
  // The person, big, bottom right, in front of the band (a cut-out stands on the bottom edge; a photo is a card).
  const pw = landscape ? W * 0.42 : W * 0.62, ph = (landscape ? H * 0.9 : H * 0.6) + u * 0.04;
  const b = place(ctx, spec, "person0", W - pw - (landscape ? m : W * 0.02), H - ph + u * 0.04, pw, ph);
  if (p.img && p.cutout) drawImage(ctx, p.img, b.x, b.y, b.w, b.h, { mode: "contain", alignX: 0.6, alignY: 1 });
  else if (p.img) {
    ctx.save();
    roundRect(ctx, b.x + b.w * 0.08, b.y + b.h * 0.06, b.w * 0.84, b.h * 0.94 + u * 0.05, u * 0.04);
    ctx.clip();
    drawImage(ctx, p.img, b.x + b.w * 0.08, b.y + b.h * 0.06, b.w * 0.84, b.h * 0.94, { mode: "cover", focusY: 0.2 });
    ctx.restore();
  } else initials(ctx, p.name, b.x, b.y, b.w, b.h, P.accent);
  const tw = Math.min(bw - m * 1.4, (landscape ? W * 0.47 : W * 0.44) - m);   // clear of the photo
  let ty = by + bh * 0.15;
  ty = lines(ctx, fit(ctx, p.name, { width: tw, size: Math.round(u * 0.042), min: Math.round(u * 0.03), maxLines: 1, weight: 600 }), m, ty, C.white, { weight: 600 }) + u * 0.008;
  const tf = p.title ? fit(ctx, p.title, { width: tw, size: Math.round(u * 0.025), min: Math.round(u * 0.019), maxLines: 2, weight: 500 }) : null;
  if (tf) ty = lines(ctx, tf, m, ty, C.white, { weight: 500, lead: 1.3 });
  if (p.org) lines(ctx, fit(ctx, p.org, { width: tw, size: tf ? tf.size : Math.round(u * 0.025), min: Math.round(u * 0.016), maxLines: 1, weight: 500, italic: true }), m, ty, C.white, { weight: 500, italic: true });
}

/* ---------- the newspaper (TTFC Series · Special Edition) ---------- */
function drawNewspaper(ctx, spec, a, W, H) {
  const u = Math.min(W, H), m = Math.round(u * 0.05), ink = C.news;
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  const landscape = W / H > 1.3;
  const rule = (yy, t = 2) => { ctx.fillStyle = ink; ctx.fillRect(m, yy, W - m * 2, Math.max(1, u * 0.002 * t)); };
  // Masthead
  let y = m * 0.8;
  font(ctx, 700, Math.round(u * 0.022), false, SERIF); ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("SPECIAL EDITION", W / 2, y);
  // The date sits at the right of the first line, clear of the masthead.
  const when = fit(ctx, String(spec.header?.when || "").toUpperCase(), { width: W / 2 - m - u * 0.2, size: Math.round(u * 0.02), min: Math.round(u * 0.014), maxLines: 1, weight: 700, family: SERIF });
  font(ctx, 700, when.size, false, SERIF); ctx.textAlign = "right";
  ctx.fillText(when.lines[0] || "", W - m, y + u * 0.002);
  y += u * 0.04;
  font(ctx, 700, Math.round(u * 0.05), true, SERIF); ctx.textAlign = "center";
  ctx.fillText("* TTFC Series *", W / 2, y);
  ctx.textAlign = "left";
  logo(ctx, spec, a, "dark", m, y - u * 0.005, Math.round(u * 0.05));
  y += u * 0.075;
  rule(y, 3); rule(y + u * 0.012, 1);
  y += u * 0.03;
  // The city in wide capitals, sized so the letters and their spacing fit between the margins.
  const cityText = String(spec.city || "").toUpperCase() || "TTFC";
  let cs = Math.round(u * (landscape ? 0.11 : 0.14));
  const cityWidth = (size) => { font(ctx, 700, size, false, SERIF); return ctx.measureText(cityText).width + size * 0.12 * (cityText.length - 1); };
  while (cs > u * 0.05 && cityWidth(cs) > W - m * 2) cs -= 2;
  const city = { size: cs };
  const cityX = (W - cityWidth(cs)) / 2;          // measured before the spacing is switched on
  font(ctx, 700, cs, false, SERIF); ctx.letterSpacing = `${Math.round(cs * 0.12)}px`;
  ctx.textAlign = "left"; ctx.fillText(cityText, cityX, y); ctx.letterSpacing = "0px";
  y += city.size * 1.05 + u * 0.02;
  rule(y, 3); rule(y + u * 0.012, 1);
  y += u * 0.04;
  const p = spec.people?.[0] || {};
  const bottom = H - m;
  const colGap = u * 0.025;
  const leftW = (W - m * 2) * (landscape ? 0.45 : 0.62);
  const rightX = m + leftW + colGap, rightW = W - m - rightX;
  // Left: the "TTFC SPEAKER" box over the photo.
  const capH = u * 0.065;
  ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, u * 0.002);
  ctx.strokeRect(m, y, leftW, capH);
  font(ctx, 700, Math.round(u * 0.028), true, SERIF); ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`TTFC ${spec.year || ""} SPEAKER`.replace(/\s+/g, " ").toUpperCase(), m + leftW / 2, y + capH / 2);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const photoY = y + capH + u * 0.015;
  const photoH = (landscape ? bottom : bottom - u * 0.24) - photoY;
  ctx.save();
  ctx.beginPath(); ctx.rect(m, photoY, leftW, photoH); ctx.clip();
  ctx.fillStyle = "#C9CCD3"; ctx.fillRect(m, photoY, leftW, photoH);
  const b = place(ctx, spec, "person0", m, photoY, leftW, photoH, { x: m, y: photoY, w: leftW, h: photoH });
  if (p.img) drawImage(ctx, p.img, b.x, b.y, b.w, b.h, { mode: "cover", focusY: p.cutout ? 0.05 : 0.2 });
  else initials(ctx, p.name, b.x, b.y, b.w, b.h, ink);
  ctx.restore();
  ctx.strokeRect(m, photoY, leftW, photoH);
  // Right: the name on black, then the bio.
  ctx.fillStyle = "#3B3B3B"; ctx.fillRect(rightX, y, rightW, capH);
  const nf = fit(ctx, String(p.name || "").toUpperCase(), { width: rightW * 0.9, size: Math.round(u * 0.03), min: Math.round(u * 0.016), maxLines: 1, weight: 700, italic: true, family: SERIF });
  font(ctx, 700, nf.size, true, SERIF); ctx.fillStyle = "#F5EFE3"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(nf.lines[0] || "", rightX + rightW / 2, y + capH / 2);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const bioTop = y + capH + u * 0.015;
  ctx.strokeRect(rightX, bioTop, rightW, photoY + photoH - bioTop);
  const bio = [p.title && p.org ? `${p.title}, ${p.org}.` : p.title || p.org, spec.bio].filter(Boolean).join(" ");
  const bf = fit(ctx, bio, { width: rightW - u * 0.04, size: Math.round(u * 0.022), min: Math.round(u * 0.014), maxLines: Math.floor((photoY + photoH - bioTop - u * 0.04) / (u * 0.022 * 1.35)), weight: 500, italic: true, family: SERIF });
  lines(ctx, bf, rightX + u * 0.02, bioTop + u * 0.02, ink, { weight: 500, italic: true, lead: 1.35 });
  if (landscape) return;
  // Bottom row: the event card, a line about the event, date and place.
  const rowY = photoY + photoH + u * 0.025, rowH = bottom - rowY;
  const c1 = rowH * 0.95;
  ctx.fillStyle = "#2E2B33"; ctx.fillRect(m, rowY, c1, rowH);
  logo(ctx, { ...spec, adjust: {} }, a, "white", m + c1 * 0.08, rowY + rowH * 0.3, c1 * 0.38);
  ctx.strokeRect(m + c1 + colGap, rowY, W - m * 2 - c1 - colGap, rowH);
  const tx = m + c1 + colGap * 2, tw = W - m - tx - colGap;
  let ty = rowY + u * 0.02;
  ty = lines(ctx, fit(ctx, spec.headline || "", { width: tw, size: Math.round(u * 0.022), min: Math.round(u * 0.015), maxLines: 3, weight: 500, italic: true, family: SERIF }), tx, ty, ink, { weight: 500, italic: true, lead: 1.35 }) + u * 0.01;
  lines(ctx, fit(ctx, [spec.header?.when, spec.header?.venue].filter(Boolean).join(" · "), { width: tw, size: Math.round(u * 0.022), min: Math.round(u * 0.015), maxLines: 2, weight: 700, italic: true, family: SERIF }), tx, ty, ink, { weight: 700, italic: true, lead: 1.35 });
}

/* ---------- session ---------- */
function drawSession(ctx, spec, a, W, H, P) {
  const u = Math.min(W, H), m = Math.round(u * 0.045);
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  dots(ctx, W, H, P.dots);
  let y = header(ctx, spec, a, P, m, m, u) + Math.round(u * 0.06);
  y = tag(ctx, spec.tag, P, m, y, u) + Math.round(u * 0.03);
  y = title(ctx, spec, P, m, y, W - m * 2, { size: Math.round(u * 0.054), min: Math.round(u * 0.034), maxLines: 2 }) + Math.round(u * 0.045);
  const people = (spec.people || []).slice(0, 6);
  const n = Math.max(1, people.length);
  // One row, as TTFC posts them (five across on LinkedIn); Instagram's narrow page takes two rows past four.
  const perRow = W >= H || n <= 4 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);
  const gap = Math.round(u * 0.025);
  const textH = u * 0.19;
  // Cards keep their portrait shape: as wide as the row allows, as tall as the page allows, whichever is smaller.
  const maxW = Math.min((W - m * 2 - gap * (perRow - 1)) / perRow, u * 0.3);
  const maxH = (H - y - m - rows * textH - (rows - 1) * gap) / rows;
  const cardH = Math.max(u * 0.12, Math.min(maxW * 1.32, maxH));
  const cardW = Math.min(maxW, cardH / 1.32);
  const rowW = (k) => k * cardW + (k - 1) * gap;
  people.forEach((p, i) => {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    const x = (W - rowW(inRow)) / 2 + col * (cardW + gap);
    const cy = y + row * (cardH + textH + gap);
    ctx.save();
    roundRect(ctx, x, cy, cardW, cardH, cardW * 0.14);
    ctx.clip();
    ctx.fillStyle = P.card;
    ctx.fillRect(x, cy, cardW, cardH);
    // The photo moves and zooms inside its card; grabbed by the card.
    const b = p.cutout ? place(ctx, spec, `person${i}`, x, cy + cardH * 0.1, cardW, cardH * 0.9, { x, y: cy, w: cardW, h: cardH })
      : place(ctx, spec, `person${i}`, x, cy, cardW, cardH, { x, y: cy, w: cardW, h: cardH });
    if (p.img) drawImage(ctx, p.img, b.x, b.y, b.w, b.h, { mode: "cover", focusY: p.cutout ? 0 : 0.2 });
    else initials(ctx, p.name, x, cy, cardW, cardH);
    ctx.restore();
    // Under the card: ROLE, the name in the accent colour, the title, the organisation in italics.
    const tw = cardW + gap * 0.6;
    let ty = cy + cardH + u * 0.022;
    font(ctx, 600, Math.round(u * 0.015));
    ctx.fillStyle = P.ink;
    ctx.textBaseline = "top";
    ctx.fillText(String(p.role || "Speaker").toUpperCase(), x, ty);
    ty += u * 0.03;
    const small = n > 4;
    ty = lines(ctx, fit(ctx, p.name, { width: tw, size: Math.round(u * (small ? 0.022 : 0.026)), min: Math.round(u * 0.017), maxLines: 2, weight: 600 }), x, ty, P.accent, { weight: 600, lead: 1.15 }) + u * 0.006;
    if (p.title) ty = lines(ctx, fit(ctx, p.title, { width: tw, size: Math.round(u * (small ? 0.017 : 0.019)), min: Math.round(u * 0.014), maxLines: 2, weight: 600 }), x, ty, P.ink, { weight: 600, lead: 1.25 });
    if (p.org) lines(ctx, fit(ctx, p.org, { width: tw, size: Math.round(u * (small ? 0.017 : 0.019)), min: Math.round(u * 0.014), maxLines: 1, weight: 500, italic: true }), x, ty, P.sub, { weight: 500, italic: true });
  });
}

/* ---------- partner ---------- */
function drawPartnerBlue(ctx, spec, a, W, H) {
  const u = Math.min(W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, C.blue1); g.addColorStop(1, C.blue2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(120,100,255,0.55)"; ctx.lineWidth = u * 0.06;
  ctx.beginPath(); ctx.arc(W * 0.02, H * 0.02, u * 0.38, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(90,70,255,0.5)";
  ctx.beginPath(); ctx.arc(W * 0.95, H * 1.02, u * 0.36, 0, Math.PI * 2); ctx.fill();
  const half = W / 2;
  const lh = Math.round(u * 0.14);
  const lw = (lh * LOGO_WHITE_BOX[2]) / LOGO_WHITE_BOX[3];
  const ly = H * 0.36;
  logo(ctx, spec, a, "white", half * 0.5 - lw / 2, ly, lh);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(half * 0.14, ly + lh + u * 0.04, half * 0.72, Math.max(1, u * 0.0015));
  let ty = ly + lh + u * 0.07;
  ty = lines(ctx, fit(ctx, spec.header?.when || "", { width: half * 0.8, size: Math.round(u * 0.026), min: Math.round(u * 0.02), maxLines: 1, weight: 600 }), half * 0.5, ty, C.white, { weight: 600, align: "center" }) + u * 0.006;
  lines(ctx, fit(ctx, spec.header?.venue || "", { width: half * 0.75, size: Math.round(u * 0.024), min: Math.round(u * 0.018), maxLines: 2, weight: 500 }), half * 0.5, ty, C.white, { weight: 500, align: "center", lead: 1.35 });
  font(ctx, 500, Math.round(u * 0.05)); ctx.fillStyle = C.white; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("×", half, H * 0.5); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const cw = half * 0.72, ch = cw * 0.62, cx = half + half * 0.14, cy = H * 0.5 - ch / 2;
  ctx.fillStyle = C.white;
  roundRect(ctx, cx, cy, cw, ch, u * 0.025); ctx.fill();
  ctx.save(); roundRect(ctx, cx, cy, cw, ch, u * 0.025); ctx.clip();
  const b = place(ctx, spec, "logo", cx + cw * 0.1, cy + ch * 0.14, cw * 0.8, ch * 0.72, { x: cx, y: cy, w: cw, h: ch });
  drawImage(ctx, spec.logo, b.x, b.y, b.w, b.h, { mode: "contain" });
  ctx.restore();
  if (spec.tag) {
    font(ctx, 600, Math.round(u * 0.022)); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.textAlign = "center";
    ctx.fillText(spec.tag.toUpperCase(), W / 2, H * 0.14);
    ctx.textAlign = "left";
  }
}

function drawPartnerWhite(ctx, spec, a, W, H) {
  const P = LIGHT;
  const u = Math.min(W, H), m = Math.round(u * 0.055);
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  dots(ctx, W, H, P.dots);
  let y = header(ctx, spec, a, P, m, m, u) + Math.round(u * 0.07);
  y = tag(ctx, "Partnership", P, m, y, u) + Math.round(u * 0.035);
  y = title(ctx, { title: { accent: "Welcome,", rest: String(spec.headline || "").replace(/^Welcome,\s*/, "") } }, P, m, y, W - m * 2, { size: Math.round(u * 0.06), min: Math.round(u * 0.036), maxLines: 2 }) + u * 0.05;
  const cw = Math.min(W - m * 2, u * 0.8), chh = Math.min(H - y - m, cw * 0.55);
  const cx = (W - cw) / 2;
  ctx.fillStyle = "#F4F1FA";
  roundRect(ctx, cx, y, cw, chh, u * 0.04); ctx.fill();
  ctx.save(); roundRect(ctx, cx, y, cw, chh, u * 0.04); ctx.clip();
  const b = place(ctx, spec, "logo", cx + cw * 0.12, y + chh * 0.15, cw * 0.76, chh * 0.7, { x: cx, y, w: cw, h: chh });
  drawImage(ctx, spec.logo, b.x, b.y, b.w, b.h, { mode: "contain" });
  ctx.restore();
}

/* ---------- event ---------- */
function drawEventCity(ctx, spec, a, W, H) {
  const u = Math.min(W, H);
  ctx.fillStyle = C.night; ctx.fillRect(0, 0, W, H);
  if (spec.photo) {
    const b = place(ctx, spec, "photo", 0, 0, W, H, { x: 0, y: 0, w: W, h: H });
    drawImage(ctx, spec.photo, b.x, b.y, b.w, b.h, { mode: "cover", focusY: 0.6 });
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(27,11,61,0.94)"); g.addColorStop(0.55, "rgba(60,20,120,0.72)"); g.addColorStop(1, "rgba(27,11,61,0.35)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lh = Math.round(u * 0.17);
  const lw = (lh * LOGO_WHITE_BOX[2]) / LOGO_WHITE_BOX[3];
  let y = H * 0.1;
  logo(ctx, spec, a, "white", W / 2 - lw / 2, y, lh);
  y += lh + u * 0.05;
  if (spec.tag) {
    font(ctx, 600, Math.round(u * 0.022)); ctx.fillStyle = C.white; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(spec.tag.toUpperCase(), W / 2, y);
    ctx.textAlign = "left";
    y += u * 0.05;
  }
  y = lines(ctx, fit(ctx, spec.headline, { width: W * 0.82, size: Math.round(u * 0.062), min: Math.round(u * 0.04), maxLines: 2, weight: 700 }), W / 2, y, C.white, { weight: 700, align: "center", lead: 1.15 }) + u * 0.035;
  y = lines(ctx, fit(ctx, spec.header?.when || "", { width: W * 0.8, size: Math.round(u * 0.04), min: Math.round(u * 0.028), maxLines: 1, weight: 600 }), W / 2, y, C.magenta, { weight: 600, align: "center" }) + u * 0.015;
  y = lines(ctx, fit(ctx, spec.header?.venue || "", { width: W * 0.8, size: Math.round(u * 0.03), min: Math.round(u * 0.022), maxLines: 1, weight: 600 }), W / 2, y, C.white, { weight: 600, align: "center" }) + u * 0.03;
  if (spec.footer) lines(ctx, fit(ctx, spec.footer, { width: W * 0.8, size: Math.round(u * 0.024), min: Math.round(u * 0.018), maxLines: 1, weight: 500 }), W / 2, y, "rgba(255,255,255,0.85)", { weight: 500, align: "center" });
}

function drawEventWhite(ctx, spec, a, W, H) {
  const P = LIGHT;
  const u = Math.min(W, H), m = Math.round(u * 0.055);
  ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
  dots(ctx, W, H, P.dots);
  const landscape = W / H > 1.3;
  let y = header(ctx, spec, a, P, m, m, u) + Math.round(u * 0.06);
  y = tag(ctx, spec.tag, P, m, y, u) + Math.round(u * 0.03);
  const head = String(spec.headline || "");
  const t = { accent: head.split(" ").slice(0, 2).join(" "), rest: head.split(" ").slice(2).join(" ") };
  y = title(ctx, { title: t }, P, m, y, landscape ? W * 0.5 : W - m * 2, { size: Math.round(u * 0.058), min: Math.round(u * 0.036), maxLines: landscape ? 3 : 2 }) + u * 0.02;
  if (spec.footer) y = lines(ctx, fit(ctx, spec.footer, { width: W - m * 2, size: Math.round(u * 0.026), min: Math.round(u * 0.02), maxLines: 1, weight: 600 }), m, y, P.accent, { weight: 600 }) + u * 0.035;
  const px = landscape ? W * 0.56 : m, py = landscape ? m : y;
  const pw = landscape ? W - px - m : W - m * 2, ph = (landscape ? H - m * 2 : H - y - m);
  ctx.save();
  roundRect(ctx, px, py, pw, ph, u * 0.04); ctx.clip();
  ctx.fillStyle = P.card; ctx.fillRect(px, py, pw, ph);
  const b = place(ctx, spec, "photo", px, py, pw, ph, { x: px, y: py, w: pw, h: ph });
  if (spec.photo) drawImage(ctx, spec.photo, b.x, b.y, b.w, b.h, { mode: "cover", focusY: 0.55 });
  ctx.restore();
}

/* ---------- an uploaded template: the blank design, then each box by its rules ---------- */

/** Text in a box: shrinks between size and minSize to fit maxLines, cut to maxChars, aligned in the box. */
function boxText(ctx, b, value, W, H, { accent = "", } = {}) {
  if (!b?.on || !value) return;
  let text = String(value);
  if (b.upper) text = text.toUpperCase();
  if (b.maxChars && text.length > b.maxChars) text = `${text.slice(0, Math.max(1, b.maxChars - 1)).trim()}…`;
  const x = b.x * W, y = b.y * H, w = b.w * W, h = b.h * H;
  const padX = b.fill ? b.size * 0.6 : 0;
  const f = fit(ctx, text, { width: Math.max(10, w - padX * 2), size: b.size, min: Math.min(b.minSize, b.size), maxLines: b.maxLines, weight: b.weight, italic: b.italic });
  const lead = f.size * 1.2;
  const blockH = f.lines.length * lead;
  const top = b.valign === "bottom" ? y + h - blockH : b.valign === "middle" ? y + (h - blockH) / 2 : y;
  font(ctx, b.weight, f.size, b.italic);
  const widths = f.lines.map((l) => ctx.measureText(l).width);
  if (b.fill) {
    const bw = Math.max(...widths) + padX * 2, bh = blockH + f.size * 0.5;
    const bx = b.align === "right" ? x + w - bw : b.align === "center" ? x + (w - bw) / 2 : x;
    ctx.fillStyle = b.fill;
    roundRect(ctx, bx, top - f.size * 0.25, bw, bh, Math.min(bh * 0.3, f.size * 0.5));
    ctx.fill();
  }
  // Two colours (the title): the accent words first, then the rest.
  const accentWords = accent ? accent.split(/\s+/).filter(Boolean).length : 0;
  let word = 0;
  ctx.textBaseline = "top";
  f.lines.forEach((line, i) => {
    const lw = widths[i];
    let cx = b.align === "right" ? x + w - padX - lw : b.align === "center" ? x + (w - lw) / 2 : x + padX;
    const parts = line.split(" ");
    parts.forEach((p, pi) => {
      const t = pi < parts.length - 1 ? `${p} ` : p;
      ctx.fillStyle = b.twoTone && word < accentWords ? b.accent : b.color;
      ctx.fillText(t, cx, top + i * lead);
      cx += ctx.measureText(t).width;
      word += 1;
    });
  });
  ctx.textBaseline = "alphabetic";
}

function drawUploaded(ctx, spec, a, W, H, layout) {
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
  if (spec.background) drawImage(ctx, spec.background, 0, 0, W, H, { mode: "cover", focusY: 0.5 });
  const B = layout.boxes || {};
  const u = Math.min(W, H);
  // Images first, words on top.
  const photoBox = B.photo;
  if (photoBox?.on && spec.photo) {
    const x = photoBox.x * W, y = photoBox.y * H, w = photoBox.w * W, h = photoBox.h * H;
    ctx.save(); roundRect(ctx, x, y, w, h, photoBox.radius * Math.min(w, h)); ctx.clip();
    const b = place(ctx, spec, "photo", x, y, w, h, { x, y, w, h });
    drawImage(ctx, spec.photo, b.x, b.y, b.w, b.h, { mode: photoBox.fit, focusY: 0.55 });
    ctx.restore();
  }
  const logoBox = B.logo;
  if (logoBox?.on) {
    const x = logoBox.x * W, y = logoBox.y * H, w = logoBox.w * W, h = logoBox.h * H;
    if (logoBox.card) { ctx.fillStyle = logoBox.card; roundRect(ctx, x, y, w, h, logoBox.radius * Math.min(w, h)); ctx.fill(); }
    ctx.save(); roundRect(ctx, x, y, w, h, logoBox.radius * Math.min(w, h)); ctx.clip();
    const pad = logoBox.card ? Math.min(w, h) * 0.12 : 0;
    const b = place(ctx, spec, "logo", x + pad, y + pad, w - pad * 2, h - pad * 2, { x, y, w, h });
    drawImage(ctx, spec.logo, b.x, b.y, b.w, b.h, { mode: logoBox.fit, alignX: logoBox.align === "left" ? 0 : logoBox.align === "right" ? 1 : 0.5 });
    ctx.restore();
  }
  const brandBox = B.brand;
  if (brandBox?.on) {
    const h = brandBox.h * H;
    logo(ctx, spec, a, brandBox.variant || "dark", brandBox.x * W, brandBox.y * H, h);
  }
  const pb = B.people;
  const people = spec.people || [];
  if (pb?.on && people.length) {
    const labelH = pb.labels ? u * 0.2 : 0;   // room for the role, a two-line name, the title and the organisation
    const spots = placePeople(people.length, pb, W, H, { labelH });
    people.forEach((p, i) => {
      const s = spots[i];
      ctx.save();
      if (pb.card !== "cutout") { roundRect(ctx, s.x, s.y, s.w, s.h, pb.radius * s.w); ctx.clip(); }
      if (pb.card === "card") { ctx.fillStyle = pb.cardColor; ctx.fillRect(s.x, s.y, s.w, s.h); }
      const hit = { x: s.x, y: s.y, w: s.w, h: s.h };
      const inner = pb.card === "card" && p.cutout ? { x: s.x, y: s.y + s.h * 0.08, w: s.w, h: s.h * 0.92 } : hit;
      const b = place(ctx, spec, `person${i}`, inner.x, inner.y, inner.w, inner.h, hit);
      if (p.img) {
        if (pb.card === "cutout") drawImage(ctx, p.img, b.x, b.y, b.w, b.h, { mode: "contain", alignY: 1 });
        else drawImage(ctx, p.img, b.x, b.y, b.w, b.h, { mode: "cover", focusY: p.cutout ? 0 : 0.2 });
      } else {
        if (pb.card === "cutout") { ctx.fillStyle = pb.cardColor; roundRect(ctx, s.x, s.y, s.w, s.h, pb.radius * s.w); ctx.fill(); }
        initials(ctx, p.name, s.x, s.y, s.w, s.h);
      }
      ctx.restore();
      if (pb.labels) {
        const tw = s.w + (pb.gap * W) * 0.6;
        let ty = s.labelY + u * 0.02;
        font(ctx, 600, Math.round(u * 0.015)); ctx.fillStyle = pb.labelColor; ctx.textBaseline = "top";
        ctx.fillText(String(p.role || "Speaker").toUpperCase(), s.x, ty);
        ty += u * 0.03;
        const small = people.length > 4;
        ty = lines(ctx, fit(ctx, p.name, { width: tw, size: Math.round(u * (small ? 0.022 : 0.026)), min: Math.round(u * 0.016), maxLines: 2, weight: 600 }), s.x, ty, pb.nameColor, { weight: 600, lead: 1.15 }) + u * 0.005;
        if (p.title) ty = lines(ctx, fit(ctx, p.title, { width: tw, size: Math.round(u * (small ? 0.017 : 0.019)), min: Math.round(u * 0.013), maxLines: 2, weight: 600 }), s.x, ty, pb.labelColor, { weight: 600, lead: 1.25 });
        if (p.org) lines(ctx, fit(ctx, p.org, { width: tw, size: Math.round(u * (small ? 0.017 : 0.019)), min: Math.round(u * 0.013), maxLines: 1, weight: 500, italic: true }), s.x, ty, pb.labelColor, { weight: 500, italic: true });
      }
    });
  }
  const t = spec.title;
  boxText(ctx, B.title, t ? `${t.accent || ""} ${t.rest || ""}`.trim() : spec.headline, W, H, { accent: t?.accent || "" });
  boxText(ctx, B.tag, spec.tag, W, H);
  boxText(ctx, B.when, spec.header?.when, W, H);
  boxText(ctx, B.venue, spec.header?.venue, W, H);
  boxText(ctx, B.footer, spec.footer || "thetechfestival.com", W, H);
  const p0 = people[0];
  if (p0) {
    boxText(ctx, B.name, p0.name, W, H);
    boxText(ctx, B.role, [p0.title, p0.org].filter(Boolean).join(", "), W, H);
  }
}

const DRAW = {
  "keynote-light": (ctx, s, a, W, H) => drawKeynote(ctx, s, a, W, H, LIGHT),
  "keynote-night": (ctx, s, a, W, H) => drawKeynote(ctx, s, a, W, H, NIGHT),
  newspaper: drawNewspaper,
  "session-light": (ctx, s, a, W, H) => drawSession(ctx, s, a, W, H, LIGHT),
  "session-night": (ctx, s, a, W, H) => drawSession(ctx, s, a, W, H, NIGHT),
  "partner-blue": drawPartnerBlue,
  "partner-white": drawPartnerWhite,
  "event-city": drawEventCity,
  "event-white": drawEventWhite,
};

/**
 * The finished image for one channel. `spec.design` picks the design (the kind's first by default), `spec.adjust` the
 * moved / resized images for this channel. `a` = await loadArtAssets(). The canvas carries `boxes`:
 * [{ key, x, y, w, h }] in canvas pixels, the last drawn on top.
 */
export function renderPost(spec, channel, a = {}) {
  // An uploaded template (spec.template) with a design for this channel; a channel it has no design for uses the
  // kind's first built-in design.
  const layout = spec.template?.channels?.[channel];
  if (layout?.background) {
    const [W, H] = sizeFor(spec.kind, channel);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    c.boxes = [];
    drawUploaded(c.getContext("2d"), { ...spec, background: spec.backgrounds?.[channel] }, a, W, H, layout);
    return c;
  }
  const design = DRAW[spec.design] && designsFor(spec.kind).some((d) => d.key === spec.design) ? spec.design : designsFor(spec.kind)[0].key;
  const [W, H] = sizeFor(spec.kind, channel, design);
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.boxes = [];
  DRAW[design](c.getContext("2d"), spec, a, W, H);
  return c;
}
