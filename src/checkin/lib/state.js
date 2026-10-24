import { GROUPS, groupOf, noPassOf } from "./passColors.js";
import { eventDayInfo, stationStates as localStationStates } from "./stationTime.js";
import { isUnknownKey, unknownKey } from "./special.js";

/* =========================================================
   TTFC Check-in: what a device knows, and how it changes
   ---------------------------------------------------------
   A snapshot from the server (GET /api/checkin/desk/snapshot: guests,
   today's marks, notes, booths, media queries, the stations' windows,
   a cursor), then events (the live stream or the polling fallback,
   each with the rows it changed). Applying the same event twice, or
   events out of order, ends the same: a mark row only replaces the one
   held when its `rev` is higher; a guest's pass collected, desk note
   and inclusions only change for an event newer (by `seq`) than the
   last one applied to them (or than the snapshot's cursor); events
   already seen (by `seq`) are skipped.

   Marks are per Toronto day. The device works out today itself too
   (rollDay, from the server-corrected clock): offline at the start of
   Day 2 it drops Day 1's marks (a guest's pass collected stays) so
   returning guests can be marked again.

   A guest's status for a point today is the earliest set mark among
   their passes (`keys`). Taps waiting in the device's queue (offline,
   or not answered yet) are shown on top ("pending"), and an undo
   waiting in the queue hides what it undoes.

   NO DETAILS FOUND arrivals (lib/special.js, contract C8): the lobby
   couldn't find the person; the server's unknown_arrival event opens a
   card at the pass desk (s.unknowns, keyed "u:<clientId>"), closed by
   unknown_done (Sent to help desk / Pass issued / Left), unknown_link
   (staff found the guest: that guest's arrived mark comes with it) or
   an undo. Each card only changes for a newer event.

   Counters: each person once, in one colour group (passColors.js:
   VIP > Media > Speaker > pass type), so the groups and the ISSUE PASS
   line (on the list, no pass on file: never in a pass type's count)
   add up to the total; Media, VIP and Exhibitor also counted as yes /
   no marks (overlapping the groups). NO DETAILS FOUND arrivals are
   their own count (never in the totals).
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
    unknowns: new Map(),
    booths: snap.booths || [],
    boothByKey: new Map(),
    attendance: snap.attendance || [],
    seen: prev?.seen || new Set(),
    version: (prev?.version || 0) + 1,
    // The snapshot holds everything up to its cursor: older pass / note / inclusions events never undo it.
    baseCursor: Number(snap.cursor) || 0,
    lastSeq: new Map(),
    maxSeq: Number(snap.cursor) || 0,
  };
  setGuests(s, snap.guests || []);
  for (const b of s.booths) s.boothByKey.set(b.key, b);
  for (const m of snap.marks || []) putMark(s, m);
  for (const q of snap.queries || []) s.queries.set(q.id, q);
  for (const u of snap.unknowns || []) {
    const key = u?.key || (u?.clientId ? unknownKey(u.clientId) : "");
    if (isUnknownKey(key) && sameDay(s, u.day, u.at)) s.unknowns.set(key, unknownFrom(u, key));
  }
  return s;
}

/** A NO DETAILS FOUND card from the server (snapshot row or unknown_arrival event). */
function unknownFrom(u, key) {
  const status = u.undone ? "undone" : u.status || (u.outcome ? u.outcome : "open");
  return {
    key, clientId: key.slice(2), name: String(u.name || "").slice(0, 80), company: String(u.company || "").slice(0, 80), note: String(u.note || "").slice(0, 200),
    at: u.at || null, byName: u.byName || u.by?.name || "", station: u.station || "lobby", status, outcome: u.outcome || "", doneAt: u.doneAt || null, doneBy: u.doneBy || "", guestKey: u.guestKey || "",
  };
}
const sameDay = (s, day, at) => !s.today?.date || (day ? day === s.today.date : !at || torontoDay(at) === s.today.date);

function setGuests(s, guests) {
  s.guests = guests;
  s.byKey = new Map();
  for (const g of guests) for (const k of g.keys?.length ? g.keys : [g.key]) s.byKey.set(k, g);
}

const keysOf = (g) => (g?.keys?.length ? g.keys : g?.key ? [g.key] : []);

/**
 * A guest's row as the server sent it with a guest / inclusions event (ev.guest: the row after a staff change, cut to
 * what this sign-in may see), put in place of the row(s) it replaces (any guest holding one of its keys: a new main
 * pass moves the key). Fields a newer event already changed (pass collected, inclusions) keep the newer value.
 * → { added } (true: none of its keys was on this device: a new guest).
 */
function putGuest(s, row, seq) {
  const keys = keysOf(row);
  const old = [...new Set(keys.map((k) => s.byKey.get(k)).filter(Boolean))];
  const g = { ...row };
  const main = old.find((x) => x.key === row.key) || old[0] || null;
  if (main) {
    for (const [field, k] of [["pass", `pass|${main.key}`], ["inc", `inc|${main.key}`]]) {
      if (!((s.lastSeq.get(k) || 0) > seq)) continue;
      if (field === "pass") { g.passCollected = main.passCollected; g.passCollectedAt = main.passCollectedAt; }
      else { g.extras = main.extras; if (main.extrasView) g.extrasView = main.extrasView; }
    }
    // A new main pass (a new key): the newer-than records and the desk note move with the guest.
    if (main.key !== g.key) {
      for (const p of ["pass", "inc", "note", "guest"]) {
        const from = s.lastSeq.get(`${p}|${main.key}`);
        if (from && !((s.lastSeq.get(`${p}|${g.key}`) || 0) > from)) s.lastSeq.set(`${p}|${g.key}`, from);
      }
      if (s.notes[main.key] && !s.notes[g.key]) s.notes[g.key] = s.notes[main.key];
    }
  }
  const gone = new Set(old);
  const list = s.guests.filter((x) => !gone.has(x));
  // In the old row's place (screens keep their order), else at the end.
  const at = main ? s.guests.indexOf(main) - s.guests.slice(0, s.guests.indexOf(main)).filter((x) => gone.has(x)).length : -1;
  if (at >= 0) list.splice(at, 0, g); else list.push(g);
  setGuests(s, list);
  return { added: !main };
}

/** Is this event newer than the last one applied to `k` (a guest's pass, note or inclusions)? Then it's the last one. */
function newer(s, k, seq) {
  const have = s.lastSeq.has(k) ? s.lastSeq.get(k) : s.baseCursor || 0;
  if (!(seq > have)) return false;
  s.lastSeq.set(k, seq);
  return true;
}

/**
 * Staff just changed a guest's inclusions here: events older than the change (up to `upTo`, the newest event seen when
 * it was asked for; default: the newest seen now) don't undo it. Newer ones (the change's own event) apply.
 */
export function heldInclusions(s, key, upTo = s?.maxSeq) {
  if (s && key) s.lastSeq.set(`inc|${key}`, Math.max(Number(upTo) || 0, s.lastSeq.get(`inc|${key}`) || 0));
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
    if (ev.seq > (s.maxSeq || 0)) s.maxSeq = ev.seq;
    for (const m of ev.marks || []) if (putMark(s, m)) changed = true;
    if (ev.pass?.key) {
      const g = s.byKey.get(ev.pass.key);
      if (g && (g.keys?.length <= 1 || g.key === ev.pass.key) && newer(s, `pass|${g.key}`, ev.seq)) {
        g.passCollected = !!ev.pass.collected;
        g.passCollectedAt = ev.pass.collected ? ev.pass.collectedAt || g.passCollectedAt || null : null;
        changed = true;
      }
    }
    if (ev.kind === "note") {
      const g = s.byKey.get(ev.key);
      const k = g ? g.key : ev.key;
      if (newer(s, `note|${k}`, ev.seq)) {
        if (ev.note) s.notes[k] = { text: ev.note, by: ev.by?.name || "", at: ev.at };
        else delete s.notes[k];
        changed = true;
      }
    }
    // Staff changed a guest (Admin › People, the desk app's switches): the row the event carries goes in place (the
    // guest's inclusions are any counting pass's, worked out on the server); without one, the list is loaded again.
    if ((ev.kind === "guest" || ev.kind === "inclusions") && ev.guest && typeof ev.guest === "object" && ev.guest.key) {
      if (newer(s, `guest|${ev.guest.key}`, ev.seq)) {
        const { added } = putGuest(s, ev.guest, ev.seq);
        if (ev.kind === "inclusions") s.lastSeq.set(`inc|${ev.guest.key}`, Math.max(ev.seq, s.lastSeq.get(`inc|${ev.guest.key}`) || 0));
        // A new guest (a pass just given): the list is read again too, so a row it replaces under another key (ISSUE
        // PASS: on the list with no pass, now with one) goes.
        if (added) refresh = true;
        changed = true;
      }
    } else if (ev.kind === "inclusions") {
      const g = s.byKey.get(ev.key);
      if (g && g.key === ev.key && ev.extras) {
        if (newer(s, `inc|${g.key}`, ev.seq)) {
          g.extras = { ...ev.extras };
          if (ev.extrasView) g.extrasView = ev.extrasView;
          changed = true;
        }
      } else if (g) refresh = true;
    } else if (ev.kind === "guest") refresh = true;
    const evKind = ev.kind || ev.type;
    if (evKind === "unknown_arrival" || evKind === "unknown_done" || evKind === "unknown_link" || (evKind === "undo" && isUnknownKey(ev.key || ev.target || ""))) {
      const key = isUnknownKey(ev.key) ? ev.key : isUnknownKey(ev.target) ? ev.target : ev.clientId && evKind === "unknown_arrival" ? unknownKey(ev.clientId) : "";
      // Only an arrival is checked against today; a close / link / undo applies to the card its key names, whenever.
      if (key && (evKind !== "unknown_arrival" || sameDay(s, ev.day, ev.at)) && newer(s, `unk|${key}`, ev.seq)) {
        const have = s.unknowns.get(key);
        if (evKind === "unknown_arrival") {
          const u = unknownFrom(ev, key);
          s.unknowns.set(key, u);
          if (u.status === "open" && (live || now - ms(ev.at) <= RECENT_ARRIVAL_MS)) arrivals.push({ unknown: u, at: u.at, by: u.byName, seq: ev.seq, station: u.station });
        } else if (have) {
          have.status = evKind === "undo" ? "undone" : evKind === "unknown_link" ? "linked" : ev.outcome || "done";
          have.outcome = evKind === "unknown_done" ? ev.outcome || "" : have.outcome;
          have.guestKey = ev.guestKey || have.guestKey;
          have.doneAt = ev.at || null;
          have.doneBy = ev.byName || ev.by?.name || "";
        }
        changed = true;
      }
    }
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

/**
 * The device's state as a snapshot again (fromSnapshot reads it back): what live events changed since the last list
 * load included (a pass collected, marks, notes, inclusions, queries, NO DETAILS FOUND cards) and the cursor they reach.
 * lib/desk.js keeps it on the device (without staff-only fields), so a reopen offline has it.
 */
export function toSnapshot(s) {
  return {
    user: s.me, staff: s.staff, today: s.today, cursor: s.cursor, stations: s.stations, windows: s.windows, stationStates: s.stationStates,
    agendaRead: s.agendaRead, guests: s.guests, booths: s.booths, marks: [...s.marks.values()], notes: { ...s.notes },
    queries: [...s.queries.values()], unknowns: [...(s.unknowns?.values() || [])].filter((u) => u.status !== "undone"),
  };
}

/* ---------- Today, on the device ---------- */

/**
 * The device's own idea of today (from `now`, the server-corrected clock), when it's later than the state's: offline at
 * the start of Day 2, Day 1's marks go (each day's statuses start empty; a guest's pass collected stays: "Has pass"),
 * today and the stations' states are worked out here (lib/stationTime.js). → true if the day changed. Mutates `s`.
 */
export function rollDay(s, now = Date.now()) {
  if (!s?.today?.date) return false;
  const info = eventDayInfo(now);
  if (!(info.date > s.today.date)) return false;
  s.today = info;
  for (const [k, m] of s.marks) if (m.day !== info.date) s.marks.delete(k);
  for (const [k, u] of s.unknowns || []) if (!u.at || torontoDay(u.at) !== info.date) s.unknowns.delete(k);
  const keys = (s.stations || []).map((x) => x.key).filter(Boolean);
  s.stationStates = localStationStates(s.windows, now, keys.length ? keys : undefined);
  s.dayFromDevice = true;
  s.version += 1;
  return true;
}

/* ---------- Status ---------- */

/**
 * A guest's marks today, the queue's taps on top: { arrived, checked_in, cxo, … } each a mark ({ at, by, station,
 * override, note, pending? }) or null. `pending`: the device's queued taps ({ clientId, kind, point, key, clientAt, ref }).
 */
export function statusOf(s, g, pending = [], me = s.me) {
  const out = {};
  const keys = g.keys?.length ? g.keys : [g.key];
  const today = s.today?.date || "";
  const q = prepPending(pending, today);
  const resets = [];
  for (const k of keys) for (const pt of q.resets.get(k) || []) resets.push(pt);
  for (const point of POINTS) {
    let best = null;
    for (const k of keys) {
      const m = s.marks.get(mkey(k, point));
      if (!m || !m.at || q.undone.has(m.ref) || (today && m.day && m.day !== today)) continue;
      if (!best || ms(m.at) < ms(best.at)) best = m;
    }
    if (best && (resets.includes(point) || (point === "checked_in" && resets.includes("arrived")))) best = null;
    out[point] = best;
  }
  for (const k of keys) {
    for (const p of q.marks.get(k) || []) {
      if (q.undone.has(p.clientId)) continue;
      const by = p.queuedBy?.name ? { id: p.queuedBy.id, name: p.queuedBy.name } : me ? { id: me.id, name: me.name } : null;
      const virt = { at: p.clientAt, by, station: p.station, override: p.override ? "outside_window" : "", note: p.note || "", ref: p.clientId, pending: true, practice: !!today && !s.today?.eventDay };
      if (!out[p.point]) out[p.point] = virt;
      if (p.point === "checked_in" && !out.arrived) out.arrived = virt;
    }
  }
  return out;
}

/* The queue's taps, sorted once per list of them (a screen asks statusOf for every guest with the same list). */
const prepCache = new WeakMap();
function prepPending(pending, today) {
  const hit = pending && typeof pending === "object" ? prepCache.get(pending) : null;
  if (hit && hit.today === today) return hit;
  const undone = new Set();
  const resets = new Map();
  const marks = new Map();
  for (const p of pending || []) {
    if (!p) continue;
    if (p.kind === "undo") { if (p.target || p.ref) undone.add(p.target || p.ref); continue; }
    if (p.kind === "reset") { if (!resets.has(p.key)) resets.set(p.key, []); resets.get(p.key).push(p.point); continue; }
    // Staff found a NO DETAILS FOUND arrival on the list: that guest has arrived.
    if (p.kind === "unknown_link" && p.guestKey) {
      if (!marks.has(p.guestKey)) marks.set(p.guestKey, []);
      marks.get(p.guestKey).push({ ...p, kind: "mark", point: "arrived", key: p.guestKey });
      continue;
    }
    if (p.kind !== "mark") continue;
    // A tap made on another day (queued offline yesterday) isn't today's mark.
    if (today && p.clientAt && torontoDay(p.clientAt) !== today) continue;
    if (!marks.has(p.key)) marks.set(p.key, []);
    marks.get(p.key).push(p);
  }
  const out = { today, undone, resets, marks };
  if (pending && typeof pending === "object") prepCache.set(pending, out);
  return out;
}
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" });
const torontoDay = (at) => { const t = ms(at); return Number.isFinite(t) ? dayFmt.format(new Date(t)) : ""; };
const POINTS = ["arrived", "checked_in", "cxo", "lunch", "evening", "media", "av", "exhibitor", "flag_cxo", "flag_lunch", "flag_evening"];

/** A booth's "set up" mark today (queue on top). */
export function boothStatus(s, booth, pending = [], me = s.me) {
  const today = s.today?.date || "";
  const q = prepPending(pending, today);
  const m = s.marks.get(mkey(booth.key, "booth"));
  if (m?.at && !q.undone.has(m.ref) && !(today && m.day && m.day !== today)) return m;
  const p = (q.marks.get(booth.key) || []).find((x) => x.point === "booth" && !q.undone.has(x.clientId));
  const by = p?.queuedBy?.name ? { id: p.queuedBy.id, name: p.queuedBy.name } : me ? { id: me.id, name: me.name } : null;
  return p ? { at: p.clientAt, by, station: p.station, ref: p.clientId, pending: true } : null;
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
  const d = torontoDay(g.passCollectedAt);
  return !!today?.date && !!d && d < today.date;
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
  const issuePass = emptyLine();
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
    // On the list with no pass on file: their own line, never a pass type's.
    if (noPassOf(g)) add(issuePass);
    else add(groups[groupOf(g)]);
    if (g.marks?.vip) add(marks.vip);
    if (g.marks?.media) add(marks.media);
    if (g.marks?.exhibitor) add(marks.exhibitor);
  }
  const out = { totals, groups: GROUPS.filter((k) => groups[k].total > 0).map((k) => ({ group: k, ...groups[k] })), marks, issuePass };
  if (station === "lobby" || station === "desk") out.unknown = unknownCounts(s, pending);
  if (station === "exhibitor") {
    out.booths = { total: s.booths.length, setUp: s.booths.filter((b) => boothStatus(s, b, pending)).length };
  }
  if (station === "media") out.queriesOpen = [...s.queries.values()].filter((q) => q.status !== "done").length;
  return out;
}

/** Latest first, each time read once. */
const latestFirst = (list, at) => list.map((x) => [ms(at(x)) || 0, x]).sort((a, b) => b[0] - a[0]).map((p) => p[1]);

/* ---------- NO DETAILS FOUND arrivals ---------- */

/**
 * Today's NO DETAILS FOUND arrivals, the queue on top: the server's, plus this device's taps not answered yet; a queued
 * undo / unknown_done / unknown_link closes one here at once. → [{ key, name, company, note, at, byName, status,
 * pending? }] newest first (`open`: only those still waiting at the pass desk).
 */
export function unknownsOf(s, pending = [], { open = false } = {}) {
  const closing = new Set();
  const undone = new Set();
  for (const p of pending || []) {
    if ((p.kind === "unknown_done" || p.kind === "unknown_link") && p.target) closing.add(p.target);
    if (p.kind === "undo" && (p.target || p.ref)) undone.add(p.target || p.ref);
  }
  const out = [];
  for (const u of s.unknowns?.values() || []) {
    if (u.status === "undone" || undone.has(u.clientId)) continue;
    const status = closing.has(u.key) ? "closing" : u.status;
    if (open && status !== "open") continue;
    out.push(status === u.status ? u : { ...u, status });
  }
  const today = s.today?.date || "";
  for (const p of pending || []) {
    if (p.kind !== "unknown_arrival" || undone.has(p.clientId)) continue;
    const key = unknownKey(p.clientId);
    if (s.unknowns?.has(key) || (today && p.clientAt && torontoDay(p.clientAt) !== today)) continue;
    const status = closing.has(key) ? "closing" : "open";
    if (open && status !== "open") continue;
    out.push({ key, clientId: p.clientId, name: p.name, company: p.company || "", note: p.note || "", at: p.clientAt, byName: p.queuedBy?.name || "", station: p.station, status, pending: true });
  }
  return latestFirst(out, (u) => u.at);
}

/** NO DETAILS FOUND today: { total, open } (never in the pass-type totals). */
export function unknownCounts(s, pending = []) {
  const all = unknownsOf(s, pending);
  return { total: all.length, open: all.filter((u) => u.status === "open").length };
}

/** Guests on the way up (arrived today, not checked in), newest arrival first. */
export function onTheWay(s, pending = []) {
  const out = [];
  for (const g of s.guests) {
    const st = statusOf(s, g, pending);
    if (st.arrived && !st.checked_in) out.push({ g, st });
  }
  return latestFirst(out, (x) => x.st.arrived.at);
}

/** Guests checked in today, latest first (`limit`: how many; the full count is the list's length with Infinity). */
export function checkedInToday(s, pending = [], limit = 200) {
  const out = [];
  for (const g of s.guests) {
    const st = statusOf(s, g, pending);
    if (st.checked_in) out.push({ g, st });
  }
  return latestFirst(out, (x) => x.st.checked_in.at).slice(0, limit);
}

/** Today's taps at a point, latest first (the lobby's recent arrivals, a meal station's admitted list). */
export function markedToday(s, point, pending = [], limit = 30) {
  const out = [];
  for (const g of s.guests) {
    const st = statusOf(s, g, pending);
    if (st[point]) out.push({ g, st, m: st[point] });
  }
  return latestFirst(out, (x) => x.m.at).slice(0, limit);
}
