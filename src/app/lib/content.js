import { get } from "./api";
import { createStore, local } from "./store";

/* =========================================================
   Texts and switches staff change in the admin panel
   (GET /api/app/content, public). Cached; built-in defaults
   until the first fetch and when offline.
========================================================= */

const KEY = "ttfc.app.content";

export const content = createStore({ values: local.json(KEY, {}), at: 0 });

export async function refreshContent({ force = false } = {}) {
  if (!force && Date.now() - content.get().at < 30000) return;
  try {
    const values = await get("app/content", { auth: false });
    if (values && typeof values === "object") {
      local.setJSON(KEY, values);
      content.set({ values, at: Date.now() });
    }
  } catch { /* keep the cached copy */ }
}

export function text(state, key, fallback) {
  const v = state.values?.[key];
  return typeof v === "string" && v.trim() ? v : fallback;
}

export function optionalText(state, key) {
  const v = state.values?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function flag(state, key, def = true) {
  const v = state.values?.[key];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  return def;
}

/** Live polls / audience Q&A global switches. */
export const liveFlags = (state) => ({ polls: flag(state, "flag.polls"), qa: flag(state, "flag.qa") });
