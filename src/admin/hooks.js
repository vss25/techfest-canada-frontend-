import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./api";

/**
 * Load JSON from the admin API.
 * `path` null → nothing is loaded. Returns { data, error, loading, reload, setData }.
 * Loading is derived (no synchronous setState inside the effect).
 */
export function useApi(path, { interval } = {}) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ key: null, data: undefined, error: null });
  const key = path ? `${path}#${nonce}` : null;

  useEffect(() => {
    if (!path) return undefined;
    const ctrl = new AbortController();
    const k = `${path}#${nonce}`;
    adminFetch(path, { signal: ctrl.signal }).then(
      (data) => setState({ key: k, data, error: null }),
      (error) => {
        if (error?.name === "AbortError") return;
        setState((s) => ({ key: k, data: s.data, error }));
      },
    );
    return () => ctrl.abort();
  }, [path, nonce]);

  useEffect(() => {
    if (!interval || !path) return undefined;
    const t = setInterval(() => setNonce((n) => n + 1), interval);
    return () => clearInterval(t);
  }, [interval, path]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
  }, []);

  return {
    data: state.data,
    error: state.error,
    // first load (no data yet) vs background refresh
    loading: !!key && state.key !== key && state.data === undefined,
    refreshing: !!key && state.key !== key,
    reload,
    setData,
  };
}

/** Debounced copy of a value. */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Run an async action with a busy flag; returns [run, busy]. */
export function useAction(fn) {
  const [busy, setBusy] = useState(false);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const run = useCallback(async (...args) => {
    setBusy(true);
    try { return await fnRef.current(...args); } finally { setBusy(false); }
  }, []);
  return [run, busy];
}
