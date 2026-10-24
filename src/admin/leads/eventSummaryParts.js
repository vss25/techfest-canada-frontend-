/* =========================================================
   Admin › RSVPs & meals › Event summary: the page's pure parts
   (GET /api/console/summary does all the counting; backend
   services/eventSummary.js). The "as of" time in Toronto, the
   percentages, each meal's dietary chips and the CSV of the
   tables (attendance by day from the check-in desk too: its words
   are shared with the desk app's staff Counts screen,
   src/checkin/lib/attendance.js). Unit-tested:
   node --test src/admin/leads/eventSummaryParts.test.mjs
========================================================= */

import { attendanceCsvRows } from "../../checkin/lib/attendance.js";

export const EVENT_TZ = "America/Toronto";

/** "Fri 23 Oct, 2:41 PM": a moment in Toronto time ("" for none). */
export function torontoTime(iso) {
  const t = iso ? new Date(iso) : null;
  if (!t || Number.isNaN(t.getTime())) return "";
  const date = t.toLocaleDateString("en-GB", { timeZone: EVENT_TZ, weekday: "short", day: "numeric", month: "short" });
  const time = t.toLocaleTimeString("en-US", { timeZone: EVENT_TZ, hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}`;
}

/** 75 → "75%", null / undefined → "—". */
export const pctText = (n) => (typeof n === "number" && Number.isFinite(n) ? `${n}%` : "—");

/** A meal's dietary needs as chips, biggest first: [{ key, label, count }] (zero counts left out). */
export function dietChips(row, keys = []) {
  return (keys || [])
    .map((k, i) => ({ key: k.key, label: k.label, count: Number(row?.dietary?.[k.key]) || 0, i }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.i - b.i)
    .map(({ i, ...c }) => c); // eslint-disable-line no-unused-vars
}

/* ---------- CSV ---------- */
// Text that a spreadsheet would read as a formula gets a leading apostrophe.
const cell = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (cells) => cells.map(cell).join(",");
const pctCell = (n) => (typeof n === "number" && Number.isFinite(n) ? `${n}%` : "");

/** The page's tables as one CSV (no names or emails): passes, the day split, meals with dietary columns, check-in, attendance by day. */
export function summaryCsv(s) {
  if (!s) return "";
  const out = [];
  const diet = s.meals?.dietaryKeys || [];
  out.push(line(["TTFC 2026 event summary"]));
  out.push(line(["As of (Toronto time)", torontoTime(s.builtAt)]));
  if (!s.refundsChecked) out.push(line(["Note", "Refunds could not be checked when this was built, so a refunded pass may be counted."]));
  out.push("");

  out.push(line(["Passes issued"]));
  out.push(line(["Pass type", "People", "RSVP'd", "% RSVP'd", "Day 1", "Day 2", "Pending", "Pending RSVP'd"]));
  const passRow = (r) => line([r.label, r.people, r.rsvpd, pctCell(r.pct), r.day1, r.day2, r.pending, r.pendingRsvpd]);
  for (const r of s.passes?.rows || []) out.push(passRow(r));
  if (s.passes?.total) out.push(passRow(s.passes.total));
  out.push(line(["Also counted above"]));
  for (const r of s.passes?.marks || []) out.push(passRow(r));
  out.push("");

  const t = s.totals || {};
  out.push(line(["Of the RSVPs", "Day 1", "Day 2", "Both days"]));
  out.push(line([t.rsvpd, t.day1, t.day2, t.bothDays]));
  out.push("");

  out.push(line(["Meals and events"]));
  out.push(line(["Item", "People entitled", "Entitled (pending)", "RSVP'd", "% RSVP'd", "RSVP'd outside their pass", "No dietary needs", ...diet.map((d) => d.label)]));
  for (const m of s.meals?.rows || []) {
    out.push(line([m.label, m.entitled, m.entitledPending, m.rsvpd, pctCell(m.pct), m.outsidePass, m.noNeeds, ...diet.map((d) => m.dietary?.[d.key] || 0)]));
  }
  const all = s.meals?.allRsvps;
  if (all) out.push(line([all.label, "", "", all.rsvpd, "", "", all.noNeeds, ...diet.map((d) => all.dietary?.[d.key] || 0)]));
  out.push("");

  const c = s.checkin || {};
  out.push(line(["Check-in (each person's first scan, Toronto time)"]));
  out.push(line(["Pass type", "People", "Checked in", "First scan Day 1", "First scan Day 2", "Another date", "No time recorded", "Checked in, not RSVP'd"]));
  for (const r of c.byPass || []) out.push(line([r.label, r.people, r.checkedIn, r.day1, r.day2, r.otherDay, r.noTime, r.notRsvpd]));
  out.push(line(["Total", t.people, c.checkedIn, c.day1, c.day2, c.otherDay, c.noTime, c.notRsvpd]));
  if (s.attendance) {
    out.push("");
    for (const r of attendanceCsvRows(s.attendance)) out.push(r.length ? line(r) : "");
  }
  return `${out.join("\r\n")}\r\n`;
}

/** "ttfc-event-summary-2026-10-23-1441.csv", from the time it was built (Toronto). */
export function csvFileName(iso) {
  const t = iso ? new Date(iso) : new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(Number.isNaN(t.getTime()) ? new Date() : t).map((p) => [p.type, p.value]));
  return `ttfc-event-summary-${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}.csv`;
}
