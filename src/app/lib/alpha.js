import { useMemo } from "react";

/* A–Z index helpers (iOS AlphaIndex): letters, first rows, jumping. */

/** "Alán" → "A"; anything that isn't a letter → "#". */
export function letterFor(name = "") {
  const c = String(name).trim().normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
  return /\p{L}/u.test(c) ? c : "#";
}

const byName = (x) => x.name;
const byId = (x) => x.id;

/** [{ l, id }] in A–Z order, "#" last; [] unless the list is long enough. */
export function useAlphaTargets(list, { enabled = true, name = byName, id = byId } = {}) {
  return useMemo(() => {
    if (!enabled || list.length < 12) return [];
    const first = new Map();
    for (const x of list) { const l = letterFor(name(x)); if (!first.has(l)) first.set(l, id(x)); }
    const out = [...first.entries()].map(([l, target]) => ({ l, id: target }))
      .sort((a, b) => (a.l === "#" ? 1 : b.l === "#" ? -1 : a.l.localeCompare(b.l)));
    return out.length >= 4 ? out : [];
  }, [list, enabled, name, id]);
}

/** Scrolls so the row sits just under the sticky top bar. */
export function jumpToRow(domId) {
  const el = document.getElementById(domId);
  if (!el) return;
  const bar = document.querySelector(".topbar");
  const top = el.getBoundingClientRect().top + window.scrollY - (bar ? bar.getBoundingClientRect().height : 0) - 8;
  window.scrollTo({ top: Math.max(0, top) });
}

