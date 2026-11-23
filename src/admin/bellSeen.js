/* The alerts bell's "seen" counts: see AlertsBell in TopBarMenus.jsx. */
export const KINDS = ["flags", "overdue", "changes", "sos"];
export const seenKey = (me) => {
  const id = String(me?.email || me?.id || "").toLowerCase();
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `ttfc.admin.bellSeen.${h.toString(36)}`;
};
export const readSeen = (key) => {
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v && typeof v === "object" ? v : null; } catch { return null; }
};
export const writeSeen = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: the number just won't stay cleared */ } };
export const countsOf = (a) => Object.fromEntries(KINDS.map((k) => [k, Math.max(0, Number(a?.[k]) || 0)]));
/** How many are new since the bell was last opened (null seen = never opened: everything is new). */
export const unseenCount = (attention, seen) => KINDS.reduce((sum, k) => sum + Math.max(0, (Number(attention?.[k]) || 0) - (seen ? Number(seen[k]) || 0 : 0)), 0);
/** Seen never stays above what's open now, so a count that drops and rises again shows as new. */
export const lowerSeen = (attention, seen) => (seen ? Object.fromEntries(KINDS.map((k) => [k, Math.min(Number(seen[k]) || 0, Number(attention?.[k]) || 0)])) : null);
