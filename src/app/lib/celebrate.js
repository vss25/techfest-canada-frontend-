/* =========================================================
   Confetti once (Oct 26 2026): the swag kit winners card bursts
   the first time someone sees it on this device, on Points or in
   the feed (one memory for both), and again (bigger) the first
   time a winner sees it. Remembered in localStorage per
   announcement (the winners' ids), guarded: blocked storage
   means it may burst again next time, never an error. Reduce
   Motion: never a burst, just the card. Pure; the storage is
   passed in (node --test src/app/lib/celebrate.test.mjs).
========================================================= */

export const SEEN_KEY = "ttfc.app.swagWinners.seen";
const MAX_KEPT = 12;

/** One announcement: the winners' ids in rank order ("" when there are none). */
export const winnersSignature = (winners) => (Array.isArray(winners) ? winners.map((w) => w?.userId || w?.id || w?.name || "").join(",") : "");

/** Is this person (user id) one of the winners? */
export const isWinner = (winners, myId) => !!myId && (winners || []).some((w) => String(w?.userId ?? w?.id ?? "") === String(myId));

/** What's remembered for this view: the announcement, plus "#<id>" for a winner (so a winner gets their own burst). */
export const celebrationKey = (winners, myId) => {
  const sig = winnersSignature(winners);
  if (!sig) return "";
  return isWinner(winners, myId) ? `${sig}#${myId}` : sig;
};

/** The keys already celebrated on this device ([] when storage is blocked or holds anything odd). */
export function seenKeys(storage) {
  try {
    const v = JSON.parse(storage?.getItem(SEEN_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

/** Should this view burst? Not with Reduce Motion, not without winners, not when this key was celebrated before. */
export function shouldCelebrate({ storage, winners, myId, reducedMotion }) {
  if (reducedMotion) return false;
  const key = celebrationKey(winners, myId);
  return !!key && !seenKeys(storage).includes(key);
}

/** Remembers this view (the newest few kept). Never throws. */
export function rememberCelebration({ storage, winners, myId }) {
  const key = celebrationKey(winners, myId);
  if (!key) return;
  try {
    const next = [...seenKeys(storage).filter((k) => k !== key), key].slice(-MAX_KEPT);
    storage?.setItem(SEEN_KEY, JSON.stringify(next));
  } catch { /* storage full or blocked: it may burst again next time */ }
}

/** Has this announcement been seen here before (by anyone on this device)? For the feed card's "hide" button. */
export const seenBefore = (storage, winners) => {
  const sig = winnersSignature(winners);
  return !!sig && seenKeys(storage).some((k) => k === sig || k.startsWith(`${sig}#`));
};

/* Hidden from the feed (the winners card's ×, once it's been seen): this announcement, on this device. */
export const HIDDEN_KEY = "ttfc.app.swagWinners.hidden";

export function winnersHiddenIn(storage, winners) {
  const sig = winnersSignature(winners);
  try { return !!sig && storage?.getItem(HIDDEN_KEY) === sig; } catch { return false; }
}

export function hideWinnersIn(storage, winners) {
  try { storage?.setItem(HIDDEN_KEY, winnersSignature(winners)); } catch { /* blocked: it shows again next time */ }
}

/** window.localStorage, or null where reading it throws (blocked storage). */
export const browserStorage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
