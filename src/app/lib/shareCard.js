import * as L from "./shareCardLayout.js";
import { caption, copiedNote, orderedItems, PLATFORM_LABEL, shareUrl } from "./share.js";
import { fileURL } from "./config.js";
import { initialsOf, showAlert } from "./ui.js";

/* =========================================================
   Share a feed post as a branded card image (iOS
   ShareCard.swift / PostShareService.swift, Android
   ShareCard.kt / PostShare.kt): 1080 × 1350 (Instagram 4:5)
   with the author, the text with its line breaks and
   highlighted #tags / @names, the photos and a TTFC footer.
   Then navigator.share({ files: [card, ...photos], text })
   where the browser can share files; otherwise the card is
   downloaded, the caption copied and the app's web composer
   opened. Pictures are fetched as blobs (CORS) and drawn from
   those, so the canvas is never tainted.
========================================================= */

const INK = {
  background: "#0e0828", surface: "#1c1238", elevated: "#2a1c52", border: "rgba(215,168,240,0.22)",
  purple: "#8b52e0", purpleCore: "#7a3fd1", accent: "#b99eff", secondary: "rgba(219,206,255,0.72)",
};
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const font = (size, weight = 400) => `${weight} ${size}px ${FONT}`;
const MARK_URL = "/app/brand/share-mark.png";

// ---------- Loading pictures (CORS-safe) ----------

async function fetchBlob(url, ms = 15000) {
  if (!url) return null;
  for (const cache of ["default", "reload"]) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { mode: "cors", credentials: "omit", cache, signal: ctl.signal });
      if (r.ok) { const b = await r.blob(); if (b.size) return b; }
    } catch { /* CORS or network: try once more without the cache, then give up */ }
    finally { clearTimeout(t); }
  }
  return null;
}

/** A drawable picture from a blob (same-origin object URL as a fallback). */
async function pictureOf(blob) {
  if (!blob) return null;
  try { return await createImageBitmap(blob); } catch { /* older Safari / HEIC: try an <img> */ }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 0); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

/** First frame of a video blob (object URLs are same-origin, so no taint). */
function videoFrame(blob, ms = 6000) {
  if (!blob) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    let done = false;
    const finish = (pic) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(pic); };
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch { finish(null); } };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      try { c.getContext("2d").drawImage(v, 0, 0); finish(c); } catch { finish(null); }
    };
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), ms);
    v.src = url;
  });
}

/** The video's poster: the server's, else Cloudinary's first frame (.jpg). */
export function posterURL(m) {
  if (m.posterUrl) return fileURL(m.posterUrl);
  if (!/res\.cloudinary\.com/.test(m.url) || !m.url.includes("/video/upload/")) return "";
  return m.url.replace(/\.[a-z0-9]+(\?|$)/i, ".jpg$1");
}

const extFor = (type) => (type === "image/png" ? "png" : "jpg");

/** JPEG and PNG are shared as they are; anything else (WebP, HEIC, GIF) becomes a JPEG, which every app takes. */
async function photoFile(blob, pic, n) {
  if (blob.type === "image/jpeg" || blob.type === "image/png") return new File([blob], `TTFC-photo-${n}.${extFor(blob.type)}`, { type: blob.type });
  if (!pic) return null;
  const c = document.createElement("canvas");
  c.width = pic.width; c.height = pic.height;
  c.getContext("2d").drawImage(pic, 0, 0);
  const jpeg = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
  return jpeg ? new File([jpeg], `TTFC-photo-${n}.jpg`, { type: "image/jpeg" }) : null;
}

// ---------- Drawing ----------

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws `pic` to fill the box (cropped to the middle), clipped to the current path. */
function cover(ctx, pic, x, y, w, h) {
  const pw = pic.width, ph = pic.height;
  const s = Math.max(w / pw, h / ph);
  const sw = w / s, sh = h / s;
  ctx.drawImage(pic, (pw - sw) / 2, (ph - sh) / 2, sw, sh, x, y, w, h);
}

function ellipsize(ctx, text, width) {
  if (ctx.measureText(text).width <= width) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(chars.join("") + "…").width > width) chars.pop();
  return chars.join("").trimEnd() + "…";
}

/**
 * Wraps highlighted runs into at most `maxLines` lines of `width`, keeping
 * line breaks; the last line ends with "…" when text is cut.
 */
function wrapRuns(ctx, runList, width, maxLines, size) {
  const fontOf = (h) => font(size, h ? 600 : 400);
  const lines = [[]];
  const widthOf = (line) => line.reduce((a, s) => a + s.w, 0);
  const add = (text, h) => {
    ctx.font = fontOf(h);
    const line = lines[lines.length - 1];
    const w = ctx.measureText(text).width;
    if (/^ +$/.test(text)) { if (line.length) line.push({ text, h, w }); return; }
    if (line.length && widthOf(line) + w > width) {
      while (line.length && /^ +$/.test(line[line.length - 1].text)) line.pop();
      lines.push([]);
    }
    const cur = lines[lines.length - 1];
    if (w <= width || cur.length) { cur.push({ text, h, w }); return; }
    // One word wider than the line: break it by characters.
    let piece = "";
    for (const ch of Array.from(text)) {
      if (ctx.measureText(piece + ch).width > width && piece) {
        lines[lines.length - 1].push({ text: piece, h, w: ctx.measureText(piece).width });
        lines.push([]); piece = "";
      }
      piece += ch;
    }
    if (piece) lines[lines.length - 1].push({ text: piece, h, w: ctx.measureText(piece).width });
  };
  for (const r of runList) {
    for (const tok of r.text.split(/(\n| +)/)) {
      if (!tok) continue;
      if (tok === "\n") lines.push([]); else add(tok, r.highlight);
    }
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1];
    ctx.font = fontOf(false);
    const ell = ctx.measureText("…").width;
    while (last.length && widthOf(last) + ell > width) {
      const seg = last[last.length - 1];
      ctx.font = fontOf(seg.h);
      const chars = Array.from(seg.text);
      chars.pop();
      if (!chars.length) last.pop(); else { seg.text = chars.join(""); seg.w = ctx.measureText(seg.text).width; }
    }
    while (last.length && /^ +$/.test(last[last.length - 1].text)) last.pop();
    last.push({ text: "…", h: false, w: ell });
    return kept;
  }
  return lines;
}

function drawLines(ctx, lines, x, top, size, lineHeight) {
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => {
    let cx = x;
    const cy = top + i * lineHeight + lineHeight / 2;
    for (const s of line) {
      ctx.font = font(size, s.h ? 600 : 400);
      ctx.fillStyle = s.h ? INK.accent : "#ffffff";
      ctx.fillText(s.text, cx, cy);
      cx += s.w;
    }
  });
}

/**
 * The card as a canvas. `content`: { authorName, subtitle, avatar, official,
 * body, mentions, topics, tiles: [{ pic, isVideo }] }, pictures already loaded.
 */
export function drawShareCard(content, mark) {
  const c = document.createElement("canvas");
  c.width = L.WIDTH; c.height = L.HEIGHT;
  const ctx = c.getContext("2d");
  const W = L.WIDTH, H = L.HEIGHT;

  // Background: ink with two soft purple glows.
  ctx.fillStyle = INK.background; ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, color] of [[980, 40, 820, "rgba(139,82,224,0.45)"], [80, 1300, 760, "rgba(122,63,209,0.30)"]]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // Panel.
  const P = L.PANEL;
  rounded(ctx, P.x, P.y, P.w, P.h, 44); ctx.fillStyle = INK.surface; ctx.fill();
  rounded(ctx, P.x + 1, P.y + 1, P.w - 2, P.h - 2, 43); ctx.strokeStyle = INK.border; ctx.lineWidth = 2; ctx.stroke();

  const left = P.x + L.PADDING, top = P.y + L.PADDING, width = L.CONTENT_WIDTH;

  // Author row.
  const r = L.AVATAR / 2, acx = left + r, acy = top + r;
  ctx.save();
  ctx.beginPath(); ctx.arc(acx, acy, r, 0, Math.PI * 2); ctx.clip();
  if (content.official) {
    ctx.fillStyle = INK.elevated; ctx.fillRect(left, top, L.AVATAR, L.AVATAR);
    if (mark) { const mh = 64, mw = mh * mark.width / mark.height; ctx.drawImage(mark, acx - mw / 2, acy - mh / 2, mw, mh); }
  } else if (content.avatar) {
    cover(ctx, content.avatar, left, top, L.AVATAR, L.AVATAR);
  } else {
    const g = ctx.createLinearGradient(left, top, left + L.AVATAR, top + L.AVATAR);
    g.addColorStop(0, INK.purpleCore); g.addColorStop(1, INK.purple);
    ctx.fillStyle = g; ctx.fillRect(left, top, L.AVATAR, L.AVATAR);
    ctx.fillStyle = "#ffffff"; ctx.font = font(40, 600); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(content.authorName), acx, acy + 1);
    ctx.textAlign = "left";
  }
  ctx.restore();
  const nameX = left + L.AVATAR + 24, nameW = P.x + P.w - L.PADDING - nameX;
  const hasSub = !!content.subtitle;
  const nameCY = hasSub ? acy - 24 : acy;
  ctx.textBaseline = "middle";
  ctx.font = font(40, 600); ctx.fillStyle = "#ffffff";
  ctx.fillText(ellipsize(ctx, content.authorName, nameW), nameX, nameCY);
  if (hasSub) {
    ctx.font = font(30); ctx.fillStyle = INK.secondary;
    ctx.fillText(ellipsize(ctx, content.subtitle, nameW), nameX, acy + 27);
  }

  // Text with highlighted #tags / @names, then the topic hashtags.
  const text = L.normalize(content.body);
  const hasMedia = content.tiles.length > 0;
  const st = L.textStyle(Array.from(text).length, hasMedia);
  const lines = text ? wrapRuns(ctx, L.runs(text, content.mentions || []), width, st.maxLines, st.size) : [];
  const tagText = L.hashtags(content.topics || []);
  const bodyH = lines.length * st.lineHeight;
  const tagsH = tagText ? 40 : 0;
  const blockH = bodyH + (bodyH && tagsH ? 18 : 0) + tagsH;
  let y = hasMedia ? L.TEXT_TOP : L.TEXT_TOP + Math.max(0, (L.CONTENT_BOTTOM - L.TEXT_TOP - blockH) / 2);
  if (lines.length) { drawLines(ctx, lines, left, y, st.size, st.lineHeight); y += bodyH; }
  if (tagText) {
    if (bodyH) y += 18;
    ctx.font = font(32, 600); ctx.fillStyle = INK.accent; ctx.textBaseline = "middle";
    ctx.fillText(ellipsize(ctx, tagText, width), left, y + tagsH / 2);
    y += tagsH;
  }

  // Photos: one, two side by side, or one large + two stacked (+N).
  if (hasMedia) {
    const mediaTop = blockH ? y + 32 : L.TEXT_TOP;
    const rects = L.tiles(content.tiles.length, { x: left, y: mediaTop, w: width, h: L.CONTENT_BOTTOM - mediaTop });
    const extra = L.overflow(content.tiles.length);
    rects.forEach((b, i) => {
      const t = content.tiles[i];
      ctx.save();
      rounded(ctx, b.x, b.y, b.w, b.h, 28); ctx.clip();
      ctx.fillStyle = INK.elevated; ctx.fillRect(b.x, b.y, b.w, b.h);
      if (t.pic) cover(ctx, t.pic, b.x, b.y, b.w, b.h);
      const mx = b.x + b.w / 2, my = b.y + b.h / 2;
      if (t.isVideo) {
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.arc(mx, my, 60, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(mx - 16, my - 26); ctx.lineTo(mx + 28, my); ctx.lineTo(mx - 16, my + 26); ctx.closePath(); ctx.fill();
      }
      if (i === rects.length - 1 && extra > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "#ffffff"; ctx.font = font(64, 600); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`+${extra}`, mx, my); ctx.textAlign = "left";
      }
      ctx.restore();
    });
  }

  // Footer: logo mark, the festival line and the website.
  const fTop = P.y + P.h, fMid = fTop + (H - fTop) / 2;
  const mh = 112, mw = mark ? mh * mark.width / mark.height : 86, mx = P.x + 12;
  if (mark) ctx.drawImage(mark, mx, fMid - mh / 2, mw, mh);
  const tx = mx + mw + 28, avail = P.x + P.w - tx;
  let fs = 30;
  ctx.font = font(fs, 600);
  while (ctx.measureText(L.FOOTER_LINE).width > avail && fs > 18) { fs -= 1; ctx.font = font(fs, 600); }
  ctx.textBaseline = "middle"; ctx.fillStyle = "#ffffff";
  ctx.fillText(L.FOOTER_LINE, tx, fMid - 22);
  ctx.font = font(30, 600); ctx.fillStyle = INK.accent;
  ctx.fillText(L.FOOTER_URL, tx, fMid + 22);
  return c;
}

// ---------- Preparing and sharing ----------

/** A post as the share flow sees it (author fields as on the feed card). */
export function shareSourceOf(post, subtitle) {
  const media = post.media?.length ? post.media : post.imageUrl ? [{ type: "image", url: post.imageUrl }] : [];
  return {
    authorName: post.authorName || "", subtitle: subtitle || "", avatarUrl: post.authorAvatarUrl || "",
    official: post.kind === "announcement", body: post.body || "", mentions: (post.mentions || []).map((m) => m.name),
    topics: post.topicTags || [], link: post.linkUrl || "", media,
  };
}

/** Renders the card and gathers the photo / video files. */
export async function prepareShare(source) {
  const [markBlob, avatarBlob] = await Promise.all([fetchBlob(MARK_URL), source.official ? null : fetchBlob(fileURL(source.avatarUrl))]);
  const [mark, avatar] = await Promise.all([pictureOf(markBlob), pictureOf(avatarBlob)]);
  const loaded = await Promise.all(source.media.map(async (m, i) => {
    const n = i + 1;
    if (m.type === "video") {
      const blob = await fetchBlob(fileURL(m.url), 30000);
      const poster = await pictureOf(await fetchBlob(posterURL(m)));
      const pic = poster || (await videoFrame(blob));
      return { isVideo: true, pic, file: blob ? new File([blob], `TTFC-video-${n}.mp4`, { type: blob.type || "video/mp4" }) : null };
    }
    const blob = await fetchBlob(fileURL(m.url));
    const pic = await pictureOf(blob);
    return { isVideo: false, pic, file: blob ? await photoFile(blob, pic, n) : null };
  }));
  const canvas = drawShareCard({ ...source, avatar, tiles: loaded.map((l) => ({ pic: l.pic, isVideo: l.isVideo })) }, mark);
  const png = await new Promise((r) => canvas.toBlob(r, "image/png"));
  if (!png) throw new Error("card");
  return {
    source,
    card: new File([png], "TTFC-post-card.png", { type: "image/png" }),
    photos: loaded.filter((l) => !l.isVideo && l.file).map((l) => l.file),
    videos: loaded.filter((l) => l.isVideo && l.file).map((l) => l.file),
  };
}

function copy(text) {
  try { navigator.clipboard?.writeText(text)?.catch?.(() => {}); } catch { /* no clipboard */ }
}

function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Shares a prepared post to `platform` ("instagram" | "whatsapp" |
 * "linkedin" | "x" | null for More…). Call it straight from the tap (no
 * await before it), as browsers only open the share sheet from a gesture.
 * If the gesture has expired, a toast offers a Share button (a fresh tap).
 * Returns "shared" (share sheet) or "fallback" (card downloaded).
 */
export function sharePrepared(prepared, platform) {
  const { source } = prepared;
  const text = caption(source.authorName, source.body, source.link, platform);
  copy(text);
  const files = orderedItems(platform, prepared.card, prepared.photos, prepared.videos, null).filter(Boolean);
  const canFiles = (list) => { try { return !!navigator.canShare?.({ files: list }); } catch { return false; } };
  // Some browsers refuse a mix (video + photos) or many files: fall back to fewer, card first.
  const pick = [files, files.filter((f) => f.type.startsWith("image/")), [prepared.card]].find(canFiles);
  if (navigator.share && pick) {
    const data = platform === "instagram" ? { files: pick } : { files: pick, text };
    let p;
    try { p = navigator.share(data); } catch (e) { p = Promise.reject(e); }
    p.catch((e) => {
      if (e?.name === "NotAllowedError") {
        showAlert("Your post card is ready", "Tap Share to open the share sheet.", { action: { label: "Share", run: () => sharePrepared(prepared, platform) }, ms: 10000 });
      }
    });
    showAlert(copiedNote(platform));
    return "shared";
  }
  // No file sharing here (e.g. a desktop browser): save the card, copy the caption, open the app's composer.
  download(prepared.card);
  const url = platform && shareUrl(platform, text);
  if (url) window.open(url, "_blank", "noopener");
  showAlert("Card saved and caption copied",
    platform === "instagram" ? "Post the card from Instagram, then paste the caption."
      : url ? `Add the card to your ${PLATFORM_LABEL[platform]} post.` : "Attach the card wherever you share it.");
  return "fallback";
}
