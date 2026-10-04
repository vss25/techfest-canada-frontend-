/**
 * Build the request body for POST/PATCH /api/cms/:type.
 * The backend reads the fields straight from the JSON body
 * (see toSanityPatch in services/cmsSchema.js).
 *  - create: every non-empty value
 *  - edit: only changed values; a cleared optional field is sent as null (unset)
 */
export function buildBody({ form, original, keys, numberKeys = [], boolKeys = [], creating }) {
  const out = {};
  for (const k of keys) {
    let v = form[k];
    if (typeof v === "string") v = v.trim();
    if (numberKeys.includes(k)) v = v === "" || v == null ? "" : Number(v);
    if (boolKeys.includes(k)) v = !!v;
    if (creating) {
      if (v !== "" && v != null) out[k] = v;
      continue;
    }
    let before = original?.[k];
    if (boolKeys.includes(k)) before = !!before;
    if (before == null) before = "";
    if (v === before) continue;
    out[k] = v === "" ? null : v;
  }
  return out;
}

export const nextOrder = (docs = []) =>
  docs.reduce((m, d) => (typeof d.order === "number" && d.order > m ? d.order : m), 0) + 1;
