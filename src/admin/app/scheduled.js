/* =========================================================
   Scheduled broadcasts (Oct 27 2026, management only): an update
   written now and sent later, as a feed post, the Home banner and /
   or a notification to app users. Pure helpers for Admin › Event
   day › Send an app update › Scheduled (ScheduledBroadcasts.jsx).
   Server (backend claude/scheduled-broadcasts):
     GET   /console/broadcasts/scheduled → { items, quietHours: { from: "22:00", to: "08:00", tz: "America/Toronto" } }
     item: { id, sendAt, title, body, linkUrl, feedPost, banner, notify, audience: "app" | "checkedIn", status:
             scheduled | sending | sent | cancelled | failed | missed, sentAt, recipients, postId, error, createdByName,
             updatedByName, createdAt, updatedAt, estimate }
     POST  /console/broadcasts/scheduled → 201 item | 400 { error, field }
     PATCH /console/broadcasts/scheduled/:id → item | 409 unless still scheduled
     POST  /console/broadcasts/scheduled/:id/cancel, …/:id/send-now
   Times are Toronto's ("Tue Oct 27, 7:00 PM ET"); notifications
   aren't sent in the quiet hours (the server's, 10 PM–8 AM by
   default), and the form refuses those times before sending.
   Imports only the pure src/lib/swag.js: node --test src/admin/app/scheduled.test.mjs.
========================================================= */

import { parseToronto, torontoIso, torontoLocalInput } from "../../lib/swag.js";

export const SCHEDULED_PATH = "/console/broadcasts/scheduled";
export const DEFAULT_QUIET = Object.freeze({ from: "22:00", to: "08:00", tz: "America/Toronto" });
export const LIMITS = Object.freeze({ title: 80, body: 1000, link: 500 });
/** The link's quick picks (value "" = no link). */
export const QUICK_LINKS = Object.freeze([
  { label: "2027 page", value: "https://www.thetechfestival.com/stay-updated" },
  { label: "Rate the app", value: "https://www.thetechfestival.com/rate" },
  { label: "Feed", value: "ttfc://tab/feed" },
  { label: "None", value: "" },
]);
export const AUDIENCES = Object.freeze([
  { key: "app", label: "Everyone on the app" },
  { key: "checkedIn", label: "Checked-in only" },
]);
export const STATUS = Object.freeze({
  scheduled: { label: "Scheduled", tone: "purple" },
  sending: { label: "Sending…", tone: "warn" },
  sent: { label: "Sent", tone: "good" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  failed: { label: "Failed", tone: "bad" },
  missed: { label: "Missed", tone: "bad" },
});

const pad = (n) => String(n).padStart(2, "0");

/** "22:00" → minutes after midnight (NaN when it isn't a time). */
export function minutesOf(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return NaN;
  return +m[1] * 60 + +m[2];
}

/** The quiet hours from the server, or the default when they're missing or odd. */
export function quietFrom(q) {
  const from = minutesOf(q?.from);
  const to = minutesOf(q?.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return DEFAULT_QUIET;
  return { from: q.from, to: q.to, tz: typeof q.tz === "string" && q.tz ? q.tz : DEFAULT_QUIET.tz };
}

/** Minutes after midnight at `ms` in `tz`. */
function clockIn(ms, tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return (+parts.hour % 24) * 60 + +parts.minute;
}

/** Is `ms` inside the quiet hours (which may run past midnight)? */
export function inQuietHours(ms, quiet = DEFAULT_QUIET) {
  if (!Number.isFinite(ms)) return false;
  const q = quietFrom(quiet);
  const m = clockIn(ms, q.tz);
  const from = minutesOf(q.from);
  const to = minutesOf(q.to);
  return from > to ? m >= from || m < to : m >= from && m < to;
}

/** "22:00" → "10:00 PM". */
export function clock12(hhmm) {
  const m = minutesOf(hhmm);
  if (!Number.isFinite(m)) return String(hhmm ?? "");
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? "AM" : "PM"}`;
}

/** "10:00 PM to 8:00 AM, Toronto time" */
export const quietLabel = (quiet) => { const q = quietFrom(quiet); return `${clock12(q.from)} to ${clock12(q.to)}, Toronto time`; };

/** "Tue Oct 27, 7:00 PM ET" ("" for no time). */
export function whenET(v) {
  const ms = typeof v === "number" ? v : parseToronto(v);
  if (!Number.isFinite(ms)) return "";
  const f = (o) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", ...o }).format(new Date(ms));
  return `${f({ weekday: "short" })} ${f({ month: "short", day: "numeric" })}, ${f({ hour: "numeric", minute: "2-digit" })} ET`;
}

/** A link people can be sent to: "", an https address, or the app's own ttfc:// link. */
export const linkOk = (v) => { const s = String(v ?? "").trim(); return !s || /^https:\/\/[^\s]+$/i.test(s) || /^ttfc:\/\/[^\s]+$/i.test(s); };

/** A new draft (sends in an hour, on the hour, outside the quiet hours when possible). */
export function blankDraft(now = Date.now(), quiet = DEFAULT_QUIET) {
  let t = Math.ceil((now + 3600000) / 3600000) * 3600000;
  for (let i = 0; i < 24 && inQuietHours(t, quiet); i++) t += 3600000;
  return { id: "", sendAt: torontoLocalInput(t), title: "", body: "", linkUrl: "", feedPost: true, banner: false, notify: true, audience: "app" };
}

/** A scheduled item back into the form. */
export function draftFrom(item) {
  return {
    id: String(item?.id ?? ""), sendAt: torontoLocalInput(parseToronto(item?.sendAt)), title: String(item?.title ?? ""), body: String(item?.body ?? ""),
    linkUrl: String(item?.linkUrl ?? ""), feedPost: item?.feedPost !== false, banner: item?.banner === true, notify: item?.notify !== false,
    audience: item?.audience === "checkedIn" ? "checkedIn" : "app",
  };
}

/** Problems before saving: { field: words } ({} = fine). `now` in ms. */
export function checkDraft(d, now = Date.now(), quiet = DEFAULT_QUIET) {
  const errors = {};
  const at = parseToronto(d?.sendAt);
  if (!Number.isFinite(at)) errors.sendAt = "Pick a date and time.";
  else if (at < now + 60000) errors.sendAt = "Pick a time at least a minute from now.";
  else if (d.notify && inQuietHours(at, quiet)) errors.sendAt = `That's in the quiet hours (${quietLabel(quiet)}): phones aren't notified then. Pick another time.`;
  if (!String(d?.title ?? "").trim()) errors.title = "Write a title.";
  else if (d.title.trim().length > LIMITS.title) errors.title = `Keep the title to ${LIMITS.title} characters.`;
  if (!String(d?.body ?? "").trim()) errors.body = "Write the message.";
  else if (d.body.trim().length > LIMITS.body) errors.body = `Keep the message to ${LIMITS.body} characters.`;
  if (!linkOk(d?.linkUrl)) errors.linkUrl = "Use an https:// address, a ttfc:// app link, or no link.";
  if (!d?.feedPost && !d?.banner && !d?.notify) errors.channels = "Choose at least one: the feed, the Home banner or a notification.";
  return errors;
}

/** The request body (sendAt with Toronto's offset). */
export function bodyFrom(d) {
  return {
    sendAt: torontoIso(d.sendAt), title: d.title.trim(), body: d.body.trim(), linkUrl: String(d.linkUrl ?? "").trim(),
    feedPost: !!d.feedPost, banner: !!d.banner, notify: !!d.notify, audience: d.audience === "checkedIn" ? "checkedIn" : "app",
  };
}

/** The list: still to send first (soonest first), then the rest (newest first). */
export function sortItems(items) {
  const at = (x) => parseToronto(x?.sendAt) || 0;
  const live = (x) => x?.status === "scheduled" || x?.status === "sending";
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => (live(a) !== live(b) ? (live(a) ? -1 : 1) : live(a) ? at(a) - at(b) : at(b) - at(a)));
}

/** "Sent to 412 people" | "About 600 people" | "" */
export function reachText(item) {
  const n = (v) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Math.round(Number(v)) : null);
  const sent = n(item?.recipients);
  const est = n(item?.estimate);
  if (item?.status === "sent" && sent !== null) return `Sent to ${sent.toLocaleString("en-US")} ${sent === 1 ? "person" : "people"}`;
  if (est !== null && (item?.status === "scheduled" || item?.status === "sending")) return `About ${est.toLocaleString("en-US")} ${est === 1 ? "person" : "people"}`;
  return "";
}
