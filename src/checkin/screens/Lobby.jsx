import { useCallback } from "react";
import { desk, useDesk, pending } from "../lib/desk.js";
import { deskStage, markedToday, statusOf } from "../lib/state.js";
import { timeText } from "../lib/timers.js";
import { act, undoFor } from "../act.js";
import { SearchBox } from "../components.jsx";
import { byLine } from "../lib/byLine.js";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useUndoExpiry } from "../hooks.js";

/* LOBBY — Arrivals. Ask the guest's name, find them, tap Arrived (one tap): the pass desk upstairs is told at once.
   A quick toast with Undo (15 s). Nothing else to fill in. */

// Among equal matches, guests not arrived yet first.
const rankLobby = (g) => (deskStage(statusOf(desk.state, g, pending())) === "not_arrived" ? 0 : 1);

export default function Lobby({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const arrive = useCallback((g, done) => {
    const st = statusOf(s, g, pending());
    if (st.arrived || st.checked_in) return;
    act({ point: "arrived", guest: g, undoText: `${g.name}: arrived. The pass desk has been told.`, onDone: done });
  }, [s]);
  const { q, setQ, sel, results, inputRef, lookingUp, done } = useGuestSearch(s.guests, { rank: rankLobby, onEnter: arrive, version: s.version + p.length });
  useUndoExpiry();
  const recent = markedToday(s, "arrived", p, 12);

  const row = (g, i) => {
    const st = statusOf(s, g, p);
    const stage = deskStage(st);
    const undo = undoFor(g, "arrived");
    const status = stage === "checked_in" ? `Checked in at ${timeText(st.checked_in.at)}` : stage === "on_the_way" ? `On the way up · ${byLine(st.arrived)}` : "Not arrived";
    return (
      <GuestRow key={g.key} id={`res-${i}`} guest={g} selected={i === sel && !!q} onOpen={onOpen}
        status={status} statusTone={stage === "checked_in" ? "good" : stage === "on_the_way" ? "info" : ""}
        actions={stage === "not_arrived"
          ? <button key="act" type="button" className="ci-btn ci-btn-primary ci-btn-cta" onClick={() => arrive(g, done)}>Arrived</button>
          : undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost ci-btn-cta" onClick={undo}>Undo</button>
            : <span key="done" className="ci-done" aria-label="Done">✓</span>} />
    );
  };

  return (
    <div className="ci-station ci-lobby">
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} autoFocus placeholder="Guest's name, company or ticket ID" />
      {q ? (
        <section aria-label="Search results">
          {lookingUp && <p className="ci-muted ci-pad">Looking up the ticket ID…</p>}
          {!results.length && !lookingUp && <p className="ci-empty">No guest matches “{q}”. Check the spelling, try the surname or company, or send them to the pass desk.</p>}
          <ul className="ci-list">{results.map(row)}</ul>
        </section>
      ) : (
        <section aria-label="Recent arrivals">
          <h2 className="ci-h2">Recent arrivals today</h2>
          {!recent.length && <p className="ci-empty">No arrivals yet today. Type a guest's name to start.</p>}
          <ul className="ci-list">{recent.map((x, i) => row(x.g, i))}</ul>
        </section>
      )}
    </div>
  );
}
