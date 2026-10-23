/* =========================================================
   TTFC Check-in: timers and times
   ---------------------------------------------------------
   The pass desk's "on the way up" timer (the guest takes ~30 s up the
   escalator; the desk should hand the pass over within 15 s): amber
   after 60 s, red after 2 minutes. The AV station's "speaks in …"
   (highlighted within 60 minutes). Times are Toronto's. The device's
   clock is corrected by the server's (serverOffset), so a wrong iPad
   clock doesn't break the timers.
   Pure; node --test src/checkin/lib/timers.test.mjs
========================================================= */

export const AMBER_AFTER_S = 60;
export const RED_AFTER_S = 120;
export const AV_SOON_MIN = 60;
export const TZ = "America/Toronto";

const ms = (d) => { const n = d ? new Date(d).getTime() : NaN; return Number.isFinite(n) ? n : NaN; };

/** Seconds since `at` (never negative), or null. */
export function secondsSince(at, now = Date.now()) {
  const t = ms(at);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 1000)) : null;
}

/** "0:35", "1:05", "12:40", then "1 h 05" from an hour. */
export function clockText(seconds) {
  if (seconds === null || seconds === undefined) return "";
  const s = Math.max(0, Math.floor(seconds));
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The timer's colour: "ok" under 60 s, "amber" from 60 s, "red" from 2 minutes. */
export function timerLevel(seconds) {
  if (seconds === null || seconds === undefined) return "ok";
  if (seconds >= RED_AFTER_S) return "red";
  if (seconds >= AMBER_AFTER_S) return "amber";
  return "ok";
}

/** "10:42 AM", Toronto. */
export function timeText(at) {
  const t = ms(at);
  return Number.isFinite(t) ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(t)) : "";
}

/** "Mon", Toronto (the day a pass was collected). */
export function weekday(at) {
  const t = ms(at);
  return Number.isFinite(t) ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(t)) : "";
}

/** "2026-10-26", Toronto. */
export function torontoDate(at) {
  const t = ms(at);
  return Number.isFinite(t) ? new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t)) : "";
}

/** Minutes past midnight in Toronto. */
export function torontoMinutes(at) {
  const t = ms(at);
  if (!Number.isFinite(t)) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return (Number(p.hour) % 24) * 60 + Number(p.minute);
}

const toMin = (hhmm) => (/^\d\d:\d\d$/.test(String(hhmm || "")) ? Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) : null);

/** "09:30" → "9:30 AM". */
export function clock12(hhmm) {
  const m = toMin(hhmm);
  if (m === null) return "";
  return `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m >= 720 ? "PM" : "AM"}`;
}

/**
 * A speaker's next session today (AV station): the first one that hasn't ended. → { session, minutesUntil, soon, now } |
 * null. `soon`: starts within 60 minutes (or is on now).
 */
export function nextSession(sessions = [], { eventDay, now = Date.now() } = {}) {
  if (!eventDay) return null;
  const nowMin = torontoMinutes(now);
  const today = (sessions || []).filter((s) => s.day === eventDay && toMin(s.start) !== null)
    .sort((a, b) => toMin(a.start) - toMin(b.start));
  for (const s of today) {
    const end = toMin(s.end) ?? toMin(s.start) + 30;
    if (end <= nowMin) continue;
    const until = toMin(s.start) - nowMin;
    return { session: s, minutesUntil: until, soon: until <= AV_SOON_MIN, live: until <= 0 };
  }
  return null;
}

/** "in 25 min", "in 1 h 10", "on now". */
export function untilText(minutes) {
  if (minutes === null || minutes === undefined) return "";
  if (minutes <= 0) return "on now";
  if (minutes < 60) return `in ${minutes} min`;
  return `in ${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** "Day 1 · Mon, Oct 26" / "Before the event · Fri, Oct 23" from the server's today ({ date, label }). */
export function dayHeading(today) {
  if (!today?.date) return "";
  const d = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${today.date}T12:00:00Z`));
  return `${today.label} · ${d}`;
}
