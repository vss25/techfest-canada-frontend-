/* =========================================================
   Catalyst Awards jury portal: pure helpers (no React, no
   network), shared by the portal (src/jury) and the admin
   pages (src/admin/awards). Tested with
   node --test src/jury/juryLib.test.mjs
   The scoring maths mirrors the backend (services/jury.js
   weightedTotal): 0–100, 1 = 0, 3 = 50, 5 = 100, weighted
   over the criteria scored.
========================================================= */

export const SCORE_VALUES = [1, 2, 3, 4, 5];
/** Class names, falsy ones left out. */
export const cx = (...a) => a.filter(Boolean).join(" ");
export const TORONTO = "America/Toronto";

/** Weighted total on 0–100 (one decimal) over the criteria that have a score; null when none. */
export function totalOf(scores = {}, criteria = []) {
  let w = 0;
  let sum = 0;
  for (const c of criteria) {
    const v = Number(scores?.[c.key]);
    if (!Number.isInteger(v) || v < 1 || v > 5) continue;
    const weight = Number(c.weight) || 0;
    w += weight;
    sum += weight * ((v - 1) / 4);
  }
  return w > 0 ? Math.round((sum / w) * 1000) / 10 : null;
}

/** "72" / "72.5" / "—". */
export const fmtTotal = (t) => (t === null || t === undefined ? "—" : String(Math.round(t * 10) / 10));

/** How many of the criteria have a score. */
export const scoredCount = (scores = {}, criteria = []) => criteria.filter((c) => Number.isInteger(Number(scores?.[c.key])) && scores[c.key] >= 1).length;

/** What a score means: the anchor for 1, 3 or 5, else "Between …". */
export function anchorFor(criterion, value) {
  const a = criterion?.anchors || {};
  if (value === 1 || value === 3 || value === 5) return a[value] || a[String(value)] || "";
  if (value === 2) return a[1] && a[3] ? `Between "${trimDot(a[1])}" and "${trimDot(a[3])}".` : "";
  if (value === 4) return a[3] && a[5] ? `Between "${trimDot(a[3])}" and "${trimDot(a[5])}".` : "";
  return "";
}
const trimDot = (s) => String(s || "").replace(/[.\s]+$/, "");

export const STATES = Object.freeze({
  not_started: { label: "Not started", tone: "idle" },
  draft: { label: "Draft", tone: "draft" },
  editing: { label: "Editing", tone: "edit" },
  submitted: { label: "Submitted", tone: "done" },
  conflict: { label: "Conflict", tone: "conflict" },
});
export const stateInfo = (s) => STATES[s] || STATES.not_started;
export const isDoneState = (s) => s === "submitted" || s === "editing";

/** Rows → [{ key, label, rows }] in the order they came (the server sorts them). */
export function groupByCategory(rows = []) {
  const out = [];
  const at = new Map();
  for (const r of rows) {
    const key = r.categoryKey || r.categoryLabel || r.category || "";
    if (!at.has(key)) {
      at.set(key, out.length);
      out.push({ key, label: r.categoryLabel || r.category || "Other", short: r.category || "", rows: [] });
    }
    out[at.get(key)].rows.push(r);
  }
  return out;
}

/** "8 of 12 submitted · 2 drafts · 1 being edited". */
export function progressLine(p = {}) {
  const parts = [`${p.submitted || 0} of ${p.assigned || 0} submitted`];
  if (p.drafts) parts.push(`${p.drafts} ${p.drafts === 1 ? "draft" : "drafts"}`);
  if (p.editing) parts.push(`${p.editing} being edited`);
  return parts.join(" · ");
}

/** Matches a nominee row against a search ("" matches everything). */
export function matchesSearch(row, q) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return true;
  return [row.nomineeName, row.nomineeOrganisation, row.category, row.categoryLabel, row.nomineeType]
    .some((v) => String(v || "").toLowerCase().includes(needle));
}

/* ---------- text with links ---------- */

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/** Text → [{ type: "text", value } | { type: "link", value, href }]; trailing punctuation stays text. http(s) only. */
export function linkParts(text) {
  const s = String(text ?? "");
  const out = [];
  let last = 0;
  for (const m of s.matchAll(URL_RE)) {
    let url = m[0];
    let tail = "";
    while (/[.,;:!?)\]]$/.test(url)) {
      // Keep a closing bracket that belongs to the URL ("…/Foo_(bar)").
      if (url.endsWith(")") && (url.match(/\(/g) || []).length >= (url.match(/\)/g) || []).length) break;
      tail = url.slice(-1) + tail;
      url = url.slice(0, -1);
    }
    if (m.index > last) out.push({ type: "text", value: s.slice(last, m.index) });
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    out.push({ type: "link", value: url, href });
    if (tail) out.push({ type: "text", value: tail });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: "text", value: s.slice(last) });
  return out.length ? out : [{ type: "text", value: "" }];
}

/** Text → paragraphs (blank lines), each a list of lines. */
export function paragraphs(text) {
  return String(text ?? "").replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => p.split("\n"));
}

/** A website / LinkedIn for display: "example.com/path" (no scheme, no trailing slash). */
export const displayUrl = (href) => String(href || "").replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

/* ---------- Toronto time for the deadline input ---------- */

function torontoParts(date) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TORONTO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

/** ISO → "2026-10-25T23:59" in Toronto time (for <input type="datetime-local">). "" for none. */
export function torontoInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = torontoParts(d);
  const z = (n) => String(n).padStart(2, "0");
  return `${p.y}-${z(p.mo)}-${z(p.d)}T${z(p.h)}:${z(p.mi)}`;
}

/** "2026-10-25T23:59" read as Toronto time → ISO. "" when it isn't a date. */
export function isoFromTorontoInput(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return "";
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  // Toronto is UTC−4 or UTC−5: guess, then correct by what that instant shows in Toronto (twice, for the DST edges).
  let t = wanted + 5 * 3600e3;
  for (let i = 0; i < 2; i++) {
    const p = torontoParts(new Date(t));
    const shown = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
    t += wanted - shown;
  }
  return new Date(t).toISOString();
}

/** "Sun, Oct 25, 11:59 PM ET". */
export function fmtToronto(iso, { weekday = "short" } = {}) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { timeZone: TORONTO, ...(weekday ? { weekday } : {}), month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: TORONTO, hour: "numeric", minute: "2-digit" });
  return `${date}, ${time} ET`;
}

/** "Saved just now" / "Saved 3 min ago" / "Saved Oct 21, 2:05 PM". */
export function savedAgo(at, now = Date.now()) {
  if (!at) return "";
  const s = Math.round((now - new Date(at).getTime()) / 1000);
  if (s < 45) return "Saved just now";
  if (s < 3600) return `Saved ${Math.max(1, Math.round(s / 60))} min ago`;
  return `Saved ${new Date(at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}
