import { useCallback, useMemo, useState } from "react";
import { closeUnknown, deskVersion, linkUnknown, useDesk, pending } from "../lib/desk.js";
import { checkedInToday, collectedBefore, deskStage, onTheWay, statusOf, unknownsOf } from "../lib/state.js";
import { badgeOf, noPassOf } from "../lib/passColors.js";
import { ISSUE_PASS, NO_DETAILS, UNKNOWN_OUTCOMES } from "../lib/special.js";
import { buildIndex, search } from "../lib/search.js";
import { clockText, secondsSince, timeText, timerLevel, weekday } from "../lib/timers.js";
import { act, undoFor } from "../act.js";
import { BoxHint, Chips, InclusionSummary, PassBand, SearchBox, Sheet, SpecialBadge, StateChip } from "../components.jsx";
import { cta, onTheWayText, stateChip } from "../lib/vocab.js";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useLayout, useNow, useUndoExpiry } from "../hooks.js";

/* FLOOR 1 — Pass desk. "On the way up": everyone the lobby marked Arrived, newest on top, each card big enough to read
   from the desk (name, company, pass colour, the inclusion summary: CxO Breakfast / Lunch / Gala Dinner / Catalyst
   Awards ✓ or ✗ as the server says, live; the badge box, the time since they arrived: amber after 60 s, red after
   2 min). Tap "Check in & give pass" when the pass is handed over. "Checked in": latest first (the latest
   80 shown, the count is everyone's). A search for people who came straight up. Day 2: "Has pass (collected Mon)".
   ISSUE PASS (on the list, no pass on file): the card says so in big type ("Issue pass: name is on the list, no pass on
   file"), with a dashed outline. NO DETAILS FOUND (the lobby couldn't find them): a hatched card with a question mark,
   the name as typed, "check ID, send to help desk", and Sent to help desk / Pass issued / Left (staff: Found them).
   The lists are worked out when something changes, not every second: only each card's own timer ticks. */

const SHOW_DONE = 80;

export default function Desk({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const v = deskVersion();
  const layout = useLayout();
  const [tab, setTab] = useState("way");
  useUndoExpiry();
  const checkIn = useCallback((g, done) => {
    const st = statusOf(s, g, pending());
    if (st.checked_in) return;
    // ISSUE PASS (on the list, no pass on file): Checked in here = the pass was issued at the desk (contract C7).
    act({ point: "checked_in", guest: g, undoText: noPassOf(g) ? `${g.name}: pass issued, checked in.` : `${g.name}: checked in · pass given.`, undoLabel: cta("desk").undo, onDone: done });
  }, [s]);
  const { q, setQ, sel, results, inputRef, lookingUp, done, matchOf } = useGuestSearch(s.guests, { onEnter: checkIn, version: s.version + p.length });
  // Worked out again when anything on the desk changes (v: every live event, tap, queue change), not on the timers' ticks.
  const way = useMemo(() => onTheWay(s, pending()), [s, v]); // eslint-disable-line react-hooks/exhaustive-deps
  // NO DETAILS FOUND arrivals still waiting, in the same list (newest first).
  const unknown = useMemo(() => unknownsOf(s, pending(), { open: true }), [s, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const wayAll = useMemo(() => [...way.map((x) => ({ type: "guest", at: x.st.arrived.at, ...x })), ...unknown.map((u) => ({ type: "unknown", at: u.at, u }))]
    .sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0)), [way, unknown]);
  const [finding, setFinding] = useState(null); // a NO DETAILS FOUND card staff are matching to a guest
  const staff = !!d.session?.staff;
  const doneAll = useMemo(() => checkedInToday(s, pending(), Infinity), [s, v]); // eslint-disable-line react-hooks/exhaustive-deps
  const doneShown = doneAll.length > SHOW_DONE ? doneAll.slice(0, SHOW_DONE) : doneAll;

  const wayCol = (
    <section className="ci-col" aria-labelledby="ci-way-h">
      <h2 className="ci-h2" id="ci-way-h">On the way up <span className="ci-count">{wayAll.length}</span></h2>
      {!wayAll.length && <p className="ci-empty">Nobody on the way up. Arrivals from the lobby appear here at once, with a chime.</p>}
      <ul className="ci-cards">
        {wayAll.map((x) => (x.type === "unknown"
          ? <UnknownCard key={x.u.key} u={x.u} staff={staff} onFind={() => setFinding(x.u)} />
          : <WayCard key={x.g.key} g={x.g} st={x.st} today={s.today} note={s.notes[x.g.key]} onOpen={onOpen} onCheckIn={checkIn} />))}
      </ul>
    </section>
  );
  const doneCol = (
    <section className="ci-col" aria-labelledby="ci-done-h">
      <h2 className="ci-h2" id="ci-done-h">Checked in today <span className="ci-count">{doneAll.length}</span></h2>
      {!doneAll.length && <p className="ci-empty">No check-ins yet today.</p>}
      <ul className="ci-list ci-list-compact">
        {doneShown.map(({ g, st }) => {
          const undo = undoFor(g, "checked_in");
          return (
            <GuestRow key={g.key} guest={g} onOpen={onOpen} state={stateChip("checked_in", st.checked_in, { noPass: noPassOf(g), by: true })}
              actions={undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost" onClick={undo}>{cta("desk").undo}</button> : null} />
          );
        })}
      </ul>
      {doneAll.length > doneShown.length && <p className="ci-muted ci-pad">Showing the latest {doneShown.length} of {doneAll.length}. Search to find anyone else.</p>}
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
              const issue = noPassOf(g);
              const undo = stage === "checked_in" ? undoFor(g, "checked_in") : null;
              // Checked in already (not this device's tap a moment ago): amber "Already checked in", so a second pass
              // is never handed over by mistake.
              const state = stage === "checked_in" ? stateChip("checked_in", st.checked_in, { noPass: issue, again: !undo, by: true }) : null;
              return (
                <GuestRow key={g.key} guest={g} selected={i === sel} onOpen={onOpen}
                  match={matchOf(g)}
                  state={state}
                  status={stage === "on_the_way" ? <OnTheWay at={st.arrived.at} /> : issue ? ISSUE_PASS.reading : collectedBefore(g, s.today) ? `Has pass (collected ${weekday(g.passCollectedAt)})` : "Not arrived"}
                  statusTone={issue && stage !== "on_the_way" ? "issue" : ""}
                  extra={<span className="ci-row-extra"><InclusionSummary guest={g} size="s" /><BoxHint guest={g} /></span>}
                  actions={stage === "checked_in" ? (undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost" onClick={undo}>{cta("desk").undo}</button> : null)
                    : <button key="act" type="button" className="ci-btn ci-btn-good ci-btn-cta" onClick={() => checkIn(g, done)}>{cta("desk", { noPass: issue }).label}</button>} />
              );
            })}
          </ul>
        </section>
      )}
      {layout.deskTabs ? (
        <>
          <div className="ci-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "way"} className={tab === "way" ? "is-on" : ""} onClick={() => setTab("way")}>On the way up ({wayAll.length})</button>
            <button type="button" role="tab" aria-selected={tab === "done"} className={tab === "done" ? "is-on" : ""} onClick={() => setTab("done")}>Checked in ({doneAll.length})</button>
          </div>
          {tab === "way" ? wayCol : doneCol}
        </>
      ) : (
        <div className="ci-two-col">{wayCol}{doneCol}</div>
      )}
      {finding && <FindGuest u={finding} guests={s.guests} onClose={() => setFinding(null)} />}
    </div>
  );
}

/** A NO DETAILS FOUND arrival: the name as typed, check their ID, then close it. Never looks like a pass. */
function UnknownCard({ u, staff, onFind }) {
  const now = useNow(1000);
  const secs = secondsSince(u.at, now);
  const level = timerLevel(secs);
  return (
    <li className={`ci-card is-unknown is-${level}`}>
      <div className="ci-card-band"><SpecialBadge kind="unknown" size="l" /></div>
      <p className="ci-card-big is-unknown"><span className="ci-flag-icon" aria-hidden="true">{NO_DETAILS.icon}</span>{NO_DETAILS.card}</p>
      <div className="ci-card-main">
        <span className="ci-card-name">{u.name}</span>
        {u.company && <span className="ci-card-job">{u.company}</span>}
      </div>
      <div className="ci-card-facts">
        <span className="ci-small ci-muted">Name as typed in the lobby</span>
        <span className={`ci-timer is-${level}`} aria-label={`Arrived ${clockText(secs)} ago`}>⏱ {clockText(secs)}</span>
      </div>
      {u.note && <p className="ci-card-note">📝 {u.note}</p>}
      <div className="ci-card-foot">
        <span className="ci-small ci-muted">Arrived {timeText(u.at)}{u.byName ? ` · ${u.byName}` : ""}{u.pending ? " · pending" : ""}</span>
        <div className="ci-unknown-actions">
          {UNKNOWN_OUTCOMES.map((o) => <button key={o.outcome} type="button" className={`ci-btn ${o.outcome === "pass_issued" ? "ci-btn-good" : "ci-btn-ghost"}`} onClick={() => closeUnknown(u.key, o.outcome)}>{o.label}</button>)}
          {staff && <button type="button" className="ci-btn ci-btn-primary" onClick={onFind}>Found them</button>}
        </div>
      </div>
    </li>
  );
}

/** Staff: the NO DETAILS FOUND arrival is on the list after all. Pick the guest: they're marked Arrived, the card goes. */
function FindGuest({ u, guests, onClose }) {
  const [q, setQ] = useState(u.name || "");
  const index = useMemo(() => buildIndex(guests), [guests]);
  const results = useMemo(() => search(index, q, { limit: 12 }), [index, q]);
  return (
    <Sheet title="Found them on the list?" onClose={onClose}>
      <p className="ci-small ci-muted">Typed in the lobby: <b>{u.name}</b>{u.company ? ` · ${u.company}` : ""}. Search the guest list and pick them: they're marked Arrived and this card goes.</p>
      <input className="ci-input ci-input-wide" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company…" aria-label="Search the guest list" autoFocus />
      <ul className="ci-list ci-list-compact ci-find-list">
        {results.map((g) => (
          <GuestRow key={g.key} guest={g} match={{ q, kind: "" }}
            actions={<button type="button" className="ci-btn ci-btn-primary" onClick={() => { linkUnknown(u.key, g.key); onClose(); }}>This is them</button>} />
        ))}
      </ul>
      {q && !results.length && <p className="ci-empty">No guest matches “{q}”.</p>}
    </Sheet>
  );
}

/** "On the way up · 0:35" (the arrived state's chip), the time since `at` ticking on its own (the rest of the screen
    doesn't re-render every second). */
function OnTheWay({ at }) {
  const now = useNow(1000);
  return <StateChip tone="arrived" text={onTheWayText(clockText(secondsSince(at, now)))} />;
}

function WayCard({ g, st, today, note, onOpen, onCheckIn }) {
  const now = useNow(1000);
  const band = badgeOf(g);
  const secs = secondsSince(st.arrived.at, now);
  const level = timerLevel(secs);
  const had = collectedBefore(g, today);
  const issue = noPassOf(g);
  return (
    <li className={`ci-card is-${level}${issue ? " is-issue" : ""}`} style={band.neutral ? undefined : { "--gbg": band.bg, "--gtx": band.text }}>
      <div className="ci-card-band"><PassBand guest={g} size="l" /><Chips guest={g} /></div>
      {issue && <p className="ci-card-big is-issue"><span className="ci-flag-icon" aria-hidden="true">{ISSUE_PASS.icon}</span>{ISSUE_PASS.card}</p>}
      <button type="button" className="ci-card-main" onClick={() => onOpen?.(g)}>
        <span className="ci-card-name">{g.name}</span>
        {(g.title || g.company) && <span className="ci-card-job">{[g.title, g.company].filter(Boolean).join(" · ")}</span>}
      </button>
      <div className="ci-card-facts">
        <BoxHint guest={g} />
        <span className={`ci-timer is-${level}`} aria-label={`Arrived ${clockText(secs)} ago`}>⏱ {clockText(secs)}</span>
      </div>
      <div className="ci-card-hand">
        <InclusionSummary guest={g} size="m" />
      </div>
      {had && <p className="ci-card-had">Has pass (collected {weekday(g.passCollectedAt)}): wave them through, or check in for today.</p>}
      {note?.text && <p className="ci-card-note">📝 {note.text}</p>}
      {g.pending && <p className="ci-card-note is-warn">Pending pass: not sent to them yet. Check with staff.</p>}
      <div className="ci-card-foot">
        <StateChip {...stateChip("arrived", st.arrived, { by: true })} size="s" />
        <button type="button" className="ci-btn ci-btn-good ci-btn-xl" onClick={() => onCheckIn(g)}>{cta("desk", { noPass: issue }).label}</button>
      </div>
    </li>
  );
}
