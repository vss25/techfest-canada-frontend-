import { useEffect, useRef, useState } from "react";
import { createStore } from "./store";
import { now as clockNow } from "./time";

/* Helpers shared by the app's components (kept out of .jsx files so fast refresh works). */

export function cx(...xs) { return xs.filter(Boolean).join(" "); }

export function initialsOf(name = "") {
  const p = String(name).trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "•";
}

const TITLES = new Set(["dr", "dr.", "prof", "prof.", "professor", "mr", "mr.", "ms", "ms.", "mrs", "mrs.", "mx", "mx.", "hon", "hon.", "sir", "dame", "the"]);
/** iOS String.givenName: "Dr. Maya Singh" → "Maya". */
export function givenName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.find((p) => !TITLES.has(p.toLowerCase())) || String(name).trim();
}

export const toasts = createStore({ items: [], confirm: null });
let toastId = 0;

/** iOS action.showAlert(title, message): a toast that fades after a few seconds. `action` (or several `actions`): { label, run }. */
export function showAlert(title, message = "", { action, actions, ms = 4500 } = {}) {
  const id = ++toastId;
  toasts.set((s) => ({ ...s, items: [...s.items, { id, title, message, actions: actions || (action ? [action] : []) }] }));
  if (ms) setTimeout(() => dismissToast(id), ms);
  return id;
}
export function dismissToast(id) {
  toasts.set((s) => ({ ...s, items: s.items.filter((t) => t.id !== id) }));
}

/** iOS confirmationDialog with several buttons: chooseDialog({ title, message, options: [{ label, value, destructive }] }) → Promise<value | null> */
export function chooseDialog(opts) {
  return new Promise((resolve) => toasts.set((s) => ({ ...s, confirm: { ...opts, choose: true, resolve } })));
}

/** iOS .alert with one OK: alertDialog({ title, message }) → Promise<void> */
export function alertDialog(opts) {
  return new Promise((resolve) => toasts.set((s) => ({ ...s, confirm: { ...opts, okOnly: true, resolve } })));
}

/** confirmDialog({ title, message, confirm: "Delete", destructive }) → Promise<boolean> */
export function confirmDialog(opts) {
  return new Promise((resolve) => toasts.set((s) => ({ ...s, confirm: { ...opts, resolve } })));
}

// ---------- Hooks ----------

/** Re-renders every `ms` (countdowns, "on now"). */
export function useTick(ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/** Runs `fn` now and every `ms` while the page is visible. */
export function usePolling(fn, ms, deps = []) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    let timer = null;
    let alive = true;
    const run = async () => {
      if (!alive) return;
      if (document.visibilityState === "visible") { try { await saved.current(); } catch { /* next round */ } }
      if (alive && ms) timer = setTimeout(run, ms);
    };
    run();
    const onVis = () => { if (document.visibilityState === "visible") { clearTimeout(timer); run(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}

/** The app clock (lib/time `now`), refreshed every `ms`. */
export function useNow(ms = 1000) {
  const [t, setT] = useState(() => clockNow().getTime());
  useEffect(() => {
    const id = setInterval(() => setT(clockNow().getTime()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

/** Linkifies http(s) URLs safely in plain text. */
export function safeHref(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch { return ""; }
}
