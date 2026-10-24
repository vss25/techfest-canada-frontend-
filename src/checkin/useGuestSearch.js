import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildIndex, search, ticketIdQuery } from "./lib/search.js";
import { desk, lookupTicket } from "./lib/desk.js";
import { revealSelected, useSearchKeys } from "./hooks.js";

const finePointer = () => {
  try { return window.matchMedia("(any-pointer: fine)").matches && !window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
};

/**
 * The search every station uses: instant, on the device, over `guests`; a typed ticket ID is looked up on the server
 * for volunteers (they don't hold ticket IDs). Keyboard: typing anywhere, ↑ ↓ (scrolls to the row), Enter
 * (onEnter(guest, done) on a clear choice: hooks.js useSearchKeys), Esc.
 * `done()`: call after a station's action. The search box is cleared and gets the focus back (after a search, or on a
 * laptop), so the next name typed starts a new search and Enter can never land on the row's new Undo button.
 */
export function useGuestSearch(guests, { rank = null, onEnter, limit = 40, version = 0 } = {}) {
  const [q, setQRaw] = useState("");
  const [sel, setSel] = useState(0);
  const navigated = useRef(false);
  // A new search starts at the top result, not picked yet.
  const setQ = useCallback((v) => { setQRaw(v); setSel(0); navigated.current = false; }, []);
  const [looked, setLooked] = useState(null); // { q, key } from the server
  const inputRef = useRef(null);
  const qRef = useRef(q);
  useLayoutEffect(() => { qRef.current = q; });
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

  // ↑ ↓ moved the highlight: keep it on screen.
  useEffect(() => { if (q && navigated.current) revealSelected(); }, [sel, q]);

  const done = useCallback(() => {
    const had = !!qRef.current;
    if (had) setQ("");
    if (had || finePointer()) inputRef.current?.focus();
  }, [setQ]);

  useSearchKeys({
    inputRef, count: results.length, selected: sel, setSelected: setSel,
    onEnter: (i) => { const g = results[i] || results[0]; if (g) onEnter?.(g, done); },
    onEscape: () => setQ(""),
    onType: (ch) => { setQRaw((v) => v + ch); setSel(0); navigated.current = false; },
    onNavigate: () => { navigated.current = true; },
    navigated: () => navigated.current,
  });
  return { q, setQ, sel, setSel, results, inputRef, done, lookingUp: !!tid && !local.length && !desk.session?.staff && !(looked && looked.q === tid) };
}
