/* =========================================================
   TTFC 2026: attendance by day (contract C10), as the staff read it
   ---------------------------------------------------------
   "Ability to count the checkins for breakfast, lunch, dinner and over
   each day." The server counts (CheckinMark: one per person per point
   per day; practice marks never; overrides included and counted on
   their own) and sends `attendance` in GET /api/console/summary (Admin
   › RSVPs & meals › Event summary) and GET /api/checkin/desk/counts
   (the desk app's staff Counts screen):
     { days: [{ day: "day1" | "day2", date, label, arrived, checkedIn,
         passesCollectedToDate,
         meals: { cxo, lunch, dinner: { key: "awards" | "gala", … } }
           each { label, admitted, entitled, rsvpd, admittedOfRsvpd,
                  noShows, overrides, notRsvpdAdmitted },
         byPass: { <colour group>: { arrived, checkedIn, cxo, lunch, dinner } },
         issuePass: { arrived, issued },
         noDetails: { recorded, sentToHelp, passIssued, left } }],
       builtAt }
   This file only turns that into what both pages show (the same words
   and numbers) and the Event summary's CSV lines. Nothing is counted
   here. Pure; node --test src/checkin/lib/attendance.test.mjs
========================================================= */

import { GROUPS, GROUP_COLORS } from "./passColors.js";

export const DAY_KEYS = Object.freeze(["day1", "day2"]);
const DAY_DEFAULT = Object.freeze({ day1: { date: "2026-10-26", label: "Day 1", short: "Mon Oct 26" }, day2: { date: "2026-10-27", label: "Day 2", short: "Tue Oct 27" } });
export const MEAL_KEYS = Object.freeze(["cxo", "lunch", "dinner"]);
const MEAL_LABEL = Object.freeze({ cxo: "CxO Breakfast", lunch: "Networking Luncheon", dinner: "Dinner" });
const DINNER_LABEL = Object.freeze({ day1: "Catalyst Awards Night", day2: "Gala Dinner & Networking Reception" });

const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const has = (v) => typeof v === "number" && Number.isFinite(v);
const num = (v) => (has(v) ? v.toLocaleString("en-US") : "—");
const plural = (k, one, many = `${one}s`) => `${num(k)} ${k === 1 ? one : many}`;

/** % of a meal's RSVPs admitted (null with no RSVPs). */
export const pctOfRsvpd = (m) => (has(m?.pctOfRsvpd) ? m.pctOfRsvpd : n(m?.rsvpd) > 0 ? Math.round((n(m.admittedOfRsvpd) * 100) / n(m.rsvpd)) : null);

/**
 * One meal on one day as shown: main "admitted / entitled", then "RSVP'd · % of RSVP'd · no-shows · overrides" (and
 * "admitted without an RSVP" when any were).
 */
export function mealCell(m, day = "") {
  if (!m) return { main: "—", sub: "", label: "", empty: true };
  const pct = pctOfRsvpd(m);
  const sub = [
    `${num(m.rsvpd)} RSVP’d`,
    pct === null ? "" : `${pct}% of RSVP’d`,
    plural(n(m.noShows), "no-show"),
    plural(n(m.overrides), "override"),
    n(m.notRsvpdAdmitted) > 0 ? `${num(m.notRsvpdAdmitted)} admitted without an RSVP` : "",
  ].filter(Boolean).join(" · ");
  return { main: `${num(m.admitted)} / ${num(m.entitled)}`, sub, label: m.label || (day ? DINNER_LABEL[day] : "") || "", pct, empty: false };
}

/** The server's days in Day 1, Day 2 order (each once; a missing day stays empty). */
export function attendanceDays(att) {
  const list = Array.isArray(att?.days) ? att.days.filter((d) => d && DAY_KEYS.includes(d.day)) : [];
  return DAY_KEYS.map((k) => {
    const d = list.find((x) => x.day === k) || null;
    const base = DAY_DEFAULT[k];
    // "Day 1 · Mon Oct 26" (the server's own label when it already says the date).
    const label = d?.label && d.label.includes("·") ? d.label : `${d?.label || base.label} · ${base.short}`;
    return { key: k, date: d?.date || base.date, label, data: d };
  });
}

/** A colour group's name in the counts ("Power Pass", "Media", "Issue pass (no pass on file)"). */
export function passGroupLabel(k) {
  if (k === "issue_pass" || k === "no_pass") return "Issue pass (no pass on file)";
  const c = GROUP_COLORS[k];
  if (!c) return String(k || "Other").replace(/[_-]+/g, " ").replace(/^\w/, (x) => x.toUpperCase());
  return ["connect", "influence", "power", "apex"].includes(k) ? `${c.label} Pass` : c.label;
}

/**
 * The page's model: { builtAt, days: [{ key, date, label, data }], rows: [{ key, label, cells: [{ main, sub, label }]
 * (one per day) }], byPass: [{ day, label, rows: [{ key, label, people, arrived, checkedIn, cxo, lunch, dinner }] }], empty }.
 * Rows: Arrived (lobby), Checked in / pass collected, CxO Breakfast, Networking Luncheon, Dinner (the evening's own
 * name per day), Issue pass, No details found.
 */
export function attendanceView(att) {
  const days = attendanceDays(att);
  const cells = (fn) => days.map((d) => (d.data ? fn(d.data, d.key) : { main: "—", sub: "", empty: true }));
  const rows = [
    { key: "arrived", label: "Arrived (lobby)", cells: cells((d) => ({ main: num(d.arrived), sub: "" })) },
    { key: "checkedIn", label: "Checked in / pass collected", cells: cells((d) => ({ main: num(d.checkedIn), sub: has(d.passesCollectedToDate) ? `${num(d.passesCollectedToDate)} passes collected to date` : "" })) },
    ...MEAL_KEYS.map((k) => ({
      key: k,
      label: k === "dinner" ? "Dinner" : MEAL_LABEL[k],
      cells: cells((d, day) => mealCell(d.meals?.[k] ? { label: k === "dinner" ? d.meals[k].label || DINNER_LABEL[day] : "", ...d.meals[k] } : null, k === "dinner" ? day : "")),
    })),
    { key: "issuePass", label: "Issue pass (on the list, no pass)", cells: cells((d) => ({
      main: `${num(n(d.issuePass?.arrived))} arrived · ${num(n(d.issuePass?.issued))} issued`,
      sub: has(d.issuePass?.people) ? `of ${plural(d.issuePass.people, "person", "people")} on the list with no pass; passes issued at the desk` : "passes issued at the desk",
    })) },
    { key: "noDetails", label: "No details found", cells: cells((d) => {
      const x = d.noDetails || {};
      const sub = [
        `${num(n(x.sentToHelp))} sent to the help desk`, `${num(n(x.passIssued))} pass issued`, `${num(n(x.left))} left`,
        n(x.linked) > 0 ? `${num(x.linked)} found on the list` : "", n(x.open) > 0 ? `${num(x.open)} still open` : "",
      ].filter(Boolean).join(" · ");
      return { main: num(n(x.recorded)), sub };
    }) },
  ];
  const byPass = days.filter((d) => d.data?.byPass && Object.keys(d.data.byPass).length).map((d) => {
    const keys = Object.keys(d.data.byPass);
    const order = [...GROUPS.filter((k) => keys.includes(k)), ...keys.filter((k) => !GROUPS.includes(k)).sort()];
    return {
      day: d.key, label: d.label,
      rows: order
        .map((k) => {
          const r = d.data.byPass[k] || {};
          return { key: k, label: r.label || passGroupLabel(k), people: has(r.people) ? r.people : null, arrived: n(r.arrived), checkedIn: n(r.checkedIn), cxo: n(r.cxo), lunch: n(r.lunch), dinner: n(r.dinner) };
        })
        // A group nobody is in (the server lists every one): left out.
        .filter((r) => r.people !== 0 || r.arrived || r.checkedIn || r.cxo || r.lunch || r.dinner),
    };
  });
  return { builtAt: att?.builtAt || null, days, rows, byPass, empty: !days.some((d) => d.data) };
}

/** The Event summary CSV's lines for attendance (arrays of cells; the page's CSV writer quotes them). */
export function attendanceCsvRows(att) {
  if (!att) return [];
  const v = attendanceView(att);
  const out = [];
  out.push(["Attendance by day (the check-in desk: each person once per point per day; practice marks not counted)"]);
  out.push(["Measure", ...v.days.map((d) => `${d.label}${d.date ? ` (${d.date})` : ""}`)]);
  const per = (fn) => v.days.map((d) => (d.data ? fn(d.data, d.key) : ""));
  out.push(["Arrived (lobby)", ...per((d) => n(d.arrived))]);
  out.push(["Checked in / pass collected", ...per((d) => n(d.checkedIn))]);
  out.push(["Passes collected to date", ...per((d) => n(d.passesCollectedToDate))]);
  for (const k of MEAL_KEYS) {
    const name = k === "dinner" ? "Dinner (Awards Night / Gala)" : MEAL_LABEL[k];
    const m = (d) => d.meals?.[k] || {};
    out.push([`${name}: admitted`, ...per((d) => n(m(d).admitted))]);
    out.push([`${name}: entitled`, ...per((d) => n(m(d).entitled))]);
    out.push([`${name}: RSVP'd`, ...per((d) => n(m(d).rsvpd))]);
    out.push([`${name}: admitted of those RSVP'd`, ...per((d) => n(m(d).admittedOfRsvpd))]);
    out.push([`${name}: % of RSVP'd admitted`, ...per((d) => { const p = pctOfRsvpd(m(d)); return p === null ? "" : `${p}%`; })]);
    out.push([`${name}: no-shows (RSVP'd, not admitted)`, ...per((d) => n(m(d).noShows))]);
    out.push([`${name}: overrides (Admit anyway)`, ...per((d) => n(m(d).overrides))]);
    out.push([`${name}: admitted without an RSVP`, ...per((d) => n(m(d).notRsvpdAdmitted))]);
  }
  out.push(["Issue pass: people on the list with no pass", ...per((d) => (has(d.issuePass?.people) ? d.issuePass.people : ""))]);
  out.push(["Issue pass: arrived", ...per((d) => n(d.issuePass?.arrived))]);
  out.push(["Issue pass: issued at the desk", ...per((d) => n(d.issuePass?.issued))]);
  out.push(["No details found: recorded", ...per((d) => n(d.noDetails?.recorded))]);
  out.push(["No details found: sent to the help desk", ...per((d) => n(d.noDetails?.sentToHelp))]);
  out.push(["No details found: pass issued", ...per((d) => n(d.noDetails?.passIssued))]);
  out.push(["No details found: left", ...per((d) => n(d.noDetails?.left))]);
  out.push(["No details found: found on the list", ...per((d) => n(d.noDetails?.linked))]);
  out.push(["No details found: still open", ...per((d) => n(d.noDetails?.open))]);
  if (v.byPass.length) {
    out.push([]);
    out.push(["Attendance by pass type (each person once, in their colour group)"]);
    out.push(["Day", "Pass type", "People", "Arrived", "Checked in", "CxO Breakfast", "Lunch", "Dinner"]);
    for (const d of v.byPass) for (const r of d.rows) out.push([d.label, r.label, r.people ?? "", r.arrived, r.checkedIn, r.cxo, r.lunch, r.dinner]);
  }
  return out;
}
