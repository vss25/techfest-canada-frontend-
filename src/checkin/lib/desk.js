import { useSyncExternalStore } from "react";
import { ApiError, PASSWORD_REQUIRED, PASSWORD_REQUIRED_TEXT, api, getSession, onSession, setAuthProblemHandler, setServerTimeObserver, setSession, signIn as apiSignIn } from "./api.js";
import { createClock } from "./clock.js";
import { createLive } from "./live.js";
import { browserStorage, createQueue } from "./queue.js";
import { createTabs } from "./tabs.js";
import { applyEvents, fromSnapshot, heldInclusions, rollDay, statusOf, unknownsOf } from "./state.js";
import { stationStates as localStationStates } from "./stationTime.js";
import { bannerText, createBanners, notifyStations } from "./notify.js";
import { badgeOf, noPassOf } from "./passColors.js";
import { describeTap, signOutText } from "./tapText.js";
import { NO_DETAILS, unknownArrivalAction, unknownDoneAction, unknownKey, unknownLinkAction } from "./special.js";
import { RESUME_KEY, SNAPSHOT_KEY, chime, letSleep, onAudio, remember, setCount, stationStore } from "./device.js";
import { UNDO_MS } from "./constants.js";

/* =========================================================
   TTFC Check-in: the running app (one per page)
   ---------------------------------------------------------
   Holds the device's state (lib/state.js), the queue of taps
   (lib/queue.js), the live connection (lib/live.js), the banners per
   station (lib/notify.js), the toasts and the Needs attention list,
   and tells the screens when anything changed (useDesk). The last
   snapshot is kept on the device (without staff-only fields: emails,
   ticket IDs), so the app opens with the guest list even with no
   connection; the live connection then starts at once on that copy.
   • Time: the server's clock on this device (lib/clock.js) stamps
     every tap; today and the stations' states are worked out here too
     when the server can't be asked (offline at the start of Day 2,
     offline across a station's hours).
   • Who made a tap: each queued tap carries queuedBy (the person
     signed in when it was tapped, as the server named them at sign-in),
     so taps sent after a shift change are still recorded as theirs
     (contract C3). "Admit anyway" / "Try again" are the person deciding
     now: theirs.
   • One sign-in at a time: anything still on its way for an earlier
     sign-in (a list download during a shift change) is never applied
     to the next one.
   • A staff sign-in left unused for 30 minutes locks (password again),
     after a reload or a Home Screen relaunch too (the last use is kept
     with the sign-in).
   • Sign out: the person's taps are sent first (with a connection), then
     the sign-in, the cached list and everything in memory go.
========================================================= */

const listeners = new Set();
let version = 0;
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function emit() {
  version += 1;
  syncPresence();
  listeners.forEach((fn) => fn());
}

export const desk = {
  session: getSession(),
  state: null,
  station: stationStore.get(),
  conn: "reconnecting",
  loading: false,
  loadError: "",
  needSignIn: false,
  queueItems: [],
  toasts: [],
  myTaps: new Map(),
  banners: { desk: createBanners(), av: createBanners(), exhibitor: createBanners(), media: createBanners() },
  started: false,
  picked: false,
  /** Every tap written to the device's storage? (false: "Not saved on this device") */
  persistOk: true,
  /** The Needs attention list (refused taps) is open. */
  trayOpen: false,
  /** Other tabs / windows on this device with this station open. */
  othersHere: 0,
  /** The last arrival at this station (the screen flashes): { seq, bg }. */
  flash: null,
  /** Today worked out on the device (offline at the start of a new day): today's list from the server isn't in yet. */
  dayStale: false,
  /** A staff sign-in left unused for 30 minutes: the screen asks for the password again. */
  locked: false,
  /** Why the sign-in screen is showing ("password", "idle"), and what to say. */
  endedReason: "",
  authNotice: "",
  signingOut: false,
  confirm: null,
};

/** The screens re-render whenever the desk changes. */
export function useDesk() {
  useSyncExternalStore(subscribe, () => version);
  return desk;
}
export const deskVersion = () => version;

/* ---------- The server's clock on this device ---------- */

const clock = createClock();
/** The server's clock (the device's, corrected). */
export const serverNow = () => clock.now();
setServerTimeObserver((t, sentAt, answeredAt) => clock.observe(t, sentAt, answeredAt));
// C1: this sign-in can't be used for the desk (a passwordless one): back to the sign-in screen.
setAuthProblemHandler((code) => { if (code === PASSWORD_REQUIRED) passwordRequired(); });
onAudio(() => emit());

/* ---------- Tabs and windows on this device ---------- */

const sessionStore = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* blocked */ } },
  remove: (k) => { try { sessionStorage.removeItem(k); } catch { /* blocked */ } },
};
const tabs = createTabs({
  storage: browserStorage, session: sessionStore, locks: (typeof navigator !== "undefined" && navigator.locks) || null,
  onChange: () => updateOthers(),
});
let presenceStation = null;
/** The station this page tells the other pages it runs ("" while signed out or picking). */
function syncPresence() {
  const st = desk.session?.token && desk.state && !desk.locked ? desk.station : "";
  if (st === presenceStation) return;
  presenceStation = st;
  tabs.setStation(st);
  desk.othersHere = st ? tabs.othersOnStation(st) : 0;
}
function updateOthers() {
  const n = presenceStation ? tabs.othersOnStation(presenceStation) : 0;
  if (n !== desk.othersHere) { desk.othersHere = n; emit(); }
}

/* ---------- Toasts ---------- */

let toastSeq = 0;
export function toast(text, { tone = "ok", action = null, ms = 6000, key = "", tapId = "" } = {}) {
  const id = ++toastSeq;
  // The newest refusal stays (it's also in Needs attention), plus the two newest others (the rows keep their own Undo).
  const next = [{ id, text, tone, action, key, tapId, until: Date.now() + ms }, ...desk.toasts.filter((t) => !key || t.key !== key)];
  const bad = next.filter((t) => t.tone === "bad").slice(0, 1);
  const rest = next.filter((t) => t.tone !== "bad").slice(0, 2);
  desk.toasts = next.filter((t) => bad.includes(t) || rest.includes(t));
  emit();
  setTimeout(() => { desk.toasts = desk.toasts.filter((t) => t.id !== id); emit(); }, ms);
  return id;
}
export function dismissToast(id) { desk.toasts = desk.toasts.filter((t) => t.id !== id); emit(); }

/* ---------- Queue of taps ---------- */

let failing = [];
let failTimer = null;
/** Refused taps: one toast for a batch of them ("3 taps not recorded · Review"); the list keeps every one. */
function noteFailure(item) {
  failing.push(item);
  // Not recorded: its "… · Undo" toast is wrong now (the refusal toast and Needs attention say what happened).
  desk.toasts = desk.toasts.filter((t) => t.tapId !== item.clientId);
  clearTimeout(failTimer);
  failTimer = setTimeout(() => {
    const list = failing;
    failing = [];
    if (!list.length) return;
    if (list.length === 1) {
      const it = list[0];
      const { who } = describeTap(it, { state: desk.state, items: desk.queueItems });
      const action = it.code === "outside_window"
        ? { label: "Admit anyway", fn: () => retryTap(it.clientId, { override: true }) }
        : { label: "Review", fn: openTray };
      toast(`${who ? `${who}: ` : ""}not recorded. ${it.window?.text || it.error || ""}`.trim(), { tone: "bad", ms: 20000, key: "fail", action });
    } else {
      toast(`${list.length} taps not recorded.`, { tone: "bad", ms: 20000, key: "fail", action: { label: "Review", fn: openTray } });
    }
  }, 0);
}

const queue = createQueue({
  storage: browserStorage,
  send: async (actions) => {
    const token = desk.session?.token || "";
    try {
      return await api("/checkin/desk/actions", { method: "POST", body: { actions }, token });
    } catch (err) {
      // An earlier sign-in's answer (signed out while it was on its way) says nothing about this one: just try again.
      if (err?.status === 401 && token !== (desk.session?.token || "")) throw new ApiError(err.message, 0);
      throw err;
    }
  },
  tabId: () => tabs.id,
  alive: () => tabs.alive(),
  now: serverNow,
  // The device says it has no network: taps wait unsent (an Undo then just drops one), tried again once it's back.
  online: () => typeof navigator === "undefined" || navigator.onLine !== false,
  onChange: (items) => { desk.queueItems = items; if (!items.some((x) => x.state === "failed")) desk.trayOpen = false; tidyBanners(); emit(); },
  onAuth: () => { desk.needSignIn = true; emit(); },
  onPersist: (ok) => { desk.persistOk = ok; emit(); },
  // The tap matters more than the cached list (it comes back with the next load).
  onStorageFull: () => { remember.set(SNAPSHOT_KEY, null); },
  // Arrived / Checked in, the media, AV and exhibitor desks are never refused for the time on an event day (contract C9:
  // the server holds only the meals and the evening to their hours), so a refusal is always someone's to decide.
  onResult: (item, r, outcome) => {
    if (outcome === "ok") {
      if (r?.events?.length) handleEvents(r.events, { live: true });
      if (r?.already && r.message) toast(r.message, { tone: "warn", key: `already-${item.key}` });
    } else if (outcome === "failed") noteFailure(item);
  },
});
desk.queueItems = queue.items();
desk.persistOk = queue.persisted();
export const pending = () => queue.pending();
export const failedTaps = () => queue.failed();
/** "Admit anyway" / "Try again" (Needs attention, the refusal toast): the person signed in now decides, so it's theirs (C3). */
export const retryTap = (clientId, patch = {}) => queue.retry(clientId, { ...patch, ...signedInAs() });
export const dismissTap = (clientId) => queue.dismiss(clientId);
export function dismissAllFailed() { for (const it of queue.failed()) queue.dismiss(it.clientId); }
export function openTray() { desk.trayOpen = true; emit(); }
export function closeTray() { desk.trayOpen = false; emit(); }

/**
 * Who this sign-in is: the server's answer at sign-in (/checkin/desk/me), kept as session.identity. Every tap's queuedBy
 * (C3). A list load only refreshes the name and staff flag the header shows (session.user), never this. (A sign-in
 * kept by an older version of the app has only `user`.)
 */
export const identityOf = (session) => {
  const u = session?.identity || session?.user;
  return u?.id ? { id: String(u.id), name: u.name || "" } : null;
};
const signedInAs = () => { const u = identityOf(desk.session); return u ? { queuedBy: u } : {}; };

/**
 * A tap at the current station: { kind: "mark", point, key, override?, note? } | reset | note | query_add | query_update.
 * Stored on the device at once (with who made it), shown, sent when it can be. → the queued item.
 */
export function tap(action, { undoText = "" } = {}) {
  const item = queue.add({ station: desk.station, ...action, ...signedInAs() });
  if (action.kind === "mark") desk.myTaps.set(item.clientId, { at: Date.now(), key: action.key, point: action.point });
  if (action.kind === "unknown_arrival") desk.myTaps.set(item.clientId, { at: Date.now(), key: unknownKey(item.clientId), point: "unknown" });
  if (undoText) {
    toast(undoText, { tone: "ok", ms: UNDO_MS, key: `tap-${action.key}-${action.point}`, tapId: item.clientId, action: { label: "Undo", fn: () => undoTap(item.clientId) } });
  }
  emit();
  return item;
}

/**
 * Undo one of this device's taps (within the undo window for volunteers; staff any time). A tap that might have reached
 * the server is undone there by reference (lib/queue.js): never just dropped here.
 */
export function undoTap(clientId) {
  const r = queue.undo(clientId, { station: desk.station, ...signedInAs() });
  desk.myTaps.delete(clientId);
  // Its "… · Undo" toast goes (an undone tap can't be undone twice).
  desk.toasts = desk.toasts.filter((t) => t.tapId !== clientId);
  toast(r.local ? "Undone (it hadn't been sent yet)." : "Undone.", { tone: "ok", ms: 3000 });
  emit();
}

/** A volunteer's own Undo lasts 15 s; on a day that isn't an event day (practice marks) it lasts all day. */
const undoWindow = () => (desk.state?.today?.date && !desk.state.today.eventDay ? 12 * 3600 * 1000 : UNDO_MS);

/** This device's own tap on a guest at a point, still inside the undo window → its clientId, or "". */
export function myRecentTap(key, point) {
  const now = Date.now();
  const w = undoWindow();
  for (const [id, t] of desk.myTaps) {
    if (now - t.at > w) { desk.myTaps.delete(id); continue; }
    if (t.key === key && t.point === point) return id;
  }
  return "";
}
/** When the next own Undo button runs out (ms, device clock), or 0. */
export function nextUndoExpiry() {
  const now = Date.now();
  const w = undoWindow();
  let next = 0;
  for (const t of desk.myTaps.values()) { const end = t.at + w; if (end > now && (!next || end < next)) next = end; }
  return next;
}

/* ---------- NO DETAILS FOUND (contract C8) ---------- */

/** The lobby couldn't find the person: record the arrival with the name as typed ({ name, company, note }, cleaned). */
export function recordUnknown(value) {
  return tap(unknownArrivalAction(value), { undoText: `${value.name}: arrival recorded (no details found). The pass desk has been told.` });
}
/** The pass desk closes a NO DETAILS FOUND card: "sent_to_help" | "pass_issued" | "left". */
export function closeUnknown(key, outcome) { return tap(unknownDoneAction(key, outcome)); }
/** Staff found them on the list: that guest is marked Arrived, the card goes. */
export function linkUnknown(key, guestKey) { return tap(unknownLinkAction(key, guestKey)); }

/* ---------- Events, banners ---------- */

let recent = [];
let refreshTimer = null;
let flashSeq = 0;
const ANNOUNCE = ["desk", "av", "exhibitor", "media"];
const DONE_POINT = { desk: "checked_in", av: "av", exhibitor: "exhibitor", media: "media" };

function handleEvents(events, { live = true } = {}) {
  const s = desk.state;
  if (!s || !events?.length) return;
  recent = [...recent, ...events].slice(-300);
  const r = applyEvents(s, events, { live, now: serverNow() });
  for (const a of standingArrivals(s, r.arrivals, queue.pending())) {
    if (a.unknown) {
      // Only the pass desk hears about a NO DETAILS FOUND arrival.
      desk.banners.desk.add({ key: a.unknown.key, unknown: a.unknown, guest: null, at: a.at, by: a.by, text: `${NO_DETAILS.badge}: ${a.unknown.name}${a.unknown.company ? ` (${a.unknown.company})` : ""} · check ID, send to help desk` });
      if (desk.station === "desk") { chime(); desk.flash = { seq: ++flashSeq, bg: "", unknown: true }; }
      continue;
    }
    for (const st of a.stations) {
      desk.banners[st].add({ key: a.guest.key, guest: a.guest, at: a.at, by: a.by, text: bannerText(a.guest, st, { eventDay: s.today?.eventDay, now: serverNow() }) });
      // The chime plays whenever sound is on (chime() does nothing until a tap unlocked it); the screen flashes too.
      if (st === desk.station) { chime(); desk.flash = { seq: ++flashSeq, bg: badgeOf(a.guest).bg }; }
    }
  }
  tidyBanners();
  if (r.refresh) { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => load({ quiet: true }), 1500); }
  emit();
}

/**
 * A batch's arrivals still standing once the WHOLE batch is applied (each guest once), with the stations still to tell
 * (not done there yet). An arrival and its undo in one batch (e.g. an offline tap and its Undo, sent together) announce
 * nothing: no chime, no flash, no banner. `pendingTaps`: the device's queue (a local Undo counts too).
 */
export function standingArrivals(s, arrivals = [], pendingTaps = []) {
  const out = [];
  const seen = new Set();
  let open = null;
  for (const a of arrivals) {
    if (a.unknown) {
      open ||= new Set(unknownsOf(s, pendingTaps, { open: true }).map((u) => u.key));
      if (!open.has(a.unknown.key) || seen.has(a.unknown.key)) continue;
      seen.add(a.unknown.key);
      out.push(a);
      continue;
    }
    const g = s.byKey.get(a.guest?.key) || a.guest;
    if (!g || seen.has(g.key)) continue;
    const x = statusOf(s, g, pendingTaps);
    if (!x.arrived) continue;
    const stations = notifyStations(g).filter((st) => !x[DONE_POINT[st]]);
    if (!stations.length) continue;
    seen.add(g.key);
    out.push({ ...a, guest: g, stations });
  }
  return out;
}

/** A banner stays while the guest is still on the way to that station: arrived (not undone or reset), not done there. */
function tidyBanners() {
  const s = desk.state;
  if (!s) return;
  const p = queue.pending();
  const openUnknown = new Set(unknownsOf(s, p, { open: true }).map((u) => u.key));
  for (const st of ANNOUNCE) {
    desk.banners[st].keep((b) => {
      if (b.unknown) return openUnknown.has(b.key);
      const x = statusOf(s, s.byKey.get(b.key) || b.guest, p);
      return !!x.arrived && !x[DONE_POINT[st]];
    });
  }
  setCount(desk.station === "desk" ? s.guests.filter((g) => { const x = statusOf(s, g, p); return x.arrived && !x.checked_in; }).length + openUnknown.size : desk.banners[desk.station]?.size() || 0);
}
export function dismissBanner(station, key) { desk.banners[station]?.clear(key); emit(); }

/* ---------- Loading, the clock, live ---------- */

/**
 * Never kept on the device: staff-only fields (a shared iPad's cache must not hold every guest's email and ticket IDs),
 * at any depth (the staff's inclusion switches name the ticket too, so they go; the guest's inclusions stay).
 */
const STAFF_ONLY_FIELDS = new Set(["email", "ticketId", "ticketIds", "personId", "phone", "extrasView"]);
const scrub = (v) => {
  if (Array.isArray(v)) return v.map(scrub);
  if (!v || typeof v !== "object") return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) if (!STAFF_ONLY_FIELDS.has(k)) out[k] = scrub(x);
  return out;
};
export function cacheableSnapshot(snap) {
  return { ...snap, guests: (snap.guests || []).map(scrub), attendance: [] };
}
function cacheSnapshot(snap) {
  try { remember.set(SNAPSHOT_KEY, JSON.stringify({ userId: desk.session?.user?.id, snap: cacheableSnapshot(snap) })); } catch { /* too big or blocked: fine */ }
}
function cachedSnapshot() {
  try {
    const c = JSON.parse(remember.get(SNAPSHOT_KEY, "null") || "null");
    return c && c.userId === desk.session?.user?.id ? c.snap : null;
  } catch { return null; }
}

const stationKeys = (s) => { const k = (s?.stations || []).map((x) => x.key).filter(Boolean); return k.length ? k : undefined; };
/** What the header shows about today and the stations (an emit only when it changed). */
const clockSig = (s) => JSON.stringify([s?.today?.date, s?.today?.eventDay, s?.agendaRead, (s?.stations || []).map((x) => `${x.key}${x.enabled}`),
  Object.entries(s?.stationStates || {}).map(([k, v]) => `${k}|${v?.code}|${v?.text}|${v?.detail || ""}|${v?.open}`)]);
let lastServerStates = 0;

/**
 * +1 at every sign-in and sign-out. Whatever was asked for under an earlier one (a list still downloading when the shift
 * changed, a clock check) is never applied to the next person's session.
 */
let sessionGen = 0;
let loader = null;
let wanted = null;
/** Two load requests as one: quiet only if both are; a full refresh if either asks. */
export const mergeLoads = (a, b = {}) => ({ quiet: (a ? !!a.quiet : true) && !!b.quiet, refresh: !!(a?.refresh || b.refresh) });
/**
 * (Re)load everything from the server, one load at a time. A request while one runs (a new guest's event, the 3-minute
 * reload, "Reload the guest list") gets one more load after it, never dropped: the running one may have been built
 * before what it was asked for. → resolves when the list asked for is in (or has failed).
 */
export function load(opts = {}) {
  const g = sessionGen;
  if (loader && loader.gen === g) {
    wanted = mergeLoads(wanted, opts);
    return loader.promise;
  }
  wanted = mergeLoads(null, opts);
  let promise = null;
  promise = (async () => {
    try {
      while (wanted && g === sessionGen) {
        const o = wanted;
        wanted = null;
        await doLoad(o, g);
      }
    } finally {
      if (loader?.promise === promise) loader = null;
    }
  })();
  loader = { gen: g, promise };
  return promise;
}
async function doLoad({ quiet = false, refresh = false } = {}, g = sessionGen) {
  const token = desk.session?.token;
  if (!token) return;
  // Still the sign-in this load was for?
  const current = () => g === sessionGen && desk.session?.token === token;
  if (!quiet) { desk.loading = true; emit(); }
  try {
    // A big list on venue Wi-Fi: fine while it keeps arriving; given up when it stalls (lib/api.js).
    const snap = await api(`/checkin/desk/snapshot${refresh ? "?refresh=1" : ""}`, { timeoutMs: 20000, token });
    if (!current()) return;
    // Someone else's list (never expected): never shown here.
    const who = identityOf(desk.session);
    if (who && snap.user?.id && String(snap.user.id) !== who.id) throw new ApiError("That guest list was for another sign-in. Reload the guest list, or sign out and in again.", 0);
    const fresh = fromSnapshot(snap, { clientNow: Date.now() });
    applyEvents(fresh, recent.filter((e) => e.seq > fresh.cursor), { live: false, now: serverNow() });
    desk.state = fresh;
    desk.loadError = "";
    desk.dayStale = false;
    lastServerStates = Date.now();
    if (desk.session.staff !== !!snap.staff || desk.session.user?.name !== snap.user?.name) setSession({ ...desk.session, staff: !!snap.staff, user: snap.user });
    cacheSnapshot(snap);
    tidyBanners();
  } catch (err) {
    if (!current()) return;
    if (err.status === 401) desk.needSignIn = true;
    desk.loadError = err.message || "Couldn't load the guest list.";
  } finally {
    if (current()) {
      desk.loading = false;
      emit();
    }
  }
}

async function tickClock() {
  const token = desk.session?.token;
  if (!token || !desk.state) return;
  const g = sessionGen;
  const current = () => g === sessionGen && desk.session?.token === token;
  try {
    const c = await api("/checkin/desk/clock", { timeoutMs: 8000, token });
    const s = desk.state;
    if (!s || !current()) return;
    const before = clockSig(s);
    // A new day by the server's clock: yesterday's marks go now, even if today's list can't be loaded yet.
    const rolled = rollDay(s, Date.parse(c.serverTime) || serverNow());
    s.today = c.today;
    s.stationStates = c.stationStates;
    s.stations = c.stations;
    s.windows = c.windows;
    s.agendaRead = !!c.agendaRead;
    lastServerStates = Date.now();
    if (rolled) { desk.dayStale = true; tidyBanners(); }
    if (desk.dayStale) await load({ quiet: true });
    if (rolled || clockSig(s) !== before) emit();
  } catch (err) {
    if (err.status === 401 && current()) { desk.needSignIn = true; emit(); }
  }
}

/** Every 15 s, on the device: a new day (offline too), and the stations' states when the server hasn't said lately. */
function localTick() {
  const s = desk.state;
  if (!s) return;
  const now = serverNow();
  let changed = false;
  if (rollDay(s, now)) { desk.dayStale = true; tidyBanners(); changed = true; }
  if (s.windows && Date.now() - lastServerStates > 75 * 1000) {
    const before = clockSig(s);
    s.stationStates = localStationStates(s.windows, now, stationKeys(s));
    if (clockSig(s) !== before) changed = true;
  }
  if (changed) emit();
}

const live = createLive({
  getCursor: () => desk.state?.cursor || 0,
  onEvents: (events, o) => handleEvents(events, o),
  onCursor: (c) => { if (desk.state && c > desk.state.cursor) desk.state.cursor = c; },
  onReset: () => load({ quiet: true }),
  onServerTime: (t) => clock.observe(t),
  onStatus: (st) => { desk.conn = st; emit(); },
  onAuth: (status, code) => {
    if (code === PASSWORD_REQUIRED) { passwordRequired(); return; }
    desk.needSignIn = true;
    emit();
  },
});

let clockTimer = null;
let localTimer = null;
let fullTimer = null;
let running = false;
const onVisible = () => { if (document.visibilityState === "visible") { checkIdle(); localTick(); tickClock(); queue.flush(); } };
// Back online: the taps go, and a device with no list yet (its copy dropped, opened offline) loads it now.
const onOnline = () => { queue.resume(); if (desk.state) tickClock(); else load(); };
function startRunning() {
  if (running || !desk.session?.token) return;
  running = true;
  const cached = cachedSnapshot();
  if (cached && !desk.state) {
    desk.state = fromSnapshot(cached, { clientNow: Date.now() });
    // Opened on a later day than the copy (offline at the start of Day 2): today starts empty, worked out here.
    if (rollDay(desk.state, serverNow())) desk.dayStale = true;
    tidyBanners();
  }
  // Live updates start at once on the device's copy; with no copy, once the first snapshot is in (or has failed).
  if (desk.state) live.start();
  load({ quiet: !!desk.state }).finally(() => { if (running) live.start(); });
  queue.resume();
  clockTimer = setInterval(tickClock, 30000);
  localTimer = setInterval(localTick, 15000);
  // Every 3 minutes a fresh list (new passes, name changes); events keep it current in between.
  fullTimer = setInterval(() => { if (document.visibilityState === "visible") load({ quiet: true }); }, 3 * 60 * 1000);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
}
function stopRunning() {
  running = false;
  live.stop();
  clearInterval(clockTimer);
  clearInterval(localTimer);
  clearInterval(fullTimer);
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("online", onOnline);
}

/* ---------- Sign-in, sign-out, the staff lock ---------- */

export async function signIn(email, password) {
  const s = await apiSignIn(email, password);
  const sameUser = !!desk.state && String(desk.state.me?.id ?? "") === String(s.user?.id ?? "");
  // A new sign-in: nothing still on its way for the one before is applied to it; this one loads its own list.
  sessionGen += 1;
  lastUse = Date.now();
  savedUse = lastUse;
  desk.session = { ...s, email: String(email || "").trim(), identity: identityOf(s), lastUse };
  setSession(desk.session);
  desk.needSignIn = false;
  desk.locked = false;
  desk.loading = false;
  desk.authNotice = "";
  desk.endedReason = "";
  if (!sameUser) { desk.state = null; recent = []; }
  queue.resume();
  if (running) { load(); live.kick(); } else startRunning();
  emit();
  return s;
}

/** Everything about the person signed in goes; the taps waiting on the device stay (each says who made it). */
function endSession(reason = "") {
  sessionGen += 1;
  loader = null;
  wanted = null;
  stopRunning();
  queue.pause();
  setSession(null);
  remember.set(SNAPSHOT_KEY, null);
  desk.session = null;
  desk.state = null;
  desk.started = false;
  desk.picked = false;
  desk.needSignIn = false;
  desk.locked = false;
  desk.loading = false;
  desk.loadError = "";
  desk.dayStale = false;
  desk.trayOpen = false;
  desk.confirm = null;
  desk.toasts = [];
  desk.flash = null;
  desk.endedReason = reason;
  desk.myTaps.clear();
  recent = [];
  sessionStore.remove(STARTED_HERE_KEY);
  for (const b of Object.values(desk.banners)) b.keep(() => false);
  setCount(0);
  letSleep();
  emit();
}

/** Sign out: with a connection, this person's waiting taps are sent first (up to 4 s), under their own sign-in. */
export async function signOut({ reason = "" } = {}) {
  if (desk.signingOut) return;
  if (desk.session?.token && !desk.needSignIn && (typeof navigator === "undefined" || navigator.onLine !== false)) {
    desk.signingOut = true;
    emit();
    try { await queue.drain(4000); } catch { /* kept on the device */ }
    desk.signingOut = false;
  }
  endSession(reason);
}

/** Sign out, asking first when taps are still on the device (who they'll be recorded as, and the refused ones). */
export function requestSignOut() {
  const text = signOutText(queue.items());
  if (!text) { signOut(); return; }
  askConfirm({
    title: "Sign out with taps still on this device?",
    text,
    detail: "With a connection they're sent before signing out. Without one, they're sent after the next sign-in on this device.",
    yes: "Sign out", no: "Stay signed in", tone: "warn",
    onYes: () => signOut(),
  });
}

function passwordRequired() {
  desk.authNotice = PASSWORD_REQUIRED_TEXT;
  endSession("password");
}

export const STAFF_IDLE_MS = 30 * 60 * 1000;
/** The last use is written to the sign-in at most this often (and when the app is hidden or closed). */
export const USE_SAVE_MS = 60 * 1000;
/** Has a staff sign-in gone unused long enough to lock? */
export const staffIdle = ({ staff = false, lastUse = 0, now = Date.now(), idleMs = STAFF_IDLE_MS } = {}) => !!staff && now - lastUse >= idleMs;
/** When a kept sign-in was last used: its own record (an older version's sign-in: when it was made). */
export const lastUseOf = (session) => Number(session?.lastUse) || Number(session?.at) || 0;
let lastUse = lastUseOf(getSession());
let savedUse = lastUse;
/**
 * Keep the last use with the sign-in (localStorage), so a reload or a Home Screen relaunch can't reopen an idle staff
 * sign-in unlocked. Throttled; `force` when the app is hidden or closed. Never while locked (the lock stays locked).
 */
function saveUse(force = false) {
  if (!desk.session?.token || desk.locked || lastUse <= savedUse) return;
  if (!force && lastUse - savedUse < USE_SAVE_MS) return;
  savedUse = lastUse;
  setSession({ ...desk.session, lastUse });
}
/** A staff sign-in on a shared device, unused for 30 minutes: the screen locks until the password is entered again (or
    someone signs out and in as themselves). Arrivals still come in and chime meanwhile. */
function checkIdle() {
  if (desk.locked || !desk.session?.token) return;
  if (staffIdle({ staff: desk.session.staff, lastUse, now: Date.now() })) { desk.locked = true; desk.trayOpen = false; desk.confirm = null; emit(); }
}
/** The staff lock's password. */
export async function unlock(password) {
  const email = desk.session?.email || "";
  if (!email) throw new ApiError("Sign out, then sign in again.", 400);
  return signIn(email, password);
}
if (typeof window !== "undefined") {
  const used = () => { if (!desk.locked) { lastUse = Date.now(); saveUse(); } };
  for (const t of ["pointerdown", "keydown"]) window.addEventListener(t, used, { capture: true, passive: true });
  window.addEventListener("pagehide", () => saveUse(true));
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveUse(true); });
  setInterval(checkIdle, 30 * 1000);
}

/* ---------- Station ---------- */

export function setStation(key) {
  desk.station = key || "";
  desk.toasts = [];
  // Just picked on this device: the Start screen (a tap for sound and the screen lock). After a reload the station opens
  // straight away (nothing is missed); the header asks for a tap to turn the chime back on.
  desk.picked = !!key;
  stationStore.set(key || null);
  desk.started = false;
  tidyBanners();
  emit();
  updateOthers();
}
/** A station was started in this tab (this sign-in), kept across reloads: updates then wait for a tap (updatePolicy.js). */
const STARTED_HERE_KEY = "ttfc.desk.startedHere";
export const startedHere = () => sessionStore.get(STARTED_HERE_KEY) === "1";
export function markStarted() { desk.started = true; sessionStore.set(STARTED_HERE_KEY, "1"); emit(); }

onSession((s) => { desk.session = s; emit(); });

export function boot() {
  tabs.start();
  // A staff sign-in left unused for 30 minutes is locked before anything shows (main.jsx renders after boot): a reload
  // or a Home Screen relaunch doesn't open it (its last use is kept with it).
  lastUse = lastUseOf(desk.session);
  savedUse = lastUse;
  checkIdle();
  // Reloaded for an update the person tapped: the station comes back on its Start screen (one tap: sound back on).
  try {
    const r = sessionStorage.getItem(RESUME_KEY);
    if (r) { sessionStorage.removeItem(RESUME_KEY); if (r === desk.station) desk.picked = true; }
  } catch { /* blocked */ }
  window.addEventListener("pagehide", () => tabs.stop());
  window.addEventListener("pageshow", (e) => { if (e.persisted) window.location.reload(); });
  if (desk.session?.token) startRunning();
}

/* ---------- Staff: through Admin › People's own routes (audited there) ---------- */

/** Switch a pass extra (cxo | lunch | gala | awards) Yes / No / automatic (null) for the guest's main pass. */
export async function setInclusion(g, extra, value) {
  if (!desk.session?.staff) throw new ApiError("Only staff can change inclusions.", 403);
  if (noPassOf(g)) throw new ApiError("No pass on file: issue a pass first (at the pass desk, or Admin › People).", 400);
  if (!g.personId || !g.ticketId) throw new ApiError("The guest list is still loading from the server. Try again in a moment.", 0);
  const r = await api(`/console/people/${encodeURIComponent(g.personId)}/passes/${encodeURIComponent(g.ticketId)}`, { method: "PATCH", body: { extras: { [extra]: value } } });
  const t = (r.person?.passes || []).find((p) => p.ticketId === g.ticketId);
  if (t?.extras) {
    g.extras = Object.fromEntries(Object.entries(t.extras).map(([k, v]) => [k, !!v.included]));
    g.extrasView = t.extras;
  } else if (value !== null) g.extras = { ...g.extras, [extra]: value };
  // Older inclusions events still on their way don't undo this.
  heldInclusions(desk.state, g.key);
  emit();
  return r;
}

/** Media / VIP / Exhibitor Yes or No (PATCH /api/console/people/:id, audited there); the list reloads. */
export async function setPersonFlag(g, flag, value) {
  if (!desk.session?.staff) throw new ApiError("Only staff can change this.", 403);
  if (!g.personId) throw new ApiError("The guest list is still loading from the server. Try again in a moment.", 0);
  const r = await api(`/console/people/${encodeURIComponent(g.personId)}`, { method: "PATCH", body: { [flag]: !!value } });
  await load({ quiet: true, refresh: true });
  return r;
}

export const fetchHistory = (key) => api(`/checkin/desk/history/${encodeURIComponent(key)}`);
export const fetchTeam = () => api("/checkin/desk/team");
export const lookupTicket = (ticketId) => api("/checkin/desk/lookup", { method: "POST", body: { ticketId } });

/* ---------- One question at a time ("Admit anyway?") ---------- */

/** Ask before doing something unusual: { title, text, yes, no, tone, onYes }. */
export function askConfirm(q) { desk.confirm = q; emit(); }
export function answerConfirm(yes) {
  const q = desk.confirm;
  desk.confirm = null;
  emit();
  if (yes && q?.onYes) q.onYes();
}
