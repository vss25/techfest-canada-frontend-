import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDesk, pending, setInclusion, toast } from "../lib/desk.js";
import { FLAG_POINT, STATION_POINT, statusOf } from "../lib/state.js";
import { MEAL_ITEMS } from "../lib/stationTime.js";
import { act, undoFor } from "../act.js";
import { Dietary, InclusionSummary, PassBand, SearchBox, StateChip, StopSign } from "../components.jsx";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useUndoExpiry } from "../hooks.js";
import { noPassOf, passNameOf } from "../lib/passColors.js";
import { cta, mealName, permit, stateChip } from "../lib/vocab.js";

/* CxO BREAKFAST · LUNCH · EVENING ENTRY (Awards Night on Day 1, the Gala on Day 2).
   Find the guest (or browse the list): every result says at once whether they're permitted for today's item, BEFORE
   anyone taps (Oct 24 2026, the organiser: "when I search a name I should be able to see whether they are permitted or
   not. Use a stop sign"): a green check "On the list", or a red STOP sign "Not on the list" (the server's inclusions:
   any of their passes, staff's switches and Media / VIP first; never worked out here). Then whether they RSVP'd for it
   and their dietary needs (allergies first, for the kitchen). "Admit to Lunch" once a day; a second time: "Already
   admitted · 12:31 PM" in amber. Tapping someone who isn't on the list opens the STOP panel with the reason
   ("Connect Pass — lunch not included"): volunteers send them to staff ("Sent to staff", logged); staff can "Admit
   anyway (override)" (contract C11: recorded and audited as an override, their pass unchanged) or add it to their pass
   and admit (Admin › People's switch, audited). A day that isn't an event day: practice marks, and the list as on the
   next event day, so the check and the STOP sign can be rehearsed. */

const SHOW = [
  { key: "entitled", label: "On the list" },
  { key: "rsvpd", label: "RSVP'd" },
  { key: "admitted", label: "Admitted" },
  { key: "flagged", label: "Sent to staff" },
];

/** The item a station's list is checked against: today's, else (practice) the next event day's, else Day 1's. */
function shownItem(station, st) {
  if (st?.item) return { item: st.item, practice: false };
  const next = st?.next?.item || MEAL_ITEMS[station]?.day1 || null;
  return { item: next, practice: !!next };
}

export default function Meal({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const station = d.station;
  const point = STATION_POINT[station];
  const flagPoint = FLAG_POINT[station];
  const st = s.stationStates?.[station];
  const { item, practice } = shownItem(station, st);
  const staff = !!d.session?.staff;
  const [show, setShow] = useState("entitled");
  const [busy, setBusy] = useState("");
  const [stop, setStop] = useState(null); // the guest whose STOP panel is open
  const name = mealName(item);
  const CTA = cta(station, { item });

  const included = useCallback((g) => (item ? !noPassOf(g) && !!g.extras?.[item.extra] : null), [item]);
  const admit = useCallback((g, done) => {
    const now = statusOf(s, g, pending());
    if (now[point]) { toast(`${g.name}: ${stateChip("admitted", now[point], { item, again: true, by: true }).text}.`, { tone: "warn" }); return; }
    if (item && !included(g)) { setStop(g); return; }
    act({ point, guest: g, undoText: `${g.name}: admitted to ${name || "the event"}.`, undoLabel: CTA.undo, onDone: done });
  }, [s, point, item, included, name, CTA.undo]);
  const rank = useCallback((g) => (included(g) ? 0 : 1), [included]);
  const { q, setQ, sel, results, inputRef, lookingUp, done } = useGuestSearch(s.guests, { rank, onEnter: admit, version: s.version + p.length });
  useUndoExpiry();

  const list = useMemo(() => {
    if (q || !item) return [];
    return s.guests.filter((g) => {
      const x = statusOf(s, g, p);
      if (show === "entitled") return included(g) && !x[point];
      if (show === "rsvpd") return g.rsvp?.options?.includes(item.key);
      if (show === "admitted") return !!x[point];
      if (show === "flagged") return !!x[flagPoint];
      return false;
    });
  }, [q, item, s, s.version, p.length, show, included, point, flagPoint]); // eslint-disable-line react-hooks/exhaustive-deps

  const row = (g, i, { inList = false } = {}) => {
    const x = statusOf(s, g, p);
    const inc = included(g);
    const pm = permit({ item, included: inc, noPass: noPassOf(g), passName: passNameOf(g) });
    const rsvpd = item ? g.rsvp?.options?.includes(item.key) : false;
    const admitted = x[point];
    const flagged = x[flagPoint];
    const undo = undoFor(g, point);
    const blocked = !!pm && !pm.ok && !admitted;
    const extra = (
      <span className="ci-row-extra">
        {pm && <Permit p={pm} />}
        {item && <span className={`ci-rsvp ${rsvpd ? "is-yes" : ""}`}>{rsvpd ? "RSVP'd" : g.rsvp?.rsvpd ? "Not on their RSVP" : "No RSVP"}</span>}
        <Dietary guest={g} big />
      </span>
    );
    // What happened: admitted (this device's tap a moment ago, or the Admitted list: green), or again in a search: amber.
    const state = admitted ? stateChip("admitted", admitted, { item, again: !undo && !inList, by: true }) : flagged ? stateChip("flagged", flagged, { by: true }) : null;
    let actions = null;
    if (admitted) actions = undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost" onClick={undo}>{CTA.undo}</button> : null;
    else if (!blocked) actions = <button key="act" type="button" className="ci-btn ci-btn-good ci-btn-cta" onClick={() => admit(g, done)}>{CTA.label}</button>;
    else actions = <button key="stop" type="button" className="ci-btn ci-btn-stop ci-btn-cta" onClick={() => setStop(g)}><StopSign size={22} /> Not on the list</button>;
    return (
      <GuestRow key={g.key} guest={g} selected={i === sel && !!q} onOpen={blocked ? () => setStop(g) : onOpen} extra={extra}
        state={state} actions={actions} tone={blocked ? "stop" : ""} />
    );
  };

  const includeAndAdmit = async (g) => {
    setBusy(g.key);
    try {
      await setInclusion(g, item.extra, true);
      toast(`${item.label} added to ${g.name}'s pass (logged).`, { tone: "ok" });
      setStop(null);
      act({ point, guest: g, undoText: `${g.name}: admitted to ${name}.`, undoLabel: CTA.undo, onDone: done });
    } catch (err) {
      toast(err.message || "Couldn't add it. Check the connection.", { tone: "bad" });
    } finally { setBusy(""); }
  };

  const open = stop ? s.byKey.get(stop.key) || stop : null;
  const openSt = open ? statusOf(s, open, p) : null;
  return (
    <div className="ci-station ci-meal">
      {practice && <p className="ci-notice">{st?.text || "No event today."} Practice: the list as on {st?.next?.dayLabel || "Day 1"} ({item.label}); taps are practice marks.</p>}
      {!item && <p className="ci-notice">{st?.text || "No event today."} Taps here are practice marks.</p>}
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} autoFocus placeholder={`Guest's name for ${item?.label || "entry"}`} />
      {q ? (
        <section aria-label="Search results">
          {lookingUp && <p className="ci-muted ci-pad">Looking up the ticket ID…</p>}
          {!results.length && !lookingUp && <p className="ci-empty">No guest matches “{q}”.</p>}
          <ul className="ci-list">{results.map((g, i) => row(g, i))}</ul>
        </section>
      ) : item ? (
        <section aria-label="Guest list">
          <div className="ci-tabs ci-tabs-small" role="tablist">
            {SHOW.map((x) => <button key={x.key} type="button" role="tab" aria-selected={show === x.key} className={show === x.key ? "is-on" : ""} onClick={() => setShow(x.key)}>{x.label}</button>)}
          </div>
          {!list.length && <p className="ci-empty">{show === "entitled" ? "Everyone on the list has been admitted." : "Nobody here yet."}</p>}
          <ul className="ci-list">{list.slice(0, 150).map((g, i) => row(g, i, { inList: true }))}</ul>
          {list.length > 150 && <p className="ci-muted ci-pad">Showing 150 of {list.length}. Search to find anyone.</p>}
        </section>
      ) : null}
      {open && (
        <StopPanel g={open} item={item} staff={staff} busy={busy === open.key} flagged={openSt[flagPoint]} admitted={openSt[point]}
          onClose={() => { setStop(null); done(); }}
          onAdmit={(g) => { setStop(null); act({ point, guest: g, undoText: `${g.name}: admitted to ${name}.`, undoLabel: CTA.undo, onDone: done }); }}
          onOverride={(g) => { setStop(null); act({ point, guest: g, notIncluded: true, undoText: `${g.name}: admitted to ${name} (staff override, logged).`, undoLabel: CTA.undo, onDone: done }); }}
          onInclude={includeAndAdmit}
          onFlag={(g) => { setStop(null); act({ point: flagPoint, guest: g, undoText: `${g.name}: sent to staff.`, onDone: done }); }}
          onDetails={(g) => { setStop(null); onOpen?.(g); }} />
      )}
    </div>
  );
}

/** "On the list" (a green check) or "Not on the list" (a red STOP sign), before anyone taps. */
function Permit({ p }) {
  return p.ok
    ? <span className="ci-permit is-yes"><span className="ci-permit-icon" aria-hidden="true">✓</span>{p.text}</span>
    : <span className="ci-permit is-no"><StopSign size={22} />{p.text}</span>;
}

/**
 * The STOP panel: a guest who isn't on today's list. The reason, then what can be done: staff "Admit anyway
 * (override)" (recorded as an override, contract C11) or add it to their pass and admit; volunteers "Send to staff".
 * If an admin changes their inclusions meanwhile (a live event), the panel turns into "On the list" with Admit.
 */
function StopPanel({ g, item, staff, busy, flagged, admitted, onClose, onAdmit, onOverride, onInclude, onFlag, onDetails }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const issue = noPassOf(g);
  const inc = !issue && !!g.extras?.[item?.extra];
  const pm = permit({ item, included: inc, noPass: issue, passName: passNameOf(g) });
  const name = mealName(item);
  const rsvpd = item && g.rsvp?.options?.includes(item.key);
  return (
    <div className="ci-modal" data-modal-open role="alertdialog" aria-modal="true" aria-labelledby="ci-stop-t" aria-describedby="ci-stop-why"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`ci-modal-card ci-stop-card${pm?.ok ? " is-ok" : ""}`}>
        <div className="ci-stop-head">
          {pm?.ok ? <span className="ci-permit-big" aria-hidden="true">✓</span> : <StopSign size={72} title="Stop" />}
          <div>
            <h2 id="ci-stop-t">{pm?.ok ? "On the list" : "Not on the list"}</h2>
            <p className="ci-stop-what">{item?.label}</p>
          </div>
        </div>
        <p className="ci-stop-name">{g.name}</p>
        <div className="ci-stop-band"><PassBand guest={g} size="m" /></div>
        <p className="ci-stop-why" id="ci-stop-why">{pm?.ok ? `${name} is on their pass now (changed by staff).` : pm?.reason}</p>
        <p className="ci-small ci-muted">{rsvpd ? `RSVP'd for ${name}.` : g.rsvp?.rsvpd ? `Not on their RSVP for ${name}.` : "No RSVP."}</p>
        <InclusionSummary guest={g} size="m" />
        {admitted && <p><StateChip {...stateChip("admitted", admitted, { item, again: true, by: true })} /></p>}
        {flagged && !admitted && <p><StateChip {...stateChip("flagged", flagged, { by: true })} /></p>}
        <div className="ci-modal-actions ci-stop-actions">
          {pm?.ok && !admitted && <button type="button" className="ci-btn ci-btn-good" onClick={() => onAdmit(g)}>{cta("lunch", { item }).label}</button>}
          {!pm?.ok && !admitted && staff && !issue && <button type="button" className="ci-btn ci-btn-warn" onClick={() => onOverride(g)}>Admit anyway (override)</button>}
          {!pm?.ok && !admitted && staff && !issue && <button type="button" className="ci-btn ci-btn-ghost" disabled={busy} onClick={() => onInclude(g)}>{busy ? "Adding…" : `Add ${name} to their pass + admit`}</button>}
          {!pm?.ok && !admitted && !staff && !flagged && <button type="button" className="ci-btn ci-btn-warn" onClick={() => onFlag(g)}>Send to staff</button>}
          <button type="button" className="ci-btn ci-btn-ghost" ref={ref} onClick={onClose}>Back</button>
        </div>
        {!pm?.ok && !admitted && (
          <p className="ci-small ci-muted">
            {issue ? "No pass on file: they need a pass first (the pass desk on Floor 1, or Admin › People)." : staff ? "An override is logged with your name; their pass stays as it is." : "Only staff can admit someone who isn't on the list."}
          </p>
        )}
        <p className="ci-center"><button type="button" className="ci-linkbtn" onClick={() => onDetails(g)}>Guest details</button></p>
      </div>
    </div>
  );
}
