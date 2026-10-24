/* =========================================================
   TTFC Check-in: the device's queue of taps (never lose a tap)
   ---------------------------------------------------------
   Every tap is written to the device's storage first (localStorage:
   synchronous, so a tap survives the iPad sleeping or the app being
   closed a moment later), shown as "pending", and sent in order, up to
   20 at a time (POST /api/checkin/desk/actions { actions }). Each tap
   carries an id made on the device (clientId), so sending it again
   after a dropped connection does it once on the server.
     - no connection / server error / too many requests: kept, retried
       (1 s, 2 s, 4 s … up to 15 s, and at once when the device is back
       online or back in front);
     - signed out (401): kept, sent after signing in again;
     - refused (e.g. outside the station's hours, not on their pass):
       kept as "failed" with the reason, for the person to retry ("Admit
       anyway") or dismiss (the app's Needs attention list).

   Undo (the shared contract with the backend, C2): a tap that has
   never left the device (or that the server refused) just goes. Any
   other tap may already be on the server, even if its answer never
   came back, so an undo is queued after it, by reference:
   { kind: "undo", target: <the tap's clientId> } (also sent as `ref`).
   The server undoes that tap if it has it, and otherwise keeps a
   tombstone so the tap is never applied if it arrives later. Once the
   server has the undo, the tap itself is dropped from the queue.

   One tap per storage key ("ttfc.desk.q2.<clientId>"), so two tabs or
   windows on one device never overwrite each other's taps: each page
   keeps its own taps and sees the others' (the storage event). A page
   sends its own taps and takes over those of a page that has gone
   (lib/tabs.js). An older version's single list ("ttfc.desk.queue.v1")
   is moved over on start.

   If the device can't store a tap (storage full or blocked), the queue
   says so (onPersist(false): "Not saved on this device"), frees space
   (onStorageFull: the cached guest list goes first) and keeps trying.

   Pure apart from the storage, send and timers it's given;
   node --test src/checkin/lib/queue.test.mjs
========================================================= */

export const QUEUE_KEY = "ttfc.desk.queue.v1";
export const ITEM_PREFIX = "ttfc.desk.q2.";
export const BATCH = 20;
/** The queue's own bookkeeping: never sent to the server. */
const QUEUE_FIELDS = new Set(["state", "tries", "addedAt", "error", "code", "window", "status", "sentOnce", "ord", "owner", "undoneBy", "sendingAt"]);
const BACKOFF = [1000, 2000, 4000, 8000, 15000];
const REPAIR_MS = 5000;

/** A tap id: time + randomness, 8–64 of [A-Za-z0-9_-]. */
export function newClientId(prefix = "t", rand = Math.random) {
  let r = "";
  for (let i = 0; i < 10; i++) r += Math.floor(rand() * 36).toString(36);
  return `${prefix}${Date.now().toString(36)}${r}`.slice(0, 40);
}

/** localStorage, never throwing (private mode, storage full); `subscribe` = the other tabs' changes. */
export const browserStorage = {
  get(key) { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } },
  set(key, value) { try { globalThis.localStorage?.setItem(key, value); return true; } catch { return false; } },
  remove(key) { try { globalThis.localStorage?.removeItem(key); } catch { /* blocked */ } },
  keys(prefix) {
    const out = [];
    try {
      const ls = globalThis.localStorage;
      for (let i = 0; i < (ls?.length || 0); i++) { const k = ls.key(i); if (k && k.startsWith(prefix)) out.push(k); }
    } catch { /* blocked */ }
    return out;
  },
  subscribe(fn) {
    if (typeof window === "undefined") return () => {};
    const on = (e) => { if (!e.storageArea || e.storageArea === globalThis.localStorage) fn(e.key, e.newValue); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  },
};

/** Should a failed send be tried again later (true), or is it a refusal to show (false)? */
export const retryable = (status) => !status || status === 408 || status === 425 || status === 429 || status >= 500;

const parse = (raw) => { try { const v = JSON.parse(raw); return v && typeof v === "object" && v.clientId ? v : null; } catch { return null; } };
const byOrd = (a, b) => (a.ord || 0) - (b.ord || 0) || (a.addedAt || 0) - (b.addedAt || 0);
/** The clientId an undo is for (the contract's `target`; older taps have `ref`). */
export const undoTarget = (it) => it?.target || it?.ref || "";

/**
 * createQueue({ storage, send, onResult, onChange, onAuth, onPersist, onStorageFull, tabId, alive, now, clock, setTimer, clearTimer })
 *   send(actions) → Promise<{ results: [...] }> (throws { status } when the request itself failed)
 *   onResult(item, result, outcome)  each answer; outcome "ok" | "retry" | "failed" | "dropped" (refused, but undone already)
 *   onChange(items)      whenever the queue changes (this page's or another's)
 *   onAuth()             the server said 401: sign in again (the queue keeps everything)
 *   onPersist(ok)        false: a tap couldn't be written to the device's storage (kept in memory, written again)
 *   onStorageFull()      called before writing again after a failed write (free some space)
 *   tabId()              this page's id (lib/tabs.js); alive() → Promise<Set> of the ids of the pages still open
 *   now()                the server's time on this device: each tap's clientAt (the shared contract's C4)
 *   clock()              the device's own clock (order, timers)
 */
export function createQueue({
  storage = browserStorage, send, onResult = () => {}, onChange = () => {}, onAuth = () => {},
  onPersist = () => {}, onStorageFull = () => {}, tabId = () => "", alive = async () => null,
  now = () => Date.now(), clock = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (t) => clearTimeout(t),
} = {}) {
  let items = [];
  let flushing = null;
  let timer = null;
  let repairTimer = null;
  let attempt = 0;
  let paused = false;
  const inFlight = new Set();
  const unsaved = new Set();
  let persistOk = true;
  const me = () => tabId() || "";

  /* ---------- Storage: one key per tap ---------- */

  function readAll() {
    const out = [];
    for (const k of storage.keys(ITEM_PREFIX)) { const it = parse(storage.get(k)); if (it) out.push(it); }
    return out.sort(byOrd);
  }
  function write(it) {
    const ok = storage.set(ITEM_PREFIX + it.clientId, JSON.stringify(it));
    if (ok) unsaved.delete(it.clientId); else unsaved.add(it.clientId);
    return ok;
  }
  /** Write taps; after a failed write, free space once and try again. */
  function save(list) {
    let freed = false;
    for (const it of list) {
      if (write(it) || freed) continue;
      freed = true;
      try { onStorageFull(); } catch { /* best effort */ }
      write(it);
    }
  }
  function drop(it) {
    items = items.filter((x) => x.clientId !== it.clientId);
    storage.remove(ITEM_PREFIX + it.clientId);
    unsaved.delete(it.clientId);
  }
  function checkPersist() {
    const ok = unsaved.size === 0;
    if (ok !== persistOk) { persistOk = ok; try { onPersist(ok); } catch { /* the UI's problem */ } }
    if (!ok && !repairTimer) repairTimer = setTimer(() => { repairTimer = null; repair(); }, REPAIR_MS);
  }
  /** Write again what couldn't be written, after freeing space. */
  function repair() {
    if (unsaved.size) {
      try { onStorageFull(); } catch { /* best effort */ }
      for (const id of [...unsaved]) { const it = items.find((x) => x.clientId === id); if (it) write(it); else unsaved.delete(id); }
    }
    checkPersist();
  }
  const changed = () => { checkPersist(); try { onChange(items.slice()); } catch { /* the UI's problem */ } };

  let lastOrd = 0;
  const nextOrd = () => {
    const top = items.reduce((m, x) => Math.max(m, x.ord || 0), lastOrd);
    lastOrd = Math.max(clock(), top + 1);
    return lastOrd;
  };

  // Start: this device's taps (every page's), plus an older version's single list.
  items = readAll();
  try {
    const legacy = JSON.parse(storage.get(QUEUE_KEY) || "null");
    if (Array.isArray(legacy)) {
      const have = new Set(items.map((x) => x.clientId));
      let all = true;
      legacy.forEach((x, i) => {
        if (!x || !x.clientId || have.has(x.clientId)) return;
        const it = { ...x, ord: x.ord || (Number(x.addedAt) || 0) * 1000 + i, owner: "" };
        items.push(it);
        if (!write(it)) all = false;
      });
      items.sort(byOrd);
      if (all) storage.remove(QUEUE_KEY);
    }
  } catch { /* nothing to move */ }
  // What this page was sending when it closed goes again (the server skips a tap it already has).
  for (const it of items) if (it.state === "sending" && (!it.owner || it.owner === me())) { it.state = "pending"; it.sentOnce = true; write(it); }
  checkPersist();

  // Another page added, changed or removed a tap.
  storage.subscribe?.((key, value) => {
    if (key === null) {
      const keep = items.filter((x) => inFlight.has(x.clientId) || unsaved.has(x.clientId));
      items = [...readAll().filter((x) => !keep.some((y) => y.clientId === x.clientId)), ...keep].sort(byOrd);
      changed();
      return;
    }
    if (!String(key).startsWith(ITEM_PREFIX)) return;
    const id = String(key).slice(ITEM_PREFIX.length);
    if (inFlight.has(id)) return; // this page is sending it: its answer decides
    const it = value === null || value === undefined ? null : parse(value);
    items = items.filter((x) => x.clientId !== id);
    if (it) { items.push(it); items.sort(byOrd); }
    changed();
  });

  const schedule = (ms) => {
    if (timer) clearTimer(timer);
    timer = setTimer(() => { timer = null; return flush(); }, ms);
  };

  /* ---------- Taps ---------- */

  /** Queue a tap (action without clientId gets one). → the item */
  function add(action, { owner = me() } = {}) {
    const item = {
      ...action, clientId: action.clientId || newClientId(), clientAt: action.clientAt || new Date(now()).toISOString(),
      state: "pending", tries: 0, addedAt: now(), ord: nextOrd(), owner,
    };
    items.push(item);
    save([item]);
    changed();
    schedule(0);
    return item;
  }

  /** Could this tap have reached the server? Only a tap this page holds, never sent and not being sent, can't. */
  const neverSent = (it) => it.state === "pending" && !it.sentOnce && !inFlight.has(it.clientId) && (it.owner || "") === me();

  /**
   * Undo a tap. Never sent from here (or refused by the server) → it just goes (→ { local: true }). Otherwise (being
   * sent, sent with no answer, sent and recorded, another page's) an undo by reference is queued after it
   * (→ { local: false, item }). Never dropped silently.
   */
  function undo(ref, extra = {}) {
    const it = items.find((x) => x.clientId === ref);
    if (it && (neverSent(it) || (it.state === "failed" && !inFlight.has(it.clientId)))) {
      drop(it);
      changed();
      return { local: true };
    }
    const u = add({ ...extra, kind: "undo", target: ref, ref }, { owner: it ? it.owner || me() : me() });
    if (it) { it.undoneBy = u.clientId; save([it]); changed(); }
    return { local: false, item: u };
  }

  /** Try a refused tap again, e.g. with { override: true } ("Admit anyway"). This page sends it. */
  function retry(clientId, patch = {}) {
    const it = items.find((x) => x.clientId === clientId);
    if (!it || inFlight.has(clientId)) return null;
    Object.assign(it, patch, { state: "pending", error: "", code: "", status: 0, window: null, tries: 0, owner: me() });
    save([it]);
    changed();
    schedule(0);
    return it;
  }

  function dismiss(clientId) {
    const it = items.find((x) => x.clientId === clientId);
    if (!it || inFlight.has(clientId)) return false;
    drop(it);
    changed();
    return true;
  }

  /* ---------- Sending ---------- */

  /** Bring this page's copy up to date with the storage (another page may have sent, dismissed or changed a tap). */
  function refresh() {
    const fresh = new Map(readAll().map((x) => [x.clientId, x]));
    const next = [];
    for (const x of items) {
      if (inFlight.has(x.clientId) || unsaved.has(x.clientId)) next.push(x); // only this page has the latest
      else if (fresh.has(x.clientId)) next.push(fresh.get(x.clientId));
      // else: removed by another page
      fresh.delete(x.clientId);
    }
    items = [...next, ...fresh.values()].sort(byOrd);
  }

  async function doFlush() {
    if (paused) return;
    const live = await alive().catch(() => null);
    if (paused) return;
    const mine = (x) => !x.owner || x.owner === me() || (live ? !live.has(x.owner) : false);
    refresh();
    const batch = [];
    const inBatch = new Set();
    for (const x of items) {
      if (batch.length >= BATCH) break;
      if (!mine(x)) continue;
      // A page that has gone was sending it: it may or may not have arrived.
      if (x.state === "sending" && x.owner !== me()) { x.state = "pending"; x.sentOnce = true; }
      if (x.state !== "pending") continue;
      // An undo goes after its tap: it waits while that tap is still to be sent (and wasn't refused).
      const t = x.kind === "undo" ? items.find((y) => y.clientId === undoTarget(x)) : null;
      if (t && !inBatch.has(t.clientId) && t.state !== "failed") continue;
      batch.push(x);
      inBatch.add(x.clientId);
    }
    if (!batch.length) return;
    const t0 = clock();
    for (const it of batch) { it.state = "sending"; it.tries = (it.tries || 0) + 1; it.sentOnce = true; it.sendingAt = t0; it.owner = me(); inFlight.add(it.clientId); }
    save(batch);
    changed();
    let results = null;
    let failStatus = 0;
    try {
      // What the server gets: the tap itself, not the queue's bookkeeping.
      const out = await send(batch.map((it) => Object.fromEntries(Object.entries(it).filter(([k]) => !QUEUE_FIELDS.has(k)))));
      results = Array.isArray(out?.results) ? out.results : null;
    } catch (err) {
      failStatus = Number(err?.status) || 0;
    }
    for (const it of batch) inFlight.delete(it.clientId);
    if (!results) {
      for (const it of batch) it.state = "pending";
      save(batch.filter((it) => items.includes(it)));
      changed();
      if (failStatus === 401) { paused = true; onAuth(); return; }
      schedule(BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
      return;
    }
    attempt = 0;
    const byId = new Map(results.map((r) => [r.clientId, r]));
    let again = false;
    for (const it of batch) {
      const r = byId.get(it.clientId) || null;
      let outcome;
      if (!r) { it.state = "pending"; again = true; outcome = "retry"; }
      else if (r.ok || (it.kind === "undo" && r.status === 404)) {
        // Done. An undo the server had nothing to undo for is done too (that tap never reached it); its tap then goes.
        drop(it);
        outcome = "ok";
        if (it.kind === "undo") { const t = items.find((x) => x.clientId === undoTarget(it)); if (t && !inFlight.has(t.clientId)) drop(t); }
      } else if (retryable(r.status)) { it.state = "pending"; again = true; outcome = "retry"; }
      else if (it.undoneBy) { drop(it); outcome = "dropped"; }
      else {
        it.state = "failed";
        it.error = r.error || "Not recorded.";
        it.code = r.code || "";
        it.status = r.status || 0;
        it.window = r.window || null;
        outcome = "failed";
      }
      if (items.includes(it)) save([it]);
      try { onResult(it, r, outcome); } catch { /* the UI's problem, not the queue's */ }
    }
    changed();
    if (items.some((x) => x.state === "pending" && mine(x))) schedule(again ? BACKOFF[0] : 0);
  }

  /** Send what this page can. One send at a time; a call while sending waits for it. */
  function flush() {
    if (flushing) return flushing;
    flushing = doFlush().finally(() => { flushing = null; });
    return flushing;
  }

  /** Send now, for up to `ms` (sign-out with a connection: the person's taps go under their own sign-in). → taps left */
  async function drain(ms = 4000) {
    const end = clock() + ms;
    paused = false;
    for (;;) {
      await flush();
      const left = items.filter((x) => (x.state === "pending" || x.state === "sending") && (!x.owner || x.owner === me())).length;
      if (!left || paused || clock() >= end) return left;
      await new Promise((r) => setTimer(r, 300));
    }
  }

  return {
    add, undo, retry, dismiss, flush, drain,
    /** Start sending again (after signing in, coming back online). */
    resume() { paused = false; attempt = 0; schedule(0); },
    /** Stop sending (signed out): everything stays on the device. */
    pause() { paused = true; if (timer) clearTimer(timer); timer = null; },
    items: () => items.slice(),
    /** Taps not refused: shown as pending on the screens. */
    pending: () => items.filter((x) => x.state !== "failed"),
    failed: () => items.filter((x) => x.state === "failed"),
    isPaused: () => paused,
    /** Is every tap written to the device's storage? */
    persisted: () => unsaved.size === 0,
  };
}
