import { useCallback, useMemo } from "react";
import { useDesk, pending } from "../lib/desk.js";
import { boothStatus, statusOf } from "../lib/state.js";
import { act, undoFor } from "../act.js";
import { SearchBox } from "../components.jsx";
import { byLine } from "../lib/byLine.js";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { fold } from "../lib/search.js";
import { useUndoExpiry } from "../hooks.js";

/* EXHIBITOR DESK. Exhibitor companies by booth (the exhibitor passes and their booth numbers): each exhibitor checks in
   here ("Checked in"), each booth is marked "Booth set up" once a day, with the time. The lobby's arrivals of
   exhibitors ring here too. */

export default function Exhibitor({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const exhibitors = useMemo(() => s.guests.filter((g) => g.marks?.exhibitor), [s.guests]);
  const checkIn = useCallback((g, done) => {
    if (statusOf(s, g, pending()).exhibitor) return;
    act({ point: "exhibitor", guest: g, undoText: `${g.name}: checked in at the exhibitor desk.`, onDone: done });
  }, [s]);
  const { q, setQ, sel, results, inputRef, done } = useGuestSearch(exhibitors, { onEnter: checkIn, version: s.version + p.length });
  useUndoExpiry();
  const shownKeys = q ? new Set(results.map((g) => g.key)) : null;
  const booths = s.booths.filter((b) => !shownKeys || b.guests.some((k) => shownKeys.has(k)) || fold(b.booth).startsWith(fold(q)));
  const noBooth = exhibitors.filter((g) => !g.boothKey && (!shownKeys || shownKeys.has(g.key)));

  const person = (g) => {
    const st = statusOf(s, g, p);
    const undo = undoFor(g, "exhibitor");
    return (
      <GuestRow key={g.key} guest={g} selected={q && results[sel]?.key === g.key} onOpen={onOpen}
        extra={<span className="ci-row-extra"><span className={`ci-rsvp ${st.arrived ? "is-yes" : ""}`}>{st.arrived ? `Arrived ${byLine(st.arrived)}` : "Not arrived yet"}</span></span>}
        status={st.exhibitor ? `Checked in ${byLine(st.exhibitor)}` : ""} statusTone={st.exhibitor ? "good" : ""}
        actions={st.exhibitor ? (undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost" onClick={undo}>Undo</button> : <span key="done" className="ci-done">✓</span>)
          : <button key="act" type="button" className="ci-btn ci-btn-good ci-btn-cta" onClick={() => checkIn(g, done)}>Checked in</button>} />
    );
  };

  return (
    <div className="ci-station ci-exhibitor">
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} placeholder="Exhibitor, company or booth" />
      {!booths.length && !noBooth.length && <p className="ci-empty">{q ? `Nothing matches “${q}”.` : "No exhibitor passes yet."}</p>}
      <div className="ci-booths">
        {booths.map((b) => {
          const m = boothStatus(s, b, p);
          const people = b.guests.map((k) => s.byKey.get(k)).filter(Boolean).filter((g) => !shownKeys || shownKeys.has(g.key) || fold(b.booth).startsWith(fold(q)));
          return (
            <section key={b.key} className="ci-booth" aria-label={`Booth ${b.booth}`}>
              <header className="ci-booth-head">
                <span className="ci-booth-no">Booth {b.booth}</span>
                <span className="ci-booth-co">{b.companies.join(" · ") || "Exhibitor"}</span>
                {m ? <span className="ci-row-status is-good">Set up {byLine(m)}</span>
                  : <button type="button" className="ci-btn ci-btn-primary" onClick={() => act({ point: "booth", key: b.key, undoText: `Booth ${b.booth}: set up.`, onDone: done })}>Booth set up</button>}
              </header>
              <ul className="ci-list ci-list-compact">{people.map((g) => person(g))}</ul>
            </section>
          );
        })}
        {noBooth.length > 0 && (
          <section className="ci-booth" aria-label="No booth">
            <header className="ci-booth-head"><span className="ci-booth-no">No booth number</span><span className="ci-booth-co">Exhibitor passes without a booth</span></header>
            <ul className="ci-list ci-list-compact">{noBooth.map((g) => person(g))}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
