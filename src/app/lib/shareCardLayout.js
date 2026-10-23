/* =========================================================
   The rules behind the post share card (lib/shareCard.js):
   which words are highlighted, how big the text is, how many
   lines fit, and where the photos go. Pure (no DOM). The iOS
   ShareCardLayout.swift and Android ShareCardLayout.kt use the
   same numbers, so a post shared from any of the three looks
   the same.
========================================================= */

/** Instagram's 4:5 portrait, in pixels. */
export const WIDTH = 1080;
export const HEIGHT = 1350;
/** The post panel inside the card (the TTFC footer sits below it). */
export const PANEL = { x: 48, y: 48, w: 984, h: 1084 };
export const PADDING = 48;
export const AVATAR = 104;
/** Where the post text starts (below the author row). */
export const TEXT_TOP = 240;
export const GRID_GAP = 10;
export const CONTENT_BOTTOM = PANEL.y + PANEL.h - PADDING;
export const CONTENT_WIDTH = PANEL.w - PADDING * 2;
export const FOOTER_LINE = "The Tech Festival Canada · Oct 26–27, 2026 · Toronto";
export const FOOTER_URL = "thetechfestival.com";

/** Smaller with photos, larger for a short text-only post (like the feed card). */
export function textStyle(bodyLength, hasMedia) {
  if (hasMedia) return { size: 38, lineHeight: 52, maxLines: 6 };
  if (bodyLength < 120) return { size: 56, lineHeight: 74, maxLines: 9 };
  return { size: 42, lineHeight: 58, maxLines: 12 };
}

/** Line breaks kept (at most one blank line in a row), ends trimmed. */
export function normalize(body) {
  let t = String(body || "").replace(/\r\n?/g, "\n").trim();
  while (t.includes("\n\n\n")) t = t.replace(/\n\n\n/g, "\n\n");
  return t;
}

/** "#ArtificialIntelligence #Networking" from the post's topic tags. */
export function hashtags(topics = []) {
  return topics.map((t) => "#" + t.replace(/ /g, "").replace(/&/g, "")).join(" ");
}

const WORD = /[\p{L}\p{N}_]/u;

/**
 * Plain and highlighted runs: "@Full Name" for each tagged person (longest
 * name first), any other "@word", and "#tags". An "@" or "#" inside a word
 * (emails, "C#") stays plain.
 */
export function runs(text, mentions = []) {
  const chars = Array.from(text);
  const names = [...new Set(mentions.filter(Boolean))]
    .sort((a, b) => Array.from(b).length - Array.from(a).length || (a < b ? -1 : a > b ? 1 : 0))
    .map((n) => Array.from(n));
  const out = [];
  const push = (s, h) => {
    if (!s) return;
    const last = out[out.length - 1];
    if (last && last.highlight === h) last.text += s; else out.push({ text: s, highlight: h });
  };
  const isWord = (c) => c !== undefined && WORD.test(c);
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if ((c === "@" || c === "#") && (i === 0 || !isWord(chars[i - 1]))) {
      if (c === "@") {
        const name = names.find((n) => n.every((ch, k) => chars[i + 1 + k] === ch) && !isWord(chars[i + 1 + n.length]));
        if (name) { push("@" + name.join(""), true); i += 1 + name.length; continue; }
      }
      let end = i + 1;
      while (end < chars.length && isWord(chars[end])) end++;
      if (end > i + 1) { push(chars.slice(i, end).join(""), true); i = end; continue; }
    }
    push(c, false); i++;
  }
  return out;
}

/**
 * Where each photo goes inside `rect`: one fills it; two sit side by side;
 * three or more are one large on the left and two stacked on the right (the
 * last shows "+N" for the rest).
 */
export function tiles(count, rect) {
  const g = GRID_GAP;
  if (count < 1) return [];
  if (count === 1) return [rect];
  if (count === 2) {
    const w = Math.floor((rect.w - g) / 2);
    return [{ x: rect.x, y: rect.y, w, h: rect.h }, { x: rect.x + rect.w - w, y: rect.y, w, h: rect.h }];
  }
  const left = Math.round((rect.w - g) * 0.58);
  const right = rect.w - g - left;
  const h = Math.floor((rect.h - g) / 2);
  return [
    { x: rect.x, y: rect.y, w: left, h: rect.h },
    { x: rect.x + rect.w - right, y: rect.y, w: right, h },
    { x: rect.x + rect.w - right, y: rect.y + rect.h - h, w: right, h },
  ];
}

/** The card shows the post's first three pictures; the third says "+N" for the rest. */
export const MAX_TILES = 3;

/** How many photos didn't fit in the grid ("+2" on the last tile). */
export function overflow(count) { return Math.max(0, count - MAX_TILES); }
