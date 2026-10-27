import { createStore, local, useStore } from "./store";
import { get } from "./api";
import { SHEET_KEY, SNOOZE_KEY, promptFrom, snoozeUntil } from "./surveyPrompt.js";

/* The survey prompt (GET /api/app/survey, signed in), cached for a minute, plus this device's "Not now" (a day) and
   whether the one-time sheet was shown. A server without the survey (404) or no connection: nothing shows. */

export const surveyState = createStore({
  prompt: promptFrom(null), at: 0,
  snoozedUntil: Number(local.get(SNOOZE_KEY) || 0) || 0,
  sheetShown: local.get(SHEET_KEY) === "1",
});

export async function refreshSurveyPrompt({ force = false } = {}) {
  if (!force && Date.now() - surveyState.get().at < 60000) return;
  surveyState.set({ at: Date.now() });
  try {
    const r = await get("app/survey", { cache: "no-store" });
    surveyState.set({ prompt: promptFrom(r) });
  } catch { /* keeps what it had */ }
}

export function snoozeSurvey(now = Date.now()) {
  const until = snoozeUntil(now);
  local.set(SNOOZE_KEY, String(until));
  surveyState.set({ snoozedUntil: until });
}

export function markSurveySheetShown() {
  local.set(SHEET_KEY, "1");
  surveyState.set({ sheetShown: true });
}

export const useSurveyPrompt = () => useStore(surveyState);

window.addEventListener("ttfc:signed-out", () => surveyState.set({ prompt: promptFrom(null), at: 0 }));
