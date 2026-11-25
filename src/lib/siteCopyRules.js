/* Website text & media: the plain rules shared by the website (siteCopy.js) and the staff panel
   (admin/cms/SiteCopy.jsx). No DOM here, so it runs in tests.

   A change is one row of the "siteCopy" document (backend services/cmsSchema.js):
     texts: [{ match, page?, text }]        match = the built-in wording, spaces squashed
     media: [{ match, page?, url, alt? }]   match = the built-in file's address (mediaKey)
   `page` empty = everywhere that text or file appears; otherwise only on that address. */

/** Text as it's compared: runs of spaces and line breaks become one space, ends trimmed. */
export const squash = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Worth listing as a piece of copy: has a letter (not just numbers, arrows or bullets). */
export const isCopy = (s) => /\p{L}/u.test(s) && s.length <= 2000;

/** A page's address as rows store it: no trailing slash, query or hash; "/" for the home page. */
export function pageKey(pathname) {
  const p = String(pathname || "/").split(/[?#]/)[0].replace(/\/+$/, "");
  return p || "/";
}

/** A picture or video's address as rows store it: the path for the site's own files, the whole
    address for files elsewhere. Query and hash dropped. */
export function mediaKey(url, origin) {
  const raw = String(url || "").trim();
  if (!raw || /^(data|blob|javascript):/i.test(raw)) return "";
  try {
    const u = new URL(raw, origin || "https://thetechfestival.com");
    return origin && u.origin === origin ? u.pathname : (/^https?:/i.test(raw) ? `${u.origin}${u.pathname}` : u.pathname);
  } catch { return ""; }
}

const ruleKey = (page, match) => `${page || ""}\n${match}`;

/** Rows → lookup tables. Rows without a match or a value are ignored. */
export function indexRules(doc) {
  const texts = new Map();
  const media = new Map();
  for (const r of (doc && doc.texts) || []) {
    const match = squash(r && r.match);
    if (match && r.text) texts.set(ruleKey(r.page, match), String(r.text));
  }
  for (const r of (doc && doc.media) || []) {
    const match = String((r && r.match) || "").trim();
    if (match && /^https:\/\//i.test(String(r.url || ""))) media.set(ruleKey(r.page, match), { url: String(r.url), alt: r.alt ? String(r.alt) : "" });
  }
  return { texts, media, size: texts.size + media.size };
}

/** The change for this text (or file) on this page: the page's own row first, then the everywhere row. */
export function lookup(map, page, match) {
  if (!map || !map.size) return undefined;
  const own = map.get(ruleKey(page, match));
  return own !== undefined ? own : map.get(ruleKey("", match));
}

/** The new text with the original's leading / trailing spaces kept (" · Toronto" stays spaced). */
export function fitSpaces(raw, text) {
  const lead = /^\s*/.exec(raw)[0];
  const trail = /\s*$/.exec(raw.slice(lead.length))[0];
  return lead + text + trail;
}

/** Every url(...) inside a CSS value, as [{ whole, url }]. */
export function cssUrls(value) {
  const out = [];
  const re = /url\(\s*(["']?)(.*?)\1\s*\)/g;
  for (let m = re.exec(String(value || "")); m; m = re.exec(value)) out.push({ whole: m[0], url: m[2] });
  return out;
}

/** 32-bit FNV-1a of a string, as an unsigned number: how the built-in wording list is stored. */
export function hashText(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* ---- The staff panel's side: one list of rows, edited one item at a time ---- */

/** Rows with this item's row set (value given) or removed (value empty / same as built in). */
export function withRow(rows, { match, page = "" }, value) {
  const rest = (rows || []).filter((r) => !(r.match === match && (r.page || "") === (page || "")));
  if (!value) return rest;
  return [...rest, { match, ...(page ? { page } : {}), ...value }];
}

/** The row for an item on a page: { row, scope: "page" | "all" } or null. */
export function rowFor(rows, match, page) {
  const list = rows || [];
  const own = list.find((r) => r.match === match && (r.page || "") === page);
  if (own) return { row: own, scope: "page" };
  const all = list.find((r) => r.match === match && !r.page);
  return all ? { row: all, scope: "all" } : null;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const idOf = (r) => ruleKey(r.page, r.match);

/** What changed between two row lists, as { [id]: row | null } (null = removed). */
export function diffRows(before, after) {
  const a = new Map((before || []).map((r) => [idOf(r), r]));
  const b = new Map((after || []).map((r) => [idOf(r), r]));
  const out = {};
  for (const [id, r] of b) if (!a.has(id) || !same(a.get(id), r)) out[id] = r;
  for (const id of a.keys()) if (!b.has(id)) out[id] = null;
  return out;
}

/** Someone else's newer list with my changes put on top (so two people editing don't undo each other). */
export function applyDiff(rows, diff) {
  const map = new Map((rows || []).map((r) => [idOf(r), r]));
  for (const [id, r] of Object.entries(diff || {})) { if (r) map.set(id, r); else map.delete(id); }
  return [...map.values()];
}

/** Rows as the server keeps them (no Sanity bookkeeping), for comparing and sending. */
export const plainRows = (rows, kind) => (rows || []).map((r) => (kind === "media"
  ? { match: r.match, ...(r.page ? { page: r.page } : {}), url: r.url, ...(r.alt ? { alt: r.alt } : {}) }
  : { match: r.match, ...(r.page ? { page: r.page } : {}), text: r.text }));
