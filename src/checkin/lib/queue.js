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
       anyway") or dismiss.
   An undo of a tap that hasn't been sent yet just removes both.
   Pure apart from the storage and send it's given;
   node --test src/checkin/lib/queue.test.mjs
========================================================= */

export const QUEUE_KEY = "ttfc.desk.queue.v1";
export const BATCH = 20;
const QUEUE_FIELDS = new Set(["state", "tries", "addedAt", "error", "code", "window"]);
const BACKOFF = [1000, 2000, 4000, 8000, 15000];

/** A tap id: time + randomness, 8–64 of [A-Za-z0-9_-]. */
export function newClientId(prefix = "t", rand = Math.random) {
  let r = "";
  for (let i = 0; i < 10; i++) r += Math.floor(rand() * 36).toString(36);
  return `${prefix}${Date.now().toString(36)}${r}`.slice(0, 40);
}

/** localStorage, never throwing (private mode, storage full). */
export const browserStorage = {
  get(key) { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } },
  set(key, value) { try { globalThis.localStorage?.setItem(key, value); return true; } catch { return false; } },
};

/** Should a failed send be tried again later (true), or is it a refusal to show (false)? */
export const retryable = (status) => !status || status === 408 || status === 425 || status === 429 || status >= 500;

/**
 * createQueue({ storage, send, onResult, onChange, onAuth, now, setTimer, clearTimer })
 *   send(actions) → Promise<{ results: [...] }> (throws { status } when the request itself failed)
 *   onResult(item, result)  each answer (ok or refused)
 *   onChange(items)         whenever the queue changes
 *   onAuth()                the server said 401: sign in again (the queue keeps everything)
 */
export function createQueue({
  storage = browserStorage, key = QUEUE_KEY, send, onResult = () => {}, onChange = () => {}, onAuth = () => {},
  now = () => Date.now(), setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (t) => clearTimeout(t),
} = {}) {
  let items = [];
  try {
    const raw = storage.get(key);
    const list = raw ? JSON.parse(raw) : [];
    // Anything that was being sent when the app closed goes again (the server skips a tap it already has).
    items = Array.isArray(list) ? list.filter((x) => x && x.clientId).map((x) => (x.state === "sending" ? { ...x, state: "pending" } : x)) : [];
  } catch { items = []; }
  let flushing = false;
  let timer = null;
  let attempt = 0;
  let paused = false;

  const save = () => { storage.set(key, JSON.stringify(items)); onChange(items.slice()); };
  const schedule = (ms) => {
    if (timer) clearTimer(timer);
    timer = setTimer(() => { timer = null; flush(); }, ms);
  };

  /** Queue a tap (action without clientId gets one). → the item */
  function add(action) {
    const item = { ...action, clientId: action.clientId || newClientId(), clientAt: action.clientAt || new Date(now()).toISOString(), state: "pending", tries: 0, addedAt: now() };
    items.push(item);
    save();
    schedule(0);
    return item;
  }

  /**
   * Undo a tap: still waiting here → both disappear, nothing is sent (→ { local: true }); else an undo is queued
   * (→ { local: false, item }).
   */
  function undo(ref, extra = {}) {
    const i = items.findIndex((x) => x.clientId === ref && x.state !== "sending");
    if (i !== -1) { items.splice(i, 1); save(); return { local: true }; }
    return { local: false, item: add({ ...extra, kind: "undo", ref }) };
  }

  /** Try a refused tap again, e.g. with { override: true } ("Admit anyway"). */
  function retry(clientId, patch = {}) {
    const it = items.find((x) => x.clientId === clientId);
    if (!it) return null;
    Object.assign(it, patch, { state: "pending", error: "", code: "", tries: 0 });
    save();
    schedule(0);
    return it;
  }

  function dismiss(clientId) {
    const before = items.length;
    items = items.filter((x) => x.clientId !== clientId || x.state === "sending");
    if (items.length !== before) save();
  }

  async function flush() {
    if (flushing || paused) return;
    const batch = items.filter((x) => x.state === "pending").slice(0, BATCH);
    if (!batch.length) return;
    flushing = true;
    for (const it of batch) { it.state = "sending"; it.tries += 1; }
    save();
    let results = null;
    let failStatus = 0;
    try {
      // What the server gets: the tap itself, not the queue's bookkeeping.
      const out = await send(batch.map((it) => Object.fromEntries(Object.entries(it).filter(([k]) => !QUEUE_FIELDS.has(k)))));
      results = Array.isArray(out?.results) ? out.results : null;
    } catch (err) {
      failStatus = Number(err?.status) || 0;
    }
    flushing = false;
    if (!results) {
      for (const it of batch) it.state = "pending";
      save();
      if (failStatus === 401) { paused = true; onAuth(); return; }
      schedule(BACKOFF[Math.min(attempt++, BACKOFF.length - 1)]);
      return;
    }
    attempt = 0;
    const byId = new Map(results.map((r) => [r.clientId, r]));
    for (const it of batch) {
      const r = byId.get(it.clientId);
      if (!r) { it.state = "pending"; continue; }
      if (r.ok) {
        items = items.filter((x) => x !== it);
      } else if (retryable(r.status)) {
        it.state = "pending";
      } else {
        it.state = "failed";
        it.error = r.error || "Not recorded.";
        it.code = r.code || "";
        it.window = r.window || null;
      }
      try { onResult(it, r); } catch { /* the UI's problem, not the queue's */ }
    }
    save();
    if (items.some((x) => x.state === "pending")) schedule(items.some((x) => x.state === "pending" && x.tries > 0 && !byId.get(x.clientId)?.ok) ? BACKOFF[0] : 0);
  }

  return {
    add, undo, retry, dismiss, flush,
    /** Start sending again (after signing in, coming back online). */
    resume() { paused = false; attempt = 0; schedule(0); },
    items: () => items.slice(),
    /** Taps not refused: shown as pending on the screens. */
    pending: () => items.filter((x) => x.state !== "failed"),
    failed: () => items.filter((x) => x.state === "failed"),
    isPaused: () => paused,
  };
}
