import { createStore, useStore } from "./store";
import { get } from "./api";
import { content } from "./content";
import { swagFrom, swagFromApi } from "../../lib/swag.js";

/* =========================================================
   The swag kit giveaway in the web app (batch 7): the public
   GET /api/app/swag (no auth; the server works out the phase, the
   date words and the filled-in rules), cached for a minute. Until it
   answers, the same is worked out from the app content settings
   (lib/content.js, src/lib/swag.js swagFrom). The phase moves on with
   the clock while a screen stays open (open → closed → announced).
   Used by Points (the banner), the feed card and /install.
========================================================= */

export const swagState = createStore({ data: null, at: 0 });

export async function refreshSwag({ force = false } = {}) {
  if (!force && Date.now() - swagState.get().at < 60000) return;
  try {
    const r = await get("app/swag", { auth: false, cache: "no-store" });
    if (swagFromApi(r)) swagState.set({ data: r, at: Date.now() });
  } catch { /* the content settings stand in */ }
}

const ORDER = ["open", "closed", "announced"];

/** The giveaway now: src/lib/swag.js's shape (stage off | open | closed | announced). `now` in ms. */
export function swagNow(data, values, now) {
  const s = (data && swagFromApi(data)) || swagFrom(values, now);
  if (s.stage === "off") return s;
  const byClock = now >= s.announce ? "announced" : now >= s.cutoff ? "closed" : "open";
  return ORDER.indexOf(byClock) > ORDER.indexOf(s.stage) ? { ...s, stage: byClock } : s;
}

export function useSwag(now) {
  const st = useStore(swagState);
  const ct = useStore(content);
  return swagNow(st.data, ct.values, Number(now));
}
