/* =========================================================
   The "is typing" line's clock (Oct 22 2026). The dots move every
   420 ms and every 6th tick (about 2.5 s) asks the server who is
   typing. The old loop only moved its tick on once a check came
   back, so while a check waited every tick started another one: a
   server slower than 420 ms got a request every tick (about 143 a
   minute per open chat), and the slower it got, the more it got.
   Now at most one check is in flight and the ticks never wait.
   No imports, so node --test can run it (typingPoll.test.mjs).
========================================================= */

export const TICK_MS = 420;
export const CHECK_EVERY = 6;

/**
 * Starts the loop and returns stop().
 * check() → Promise<names>; onNames(names) after each check that returns (never after stop); onTick() every tick;
 * isVisible() → false skips checks (the page is hidden). `timers` defaults to the global setInterval / clearInterval.
 */
export function startTypingPoll({ check, onNames, onTick = () => {}, isVisible = () => true, tickMs = TICK_MS, checkEvery = CHECK_EVERY, timers = globalThis }) {
  let alive = true;
  let tick = 0;
  let inFlight = false;
  const step = () => {
    if (!alive) return;
    if (tick % checkEvery === 0 && !inFlight && isVisible()) {
      inFlight = true;
      Promise.resolve()
        .then(check)
        .then((names) => { if (alive) onNames(names); }, () => {})
        .finally(() => { inFlight = false; });
    }
    tick += 1;
    onTick();
  };
  step();
  const t = timers.setInterval(step, tickMs);
  return () => { alive = false; timers.clearInterval(t); };
}
