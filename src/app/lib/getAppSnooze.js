import { createStore, local } from "./store";
import { SNOOZE_KEY, SNOOZE_MS } from "./storePrompt";

/* One 7-day snooze for both "get the store app" nudges in the web app: Home's "The TTFC app is here" card
   (components/GetAppCard.jsx, its ×) and the "Get the TTFC app" sheet (components/StorePrompt.jsx, "Not now" or the
   store button). localStorage; blocked storage = hidden for this visit only. */

/** { until } (ms since 1970); 0 = not snoozed. */
export const getAppSnooze = createStore({ until: Number(local.get(SNOOZE_KEY) || 0) || 0 });

/** Hides the card and the sheet on this device for 7 days. */
export function snoozeGetApp(now = Date.now()) {
  const until = now + SNOOZE_MS;
  local.set(SNOOZE_KEY, String(until));
  getAppSnooze.set({ until });
}
