/* =========================================================
   TTFC Check-in: the server's clock on this device
   ---------------------------------------------------------
   Every tap carries clientAt = the server's time when it was made
   (the shared contract with the backend, C4), so a phone or laptop
   whose clock is wrong still records the right time and the right
   station window. The device keeps an offset to the server's clock:
     - from every answer that says the server's time (serverTime in
       /snapshot, /clock, /events, /actions and the live stream),
       corrected by half the round trip;
     - kept on the device (localStorage), so a device that opens with
       no connection still stamps its taps with the corrected time.
       It is never worked out from a cached snapshot's serverTime
       (that would be off by the cache's age).
   Before the device has ever reached the server, the offset is 0 (the
   device's own clock); the server clamps clientAt anyway
   ([now - 12 h, now + 2 min]).
   Pure apart from the storage it's given; node --test src/checkin/lib/clock.test.mjs
========================================================= */

export const CLOCK_KEY = "ttfc.desk.clock.v1";
/** An answer slower than this tells little about the clock (once an offset is known). */
const SLOW_RTT_MS = 5000;
/** Written to storage when the offset moves by more than this, or this long after the last write. */
const PERSIST_DELTA_MS = 500;
const PERSIST_EVERY_MS = 5 * 60 * 1000;

const safeStorage = {
  get(key) { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } },
  set(key, value) { try { globalThis.localStorage?.setItem(key, value); return true; } catch { return false; } },
};

/**
 * createClock({ storage, now }) → { now(), offset(), known(), observe(serverTime, sentAt?, answeredAt?) }
 *   now()      the server's time on this device (ms)
 *   observe()  a server time seen in an answer: sent at `sentAt`, answered at `answeredAt` (the device's clock)
 */
export function createClock({ storage = safeStorage, now = () => Date.now() } = {}) {
  let offset = 0;
  let known = false;
  let savedOffset = null;
  let savedAt = 0;
  try {
    const c = JSON.parse(storage.get(CLOCK_KEY) || "null");
    if (c && Number.isFinite(c.offset)) { offset = c.offset; known = true; savedOffset = c.offset; savedAt = Number(c.at) || 0; }
  } catch { /* nothing kept yet */ }

  function persist() {
    const t = now();
    if (savedOffset !== null && Math.abs(savedOffset - offset) < PERSIST_DELTA_MS && t - savedAt < PERSIST_EVERY_MS) return;
    if (storage.set(CLOCK_KEY, JSON.stringify({ offset, at: t }))) { savedOffset = offset; savedAt = t; }
  }

  return {
    now: () => now() + offset,
    offset: () => offset,
    known: () => known,
    observe(serverTime, sentAt, answeredAt) {
      const s = typeof serverTime === "number" ? serverTime : Date.parse(serverTime);
      if (!Number.isFinite(s)) return false;
      const t1 = Number.isFinite(answeredAt) ? answeredAt : now();
      const t0 = Number.isFinite(sentAt) ? Math.min(sentAt, t1) : t1;
      const rtt = t1 - t0;
      if (known && rtt > SLOW_RTT_MS) return false;
      offset = Math.round(s - (t0 + rtt / 2));
      known = true;
      persist();
      return true;
    },
  };
}
