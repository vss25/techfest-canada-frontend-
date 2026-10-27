import { useEffect, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { markSurveySheetShown, useSurveyPrompt } from "../lib/surveyState";
import { sheetDue } from "../lib/surveyPrompt";
import { Sheet } from "./ui";

/* =========================================================
   The survey in the web app (Oct 26 2026; lib/surveyPrompt.js
   has the rules): a card at the top of Home's feed (after the
   winners) with the server's title, text and button opening
   /survey with this person's own link, and "Not now" (a day);
   and once, from the opening time, a gentle sheet on Home. Both
   go once they've answered (the server stops saying `show`).
   The survey opens in the browser, like "How the leaderboard works".
========================================================= */

export function SurveyFeedCard({ prompt, onSnooze }) {
  return (
    <section className="feed-cta feed-cta--survey" aria-labelledby="feed-survey-h">
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <span className="feed-cta-ico" aria-hidden="true"><ClipboardList /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="feed-cta-eyebrow">Survey · 2 minutes</span>
          <h3 id="feed-survey-h" className="feed-cta-title">{prompt.title}</h3>
          {prompt.body && <p className="feed-cta-why">{prompt.body}</p>}
        </div>
        <button type="button" className="feed-cta-x pressable" onClick={onSnooze} aria-label={`Not now: hide “${prompt.title}” for a day`} title="Not now">
          <X aria-hidden="true" />
        </button>
      </div>
      <a href={prompt.url} target="_blank" rel="noopener" className="btn btn-primary feed-cta-btn pressable">{prompt.cta}</a>
    </section>
  );
}

/** Another sheet or dialog is open, or someone is typing: not now. */
function busy() {
  if (document.querySelector('[aria-modal="true"]')) return true;
  const el = document.activeElement;
  return !!el && el !== document.body && !!el.matches?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
}

/** Once per device, from the opening time: a bottom sheet on Home, when nothing else is on screen. */
export function SurveySheet({ now }) {
  const { prompt, sheetShown } = useSurveyPrompt();
  const [open, setOpen] = useState(false);
  const due = sheetDue({ prompt, shown: sheetShown, now });

  useEffect(() => {
    if (!due || open) return undefined;
    let waited = 0;
    const t = setInterval(() => {
      waited += 500;
      if (waited < 1500 || document.visibilityState !== "visible" || busy()) return;
      clearInterval(t);
      markSurveySheetShown();
      setOpen(true);
    }, 500);
    return () => clearInterval(t);
  }, [due, open]);

  if (!open) return null;
  const close = () => setOpen(false);
  return (
    <Sheet open onClose={close} labelledBy="survey-sheet-h">
      <div className="sheet-body survey-sheet">
        <span className="survey-sheet-ico" aria-hidden="true"><ClipboardList /></span>
        <h2 id="survey-sheet-h">{prompt.title}</h2>
        {prompt.body && <p>{prompt.body}</p>}
        <a href={prompt.url} target="_blank" rel="noopener" className="btn btn-primary btn-block pressable" onClick={() => setTimeout(close, 400)}>{prompt.cta}</a>
        <button type="button" className="link-btn survey-sheet-later" onClick={close}>Not now</button>
      </div>
    </Sheet>
  );
}
