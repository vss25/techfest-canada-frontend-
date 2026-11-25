/* =========================================================
   Staff activity (Nov 24 2026): the panel's side.
   - The tracker (useStaffActivityTracker, Admin.jsx): tells the server when a page opens and, once a
     minute, that the panel is still being used. "Used" = a key, click, scroll, touch or mouse move in the
     last 5 minutes while the tab is visible; an open tab nobody touches sends nothing, so it adds no time.
     The server (routes/staffActivity.js) counts edits itself and ends a session after 15 idle minutes.
   - Pure helpers for Settings › Staff activity (StaffActivity.jsx), tested in staffActivityRules.test.mjs.
========================================================= */
import { useEffect, useRef } from "react";

export const BEAT_MS = 60 * 1000;
export const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
export const PING_PATH = "/admin/staff-activity/ping";
export const SIGNOUT_PATH = "/admin/staff-activity/signout";

/** Should the heartbeat go now? Only while the tab is visible and someone used it in the last 5 minutes. */
export function shouldBeat({ lastInputAt, now, visible }) {
  return !!visible && Number.isFinite(lastInputAt) && now - lastInputAt <= ACTIVE_WINDOW_MS;
}

/** 0 → "0 min", 59 s → "1 min", 3720 → "1 h 2 min". */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s === 0) return "0 min";
  const m = Math.max(1, Math.round(s / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "14", label: "Last 14 days", days: 14 },
  { key: "30", label: "Last 30 days", days: 30 },
];

/** { from, to } (YYYY-MM-DD, the viewer's own calendar) for a RANGES key. */
export function rangeFor(key, now = new Date()) {
  const r = RANGES.find((x) => x.key === key) || RANGES[1];
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(to);
  from.setDate(from.getDate() - (r.days - 1));
  return { from: ymd(from), to: ymd(to) };
}

/** The viewer's time zone, for the server's day / hour grouping. */
export function viewerTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto"; } catch { return "America/Toronto"; }
}

/** "9 AM", "12 PM", "11 PM". */
export function hourLabel(h) {
  const n = ((Number(h) % 24) + 24) % 24;
  const suffix = n < 12 ? "AM" : "PM";
  return `${n % 12 === 0 ? 12 : n % 12} ${suffix}`;
}

/** The hours to draw for a day: every hour from the first to the last with activity, gaps filled with zeros. */
export function hourSpan(hours = []) {
  if (!hours.length) return [];
  const by = new Map(hours.map((h) => [h.hour, h]));
  const lo = Math.min(...hours.map((h) => h.hour));
  const hi = Math.max(...hours.map((h) => h.hour));
  const out = [];
  for (let h = lo; h <= hi; h += 1) out.push(by.get(h) || { hour: h, activeSeconds: 0, pageViews: 0, edits: 0 });
  return out;
}

/** 0–4 shade for an hour's active time (a full hour = 4). */
export function heatLevel(activeSeconds) {
  const s = Number(activeSeconds) || 0;
  if (s <= 0) return 0;
  if (s < 600) return 1;
  if (s < 1800) return 2;
  if (s < 3000) return 3;
  return 4;
}

/** A session's status as words. */
export function statusText(s) {
  if (s?.status === "active") return "Active now";
  if (s?.status === "signout") return "Signed out";
  return "Went idle";
}

/** Totals over the staff shown. */
export function sumTotals(staff = []) {
  return staff.reduce((t, s) => ({
    activeSeconds: t.activeSeconds + (s.totals?.activeSeconds || 0),
    sessions: t.sessions + (s.totals?.sessions || 0),
    pageViews: t.pageViews + (s.totals?.pageViews || 0),
    edits: t.edits + (s.totals?.edits || 0),
  }), { activeSeconds: 0, sessions: 0, pageViews: 0, edits: 0 });
}

/**
 * The tracker. `post(path, body)` sends to the API (api.post); `pathname` is the router's. Views go on every
 * page change, heartbeats once a minute while in use. A 404 (an API without staff activity yet) stops it.
 */
export function useStaffActivityTracker({ enabled, pathname, post }) {
  const lastInput = useRef(0);
  const off = useRef(false);
  const lastPath = useRef("");
  const postRef = useRef(post);
  useEffect(() => { postRef.current = post; }, [post]);

  const send = (body) => {
    if (off.current) return;
    Promise.resolve(postRef.current(PING_PATH, body)).catch((err) => {
      if (err?.status === 404) off.current = true;
    });
  };

  useEffect(() => {
    if (!enabled || !pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    lastInput.current = Date.now();
    send({ kind: "view" });
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return undefined;
    lastInput.current = Date.now();
    let lastMove = 0;
    const mark = () => { lastInput.current = Date.now(); };
    const move = () => { const t = Date.now(); if (t - lastMove > 5000) { lastMove = t; mark(); } };
    const opts = { passive: true, capture: true };
    const events = ["keydown", "pointerdown", "wheel", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, mark, opts));
    window.addEventListener("mousemove", move, opts);
    const onVisible = () => { if (document.visibilityState === "visible") mark(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => {
      if (shouldBeat({ lastInputAt: lastInput.current, now: Date.now(), visible: document.visibilityState === "visible" })) send({ kind: "beat" });
    }, BEAT_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark, opts));
      window.removeEventListener("mousemove", move, opts);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [enabled]);
}
