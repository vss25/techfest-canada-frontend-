import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { enterActs, isTypingKey, keyboardInset, layoutFor } from "./lib/layout.js";
import { nextUndoExpiry, serverNow } from "./lib/desk.js";

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

/** Re-render when this device's own Undo window for a tap ends (the Undo button then goes). */
export function useUndoExpiry() {
  const [, force] = useReducer((x) => x + 1, 0);
  const next = nextUndoExpiry();
  useEffect(() => {
    if (!next) return undefined;
    const t = setTimeout(force, Math.max(50, next - Date.now() + 30));
    return () => clearTimeout(t);
  }, [next]);
}

/* ---------- The on-screen keyboard (iPad, phones) ---------- */

let kbOpen = false;
/** Is the on-screen keyboard up (over a text field of this app)? */
export const softKeyboardOpen = () => kbOpen;
const inField = (el) => !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

/**
 * Follows the on-screen keyboard (visualViewport): sets --kb (the height it covers at the bottom, so the toasts sit
 * above it) and --vv-top on the page, and says whether it's open (the app then hides the counters and keeps one banner,
 * so the search results stay in view). → open
 */
export function useKeyboard() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    let width = window.innerWidth;
    let maxH = window.innerHeight;
    let t = null;
    const on = () => {
      if (window.innerWidth !== width) { width = window.innerWidth; maxH = window.innerHeight; }
      if (!inField(document.activeElement)) maxH = Math.max(maxH, window.innerHeight);
      const k = keyboardInset({ innerHeight: window.innerHeight, vvHeight: vv?.height, vvTop: vv?.offsetTop, maxInnerHeight: maxH });
      root.style.setProperty("--kb", `${k.overlap}px`);
      root.style.setProperty("--vv-top", `${k.top}px`);
      kbOpen = k.open && inField(document.activeElement);
      setOpen(kbOpen);
    };
    const later = () => { clearTimeout(t); t = setTimeout(on, 60); };
    vv?.addEventListener("resize", on);
    vv?.addEventListener("scroll", on);
    window.addEventListener("resize", on);
    document.addEventListener("focusin", later);
    document.addEventListener("focusout", later);
    on();
    return () => {
      clearTimeout(t);
      vv?.removeEventListener("resize", on);
      vv?.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      document.removeEventListener("focusin", later);
      document.removeEventListener("focusout", later);
    };
  }, []);
  return open;
}

/** Scroll the highlighted result into view, below the sticky header and above the keyboard. */
export function revealSelected() {
  const row = document.querySelector(".ci-main .ci-row.is-selected");
  if (!row) return;
  const header = document.querySelector(".ci-header");
  const top = (header ? header.getBoundingClientRect().bottom : 0) + 8;
  const bottom = (window.visualViewport?.height || window.innerHeight) + (window.visualViewport?.offsetTop || 0) - 8;
  const r = row.getBoundingClientRect();
  if (r.top < top) window.scrollBy({ top: r.top - top });
  else if (r.bottom > bottom) window.scrollBy({ top: Math.min(r.bottom - bottom, r.top - top) });
}

/**
 * Keyboard (laptops, iPads with a keyboard): typing anywhere goes to the search, ↑ ↓ move through the results (and
 * scroll to them), Enter does the station's main action on the highlighted one, Esc clears the search (from anywhere
 * on the screen). Enter only acts on a clear choice (lib/layout.js enterActs): a result picked with ↑ ↓, or a physical
 * keyboard; the on-screen keyboard's Return / Go just closes the keyboard. One listener for the screen's life, reading
 * the latest values from a ref: re-adding it on every render could drop a key pressed during a re-render.
 */
export function useSearchKeys(opts) {
  const latest = useRef(opts);
  useLayoutEffect(() => { latest.current = opts; });
  useEffect(() => {
    const onKey = (e) => {
      const { inputRef, count, selected, setSelected, onEnter, onEscape, onType, onNavigate, navigated, enabled = true } = latest.current;
      if (!enabled) return;
      const el = document.activeElement;
      if (document.querySelector("[data-modal-open]")) return;
      // The first letter typed outside the box goes into it too (browsers differ on whether moving the focus keeps it).
      if (!inField(el) && isTypingKey(e)) { e.preventDefault(); inputRef.current?.focus(); onType?.(e.key); return; }
      if (!inField(el) && e.key === "Escape") { e.preventDefault(); onEscape?.(); inputRef.current?.focus(); return; }
      if (el !== inputRef.current) return;
      if (e.key === "ArrowDown") { e.preventDefault(); onNavigate?.(); setSelected(Math.min(count - 1, selected + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); onNavigate?.(); setSelected(Math.max(0, selected - 1)); }
      else if (e.key === "Enter") {
        const composing = e.isComposing || e.keyCode === 229;
        if (composing) return;
        e.preventDefault();
        if (enterActs({ navigated: !!navigated?.(), softKeyboard: softKeyboardOpen() })) onEnter?.(selected);
        else inputRef.current?.blur();
      } else if (e.key === "Escape") { e.preventDefault(); onEscape?.(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
