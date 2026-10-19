import { useEffect, useState } from "react";
import { api } from "../api";

/* Helpers for the pass email editors (EmailCopyEditor.jsx, PassEmailTemplates.jsx, PurchaseEmail.jsx). */

const isSet = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.length > 0);

/** Number of fields set in a copy (the tier's fields counted when `tier` is given). */
export function countSet(value = {}, fields = [], tier = null) {
  return fields.filter((f) => isSet(f.tier && tier ? value?.tiers?.[tier]?.[f.key] : value?.[f.key])).length;
}

/** Drops the empty values (what the server would treat as "built-in" anyway), so dirty checks compare like with like. */
export function tidyCopy(value = {}) {
  const out = {};
  for (const [k, v] of Object.entries(value || {})) {
    if (k === "tiers") continue;
    if (isSet(v)) out[k] = v;
  }
  if (value?.tiers) {
    const tiers = {};
    for (const [t, one] of Object.entries(value.tiers)) {
      const c = tidyCopy(one);
      if (Object.keys(c).length) tiers[t] = c;
    }
    if (Object.keys(tiers).length) out.tiers = tiers;
  }
  return out;
}

const SPEAKERS = "/console/speaker-passes";
const savedOf = (r) => ({ ...tidyCopy(r.copy || {}), ...(r.label ? { label: r.label } : {}) });

/**
 * One speaker's own wording (saved on their pass; every send to them uses it, Send to all too).
 * Loads GET /:id/copy; `value` / `onChange` hold { label, ...fields } so the parent can send it as the
 * preview / send body ({ draft: true, ...value }). `defaults`: what each field shows when it's empty here.
 */
export function useSpeakerWording(id, enabled) {
  const [state, setState] = useState(null); // { saved, value, defaults, fields, sections }
  useEffect(() => {
    if (!enabled || !id) return;
    api.get(`${SPEAKERS}/${encodeURIComponent(id)}/copy`).then(
      (r) => {
        const saved = savedOf(r);
        setState({ saved, value: saved, defaults: r.defaults || {}, fields: r.fields || [], sections: r.sections || [] });
      },
      (error) => setState({ error }),
    );
  }, [id, enabled]);
  const setValue = (value) => setState((s) => ({ ...s, value }));
  const dirty = !!state?.value && JSON.stringify(tidyCopy(state.value)) !== JSON.stringify(tidyCopy(state.saved));
  const markSaved = (r) => setState((s) => ({ ...s, saved: savedOf(r), value: savedOf(r), defaults: r.defaults || s.defaults }));
  return { ...(state || {}), loaded: !!state && !state.error, setValue, dirty, markSaved };
}
