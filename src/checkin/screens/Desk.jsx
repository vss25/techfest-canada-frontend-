import { useCallback, useState } from "react";
import { useDesk, pending } from "../lib/desk.js";
import { checkedInToday, collectedBefore, deskStage, onTheWay, statusOf } from "../lib/state.js";
import { badgeOf } from "../lib/passColors.js";
import { clockText, secondsSince, timeText, timerLevel, weekday } from "../lib/timers.js";
import { act, undoFor } from "../act.js";
import { BoxHint, Chips, Inclusions, PassBand, SearchBox } from "../components.jsx";
import { byLine } from "../lib/byLine.js";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useLayout, useNow } from "../hooks.js";

/* FLOOR 1 — Pass desk. "On the way up": everyone the lobby marked Arrived, newest on top, each card big enough to read
   from the desk (name, company, pass colour, what to hand over, the badge box, the time since they arrived: amber
   after 60 s, red after 2 min). Tap Checked in when the pass is handed over. "Checked in": latest first. A search for
   people who came straight up. Day 2: "Has pass (collected Mon)". */

export default function Desk({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const now = useNow(1000);
  const layout = useLayout();
  const [tab, setTab] = useState("way");
  const checkIn = useCallback((g) => {
    const st = statusOf(s, g, pending());
    if (st.checked_in) return;
    act({ point: "checked_in", guest: g, undoText: `${g.name}: checked in, pass handed over.` });
  }, [s]);
  const { q, setQ, sel, results, inputRef, lookingUp } = useGuestSearch(s.guests, { onEnter: checkIn, version: s.version + p.length });
  const way = onTheWay(s, p);
  const done = checkedInToday(s, p, 80);

  const wayCol = (
    <section className="ci-col" aria-labelledby="ci-way-h">
      <h2 className="ci-h2" id="ci-way-h">On the way up <span className="ci-count">{way.length}</span></h2>
      {!way.length && <p className="ci-empty">Nobody on the way up. Arrivals from the lobby appear here at once, with a chime.</p>}
      <ul className="ci-cards">
        {way.map(({ g, st }) => <WayCard key={g.key} g={g} st={st} now={now} today={s.today} note={s.notes[g.key]} onOpen={onOpen} onCheckIn={checkIn} />)}
      </ul>
    </section>
  );
  const doneCol = (
    <section className="ci-col" aria-labelledby="ci-done-h">
      <h2 className="ci-h2" id="ci-done-h">Checked in today <span className="ci-count">{done.length}</span></h2>
      {!done.length && <p className="ci-empty">No check-ins yet today.</p>}
      <ul className="ci-list ci-list-compact">
        {done.map(({ g, st }) => {
          const undo = undoFor(g, "checked_in");
          return (
            <GuestRow key={g.key} guest={g} onOpen={onOpen} status={`Checked in ${byLine(st.checked_in)}`} statusTone="good"
              actions={undo ? <button type="button" className="ci-btn ci-btn-ghost" onClick={undo}>Undo</button> : <span className="ci-done">✓</span>} />
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="ci-station ci-desk">
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} placeholder="Came straight up? Search name, company…" />
      {q && (
        <section className="ci-desk-search" aria-label="Search results">
          {lookingUp && <p className="ci-muted ci-pad">Looking up the ticket ID…</p>}
          {!results.length && !lookingUp && <p className="ci-empty">No guest matches “{q}”.</p>}
          <ul className="ci-list">
            {results.map((g, i) => {
              const st = statusOf(s, g, p);
              const stage = deskStage(st);
              return (
                <GuestRow key={g.key} guest={g} selected={i === sel} onOpen={onOpen}
                  status={stage === "checked_in" ? `Checked in ${byLine(st.checked_in)}` : stage === "on_the_way" ? `On the way up · ${clockText(secondsSince(st.arrived.at, now))}` : collectedBefore(g, s.today) ? `Has pass (collected ${weekday(g.passCollectedAt)})` : "Not arrived"}
                  statusTone={stage === "checked_in" ? "good" : stage === "on_the_way" ? "info" : ""}
                  extra={<span className="ci-row-extra"><Inclusions guest={g} /><BoxHint guest={g} /></span>}
                  actions={stage === "checked_in" ? <span className="ci-done">✓</span>
                    : <button type="button" className="ci-btn ci-btn-good ci-btn-cta" onClick={() => checkIn(g)}>Checked in</button>} />
              );
            })}
          </ul>
        </section>
      )}
      {layout.deskTabs ? (
        <>
          <div className="ci-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "way"} className={tab === "way" ? "is-on" : ""} onClick={() => setTab("way")}>On the way up ({way.length})</button>
            <button type="button" role="tab" aria-selected={tab === "done"} className={tab === "done" ? "is-on" : ""} onClick={() => setTab("done")}>Checked in ({done.length})</button>
          </div>
          {tab === "way" ? wayCol : doneCol}
        </>
      ) : (
        <div className="ci-two-col">{wayCol}{doneCol}</div>
      )}
    </div>
  );
}

function WayCard({ g, st, now, today, note, onOpen, onCheckIn }) {
  const band = badgeOf(g);
  const secs = secondsSince(st.arrived.at, now);
  const level = timerLevel(secs);
  const had = collectedBefore(g, today);
  return (
    <li className={`ci-card is-${level}`} style={{ "--gbg": band.bg, "--gtx": band.text }}>
      <div className="ci-card-band"><PassBand guest={g} size="l" /><Chips guest={g} /></div>
      <button type="button" className="ci-card-main" onClick={() => onOpen?.(g)}>
        <span className="ci-card-name">{g.name}</span>
        {(g.title || g.company) && <span className="ci-card-job">{[g.title, g.company].filter(Boolean).join(" · ")}</span>}
      </button>
      <div className="ci-card-facts">
        <BoxHint guest={g} />
        <span className={`ci-timer is-${level}`} aria-label={`Arrived ${clockText(secs)} ago`}>⏱ {clockText(secs)}</span>
      </div>
      <div className="ci-card-hand">
        <span className="ci-small ci-muted">Hand over</span>
        <Inclusions guest={g} />
      </div>
      {had && <p className="ci-card-had">Has pass (collected {weekday(g.passCollectedAt)}): wave them through, or check in for today.</p>}
      {note?.text && <p className="ci-card-note">📝 {note.text}</p>}
      {g.pending && <p className="ci-card-note is-warn">Pending pass: not sent to them yet. Check with staff.</p>}
      <div className="ci-card-foot">
        <span className="ci-small ci-muted">Arrived {timeText(st.arrived.at)}{st.arrived.by?.name ? ` · ${st.arrived.by.name}` : ""}{st.arrived.pending ? " · pending" : ""}</span>
        <button type="button" className="ci-btn ci-btn-good ci-btn-xl" onClick={() => onCheckIn(g)}>✓ Checked in</button>
      </div>
    </li>
  );
}
