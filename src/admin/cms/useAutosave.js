import { useCallback, useEffect, useRef, useState } from "react";

/* Autosave (Nov 18 2026: "an auto save after 30 seconds of inputs so that if people forget to save,
   it's still saved in admin panel").

   30 seconds after the last change, the editor's own save runs in "auto" mode: it saves as a draft
   (Save, never Send to staging or Publish), quietly, and keeps the editor open. It also runs when the
   editor is closed or the browser tab is hidden with changes not yet saved. An auto save that can't
   go yet (a required field is empty) says why and waits for the next change.

   save({ auto: true }) resolves to:
     true            saved
     false           nothing to save
     "<sentence>"    can't save yet, and why
   and throws on a failed request. */

export const AUTOSAVE_MS = 30_000;

export function useAutosave({ value, save, enabled = true, delay = AUTOSAVE_MS }) {
  const [state, setState] = useState({ status: "idle", at: null, why: "" });
  const saveRef = useRef(save);
  const pending = useRef(false);
  const running = useRef(null);
  const initial = useRef(value);
  const timer = useRef(null);
  useEffect(() => { saveRef.current = save; });

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!pending.current || !enabled) return;
    if (running.current) { await running.current; if (!pending.current) return; }
    pending.current = false;
    setState((s) => ({ ...s, status: "saving", why: "" }));
    const job = (async () => {
      try {
        const out = await saveRef.current({ auto: true });
        if (typeof out === "string") { pending.current = true; setState((s) => ({ ...s, status: "waiting", why: out })); }
        else setState((s) => (out ? { status: "saved", at: new Date(), why: "" } : { ...s, status: s.at ? "saved" : "idle" }));
      } catch {
        pending.current = true;
        setState((s) => ({ ...s, status: "error", why: "" }));
      }
    })();
    running.current = job;
    await job;
    running.current = null;
  }, [enabled]);

  // Every change (not the value the editor opened with) restarts the 30-second wait.
  useEffect(() => {
    if (Object.is(value, initial.current)) return undefined;
    if (!enabled) return undefined;
    pending.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
    return () => clearTimeout(timer.current);
  }, [value, enabled, delay, flush]);

  // Switching tabs or minimising the browser saves what's waiting.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flush]);

  // Closing the editor (or leaving the page in the panel) saves what's waiting.
  const flushRef = useRef(flush);
  useEffect(() => { flushRef.current = flush; });
  useEffect(() => () => { flushRef.current(); }, []);

  // A normal Save (the button) counts: nothing is waiting any more.
  const markSaved = useCallback(() => {
    pending.current = false;
    clearTimeout(timer.current);
    setState({ status: "saved", at: new Date(), why: "" });
  }, []);

  // Cancel / Delete: drop what's waiting (whatever was autosaved before stays saved).
  const cancel = useCallback(() => { pending.current = false; clearTimeout(timer.current); }, []);

  return { ...state, flush, markSaved, cancel };
}
