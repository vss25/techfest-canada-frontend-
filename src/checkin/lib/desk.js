import { useSyncExternalStore } from "react";
import { ApiError, api, getSession, onSession, setSession, signIn as apiSignIn } from "./api.js";
import { createLive } from "./live.js";
import { createQueue } from "./queue.js";
import { applyEvents, fromSnapshot, statusOf } from "./state.js";
import { bannerText, createBanners, notifyStations } from "./notify.js";
import { SNAPSHOT_KEY, STATION_KEY, chime, remember, setCount } from "./device.js";
import { UNDO_MS } from "./constants.js";

/* =========================================================
   TTFC Check-in: the running app (one per page)
   ---------------------------------------------------------
   Holds the device's state (lib/state.js), the queue of taps
   (lib/queue.js), the live connection (lib/live.js), the banners per
   station (lib/notify.js) and the toasts, and tells the screens when
   anything changed (useDesk). The last snapshot is kept on the device,
   so the app opens with the guest list even with no connection.
========================================================= */

const listeners = new Set();
let version = 0;
const emit = () => { version += 1; listeners.forEach((fn) => fn()); };
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const desk = {
  session: getSession(),
  state: null,
  station: remember.get(STATION_KEY, ""),
  conn: "reconnecting",
  loading: false,
  loadError: "",
  needSignIn: false,
  queueItems: [],
  toasts: [],
  myTaps: new Map(),
  banners: { desk: createBanners(), av: createBanners(), exhibitor: createBanners(), media: createBanners() },
  started: false,
};

/** The screens re-render whenever the desk changes. */
export function useDesk() {
  useSyncExternalStore(subscribe, () => version);
  return desk;
}
export const deskVersion = () => version;

/** The server's clock (the device's corrected). */
export const serverNow = () => Date.now() + (desk.state?.serverOffset || 0);

/* ---------- Toasts ---------- */

let toastSeq = 0;
export function toast(text, { tone = "ok", action = null, ms = 6000, key = "" } = {}) {
  const id = ++toastSeq;
  // Two at most (the newest): the rows keep their own Undo for 15 s, so nothing is lost when a toast goes.
  desk.toasts = [{ id, text, tone, action, key, until: Date.now() + ms }, ...desk.toasts.filter((t) => !key || t.key !== key)].slice(0, 2);
  emit();
  setTimeout(() => { desk.toasts = desk.toasts.filter((t) => t.id !== id); emit(); }, ms);
  return id;
}
export function dismissToast(id) { desk.toasts = desk.toasts.filter((t) => t.id !== id); emit(); }

/* ---------- Queue of taps ---------- */

const queue = createQueue({
  send: (actions) => api("/checkin/desk/actions", { method: "POST", body: { actions } }),
  onChange: (items) => { desk.queueItems = items; emit(); },
  onAuth: () => { desk.needSignIn = true; emit(); },
  onResult: (item, r) => {
    if (r.ok) {
      if (r.events?.length) handleEvents(r.events, { live: true, own: true });
      if (r.already && r.message) toast(r.message, { tone: "warn", key: `already-${item.key}` });
      return;
    }
    const who = desk.state?.byKey.get(item.key)?.name || "";
    if (r.code === "outside_window") {
      toast(`${who ? `${who}: ` : ""}not recorded. ${r.window?.text || r.error}`, {
        tone: "bad", ms: 20000, key: `fail-${item.clientId}`,
        action: { label: "Admit anyway", fn: () => queue.retry(item.clientId, { override: true }) },
      });
    } else {
      toast(`${who ? `${who}: ` : ""}${r.error || "Not recorded."}`, { tone: "bad", ms: 12000, key: `fail-${item.clientId}`,
        action: { label: "Dismiss", fn: () => queue.dismiss(item.clientId) } });
    }
  },
});
desk.queueItems = queue.items();
export const pending = () => queue.pending();
export const failedTaps = () => queue.failed();
export const retryTap = (clientId, patch) => queue.retry(clientId, patch);
export const dismissTap = (clientId) => queue.dismiss(clientId);

/**
 * A tap at the current station: { kind: "mark", point, key, override?, note? } | reset | note | query_add | query_update.
 * Stored on the device at once, shown, sent when it can be. → the queued item.
 */
export function tap(action, { undoText = "" } = {}) {
  const item = queue.add({ station: desk.station, ...action });
  if (action.kind === "mark") desk.myTaps.set(item.clientId, { at: Date.now(), key: action.key, point: action.point });
  if (undoText) {
    toast(undoText, { tone: "ok", ms: UNDO_MS, key: `tap-${action.key}-${action.point}`, action: { label: "Undo", fn: () => undoTap(item.clientId) } });
  }
  emit();
  return item;
}

/** Undo one of this device's taps (within the undo window for volunteers; staff any time). */
export function undoTap(clientId) {
  const r = queue.undo(clientId, { station: desk.station });
  desk.myTaps.delete(clientId);
  toast(r.local ? "Undone (it hadn't been sent yet)." : "Undone.", { tone: "ok", ms: 3000 });
  emit();
}

/** This device's own tap on a guest at a point, still inside the undo window → its clientId, or "". */
export function myRecentTap(key, point) {
  const now = Date.now();
  for (const [id, t] of desk.myTaps) {
    if (now - t.at > UNDO_MS) { desk.myTaps.delete(id); continue; }
    if (t.key === key && t.point === point) return id;
  }
  return "";
}

/* ---------- Events, banners ---------- */

let recent = [];
let refreshTimer = null;
const ANNOUNCE = ["desk", "av", "exhibitor", "media"];
const DONE_POINT = { desk: "checked_in", av: "av", exhibitor: "exhibitor", media: "media" };

function handleEvents(events, { live = true } = {}) {
  const s = desk.state;
  if (!s || !events?.length) return;
  recent = [...recent, ...events].slice(-300);
  const r = applyEvents(s, events, { live, now: serverNow() });
  for (const a of r.arrivals) {
    for (const st of notifyStations(a.guest)) {
      desk.banners[st].add({ key: a.guest.key, guest: a.guest, at: a.at, by: a.by, text: bannerText(a.guest, st, { eventDay: s.today?.eventDay, now: serverNow() }) });
      if (st === desk.station && desk.started) chime();
    }
  }
  tidyBanners();
  if (r.refresh) { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => load({ quiet: true }), 1500); }
  emit();
}

/** A banner goes once the guest is done at that station (checked in at the desk, AV checked …). */
function tidyBanners() {
  const s = desk.state;
  if (!s) return;
  const p = queue.pending();
  for (const st of ANNOUNCE) desk.banners[st].keep((b) => !statusOf(s, s.byKey.get(b.key) || b.guest, p)[DONE_POINT[st]]);
  setCount(desk.station === "desk" ? s.guests.filter((g) => { const x = statusOf(s, g, p); return x.arrived && !x.checked_in; }).length : desk.banners[desk.station]?.size() || 0);
}
export function dismissBanner(station, key) { desk.banners[station]?.clear(key); emit(); }

/* ---------- Loading, the clock, live ---------- */

function cacheSnapshot(snap) {
  try { remember.set(SNAPSHOT_KEY, JSON.stringify({ userId: desk.session?.user?.id, snap })); } catch { /* too big or blocked: fine */ }
}
function cachedSnapshot() {
  try {
    const c = JSON.parse(remember.get(SNAPSHOT_KEY, "null") || "null");
    return c && c.userId === desk.session?.user?.id ? c.snap : null;
  } catch { return null; }
}

/** (Re)load everything from the server. Events that came in meanwhile are applied on top. */
export async function load({ quiet = false, refresh = false } = {}) {
  if (!desk.session?.token) return;
  if (!quiet) { desk.loading = true; emit(); }
  try {
    const snap = await api(`/checkin/desk/snapshot${refresh ? "?refresh=1" : ""}`);
    const fresh = fromSnapshot(snap, { clientNow: Date.now() });
    applyEvents(fresh, recent.filter((e) => e.seq > fresh.cursor), { live: false, now: Date.now() + fresh.serverOffset });
    desk.state = fresh;
    desk.loadError = "";
    if (desk.session.staff !== !!snap.staff || desk.session.user?.name !== snap.user?.name) setSession({ ...desk.session, staff: !!snap.staff, user: snap.user });
    cacheSnapshot(snap);
    tidyBanners();
  } catch (err) {
    if (err.status === 401) desk.needSignIn = true;
    desk.loadError = err.message || "Couldn't load the guest list.";
  } finally {
    desk.loading = false;
    emit();
  }
}

async function tickClock() {
  if (!desk.session?.token || !desk.state) return;
  try {
    const c = await api("/checkin/desk/clock", { timeoutMs: 8000 });
    const s = desk.state;
    const dayChanged = s.today?.date && c.today?.date && s.today.date !== c.today.date;
    s.serverOffset = Date.parse(c.serverTime) - Date.now();
    s.today = c.today;
    s.stationStates = c.stationStates;
    s.stations = c.stations;
    s.windows = c.windows;
    s.agendaRead = !!c.agendaRead;
    if (dayChanged) await load({ quiet: true });
    emit();
  } catch (err) {
    if (err.status === 401) { desk.needSignIn = true; emit(); }
  }
}

const live = createLive({
  getCursor: () => desk.state?.cursor || 0,
  onEvents: (events, o) => handleEvents(events, o),
  onCursor: (c) => { if (desk.state && c > desk.state.cursor) desk.state.cursor = c; },
  onReset: () => load({ quiet: true }),
  onServerTime: (t) => { if (desk.state) desk.state.serverOffset = Date.parse(t) - Date.now(); },
  onStatus: (st) => { desk.conn = st; emit(); },
  onAuth: () => { desk.needSignIn = true; emit(); },
});

let clockTimer = null;
let fullTimer = null;
let running = false;
function startRunning() {
  if (running || !desk.session?.token) return;
  running = true;
  const cached = cachedSnapshot();
  if (cached && !desk.state) { desk.state = fromSnapshot(cached, { clientNow: Date.now() }); tidyBanners(); }
  load({ quiet: !!desk.state }).then(() => live.start());
  queue.resume();
  clockTimer = setInterval(tickClock, 30000);
  // Every 3 minutes a fresh list (new passes, name changes); events keep it current in between.
  fullTimer = setInterval(() => { if (document.visibilityState === "visible") load({ quiet: true }); }, 3 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { tickClock(); queue.flush(); } });
  window.addEventListener("online", () => { queue.resume(); tickClock(); });
}
function stopRunning() {
  running = false;
  live.stop();
  clearInterval(clockTimer);
  clearInterval(fullTimer);
}

/* ---------- Sign-in, station ---------- */

export async function signIn(email, password) {
  const s = await apiSignIn(email, password);
  desk.session = s;
  desk.needSignIn = false;
  if (desk.state && desk.state.me?.id !== s.user?.id) desk.state = null;
  queue.resume();
  if (running) { load(); live.kick(); } else startRunning();
  emit();
  return s;
}

export function signOut() {
  stopRunning();
  setSession(null);
  remember.set(SNAPSHOT_KEY, null);
  desk.session = null;
  desk.state = null;
  desk.started = false;
  desk.needSignIn = false;
  for (const b of Object.values(desk.banners)) b.keep(() => false);
  setCount(0);
  emit();
}

export function setStation(key) {
  desk.station = key || "";
  desk.toasts = [];
  // Just picked on this device: the Start screen (a tap for sound and the screen lock). After a reload the station opens
  // straight away (nothing is missed); the header asks for a tap to turn the chime back on.
  desk.picked = !!key;
  remember.set(STATION_KEY, key || null);
  desk.started = false;
  tidyBanners();
  emit();
}
export function markStarted() { desk.started = true; emit(); }

onSession((s) => { desk.session = s; emit(); });

export function boot() {
  if (desk.session?.token) startRunning();
}

/* ---------- Staff: through Admin › People's own routes (audited there) ---------- */

/** Switch a pass extra (cxo | lunch | gala | awards) Yes / No / automatic (null) for the guest's main pass. */
export async function setInclusion(g, extra, value) {
  if (!desk.session?.staff) throw new ApiError("Only staff can change inclusions.", 403);
  const r = await api(`/console/people/${encodeURIComponent(g.personId)}/passes/${encodeURIComponent(g.ticketId)}`, { method: "PATCH", body: { extras: { [extra]: value } } });
  const t = (r.person?.passes || []).find((p) => p.ticketId === g.ticketId);
  if (t?.extras) {
    g.extras = Object.fromEntries(Object.entries(t.extras).map(([k, v]) => [k, !!v.included]));
    g.extrasView = t.extras;
  } else if (value !== null) g.extras = { ...g.extras, [extra]: value };
  emit();
  return r;
}

/** Media / VIP / Exhibitor Yes or No (PATCH /api/console/people/:id, audited there); the list reloads. */
export async function setPersonFlag(g, flag, value) {
  if (!desk.session?.staff) throw new ApiError("Only staff can change this.", 403);
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
