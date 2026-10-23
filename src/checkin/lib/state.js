import { GROUPS, groupOf } from "./passColors.js";

/* =========================================================
   TTFC Check-in: what a device knows, and how it changes
   ---------------------------------------------------------
   A snapshot from the server (GET /api/checkin/desk/snapshot: guests,
   today's marks, notes, booths, media queries, the stations' windows,
   a cursor), then events (the live stream or the polling fallback,
   each with the rows it changed). Applying the same event twice, or
   events out of order, ends the same: a mark row only replaces the one
   held when its `rev` is higher; events already seen (by `seq`) are
   skipped.

   A guest's status for a point today is the earliest set mark among
   their passes (`keys`). Taps waiting in the device's queue (offline,
   or not answered yet) are shown on top ("pending"), and an undo
   waiting in the queue hides what it undoes.

   Counters: each person once, in one colour group (passColors.js:
   VIP > Media > Speaker > pass type), so the groups add up to the
   total; Media, VIP and Exhibitor also counted as yes / no marks
   (overlapping the groups).
   Pure; node --test src/checkin/lib/state.test.mjs
========================================================= */

/** What each station's big button records. */
export const STATION_POINT = Object.freeze({
  lobby: "arrived", desk: "checked_in", breakfast: "cxo", lunch: "lunch", evening: "evening", media: "media", av: "av", exhibitor: "exhibitor",
});
export const MEAL_STATIONS = Object.freeze(["breakfast", "lunch", "evening"]);
export const FLAG_POINT = Object.freeze({ breakfast: "flag_cxo", lunch: "flag_lunch", evening: "flag_evening" });
/** Arrivals still on the way up are announced after a reconnect if they're this recent. */
export const RECENT_ARRIVAL_MS = 5 * 60 * 1000;
const SEEN_MAX = 4000;

const ms = (d) => { const n = d ? new Date(d).getTime() : NaN; return Number.isFinite(n) ? n : NaN; };
const mkey = (key, point) => `${key}|${point}`;

/** A fresh device state from a snapshot. `clientNow`: the device's clock when it arrived. */
export function fromSnapshot(snap, { clientNow = Date.now(), prev = null } = {}) {
  const s = {
    me: snap.user || null,
    staff: !!snap.staff,
    today: snap.today || null,
    serverOffset: ms(snap.serverTime) - clientNow || 0,
    cursor: Number(snap.cursor) || 0,
    stations: snap.stations || [],
    windows: snap.windows || {},
    stationStates: snap.stationStates || {},
    agendaRead: !!snap.agendaRead,
    guests: [],
    byKey: new Map(),
    marks: new Map(),
    notes: { ...(snap.notes || {}) },
    queries: new Map(),
    booths: snap.booths || [],
    boothByKey: new Map(),
    attendance: snap.attendance || [],
    seen: prev?.seen || new Set(),
    version: (prev?.version || 0) + 1,
  };
  setGuests(s, snap.guests || []);
  for (const b of s.booths) s.boothByKey.set(b.key, b);
  for (const m of snap.marks || []) putMark(s, m);
  for (const q of snap.queries || []) s.queries.set(q.id, q);
  return s;
}

function setGuests(s, guests) {
  s.guests = guests;
  s.byKey = new Map();
  for (const g of guests) for (const k of g.keys?.length ? g.keys : [g.key]) s.byKey.set(k, g);
}

/** Keep a mark if it's for today and newer than the one held. */
function putMark(s, m) {
  if (!m || !m.key || !m.point) return false;
  if (s.today?.date && m.day && m.day !== s.today.date) return false;
  const k = mkey(m.key, m.point);
  const have = s.marks.get(k);
  if (have && (Number(have.rev) || 0) >= (Number(m.rev) || 0)) return false;
  s.marks.set(k, m);
  return true;
}

/**
 * Apply events (in any order, any number of times). Mutates `s`. → { changed, refresh, arrivals }
 *   refresh   the server said a guest changed (name, marks, pass): reload the snapshot
 *   arrivals  lobby arrivals to announce: [{ guest, at, by, seq }] (live ones; after a reconnect, recent ones still on the way up)
 */
export function applyEvents(s, events = [], { live = true, now = Date.now() } = {}) {
  let changed = false;
  let refresh = false;
  const arrivals = [];
  for (const ev of [...(events || [])].sort((a, b) => (a.seq || 0) - (b.seq || 0))) {
    if (!ev || !ev.seq || s.seen.has(ev.seq)) continue;
    s.seen.add(ev.seq);
    if (s.seen.size > SEEN_MAX) s.seen = new Set([...s.seen].slice(-SEEN_MAX / 2));
    for (const m of ev.marks || []) if (putMark(s, m)) changed = true;
    if (ev.pass?.key) {
      const g = s.byKey.get(ev.pass.key);
      if (g && (g.keys?.length <= 1 || g.key === ev.pass.key)) {
        g.passCollected = !!ev.pass.collected;
        g.passCollectedAt = ev.pass.collected ? ev.pass.collectedAt || g.passCollectedAt || null : null;
        changed = true;
      }
    }
    if (ev.kind === "note") {
      const g = s.byKey.get(ev.key);
      const k = g ? g.key : ev.key;
      if (ev.note) s.notes[k] = { text: ev.note, by: ev.by?.name || "", at: ev.at };
      else delete s.notes[k];
      changed = true;
    }
    if (ev.kind === "inclusions") {
      const g = s.byKey.get(ev.key);
      if (g && g.key === ev.key && ev.extras) {
        g.extras = { ...ev.extras };
        if (ev.extrasView) g.extrasView = ev.extrasView;
        changed = true;
      } else if (g) refresh = true;
    }
    if (ev.kind === "guest") refresh = true;
    if (ev.kind === "query" && ev.query) {
      const have = s.queries.get(ev.query.id);
      if (!have || (have.rev || 0) < (ev.query.rev || 0)) { s.queries.set(ev.query.id, ev.query); changed = true; }
    }
    if (ev.kind === "mark" && ev.point === "arrived" && ev.key) {
      const g = s.byKey.get(ev.key);
      const recent = now - ms(ev.at) <= RECENT_ARRIVAL_MS;
      if (g && (live || recent) && ev.station !== "scanner") {
        const st = statusOf(s, g);
        if (st.arrived && !st.checked_in) arrivals.push({ guest: g, at: st.arrived.at, by: ev.by?.name || "", seq: ev.seq, station: ev.station });
      }
    }
    if (ev.kind === "mark" && ev.key && !s.byKey.has(ev.key) && !s.boothByKey.has(ev.key)) refresh = true; // a guest this list doesn't have yet
  }
  if (changed) s.version += 1;
  return { changed, refresh, arrivals };
}

/* ---------- Status ---------- */

/**
 * A guest's marks today, the queue's taps on top: { arrived, checked_in, cxo, … } each a mark ({ at, by, station,
 * override, note, pending? }) or null. `pending`: the device's queued taps ({ clientId, kind, point, key, clientAt, ref }).
 */
export function statusOf(s, g, pending = [], me = s.me) {
  const out = {};
  const keys = g.keys?.length ? g.keys : [g.key];
  const undone = new Set(pending.filter((p) => p.kind === "undo").map((p) => p.ref));
  const resets = pending.filter((p) => p.kind === "reset" && keys.includes(p.key)).map((p) => p.point);
  for (const point of POINTS) {
    let best = null;
    for (const k of keys) {
      const m = s.marks.get(mkey(k, point));
      if (!m || !m.at || undone.has(m.ref)) continue;
      if (!best || ms(m.at) < ms(best.at)) best = m;
    }
    if (best && (resets.includes(point) || (point === "checked_in" && resets.includes("arrived")))) best = null;
    out[point] = best;
  }
  for (const p of pending) {
    if (p.kind !== "mark" || !keys.includes(p.key) || undone.has(p.clientId)) continue;
    const virt = { at: p.clientAt, by: me ? { id: me.id, name: me.name } : null, station: p.station, override: p.override ? "outside_window" : "", note: p.note || "", ref: p.clientId, pending: true };
    if (!out[p.point]) out[p.point] = virt;
    if (p.point === "checked_in" && !out.arrived) out.arrived = virt;
  }
  return out;
}
const POINTS = ["arrived", "checked_in", "cxo", "lunch", "evening", "media", "av", "exhibitor", "flag_cxo", "flag_lunch", "flag_evening"];

/** A booth's "set up" mark today (queue on top). */
export function boothStatus(s, booth, pending = [], me = s.me) {
  const undone = new Set(pending.filter((p) => p.kind === "undo").map((p) => p.ref));
  const m = s.marks.get(mkey(booth.key, "booth"));
  if (m?.at && !undone.has(m.ref)) return m;
  const p = pending.find((x) => x.kind === "mark" && x.point === "booth" && x.key === booth.key && !undone.has(x.clientId));
  return p ? { at: p.clientAt, by: me ? { id: me.id, name: me.name } : null, station: p.station, ref: p.clientId, pending: true } : null;
}

/** The lobby / pass desk line for a guest: "not_arrived" | "on_the_way" | "checked_in". */
export function deskStage(st) {
  if (st.checked_in) return "checked_in";
  if (st.arrived) return "on_the_way";
  return "not_arrived";
}

/** "Has pass (collected Mon)": collected on an earlier day than today. */
export function collectedBefore(g, today) {
  if (!g?.passCollected) return false;
  if (!g.passCollectedAt) return true;
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(g.passCollectedAt));
  return !!today?.date && d < today.date;
}

/* ---------- Counters ---------- */

const emptyLine = () => ({ total: 0, collected: 0, checkedIn: 0, arrived: 0, onTheWay: 0, entitled: 0, rsvpd: 0, admitted: 0, done: 0 });

/**
 * The counters for a station: totals, per colour group (each person once), and the yes / no marks.
 *   lobby / desk: holders, passes collected (ever), checked in today, arrived today, on the way up now
 *   meal stations: entitled to today's item, RSVP'd for it, admitted (item: { key, extra })
 *   media: media guests, checked in at the media desk; av: speakers with a session today, AV checked; exhibitor: exhibitors
 * → { totals, groups: [{ group, ...line }] (only non-empty), marks: { vip, media, exhibitor }, booths? }
 */
export function counters(s, station, { pending = [], item = null } = {}) {
  const totals = emptyLine();
  const groups = Object.fromEntries(GROUPS.map((g) => [g, emptyLine()]));
  const marks = { vip: emptyLine(), media: emptyLine(), exhibitor: emptyLine() };
  const meal = MEAL_STATIONS.includes(station);
  const eventDay = s.today?.eventDay || null;
  for (const g of s.guests) {
    if (station === "media" && !g.marks?.media) continue;
    if (station === "exhibitor" && !g.marks?.exhibitor) continue;
    if (station === "av" && !(g.marks?.speaker && (g.sessions || []).some((x) => x.day === eventDay))) continue;
    const st = statusOf(s, g, pending);
    const line = {
      total: 1,
      collected: g.passCollected ? 1 : 0,
      checkedIn: st.checked_in ? 1 : 0,
      arrived: st.arrived ? 1 : 0,
      onTheWay: st.arrived && !st.checked_in ? 1 : 0,
      entitled: meal && item ? (g.extras?.[item.extra] ? 1 : 0) : 0,
      rsvpd: meal && item ? (g.rsvp?.options?.includes(item.key) ? 1 : 0) : 0,
      admitted: meal ? (st[STATION_POINT[station]] ? 1 : 0) : 0,
      done: !meal && station !== "lobby" && station !== "desk" ? (st[STATION_POINT[station]] ? 1 : 0) : 0,
    };
    const add = (into) => { for (const k of Object.keys(line)) into[k] += line[k]; };
    add(totals);
    add(groups[groupOf(g)]);
    if (g.marks?.vip) add(marks.vip);
    if (g.marks?.media) add(marks.media);
    if (g.marks?.exhibitor) add(marks.exhibitor);
  }
  const out = { totals, groups: GROUPS.filter((k) => groups[k].total > 0).map((k) => ({ group: k, ...groups[k] })), marks };
  if (station === "exhibitor") {
    out.booths = { total: s.booths.length, setUp: s.booths.filter((b) => boothStatus(s, b, pending)).length };
  }
  if (station === "media") out.queriesOpen = [...s.queries.values()].filter((q) => q.status !== "done").length;
  return out;
}

/** Guests on the way up (arrived today, not checked in), newest arrival first. */
export function onTheWay(s, pending = []) {
  const out = [];
  for (const g of s.guests) {
    const st = statusOf(s, g, pending);
    if (st.arrived && !st.checked_in) out.push({ g, st });
  }
  return out.sort((a, b) => ms(b.st.arrived.at) - ms(a.st.arrived.at));
}

/** Guests checked in today, latest first. */
export function checkedInToday(s, pending = [], limit = 200) {
  const out = [];
  for (const g of s.guests) {
    const st = statusOf(s, g, pending);
    if (st.checked_in) out.push({ g, st });
  }
  return out.sort((a, b) => ms(b.st.checked_in.at) - ms(a.st.checked_in.at)).slice(0, limit);
}

/** Today's taps at a point, latest first (the lobby's recent arrivals, a meal station's admitted list). */
export function markedToday(s, point, pending = [], limit = 30) {
  const out = [];
  for (const g of s.guests) {
    const st = statusOf(s, g, pending);
    if (st[point]) out.push({ g, st, m: st[point] });
  }
  return out.sort((a, b) => ms(b.m.at) - ms(a.m.at)).slice(0, limit);
}
