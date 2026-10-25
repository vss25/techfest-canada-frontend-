import { useState } from "react";
import { ChevronRight, Coffee, Trophy, UtensilsCrossed, Wine } from "lucide-react";
import { useStore } from "../lib/store";
import { cms } from "../lib/cms";
import { includedItems, inclusionAria, inclusionCaption, inclusionSchedule, personExtras } from "../lib/passExtras";
import { DoneButton, Sheet } from "./ui";

/* =========================================================
   What your pass includes (Oct 24 2026; lib/passExtras.js). The
   organiser found per-day chip rows "too clunky", so: one quiet
   line under the pass colour on your own Profile and under the
   pass name on My pass: icons, "Breakfast · Lunch · Awards · Gala"
   (only what's included) and a chevron, in the accent purple like
   every tappable thing (white on the coloured pass card). It fades
   in once (not under Reduce Motion) and opens "Included with your
   pass": each day with its times and rooms from the agenda (the
   Schedule's CMS sessions), else the published times. Nothing
   included: nothing at all. `tickets`: /auth/me tickets.
========================================================= */

const ICON = { cxo: Coffee, lunch: UtensilsCrossed, awards: Trophy, gala: Wine };
// A session with no stage in the CMS gets the main stage (lib/cms.js); that's not a room for a meal.
const DEFAULT_STAGE = "Centre Stage · Harbour Ballroom";

export default function PassInclusions({ tickets, onCard = false }) {
  const [open, setOpen] = useState(false);
  const c = useStore(cms);
  const extras = personExtras(tickets);
  const items = includedItems(extras);
  if (!items.length) return null;
  const close = () => setOpen(false);
  const sessions = (c.sessions || []).map((s) => ({ day: s.day, title: s.title, startTime: s.startTime, start: s.start, room: s.stage === DEFAULT_STAGE ? "" : s.stage }));

  return (
    <>
      <button type="button" className={"incl-line pressable" + (onCard ? " incl-line--card" : "")}
        aria-label={inclusionAria(extras)} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="incl-icons" aria-hidden="true">{items.map((it) => { const I = ICON[it.key]; return <I key={it.key} />; })}</span>
        <span className="incl-caption" aria-hidden="true">{inclusionCaption(extras)}</span>
        <ChevronRight className="incl-chev" aria-hidden="true" />
      </button>
      {open && (
        <Sheet open onClose={close} title="Included with your pass" actions={{ right: <DoneButton onClick={close} /> }}>
          <div className="sheet-body stack incl-sheet">
            {inclusionSchedule(extras, sessions).map((d) => (
              <section key={d.day} className="stack-sm" aria-labelledby={`incl-day-${d.day}`}>
                <h3 id={`incl-day-${d.day}`} className="eyebrow">{d.label}</h3>
                <ul className="incl-list">
                  {d.items.map((it) => {
                    const I = ICON[it.key];
                    return (
                      <li key={it.key}>
                        <I aria-hidden="true" />
                        <span><b>{it.name}</b><span className="incl-when">{it.time}{it.room ? ` · ${it.room}` : ""}</span></span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
