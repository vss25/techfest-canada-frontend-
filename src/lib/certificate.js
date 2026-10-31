/* =========================================================
   A Catalyst Awards winner's certificate (Oct 31 2026), drawn on a
   canvas in the browser so what they see is exactly what they
   download (JPG, or a one-page A4 PDF holding that JPG) and what
   goes to LinkedIn. 2000 × 1414 px, the A4 landscape ratio.
   No libraries: the PDF is written by hand (jpegToPdf). Fonts are
   the site's own (Orbitron, Montserrat, from src/main.jsx).
========================================================= */

import { EVENT, VENUE, certificateRef, longDate } from "./awardWinners";

export const CERT_W = 2000;
export const CERT_H = 1414;
const LOGO = "/Tech_Festival_Canada_Logo_Dark_Transparent.png"; // white words, for dark backgrounds

const PURPLE = "#7a3fd1";
const PINK = "#e8458b";
const AMBER = "#f5a623";
const LILAC = "#cdb8ff";

let logoPromise = null;
function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => { logoPromise = null; ok(null); };
      img.src = LOGO;
    });
  }
  return logoPromise;
}

async function loadFonts() {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  await Promise.all([
    "900 92px Orbitron", "800 30px Orbitron", "700 56px Montserrat", "600 40px Montserrat", "500 30px Montserrat",
  ].map((f) => document.fonts.load(f).catch(() => null)));
}

/** Text with letter spacing, drawn a character at a time (canvas letterSpacing isn't everywhere yet). */
function spaced(ctx, text, x, y, spacing, align = "center") {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(chars.length - 1, 0);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
  ctx.textAlign = prev;
  return total;
}

/** Words into lines no wider than max (a word longer than a line gets its own line). */
function wrap(ctx, text, max) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(next).width > max) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The largest size from `sizes` at which the text fits in `maxLines` lines of `max` width. */
function fit(ctx, text, font, sizes, max, maxLines) {
  for (const size of sizes) {
    ctx.font = font(size);
    const lines = wrap(ctx, text, max);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= max)) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  ctx.font = font(size);
  const lines = wrap(ctx, text, max);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > max) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
  }
  return { size, lines };
}

function hexagon(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

/** Draws the certificate for a winner (the public winner object) on the canvas, at 2000 × 1414. */
export async function drawCertificate(canvas, w) {
  await loadFonts();
  const logo = await loadLogo();
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext("2d");
  const W = CERT_W, H = CERT_H, cx = W / 2;
  ctx.textBaseline = "alphabetic";

  // Ground: night purple, a violet glow top left and an amber one bottom right.
  ctx.fillStyle = "#0a0516";
  ctx.fillRect(0, 0, W, H);
  let g = ctx.createRadialGradient(260, 160, 40, 260, 160, 1100);
  g.addColorStop(0, "rgba(122,63,209,0.42)");
  g.addColorStop(1, "rgba(122,63,209,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W - 220, H - 160, 40, W - 220, H - 160, 900);
  g.addColorStop(0, "rgba(245,166,35,0.20)");
  g.addColorStop(1, "rgba(245,166,35,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // The site's faint grid, and the logo's hexagon as a watermark.
  ctx.strokeStyle = "rgba(185,158,255,0.035)";
  ctx.lineWidth = 1;
  for (let x = 80; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
  for (let y = 80; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
  ctx.lineWidth = 46;
  ctx.strokeStyle = "rgba(185,158,255,0.055)";
  hexagon(ctx, W - 250, H / 2 + 40, 360);
  ctx.stroke();
  ctx.lineWidth = 30;
  ctx.strokeStyle = "rgba(245,166,35,0.04)";
  hexagon(ctx, 230, H - 300, 230);
  ctx.stroke();

  // Frame: the TTFC colour bar on top, a thin gradient border and amber corners.
  const m = 56;
  const bar = [[0.4, PURPLE], [0.35, PINK], [0.25, AMBER]];
  let bx = m;
  for (const [share, colour] of bar) { ctx.fillStyle = colour; ctx.fillRect(bx, m, (W - 2 * m) * share, 10); bx += (W - 2 * m) * share; }
  g = ctx.createLinearGradient(m, 0, W - m, 0);
  g.addColorStop(0, PURPLE); g.addColorStop(0.55, PINK); g.addColorStop(1, AMBER);
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.strokeRect(m + 1, m + 1, W - 2 * m - 2, H - 2 * m - 2);
  const inset = 76;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 0.5, inset + 10.5, W - 2 * inset - 1, H - 2 * inset - 11);
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 4;
  const c = 44;
  for (const [x, y, dx, dy] of [[inset, inset + 10, 1, 1], [W - inset, inset + 10, -1, 1], [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + dy * c); ctx.lineTo(x, y); ctx.lineTo(x + dx * c, y); ctx.stroke();
  }

  // Top: the TTFC logo (cropped to its artwork) and the programme's name.
  if (logo) {
    const sx = logo.naturalWidth * 0.16, sy = logo.naturalHeight * 0.18, sw = logo.naturalWidth * 0.68, sh = logo.naturalHeight * 0.64;
    const dw = 380, dh = (dw * sh) / sw;
    ctx.drawImage(logo, sx, sy, sw, sh, 128, 118, dw, dh);
  }
  ctx.fillStyle = AMBER;
  ctx.font = "800 30px Orbitron, sans-serif";
  spaced(ctx, "THE CATALYST AWARDS", W - 132, 196, 8, "right");
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "600 22px Montserrat, sans-serif";
  spaced(ctx, "TORONTO · 2026", W - 132, 238, 5, "right");

  // The middle, measured first so the block sits centred between the top and the facts row.
  const titleFit = fit(ctx, w.award, (s) => `700 ${s}px Montserrat, sans-serif`, [58, 54, 50, 46, 42], 1480, 3);
  const nameFit = fit(ctx, w.presentedTo, (s) => `900 ${s}px Orbitron, sans-serif`, [96, 88, 80, 72, 64, 56, 50], 1560, 2);
  ctx.font = "500 30px Montserrat, sans-serif";
  const citeLines = w.citation ? fit(ctx, `“${w.citation}”`, (s) => `500 ${s}px Montserrat, sans-serif`, [30, 28, 26], 1360, 2).lines : [];
  const titleLH = titleFit.size * 1.24, nameLH = nameFit.size * 1.12;
  const parts = [
    46,                                   // WINNER
    40,                                   // rule
    titleFit.lines.length * titleLH,
    70,                                   // PRESENTED TO
    nameFit.lines.length * nameLH,
    w.showCompany ? 62 : 0,
    citeLines.length ? 30 + citeLines.length * 40 : 0,
  ];
  const top = 330, bottom = 1100;
  let y = top + Math.max(0, (bottom - top - parts.reduce((a, b) => a + b, 0)) / 2) + 40;

  g = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
  g.addColorStop(0, AMBER); g.addColorStop(1, PINK);
  ctx.fillStyle = g;
  ctx.font = "900 46px Orbitron, sans-serif";
  spaced(ctx, "WINNER", cx, y, 18);
  y += 34;
  g = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
  g.addColorStop(0, "rgba(245,166,35,0)"); g.addColorStop(0.5, AMBER); g.addColorStop(1, "rgba(245,166,35,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - 90, y, 180, 3);
  y += 40 + titleFit.size * 0.92;

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${titleFit.size}px Montserrat, sans-serif`;
  titleFit.lines.forEach((l, i) => ctx.fillText(l, cx, y + i * titleLH));
  y += (titleFit.lines.length - 1) * titleLH + 78;

  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "600 22px Montserrat, sans-serif";
  spaced(ctx, "PRESENTED TO", cx, y, 6);
  y += 20 + nameFit.size * 0.95;

  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${nameFit.size}px Orbitron, sans-serif`;
  nameFit.lines.forEach((l, i) => ctx.fillText(l, cx, y + i * nameLH));
  y += (nameFit.lines.length - 1) * nameLH;

  if (w.showCompany) {
    y += 62;
    ctx.fillStyle = LILAC;
    ctx.font = "600 40px Montserrat, sans-serif";
    ctx.fillText(fit(ctx, w.company, (s) => `600 ${s}px Montserrat, sans-serif`, [40, 36, 32], 1500, 1).lines[0], cx, y);
  }
  if (citeLines.length) {
    y += 64;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "500 28px Montserrat, sans-serif";
    citeLines.forEach((l, i) => ctx.fillText(l, cx, y + i * 40));
  }

  // The facts: when, where, at what.
  const facts = [["PRESENTED ON", longDate(w.presentedOn)], ["AT", EVENT], ["VENUE", VENUE]];
  const cols = [430, 1000, 1570];
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(715, 1150, 1, 96);
  ctx.fillRect(1285, 1150, 1, 96);
  facts.forEach(([label, value], i) => {
    ctx.fillStyle = AMBER;
    ctx.font = "700 18px Montserrat, sans-serif";
    spaced(ctx, label, cols[i], 1182, 5);
    ctx.fillStyle = "#ffffff";
    const f = fit(ctx, value, (s) => `600 ${s}px Montserrat, sans-serif`, [30, 28, 26, 24], 520, 1);
    ctx.font = `600 ${f.size}px Montserrat, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(f.lines[0], cols[i], 1228);
  });

  // Footer.
  ctx.font = "500 20px Montserrat, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.textAlign = "left";
  ctx.fillText("thetechfestival.com/awards", 132, H - 104);
  ctx.textAlign = "right";
  ctx.fillText(`Ref. ${certificateRef(w)}`, W - 132, H - 104);
  ctx.textAlign = "left";
  return canvas;
}

export const canvasBlob = (canvas, type = "image/jpeg", quality = 0.93) =>
  new Promise((ok, bad) => canvas.toBlob((b) => (b ? ok(b) : bad(new Error("Couldn't make the image"))), type, quality));

/** A UTF-16BE PDF text string (<FEFF…>), so any name reads right in the document's properties. */
function pdfText(s) {
  let hex = "FEFF";
  for (const ch of String(s || "")) {
    const cp = ch.codePointAt(0);
    const units = cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp];
    for (const u of units) hex += u.toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
}

/**
 * A one-page A4 landscape PDF showing the JPEG edge to edge. jpeg: Uint8Array; width/height: its pixels.
 * Returns a Blob (application/pdf).
 */
export function jpegToPdf(jpeg, { width, height, title = "", subject = "" } = {}) {
  const PW = 841.89, PH = 595.28;
  const s = Math.max(PW / width, PH / height); // fill the page (the ratios match to a fraction of a point)
  const dw = width * s, dh = height * s, dx = (PW - dw) / 2, dy = (PH - dh) / 2;
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let len = 0;
  const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const f = (n) => (Math.round(n * 100) / 100).toString();
  const obj = (n, ...body) => { offsets[n] = len; push(`${n} 0 obj\n`); body.forEach(push); push("\nendobj\n"); };

  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(PW)} ${f(PH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream");
  const content = `0.039 0.02 0.086 rg 0 0 ${f(PW)} ${f(PH)} re f\nq ${f(dw)} 0 0 ${f(dh)} ${f(dx)} ${f(dy)} cm /Im0 Do Q\n`;
  obj(5, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
  const d = new Date();
  const stamp = `D:${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
  obj(6, `<< /Title ${pdfText(title)} /Subject ${pdfText(subject)} /Author ${pdfText("The Tech Festival Canada")} /Creator ${pdfText("thetechfestival.com")} /CreationDate (${stamp}) >>`);
  const xref = len;
  let table = "xref\n0 7\n0000000000 65535 f \n";
  for (let n = 1; n <= 6; n++) table += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}
