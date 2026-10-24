import { useCallback, useMemo, useState } from "react";
import { desk, deskVersion, useDesk, pending, recordUnknown, myRecentTap, undoTap } from "../lib/desk.js";
import { deskStage, markedToday, statusOf, unknownsOf } from "../lib/state.js";
import { noPassOf } from "../lib/passColors.js";
import { ISSUE_PASS, NO_DETAILS, UNKNOWN_LIMITS, cleanUnknown, outcomeText } from "../lib/special.js";
import { timeText } from "../lib/timers.js";
import { act, undoFor } from "../act.js";
import { SearchBox, Sheet, SpecialBadge } from "../components.jsx";
import GuestRow from "./GuestRow.jsx";
import AppQr from "./AppQr.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useUndoExpiry } from "../hooks.js";
import { cta, stateChip } from "../lib/vocab.js";

/* LOBBY — Arrivals. Ask the guest's name, find them, tap Mark arrived (one tap): Floor 1 upstairs is told at once.
   Everyone on the list is marked here, whatever their pass (media, exhibitors, speakers, VIPs, pending passes), at any
   hour of an event day; their own desk is told too. On the list with no pass on file: ISSUE PASS ("On the list · no
   pass on file"), the same one tap. Not on the list at all: "No details found: record arrival" (the name as typed)
   tells the pass desk to check ID. A quick toast with Undo (15 s). Beside the list (a phone: a chip above it) the
   "Get the TTFC app" QR code (AppQr.jsx), out of the way of all of that. */
const CTA = cta("lobby");

// Among equal matches, guests not arrived yet first.
const rankLobby = (g) => (deskStage(statusOf(desk.state, g, pending())) === "not_arrived" ? 0 : 1);

export default function Lobby({ onOpen, layout }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const v = deskVersion();
  const [unknownFor, setUnknownFor] = useState(null); // the name typed, when the "No details found" form is open
  const arrive = useCallback((g, done) => {
    const st = statusOf(s, g, pending());
    if (st.arrived || st.checked_in) return;
    act({ point: "arrived", guest: g, undoText: `${g.name}: arrived. Floor 1 has been told.`, undoLabel: CTA.undo, onDone: done });
  }, [s]);
  const { q, setQ, sel, results, inputRef, lookingUp, done, matchOf } = useGuestSearch(s.guests, { rank: rankLobby, onEnter: arrive, version: s.version + p.length });
  useUndoExpiry();
  // Recent arrivals: guests and NO DETAILS FOUND arrivals together, newest first.
  const recent = useMemo(() => {
    const guests = markedToday(s, "arrived", pending(), 12).map((x) => ({ type: "guest", at: x.m.at, ...x }));
    const unknown = unknownsOf(s, pending()).map((u) => ({ type: "unknown", at: u.at, u }));
    return [...guests, ...unknown].sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0)).slice(0, 12);
  }, [s, v]); // eslint-disable-line react-hooks/exhaustive-deps

  const row = (g, i) => {
    const st = statusOf(s, g, p);
    const stage = deskStage(st);
    const undo = undoFor(g, "arrived");
    const issue = noPassOf(g);
    const state = stage === "checked_in" ? stateChip("checked_in", st.checked_in, { noPass: issue }) : stage === "on_the_way" ? stateChip("arrived", st.arrived, { by: true }) : null;
    return (
      <GuestRow key={g.key} id={`res-${i}`} guest={g} selected={i === sel && !!q} onOpen={onOpen} match={q ? matchOf(g) : null}
        state={state} status={issue ? ISSUE_PASS.reading : "Not arrived"} statusTone={issue ? "issue" : ""}
        actions={stage === "not_arrived"
          ? <button key="act" type="button" className="ci-btn ci-btn-arrived ci-btn-cta" onClick={() => arrive(g, done)}>{CTA.label}</button>
          : undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost ci-btn-cta" onClick={undo}>{CTA.undo}</button>
            : null} />
    );
  };

  const noDetailsButton = (
    <button type="button" className="ci-btn ci-btn-unknown" onClick={() => setUnknownFor(q.trim())}>
      <span className="ci-flag-icon" aria-hidden="true">{NO_DETAILS.icon}</span>{NO_DETAILS.button}
    </button>
  );

  // The app QR: a column beside the list on an iPad or laptop, a chip above it on a phone (lib/appQr.js).
  const inline = layout?.kind === "phone";
  return (
    <div className={`ci-station ci-lobby${inline ? "" : " has-side"}`}>
      <div className="ci-lobby-main">
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} autoFocus placeholder="Guest's name, company or ticket ID" />
      {inline && <AppQr searching={!!q} />}
      {q ? (
        <section aria-label="Search results">
          {lookingUp && <p className="ci-muted ci-pad">Looking up the ticket ID…</p>}
          {!results.length && !lookingUp && (
            <div className="ci-empty ci-nomatch">
              <p>No guest matches “{q}”. Check the spelling, or try the surname or company.</p>
              {noDetailsButton}
            </div>
          )}
          <ul className="ci-list">{results.map(row)}</ul>
          {results.length > 0 && <p className="ci-cantfind"><span className="ci-muted">Can't find them?</span> {noDetailsButton}</p>}
        </section>
      ) : (
        <section aria-label="Recent arrivals">
          <h2 className="ci-h2">Recent arrivals today</h2>
          {!recent.length && <p className="ci-empty">No arrivals yet today. Type a guest's name to start.</p>}
          <ul className="ci-list">{recent.map((x, i) => (x.type === "guest" ? row(x.g, i) : <UnknownRow key={x.u.key} u={x.u} />))}</ul>
        </section>
      )}
      </div>
      {!inline && <AppQr searching={!!q} />}
      {unknownFor !== null && <UnknownForm name={unknownFor} onClose={() => setUnknownFor(null)} onDone={() => { setUnknownFor(null); done(); }} />}
    </div>
  );
}

/** A NO DETAILS FOUND arrival in the lobby's recent list (its own look: a hatched panel, a question mark). */
function UnknownRow({ u }) {
  const id = myRecentTap(u.key, "unknown");
  return (
    <li className="ci-row is-unknown">
      <div className="ci-row-main">
        <span className="ci-row-tags"><SpecialBadge kind="unknown" size="s" /></span>
        <span className="ci-row-name">{u.name}</span>
        {(u.company || u.note) && <span className="ci-row-job">{[u.company, u.note].filter(Boolean).join(" · ")}</span>}
      </div>
      <div className="ci-row-side">
        <span className="ci-row-status is-unknown">
          {u.status === "open" ? `Floor 1 told · ${timeText(u.at)}${u.byName ? ` by ${u.byName}` : ""}${u.pending ? " · pending" : ""}` : `Done: ${outcomeText(u.status)}`}
        </span>
        <div className="ci-row-actions">{id ? <button type="button" className="ci-btn ci-btn-ghost ci-btn-cta" onClick={() => undoTap(id)}>Undo arrival</button> : null}</div>
      </div>
    </li>
  );
}

/** "No details found: record arrival": the name as typed (required), company and a note (optional). */
function UnknownForm({ name, onClose, onDone }) {
  const [form, setForm] = useState({ name: name.slice(0, UNKNOWN_LIMITS.name), company: "", note: "" });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    const c = cleanUnknown(form);
    if (!c.ok) { setError(c); return; }
    recordUnknown(c.value);
    onDone();
  };
  return (
    <Sheet title="No details found" onClose={onClose}>
      <form className="ci-unknown-form" onSubmit={submit} noValidate>
        <p className="ci-small ci-muted">Not on the guest list. Record their arrival: the pass desk gets a "{NO_DETAILS.badge}" card to check their ID and send them to the help desk.</p>
        <label className="ci-field"><span>Name, as they said it (required)</span>
          <input value={form.name} onChange={set("name")} maxLength={UNKNOWN_LIMITS.name} autoFocus autoComplete="off" aria-invalid={error?.field === "name" || undefined} />
        </label>
        <label className="ci-field"><span>Company (optional)</span>
          <input value={form.company} onChange={set("company")} maxLength={UNKNOWN_LIMITS.company} autoComplete="off" />
        </label>
        <label className="ci-field"><span>Note (optional)</span>
          <input value={form.note} onChange={set("note")} maxLength={UNKNOWN_LIMITS.note} autoComplete="off" placeholder="e.g. says they registered with a work email" />
        </label>
        {error && <p className="ci-error" role="alert">{error.error}</p>}
        <button type="submit" className="ci-btn ci-btn-unknown ci-btn-xl"><span className="ci-flag-icon" aria-hidden="true">{NO_DETAILS.icon}</span>Record arrival</button>
      </form>
    </Sheet>
  );
}
