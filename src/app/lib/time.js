import { session } from "./store";

/* =========================================================
   Festival time. Everything happens in Toronto between
   Oct 25 and Oct 28, 2026, all in EDT (UTC−4; DST ends Nov 1),
   so a fixed offset is exact here.
========================================================= */

const OFFSET_H = 4;

/** A Toronto wall-clock time in October 2026 → Date. */
export function torontoDate(day, hour = 0, minute = 0) {
  return new Date(Date.UTC(2026, 9, day, hour + OFFSET_H, minute));
}

export const EVENT_START = torontoDate(26, 9, 0);
export const EVENT_END = torontoDate(27, 18, 0);
/** Oct 25 → Oct 27: the Home hero shows the next session instead of the days counter. */
export const SESSION_HERO_START = torontoDate(25);
export const SESSION_HERO_END = torontoDate(28);

export const showsSessionHero = (now) => now >= SESSION_HERO_START && now < SESSION_HERO_END;
export const countdownTarget = () => EVENT_START;

/**
 * The app's clock. `?ttfc-now=2026-10-26T10:20:00-04:00` fakes it for demos and
 * QA (kept for the tab session; it keeps ticking from there).
 */
let offset = 0;
try {
  const q = new URLSearchParams(window.location.search).get("ttfc-now");
  if (q) session.set("ttfc.now", q);
  const raw = session.get("ttfc.now");
  if (raw) {
    const fake = new Date(raw);
    if (!Number.isNaN(fake.getTime())) offset = fake.getTime() - Date.now();
  }
} catch { /* no window */ }

export const now = () => new Date(Date.now() + offset);
export const clockFaked = () => offset !== 0;

/** "09:05" → "9:05 AM" */
export function clock12(hhmm) {
  const p = String(hhmm || "").split(":").map(Number);
  if (p.length !== 2 || p.some(Number.isNaN)) return hhmm || "";
  const h = p[0] % 24, m = p[1];
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "9:05 AM" → { h: 9, m: 5 } (24 h) */
export function parseClock(clock) {
  const [hm = "0:00", ap = ""] = String(clock).toUpperCase().split(" ");
  let [h, m] = hm.split(":").map((x) => Number(x) || 0);
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, m };
}

/** "9:10 AM" → "9 AM" */
export function hourLabel(clock) {
  const [hm = "", ap = ""] = String(clock).split(" ");
  return `${hm.split(":")[0]}${ap ? " " + ap : ""}`;
}

/** "12:04" (min:sec) under an hour, else "1h 05m". */
export function shortCountdown(ms) {
  const s = Math.max(Math.floor(ms / 1000), 0);
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}

export function parts(ms) {
  const s = Math.max(Math.floor(ms / 1000), 0);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const pad = (n) => String(n).padStart(2, "0");

/** Post / message times: "Today 9:41 AM", "Yesterday 6:02 PM", "Oct 21". */
export function postTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const n = now();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(n) - startOf(d)) / 86400000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const mins = Math.floor((n - d) / 60000);
  if (mins >= 0 && mins < 1) return "Just now";
  if (mins >= 0 && mins < 60) return `${mins} min ago`;
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Yesterday ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", ...(d.getFullYear() !== n.getFullYear() ? { year: "numeric" } : {}) });
}

/** Compact "5m", "3h", "2d" for lists. */
export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const s = Math.floor((now() - d) / 1000);
  if (Number.isNaN(s)) return "";
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const twoDigits = pad;
