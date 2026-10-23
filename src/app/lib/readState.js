/* =========================================================
   Read state for the Notifications list, the bell and the
   activity dots. Pure (no imports) so it's unit-tested
   (readState.test.mjs). Oct 23 2026, "I am marking something
   read, but sometimes it shows up again":
   • The read list kept only the last 400 ids, dropping the
     oldest first, even ones still in the list: past 400 reads
     (every "Mark all as read" adds every row), rows read long
     ago came back unread. Now ids still listed are never
     dropped, and the cap is far higher.
   • A notifications or activity answer from a request that
     started before a "mark read" overwrote it with the old
     unread state. Now read always wins, and an activity count
     asked for before (or while) a section was marked seen is
     ignored.
========================================================= */

export const READ_CAP = 3000;

/**
 * The read list with `ids` added (in order, no repeats). Ids in `listed` (what the list shows now) or being added
 * are never dropped; past READ_CAP the oldest of the others go.
 */
export function addRead(readIds = [], ids = [], listed = []) {
  const have = new Set(readIds);
  const out = [...readIds];
  for (const id of ids) {
    if (!have.has(id)) { have.add(id); out.push(id); }
  }
  let extra = out.length - READ_CAP;
  if (extra <= 0) return out;
  const keep = new Set([...listed, ...ids]);
  return out.filter((id) => {
    if (extra > 0 && !keep.has(id)) { extra -= 1; return false; }
    return true;
  });
}

/**
 * A GET /social/notifications list over what we had: once read (here or on the server), always read. `readIds` is
 * the local read list, where staff messages are "pn-<id>".
 */
export function mergeNotifications(prev = [], incoming = [], readIds = [], now = new Date().toISOString()) {
  const before = new Map(prev.map((n) => [n.id, n]));
  const local = new Set(readIds);
  return incoming.map((n) => {
    if (n.readAt) return n;
    const readAt = before.get(n.id)?.readAt || (local.has(`pn-${n.id}`) ? now : null);
    return readAt ? { ...n, readAt } : n;
  });
}

/** Staff messages read here that this server answer still calls unread: told again (idempotent), so every device agrees. */
export function unsyncedReads(incoming = [], readIds = []) {
  const local = new Set(readIds);
  return incoming.filter((n) => !n.readAt && local.has(`pn-${n.id}`)).map((n) => n.id).slice(0, 200);
}

/**
 * Activity dots. `begin()` before GET /activity/unread; `seenStart(s)` / `seenEnd(s)` around POST /activity/seen.
 * `accepts(token, s)`: the answer may set that section's count only if no "seen" started or was in flight since
 * the request began (else it was counted before the person looked, and would bring the dot back).
 */
export function createSeenGate(sections = ["feed", "discussions"]) {
  const gen = Object.fromEntries(sections.map((s) => [s, 0]));
  const pending = Object.fromEntries(sections.map((s) => [s, 0]));
  return {
    begin: () => ({ ...gen }),
    accepts: (token, s) => s in gen && pending[s] === 0 && token[s] === gen[s],
    seenStart: (s) => { gen[s] += 1; pending[s] += 1; },
    seenEnd: (s) => { gen[s] += 1; pending[s] = Math.max(0, pending[s] - 1); },
  };
}

/** The activity state after an answer: only the sections the gate accepts change. `latest` = newest unread per section. */
export function applyActivity(prev, answer, accept) {
  const next = { ...prev, latest: { ...(prev?.latest || {}) } };
  for (const s of ["feed", "discussions"]) {
    if (!accept(s)) continue;
    next[s] = Number(answer?.[s]) || 0;
    next.latest[s] = answer?.latest?.[s] || null;
  }
  return next;
}

/** POST /activity/seen body: the newest event the app counted, so what arrives after stays unread. */
export const seenBody = (section, activity) => {
  const upTo = activity?.latest?.[section];
  return upTo ? { section, upTo } : { section };
};
