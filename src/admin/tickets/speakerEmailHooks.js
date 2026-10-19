import { useEffect, useRef, useState } from "react";
import { api } from "../api";

/* Helpers for the speakers' Power Pass email editor (SpeakerEmailCompose.jsx, SpeakerPasses.jsx). */

/** ["a@x.com", "b@y.com"] → "a@x.com, b@y.com" */
export const listText = (list) => (list || []).join(", ");

/**
 * Renders the email for `body` (debounced), so edits show up in the preview.
 * → { data, error, loading } (data stays on screen while the next version renders).
 */
export function useLivePreview(url, body, { enabled = true, delay = 450 } = {}) {
  const key = `${url} ${JSON.stringify(body || {})}`;
  const [state, setState] = useState({ data: null, error: null, key: null });
  const seq = useRef(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const n = ++seq.current;
    const t = setTimeout(() => {
      api.post(url, JSON.parse(key.slice(url.length + 1))).then(
        (data) => { if (n === seq.current) setState({ data, error: null, key }); },
        (error) => { if (n === seq.current) setState((s) => ({ data: s.data, error, key })); },
      );
    }, delay);
    return () => clearTimeout(t);
  }, [url, key, enabled, delay]);
  return { data: state.data, error: state.error, loading: enabled && state.key !== key };
}
