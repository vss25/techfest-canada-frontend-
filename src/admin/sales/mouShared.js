/* Shared bits of Sales › MOUs and the MOU catalogue (Nov 23 2026). The wording rules mirror the
   backend's services/mou.js (fillWording, scheduleText, lineText) so a line's sentence updates as
   you type; the server's own `text` and `document` are what export. */

export const MOU_STATUS_TONE = { draft: "neutral", review: "purple", exported: "good" };
export const MOU_STATUS_LABEL = { draft: "Draft", review: "In review", exported: "Exported" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const longDay = (iso) => (ISO.test(iso || "")
  ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
  : "");
const list = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const noDashes = (s) => String(s || "").replace(/\s*[—–]\s*/g, ", ");

export function scheduleText(s = {}) {
  if (s.mode === "dates") { const d = (s.dates || []).filter((x) => ISO.test(x)).sort(); return d.length ? ` on ${list(d.map(longDay))}` : ""; }
  if (s.mode === "repeat") {
    const every = { week: "every week", "2weeks": "every 2 weeks", month: "every month" }[s.every] || "every month";
    return ` ${every}${ISO.test(s.from || "") ? ` from ${longDay(s.from)}` : ""}${ISO.test(s.to || "") ? ` to ${longDay(s.to)}` : ""}`;
  }
  if (s.mode === "note" && String(s.note || "").trim()) return ` ${noDashes(String(s.note).trim()).replace(/^[,.\s]+/, "")}`;
  return "";
}

export function fillWording(wording, { partner, event, qty, value, code, schedule }) {
  const n = qty === null || qty === undefined || qty === "" ? null : Number(qty);
  const plural = n !== 1;
  return noDashes(String(wording || "")
    .replace(/\{partner\}/g, partner || "the partner")
    .replace(/\{event\}/g, event || "the event")
    .replace(/\{qty\}/g, n === null || Number.isNaN(n) ? "" : String(n))
    .replace(/\{s\}/g, plural ? "s" : "")
    .replace(/\{es\}/g, plural ? "es" : "")
    .replace(/\{ies\}/g, plural ? "ies" : "y")
    .replace(/\{when\}/g, scheduleText(schedule || {}))
    .replace(/\{code\}/g, String(code || "").toUpperCase() || "[code to be set]")
    .replace(/\{value\}/g, value || ""))
    .replace(/ {2,}/g, " ").replace(/ ([.,)])/g, "$1").replace(/\(\)/g, "").trim();
}

/** The sentence a line prints as (the panel's live copy). */
export function lineSentence(line, ctx) {
  const base = fillWording(line.wording || line.baseWording, { ...ctx, qty: line.qty, value: line.value, code: line.code, schedule: line.schedule });
  const sentence = /[.!?]$/.test(base) ? base : `${base}.`;
  const at = Number(line.unlockAt);
  return line.side === "ttfc" && line.unlockOn && at > 0 ? `Once ticket sales with ${ctx.partner || "the partner"}'s code reach ${at}: ${sentence}` : sentence;
}

export const EMPTY_SCHEDULE = { mode: "none", dates: [], every: "month", from: "", to: "", note: "" };
