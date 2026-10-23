import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { layoutFor, isTypingKey } from "./lib/layout.js";
import { serverNow } from "./lib/desk.js";

/** The server's time, ticking every `ms` (timers on cards). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** The layout for the window's size (phone / tablet / laptop), following rotation and split view. */
export function useLayout() {
  const read = () => layoutFor(window.innerWidth, window.innerHeight);
  const [l, setL] = useState(read);
  useEffect(() => {
    const on = () => setL(read());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return l;
}

/**
 * Keyboard (laptops, iPads with a keyboard): typing anywhere goes to the search, ↑ ↓ move through the results, Enter
 * does the station's main action on the highlighted one, Esc clears the search. One listener for the screen's life,
 * reading the latest values from a ref: re-adding it on every render could drop a key pressed during a re-render.
 */
export function useSearchKeys(opts) {
  const latest = useRef(opts);
  useLayoutEffect(() => { latest.current = opts; });
  useEffect(() => {
    const onKey = (e) => {
      const { inputRef, count, selected, setSelected, onEnter, onEscape, onType, enabled = true } = latest.current;
      if (!enabled) return;
      const el = document.activeElement;
      const inField = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (document.querySelector("[data-modal-open]")) return;
      // The first letter typed outside the box goes into it too (browsers differ on whether moving the focus keeps it).
      if (!inField && isTypingKey(e)) { e.preventDefault(); inputRef.current?.focus(); onType?.(e.key); return; }
      if (el !== inputRef.current) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(Math.min(count - 1, selected + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(Math.max(0, selected - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); onEnter?.(selected); }
      else if (e.key === "Escape") { e.preventDefault(); onEscape?.(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
