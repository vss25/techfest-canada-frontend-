/* =========================================================
   TTFC Check-in: when the staff Counts screen reads the counts again
   ---------------------------------------------------------
   GET /api/checkin/desk/counts is worked out on the server at most once
   a second for everyone (a shared copy kept for 1 s) and allows 120
   reads a minute per sign-in, and several iPads may share one staff
   sign-in. So, on each device:
   • After a tap anywhere (a live event), the read waits until no new
     event has come in for READ_AFTER_MS (2 s: longer than the server's
     1 s copy, so the numbers include the tap). Each new event during
     the wait starts it again; a busy stretch still reads at least
     every MAX_WAIT_MS.
   • An event that comes in while a read is on its way (or less than
     the server's copy before it started) is read again afterwards,
     never dropped.
   • Never more than one read every MIN_GAP_MS (3 s) on this device.
   • "Too many requests" (429): never shown as an error. The last
     numbers stay, with "updating…", and the read is tried again
     quietly after a back-off (5 s, 10 s, 20 s, 40 s, then every
     minute, a little jitter so iPads on one sign-in don't retry
     together). Any other failure is said, and retried the same way.
   • Opening the screen, every 30 s while it's open, and "Read the
     counts again" ask for a read now: within the same limits.
   Pure (timers and clock passed in);
   node --test src/checkin/lib/countsRefresh.test.mjs
========================================================= */

export const READ_AFTER_MS = 2000;
export const MIN_GAP_MS = 3000;
export const MAX_WAIT_MS = 8000;
/** How long the server keeps one copy of the counts for everyone. */
export const SERVER_COPY_MS = 1000;
export const BACKOFF_MS = Object.freeze([5000, 10000, 20000, 40000, 60000]);

/**
 * createCountsRefresher({ read, onData, onError, onBusy, now, setTimer, clearTimer, random })
 *   read()          the request (a promise of the counts); rejects with { status } on failure
 *   onData(r)       new counts
 *   onError(err)    a failure other than 429 (null once a read works again)
 *   onBusy(bool)    a 429 back-off is on ("updating…"), or over
 * → { event(), request(), stop(), state() }
 */
export function createCountsRefresher({
  read, onData = () => {}, onError = () => {}, onBusy = () => {},
  now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout, random = Math.random,
} = {}) {
  let timer = null;
  let inFlight = false;
  let lastStart = -Infinity;
  /** When each event not yet covered by a read came in (oldest first). */
  let events = [];
  /** A read is wanted now (opening, every 30 s, the button, a retry after a failure). */
  let asap = false;
  let fails = 0;
  let holdUntil = 0;
  let busy = false;
  let stopped = false;

  const setBusy = (v) => { if (v !== busy) { busy = v; onBusy(v); } };
  /** When the next read may go (null: none wanted). */
  const due = () => {
    const floor = Math.max(lastStart + MIN_GAP_MS, holdUntil);
    if (asap) return Math.max(floor, now());
    if (!events.length) return null;
    const settled = Math.min(events[events.length - 1] + READ_AFTER_MS, events[0] + MAX_WAIT_MS);
    return Math.max(floor, settled);
  };
  const schedule = () => {
    if (timer) { clearTimer(timer); timer = null; }
    if (stopped || inFlight) return;
    const at = due();
    if (at === null) return;
    timer = setTimer(fire, Math.max(0, at - now()));
  };
  function fire() {
    timer = null;
    if (stopped || inFlight) return;
    const at = due();
    if (at === null) return;
    if (at > now()) { schedule(); return; }
    run();
  }
  async function run() {
    inFlight = true;
    const start = now();
    lastStart = start;
    asap = false;
    try {
      const r = await read();
      if (stopped) return;
      fails = 0;
      holdUntil = 0;
      // Covered: the events the server's copy could already include.
      events = events.filter((t) => t > start - SERVER_COPY_MS);
      setBusy(false);
      onError(null);
      onData(r);
    } catch (err) {
      if (stopped) return;
      fails += 1;
      const base = BACKOFF_MS[Math.min(fails, BACKOFF_MS.length) - 1];
      holdUntil = now() + Math.round(base * (1 + 0.2 * random()));
      asap = true;
      if (err?.status === 429) setBusy(true);
      else { setBusy(false); onError(err); }
    } finally {
      inFlight = false;
      schedule();
    }
  }

  return {
    /** A live event that changes the counts (a tap, an undo, a NO DETAILS FOUND card) came in. */
    event() {
      if (stopped) return;
      events.push(now());
      if (events.length > 1000) events = events.slice(-1000);
      schedule();
    },
    /** Read as soon as the limits allow (opening, every 30 s, "Read the counts again"). */
    request() {
      if (stopped) return;
      asap = true;
      schedule();
    },
    stop() {
      stopped = true;
      if (timer) { clearTimer(timer); timer = null; }
    },
    state: () => ({ inFlight, busy, fails, holdUntil, pending: events.length, asap, scheduled: !!timer, lastStart }),
  };
}
