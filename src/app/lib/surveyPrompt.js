import { SURVEY_SNOOZE_MS } from "./feedPlan.js";
import { parseToronto } from "../../lib/swag.js";

/* =========================================================
   The survey in the web app (Oct 26 2026): GET /api/app/survey
   (signed in) → { show, opensAt, title, body, cta, url }. While
   `show` is true (the server stops once they've answered):
     - a card at the top of Home's feed (lib/feedPlan.js), whose
       "Not now" hides it on this device for a day;
     - once, from `opensAt` on, a gentle sheet on Home (this
       device remembers it was shown; its "Not now" only closes it).
   Pure (node --test src/app/lib/surveyPrompt.test.mjs); the store
   and the call are lib/surveyState.js, the UI
   components/SurveyPrompt.jsx.
========================================================= */

export const SNOOZE_KEY = "ttfc.app.survey.snoozedUntil";
export const SHEET_KEY = "ttfc.app.survey.sheetShown";

const str = (v, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d);

/** Only our own pages: the server's https link on thetechfestival.com, or a path on this site; else the plain /survey. */
export function surveyHref(url, fallback = "/survey") {
  const s = str(url);
  if (!s) return fallback;
  if (/^\/(?!\/)/.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && /(^|\.)thetechfestival\.com$/i.test(u.hostname) ? u.href : fallback;
  } catch { return fallback; }
}

/** The server's answer with defaults: { show, opensAt (ms or NaN), title, body, cta, url }; show false when unusable. */
export function promptFrom(r) {
  if (!r || typeof r !== "object") return { show: false, opensAt: NaN, title: "", body: "", cta: "", url: "/survey" };
  return {
    show: r.show === true,
    opensAt: parseToronto(r.opensAt),
    title: str(r.title, "How was TTFC 2026?"),
    body: str(r.body, "Two minutes of your time helps us plan TTFC 2027."),
    cta: str(r.cta, "Take the survey"),
    url: surveyHref(r.url),
  };
}

/** The one-time sheet: the survey shows, it's open (from opensAt), and this device hasn't shown the sheet yet. */
export function sheetDue({ prompt, shown, now }) {
  if (!prompt?.show || shown) return false;
  return !Number.isFinite(prompt.opensAt) || now >= prompt.opensAt;
}

/** "Not now" on the feed card: hidden until a day from now. */
export const snoozeUntil = (now) => now + SURVEY_SNOOZE_MS;
