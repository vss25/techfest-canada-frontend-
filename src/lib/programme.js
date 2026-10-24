/* =========================================================
   /programme: TTFC 2026 at a glance (Oct 24 2026).
   The organiser: "Create a thetechfestival.com/programme page.
   This is summary of agenda, clickable view of speakers,
   exhibitors, breakfast, lunch, catalyst awards, gala dinner
   time." The page is src/pages/Programme.jsx; the pure parts
   are here: node --test src/lib/programme.test.mjs.

   Key times: the CxO Breakfast, lunch, the Catalyst Awards
   evening and the Gala Dinner of each day, read from the same
   agenda as /agenda (src/hooks/useAgenda.js: the CMS "session"
   docs staff edit in Admin › Website content › Agenda), so a
   moved session moves here too. While the live agenda isn't
   there (loading, or the CMS can't be read) — or a key item
   can't be found in it, e.g. renamed — the times below are shown
   instead (what the live agenda said on Oct 24 2026). The bundled
   src/data/agenda.js is older than that, so it is never used for
   key times. "Included with" is the Tickets page's public pass
   table (src/data/passFeatures.js), nothing more.

   Exhibitors: GET {API}/app/exhibitors (backend services/
   exhibitors.js): company, booth(s), zone, logo, website only.
========================================================= */

import { DAYS, formatTime12 } from "../data/agenda.js";
import { passesWith } from "../data/passFeatures.js";

/* ---------- key times ---------- */

/** The four key moments, in the order a session is offered to them (one session is one moment). */
export const KEY_MOMENTS = Object.freeze([
  Object.freeze({ key: "breakfast", label: "Breakfast", words: /\bbreakfast\b/i, feature: "2x CxO Breakfasts", name: () => "CxO Breakfast" }),
  Object.freeze({ key: "lunch", label: "Lunch", words: /\blunch(eon)?\b/i, feature: "2x Luncheons", name: (s) => clean(s.title) || "Lunch" }),
  Object.freeze({ key: "awards", label: "Catalyst Awards", words: /\bawards?\b/i, feature: "1x Awards Night", startOnly: true,
    name: (s) => { const t = clean(s.title) || "Awards Evening"; return /catalyst/i.test(t) ? t : `Catalyst ${t}`; } }),
  Object.freeze({ key: "gala", label: "Gala Dinner", words: /\bgala\b/i, feature: "1x Gala Dinner & Networking Reception", name: () => "Gala Dinner & Networking Reception" }),
]);
const MOMENT = Object.fromEntries(KEY_MOMENTS.map((m) => [m.key, m]));

/** What the live agenda showed on Oct 24 2026: used while it can't be read, and for a key item it no longer has. */
export const KEY_TIMES_FALLBACK = Object.freeze({
  1: Object.freeze([
    Object.freeze({ key: "breakfast", name: "CxO Breakfast", time: "07:55", endTime: "08:55" }),
    Object.freeze({ key: "lunch", name: "Networking Lunch", time: "12:35", endTime: "13:20" }),
    Object.freeze({ key: "awards", name: "Catalyst Awards Evening", time: "17:30", endTime: "" }),
  ]),
  2: Object.freeze([
    Object.freeze({ key: "breakfast", name: "CxO Breakfast", time: "07:55", endTime: "08:55" }),
    Object.freeze({ key: "lunch", name: "Lunch", time: "12:00", endTime: "12:45" }),
    Object.freeze({ key: "gala", name: "Gala Dinner & Networking Reception", time: "17:30", endTime: "19:30" }),
  ]),
});

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;
const okTime = (t) => typeof t === "string" && HHMM.test(t.trim());

/** Only meals, breaks and evening events can be key moments (a panel called "Lunch with AI" is not lunch). */
const isEventSlot = (s) => s?.isBreak === true || ["networking", "awards", "break"].includes(String(s?.format || ""));

/** The key moment a session is ("breakfast" | "lunch" | "awards" | "gala"), or "". */
export function momentOf(s) {
  if (!s || !isEventSlot(s)) return "";
  const text = `${clean(s.title)} ${clean(s.type)}`;
  const hit = KEY_MOMENTS.find((m) => m.words.test(text));
  return hit ? hit.key : "";
}

/** "7:55–8:55 AM", "11:30 AM–12:15 PM", "5:30 PM" (no end, or start only). */
export function timeRange(time, endTime, { startOnly = false } = {}) {
  const a = formatTime12(time);
  if (!a) return "";
  const b = !startOnly && endTime && endTime !== time ? formatTime12(endTime) : "";
  if (!b) return a;
  const [ta, pa] = a.split(" ");
  const [tb, pb] = b.split(" ");
  return pa === pb ? `${ta}–${tb} ${pb}` : `${a}–${b}`;
}

/** A session's time as the page shows it: a range, or the start only for a moment shown that way (the awards evening). */
export const sessionWhen = (s) => timeRange(s?.time, s?.endTime, { startOnly: !!MOMENT[momentOf(s)]?.startOnly });

function item(key, { name, time, endTime = "", stage = "", sessionId = "", description = "", fallback = false }) {
  const m = MOMENT[key];
  return {
    key, label: m.label, name, time, endTime: m.startOnly ? "" : endTime, when: timeRange(time, endTime, { startOnly: !!m.startOnly }),
    stage, sessionId, description, includedWith: passesWith(m.feature), fallback,
  };
}

/**
 * The key times of both days.
 *   sessions  useAgenda().sessions (agenda.js shape: { id, day, time, endTime, title, type, format, isBreak, stage, description })
 *   live      true when they are the CMS's (useAgenda().source === "cms"); otherwise the fallback times are shown
 * → { live, days: [{ day, label, date, longDate, items: [{ key, label, name, time, endTime, when, stage, sessionId,
 *     description, includedWith: ["Power", "Apex"], fallback }] }] }   items by time
 */
export function keyTimes(sessions = [], { live = false } = {}) {
  const days = [1, 2].map((day) => {
    const found = new Map();
    if (live) {
      const list = (Array.isArray(sessions) ? sessions : [])
        .filter((s) => s && Number(s.day) === day && okTime(s.time))
        .sort((a, b) => a.time.localeCompare(b.time));
      for (const s of list) {
        const key = momentOf(s);
        if (!key || found.has(key)) continue;
        const m = MOMENT[key];
        found.set(key, item(key, {
          name: m.name(s), time: s.time, endTime: okTime(s.endTime) ? s.endTime : "", stage: clean(s.stage),
          sessionId: String(s.id || ""), description: clean(s.description),
        }));
      }
    }
    for (const f of KEY_TIMES_FALLBACK[day]) {
      if (!found.has(f.key)) found.set(f.key, item(f.key, { ...f, fallback: true }));
    }
    const items = [...found.values()].sort((a, b) => a.time.localeCompare(b.time));
    return { day, label: DAYS[day].label, date: DAYS[day].date, longDate: DAYS[day].longDate, items };
  });
  return { live: !!live && days.some((d) => d.items.some((i) => !i.fallback)), days };
}

/* ---------- the agenda summary ---------- */

/** "Morning" (before noon), "Afternoon" (before 5 PM), "Evening". */
export function partOfDay(time) {
  const h = Number(String(time || "").split(":")[0]);
  if (!Number.isFinite(h) || h < 12) return "Morning";
  return h < 17 ? "Afternoon" : "Evening";
}

/** One day's sessions by time, in parts of the day: [{ part: "Morning", sessions: [...] }, …]. */
export function dayParts(sessions = [], day) {
  const list = (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s && Number(s.day) === Number(day) && okTime(s.time) && clean(s.title))
    .sort((a, b) => a.time.localeCompare(b.time) || String(a.id).localeCompare(String(b.id)));
  const out = [];
  for (const s of list) {
    const part = partOfDay(s.time);
    if (!out.length || out[out.length - 1].part !== part) out.push({ part, sessions: [] });
    out[out.length - 1].sessions.push(s);
  }
  return out;
}

/** The people on a session for one line: up to `max` speaker names, "+N more", and the moderator. */
export function peopleLine(s, max = 3) {
  const names = (s?.speakers || []).map((p) => clean(p?.name)).filter(Boolean);
  const mod = clean(s?.moderator?.name);
  const shown = names.slice(0, max);
  return { names: shown, more: Math.max(0, names.length - shown.length), moderator: mod };
}

/** How many sessions (not breaks or meals) a day has. */
export const sessionCount = (sessions = [], day) => (Array.isArray(sessions) ? sessions : []).filter((s) => s && Number(s.day) === Number(day) && !s.isBreak).length;

/* ---------- speakers ---------- */

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Does a CMS speaker match the search (name, organisation or title; accents and case ignored)? */
export function speakerMatches(doc, q) {
  const needle = fold(q);
  if (!needle) return true;
  return [doc?.name, doc?.company, doc?.title].some((v) => fold(v).includes(needle));
}

/* ---------- exhibitors ---------- */

export const DEFAULT_ZONES = Object.freeze([
  Object.freeze({ key: "A", name: "Zone A", area: "Harbour Ballroom Foyer", booths: "1–15" }),
  Object.freeze({ key: "B", name: "Zone B", area: "Pier 4 & 5 Foyer", booths: "16–25" }),
]);

const https = (u) => (/^https:\/\/[^\s"'<>]+$/i.test(clean(u)) ? clean(u) : "");
const web = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(clean(u)) ? clean(u) : "");

/** GET /api/app/exhibitors's answer → { zones, exhibitors } with only well-formed entries and safe links. */
export function exhibitorsFrom(payload) {
  const zones = (Array.isArray(payload?.zones) && payload.zones.length ? payload.zones : DEFAULT_ZONES)
    .filter((z) => z && clean(z.key))
    .map((z) => ({ key: clean(z.key), name: clean(z.name) || `Zone ${clean(z.key)}`, area: clean(z.area), booths: clean(z.booths) }));
  const exhibitors = (Array.isArray(payload?.exhibitors) ? payload.exhibitors : [])
    .filter((x) => x && clean(x.name) && clean(x.booth))
    .map((x) => ({
      key: clean(x.key) || fold(x.name), name: clean(x.name), booth: clean(x.booth),
      booths: (Array.isArray(x.booths) && x.booths.length ? x.booths : [x.booth]).map(clean).filter(Boolean),
      zone: clean(x.zone), logo: https(x.logo), website: web(x.website),
    }));
  return { zones, exhibitors };
}

/** Exhibitors in their zones (the order of `zones`), then any without one: [{ key, name, area, booths, items }]. */
export function byZone({ zones = DEFAULT_ZONES, exhibitors = [] } = {}) {
  const known = new Set(zones.map((z) => z.key));
  const groups = zones.map((z) => ({ ...z, items: exhibitors.filter((x) => x.zone === z.key) }));
  const rest = exhibitors.filter((x) => !known.has(x.zone));
  if (rest.length) groups.push({ key: "other", name: "Elsewhere at the venue", area: "", booths: "", items: rest });
  return groups.filter((g) => g.items.length);
}

/** "Booth 7", "Booths 7 & 8". */
export const boothLabel = (x) => `${(x?.booths || []).length > 1 ? "Booths" : "Booth"} ${clean(x?.booth)}`;

/** The letter drawn when there's no logo: the first letter or digit of the name. */
export function initialOf(name) {
  const m = /[\p{L}\p{N}]/u.exec(String(name ?? "").normalize("NFC"));
  return m ? m[0].toUpperCase() : "?";
}

/** "acme.example" from "https://www.acme.example/about" (for the link's text). */
export function siteLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./i, ""); } catch { return ""; }
}

/** Reads the list. → { zones, exhibitors }; throws on a network error or a non-200 answer. `fetchImpl` for tests. */
export async function loadExhibitors(api, { fetchImpl = globalThis.fetch, signal } = {}) {
  const res = await fetchImpl(`${String(api).replace(/\/+$/, "")}/app/exhibitors`, { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`exhibitors ${res.status}`);
  return exhibitorsFrom(await res.json());
}
