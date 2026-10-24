import { useCallback, useMemo, useState } from "react";
import { useDesk, pending, setInclusion, toast } from "../lib/desk.js";
import { FLAG_POINT, STATION_POINT, statusOf } from "../lib/state.js";
import { act, undoFor } from "../act.js";
import { Dietary, SearchBox } from "../components.jsx";
import { byLine } from "../lib/byLine.js";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { timeText } from "../lib/timers.js";
import { useUndoExpiry } from "../hooks.js";
import { noPassOf } from "../lib/passColors.js";

/* CxO BREAKFAST · LUNCH · EVENING ENTRY (Awards Night on Day 1, the Gala on Day 2).
   Find the guest (or browse the list): green "Included today" or red "Not on their pass" for today's item (the pass's
   own inclusions, staff's switches first), whether they RSVP'd for it, and their dietary needs (allergies first, for
   the kitchen). Admitted once a day ("Already admitted at 7:52"). Not on their pass: staff can switch it on there and
   then (Admin › People's switch, audited); volunteers send them to staff ("Sent to staff", logged). */

const SHOW = [
  { key: "entitled", label: "Included" },
  { key: "rsvpd", label: "RSVP'd" },
  { key: "admitted", label: "Admitted" },
  { key: "flagged", label: "Sent to staff" },
];

export default function Meal({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const station = d.station;
  const point = STATION_POINT[station];
  const flagPoint = FLAG_POINT[station];
  const state = s.stationStates?.[station];
  const item = state?.item || null;
  const staff = !!d.session?.staff;
  const [show, setShow] = useState("entitled");
  const [busy, setBusy] = useState("");

  const included = useCallback((g) => (item ? !!g.extras?.[item.extra] : null), [item]);
  const admit = useCallback((g, done) => {
    const st = statusOf(s, g, pending());
    if (st[point]) { toast(`Already admitted at ${timeText(st[point].at)}${st[point].by?.name ? ` by ${st[point].by.name}` : ""}.`, { tone: "warn" }); return; }
    if (item && !g.extras?.[item.extra]) { toast(`${g.name}: ${item.label} isn't on their pass.`, { tone: "bad" }); return; }
    act({ point, guest: g, undoText: `${g.name}: admitted to ${item?.label || "the event"}.`, onDone: done });
  }, [s, point, item]);
  const rank = useCallback((g) => (included(g) ? 0 : 1), [included]);
  const { q, setQ, sel, results, inputRef, lookingUp, done } = useGuestSearch(s.guests, { rank, onEnter: admit, version: s.version + p.length });
  useUndoExpiry();

  const list = useMemo(() => {
    if (q || !item) return [];
    return s.guests.filter((g) => {
      const st = statusOf(s, g, p);
      if (show === "entitled") return included(g) && !st[point];
      if (show === "rsvpd") return g.rsvp?.options?.includes(item.key);
      if (show === "admitted") return !!st[point];
      if (show === "flagged") return !!st[flagPoint];
      return false;
    });
  }, [q, item, s, s.version, p.length, show, included, point, flagPoint]); // eslint-disable-line react-hooks/exhaustive-deps

  const includeAndAdmit = async (g) => {
    setBusy(g.key);
    try {
      await setInclusion(g, item.extra, true);
      toast(`${item.label} switched on for ${g.name}'s pass (logged).`, { tone: "ok" });
      act({ point, guest: g, undoText: `${g.name}: admitted to ${item.label}.`, onDone: done });
    } catch (err) {
      toast(err.message || "Couldn't switch it on. Check the connection.", { tone: "bad" });
    } finally { setBusy(""); }
  };

  const row = (g, i) => {
    const st = statusOf(s, g, p);
    const inc = included(g);
    const rsvpd = item ? g.rsvp?.options?.includes(item.key) : false;
    const admitted = st[point];
    const flagged = st[flagPoint];
    const undo = undoFor(g, point);
    const extra = (
      <span className="ci-row-extra">
        {item && <span className={`ci-ent ${inc ? "is-yes" : "is-no"}`}>{inc ? "✓ Included today" : "✕ Not on their pass"}</span>}
        {item && <span className={`ci-rsvp ${rsvpd ? "is-yes" : ""}`}>{rsvpd ? "RSVP'd" : g.rsvp?.rsvpd ? "Not on their RSVP" : "No RSVP"}</span>}
        <Dietary guest={g} big />
      </span>
    );
    let actions;
    if (admitted) actions = undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost" onClick={undo}>Undo</button> : <span key="done" className="ci-done">✓</span>;
    else if (inc || !item) actions = <button key="act" type="button" className="ci-btn ci-btn-good ci-btn-cta" onClick={() => admit(g, done)}>Admitted</button>;
    else if (staff && !noPassOf(g)) actions = <button key="incl" type="button" className="ci-btn ci-btn-warn ci-btn-cta" disabled={busy === g.key} onClick={() => includeAndAdmit(g)}>{busy === g.key ? "Switching on…" : `Include ${item.short} + admit`}</button>;
    else actions = flagged ? <span key="flagged" className="ci-row-status is-warn">Sent to staff</span>
      : <button key="flag" type="button" className="ci-btn ci-btn-warn ci-btn-cta" onClick={() => act({ point: flagPoint, guest: g, undoText: `${g.name}: sent to staff.`, onDone: done })}>Sent to staff</button>;
    return (
      <GuestRow key={g.key} guest={g} selected={i === sel && !!q} onOpen={onOpen} extra={extra}
        status={admitted ? `Admitted ${byLine(admitted)}` : flagged ? `Sent to staff ${byLine(flagged)}` : ""} statusTone={admitted ? "good" : flagged ? "warn" : ""}
        actions={actions} />
    );
  };

  return (
    <div className="ci-station ci-meal">
      {!item && <p className="ci-notice">{state?.text || "No event today."} Taps here are practice marks.</p>}
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} autoFocus placeholder={`Guest's name for ${item?.label || "entry"}`} />
      {q ? (
        <section aria-label="Search results">
          {lookingUp && <p className="ci-muted ci-pad">Looking up the ticket ID…</p>}
          {!results.length && !lookingUp && <p className="ci-empty">No guest matches “{q}”.</p>}
          <ul className="ci-list">{results.map(row)}</ul>
        </section>
      ) : item ? (
        <section aria-label="Guest list">
          <div className="ci-tabs ci-tabs-small" role="tablist">
            {SHOW.map((x) => <button key={x.key} type="button" role="tab" aria-selected={show === x.key} className={show === x.key ? "is-on" : ""} onClick={() => setShow(x.key)}>{x.label}</button>)}
          </div>
          {!list.length && <p className="ci-empty">{show === "entitled" ? "Everyone included has been admitted." : "Nobody here yet."}</p>}
          <ul className="ci-list">{list.slice(0, 150).map(row)}</ul>
          {list.length > 150 && <p className="ci-muted ci-pad">Showing 150 of {list.length}. Search to find anyone.</p>}
        </section>
      ) : null}
    </div>
  );
}
