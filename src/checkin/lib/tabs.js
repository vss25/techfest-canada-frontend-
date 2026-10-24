/* =========================================================
   TTFC Check-in: more than one tab or window on one device
   ---------------------------------------------------------
   A laptop can run the Lobby in one tab and the Media desk in another,
   and a desktop Chrome / Edge app window shares its storage with the
   browser's tabs. Each page (tab or window) has an id, kept for that tab
   across reloads (sessionStorage).
     - Who is still open: each page holds a Web Lock named after its id
       for as long as it lives (released the moment it closes, reloads or
       crashes). Where Web Locks are missing, a heartbeat in the shared
       storage, refreshed every 5 s, counts instead (a page is gone 90 s
       after its last one: a background tab's timers can slow to one a
       minute).
     - The queue (lib/queue.js) uses it to know whose taps are whose: a
       page sends its own taps, and takes over the taps of a page that
       has gone.
     - The app uses the heartbeats ({ at, station }) to say so when the
       same station is open twice on this device.
   Pure apart from the storage, locks and timers it's given;
   node --test src/checkin/lib/tabs.test.mjs
========================================================= */

export const TAB_PREFIX = "ttfc.desk.tab.";
export const TAB_LOCK_PREFIX = "ttfc.desk.tab.";
export const TAB_ID_KEY = "ttfc.desk.tabId";
export const HEARTBEAT_MS = 5000;
export const TAB_GONE_MS = 90 * 1000;

const randomId = (rand = Math.random) => {
  let r = "";
  for (let i = 0; i < 10; i++) r += Math.floor(rand() * 36).toString(36);
  return `p${r}`;
};
const parse = (raw) => { try { const v = JSON.parse(raw || "null"); return v && typeof v === "object" ? v : null; } catch { return null; } };

/** The other live tabs (heartbeat newer than TAB_GONE_MS) from { id: { at, station } }. */
export function liveTabs(beats, { me = "", now = Date.now(), goneMs = TAB_GONE_MS } = {}) {
  return Object.entries(beats || {})
    .filter(([id, b]) => id !== me && b && Number.isFinite(b.at) && now - b.at < goneMs)
    .map(([id, b]) => ({ id, ...b }));
}

/** How many other live tabs on this device have this station open. */
export function othersOnStation(beats, { me = "", station = "", now = Date.now(), alive = null } = {}) {
  if (!station) return 0;
  return liveTabs(beats, { me, now }).filter((t) => t.station === station && (!alive || alive.has(t.id))).length;
}

/**
 * createTabs({ storage, session, locks, now, rand, setTimer, clearTimer, onChange })
 *   storage  { get, set, remove, keys(prefix), subscribe?(fn(key)) }  shared by every page (localStorage)
 *   session  { get, set }                                               this tab only (sessionStorage)
 *   locks    navigator.locks, or null
 * → { id, start(), stop(), setStation(key), alive() → Promise<Set<id>>, beats(), othersOnStation(station) }
 */
export function createTabs({
  storage, session = null, locks = null, now = () => Date.now(), rand = Math.random,
  setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (t) => clearInterval(t), onChange = () => {},
} = {}) {
  let id = "";
  try { id = session?.get(TAB_ID_KEY) || ""; } catch { id = ""; }
  let station = "";
  let timer = null;
  let unsub = null;
  let release = null;
  let started = null;
  const api = { id: id || randomId(rand) };

  const beat = () => storage.set(TAB_PREFIX + api.id, JSON.stringify({ at: now(), station }));
  function beats() {
    const out = {};
    for (const k of storage.keys(TAB_PREFIX)) {
      const b = parse(storage.get(k));
      if (b) out[k.slice(TAB_PREFIX.length)] = b;
    }
    return out;
  }
  async function heldIds() {
    try {
      const q = await locks.query();
      return new Set((q?.held || []).map((l) => String(l.name || "")).filter((n) => n.startsWith(TAB_LOCK_PREFIX)).map((n) => n.slice(TAB_LOCK_PREFIX.length)));
    } catch { return null; }
  }

  async function doStart() {
    // A tab copied with "Duplicate tab" carries the same sessionStorage: if that id is still held (or beating), take a new one.
    if (id) {
      const held = locks ? await heldIds() : null;
      const b = parse(storage.get(TAB_PREFIX + id));
      if ((held && held.has(id)) || (!held && b && now() - b.at < HEARTBEAT_MS * 2)) id = "";
    }
    if (!id) id = randomId(rand);
    api.id = id;
    try { session?.set(TAB_ID_KEY, id); } catch { /* this tab only */ }
    if (locks?.request) {
      locks.request(TAB_LOCK_PREFIX + id, () => new Promise((resolve) => { release = resolve; })).catch(() => {});
    }
    beat();
    const t = now();
    for (const [other, b] of Object.entries(beats())) if (other !== id && t - b.at > TAB_GONE_MS * 4) storage.remove(TAB_PREFIX + other);
    timer = setTimer(() => { beat(); onChange(); }, HEARTBEAT_MS);
    unsub = storage.subscribe?.((key) => { if (key === null || String(key).startsWith(TAB_PREFIX)) onChange(); }) || null;
    onChange();
  }

  Object.assign(api, {
    start() { started ||= doStart(); return started; },
    stop() {
      if (timer) clearTimer(timer);
      timer = null;
      unsub?.();
      unsub = null;
      release?.();
      release = null;
      storage.remove(TAB_PREFIX + api.id);
    },
    setStation(key) { station = key || ""; beat(); },
    /** The ids of the pages open on this device right now (this one included). */
    async alive() {
      await started;
      const held = locks ? await heldIds() : null;
      const set = held || new Set(liveTabs(beats(), { now: now() }).map((t) => t.id));
      set.add(api.id);
      return set;
    },
    beats,
    othersOnStation: (key) => othersOnStation(beats(), { me: api.id, station: key, now: now() }),
  });
  return api;
}
