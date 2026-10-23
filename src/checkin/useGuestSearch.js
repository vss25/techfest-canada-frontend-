import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, search, ticketIdQuery } from "./lib/search.js";
import { desk, lookupTicket } from "./lib/desk.js";
import { useSearchKeys } from "./hooks.js";

/**
 * The search every station uses: instant, on the device, over `guests`; a typed ticket ID is looked up on the server
 * for volunteers (they don't hold ticket IDs). Keyboard: typing anywhere, ↑ ↓, Enter (onEnter(guest)), Esc.
 */
export function useGuestSearch(guests, { rank = null, onEnter, limit = 40, version = 0 } = {}) {
  const [q, setQRaw] = useState("");
  const [sel, setSel] = useState(0);
  // A new search starts at the top result.
  const setQ = useCallback((v) => { setQRaw(v); setSel(0); }, []);
  const [looked, setLooked] = useState(null); // { q, key } from the server
  const inputRef = useRef(null);
  const index = useMemo(() => buildIndex(guests), [guests]);
  const local = useMemo(() => search(index, q, { limit, rank }), [index, q, rank, limit, version]); // eslint-disable-line react-hooks/exhaustive-deps

  // A ticket ID a volunteer typed: ask the server which guest it is.
  const tid = ticketIdQuery(q);
  useEffect(() => {
    if (!tid || local.length || desk.session?.staff) return undefined;
    let gone = false;
    const t = setTimeout(() => {
      lookupTicket(tid).then((r) => { if (!gone) setLooked({ q: tid, key: r.key }); }).catch(() => { if (!gone) setLooked({ q: tid, key: "" }); });
    }, 350);
    return () => { gone = true; clearTimeout(t); };
  }, [tid, local.length]);
  const found = looked && looked.q === tid && looked.key ? guests.find((g) => (g.keys || [g.key]).includes(looked.key)) : null;
  const results = local.length ? local : found ? [found] : [];

  useSearchKeys({
    inputRef, count: results.length, selected: sel, setSelected: setSel,
    onEnter: (i) => { const g = results[i] || results[0]; if (g) onEnter?.(g); },
    onEscape: () => setQ(""),
    onType: (ch) => { setQRaw((v) => v + ch); setSel(0); },
  });
  return { q, setQ, sel, setSel, results, inputRef, lookingUp: !!tid && !local.length && !desk.session?.staff && !(looked && looked.q === tid) };
}
