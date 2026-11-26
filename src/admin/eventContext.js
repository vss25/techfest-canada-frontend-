import { createContext, useContext } from "react";
import { GRACE_DAYS, compareEvents, formatDateRange, lifecycleOf } from "../lib/eventDates.js";

/* =========================================================
   The event the panel is working on (the approved admin design's
   event switcher, board 17). Chosen in the top bar; remembered in
   this browser. Pages about one event (Website › Events,
   Sales, Operations, Event day) follow it.
========================================================= */

export const EVENT_KEY = "ttfc.admin.event";

export const AdminEventContext = createContext({
  events: [], current: null, setCurrent: () => {}, open: false, setOpen: () => {}, loading: true,
  attention: { changes: 0, sos: 0, flags: 0, overdue: 0, total: 0, ready: false }, refresh: () => {},
});
export const useAdminEvent = () => useContext(AdminEventContext);

/** The chosen event's key for API calls (`?eventKey=` / `?event=`), or "" when none is chosen. */
export const adminEventKey = (ev) => (ev ? ev.eventKey?.current || ev.eventKey || "" : "");
/** `path` with the chosen event added as `param` (Nov 23 2026: pages about one event show only its data). */
export const withEvent = (path, ev, param = "eventKey") => {
  const k = adminEventKey(ev);
  return k ? `${path}${path.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(k)}` : path;
};

const DAY = 86400000;
const daysSince = (iso, now) => Math.floor((now - new Date(`${iso}T12:00:00`).getTime()) / DAY);

/** The tag beside an event in the switcher: { label, bg, fg } (the board's colours). */
export function eventTag(ev, config, now = Date.now()) {
  const stage = lifecycleOf(ev, new Date(now));
  if (ev?.unpublished) return { label: "Draft", bg: "#EDE9FE", fg: "#5B21B6" };
  if (stage === "past") return { label: "Read only", bg: "#F1F0F5", fg: "#4A4566" };
  if (stage === "just-ended") return { label: "Just ended", bg: "#F1F0F5", fg: "#4A4566" };
  if (stage === "live") return { label: "Live now", bg: "#DCFCE7", fg: "#166534" };
  if (config?.status === "live") return { label: "On sale", bg: "#DCFCE7", fg: "#166534" };
  return { label: "Coming soon", bg: "#FEF3C7", fg: "#92400E" };
}

/** The line under an event's name: its dates (or "February 2027"), and how long ago a past one ended. */
export function eventWhen(ev, now = Date.now()) {
  const when = ev?.startDate ? formatDateRange(ev) : String(ev?.statusNote || ev?.year || "").split("·")[0].trim();
  const stage = lifecycleOf(ev, new Date(now));
  if ((stage === "past" || stage === "just-ended") && ev?.startDate) {
    const n = daysSince(ev.endDate || ev.startDate, now);
    return `${when} · ended ${n} day${n === 1 ? "" : "s"} ago`;
  }
  return when;
}

/** Upcoming and live events first in date order; past ones (more than the grace days ago, or just ended) after. */
export function splitEvents(list = [], now = Date.now()) {
  const sorted = [...list].filter((e) => e && e.name).sort(compareEvents);
  const isPast = (e) => ["past", "just-ended"].includes(lifecycleOf(e, new Date(now)));
  return { upcoming: sorted.filter((e) => !isPast(e)), past: sorted.filter(isPast).reverse() };
}

/** The event to start on: the remembered one if it still exists, else the next upcoming one. */
export function pickStart(list = [], saved = "", now = Date.now()) {
  const found = list.find((e) => e._id === saved);
  if (found) return found;
  const { upcoming, past } = splitEvents(list, now);
  return upcoming[0] || past[0] || null;
}

export { GRACE_DAYS };
