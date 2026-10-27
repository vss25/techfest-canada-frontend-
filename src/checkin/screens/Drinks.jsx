import { useCallback, useMemo, useState } from "react";
import { askConfirm, pending, toast, useDesk } from "../lib/desk.js";
import { collectedBefore, markedToday, statusOf } from "../lib/state.js";
import { noPassOf } from "../lib/passColors.js";
import { issueDrinks, undoFor } from "../act.js";
import { SearchBox } from "../components.jsx";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useUndoExpiry } from "../hooks.js";
import { couponsText, drinksAgainText, issueDrinksLabel, stateChip } from "../lib/vocab.js";
import { timeText, weekday } from "../lib/timers.js";

/* DRINKS (Oct 27 2026, Day 2). The organiser: "For the another option on pwa for just drink they can search the name
   and say issued coupons for drinks", "For already checked in or pass holders people, this should exist as a separate
   option for drinks checkin", "default is 2 coupon per person". People who collected their badge on Day 1 never pass
   the pass desk on Day 2: handing out their drink coupons here marks them arrived for the day (a soft check-in, the
   server's rule), so they count in the day's attendance and get the survey.
   Search by name or organisation (the same search as everywhere: fuzzy, the matched letters in bold); each result
   shows the pass colour and type, then "Issue 2 drink coupons" with a small − / + (1–5, starting at the desk setting,
   Admin › Event day › Check-in). Once a day per person: issued already (here or at the pass desk) → "Already issued
   today · 10:42 AM · by Sam · 2 coupons", the button off; staff get "Issue again" (adds more, asked first, logged as an
   override). Anyone with a pass on file, collected or not (some badges were handed out without a scan). No pass on
   file (ISSUE PASS) and not checked in at the pass desk today, or not found at all (NO DETAILS FOUND): "Send them to
   the pass desk first." No hours (open all day); off the event days, practice marks. Offline: queued like every tap. */

/** No pass on file and not issued one at the pass desk today: they go there first (the server says the same). */
const needsPassDesk = (g, st) => noPassOf(g) && !st.checked_in;

function Stepper({ value, min, max, onChange, label }) {
  return (
    <span className="ci-stepper" role="group" aria-label={label}>
      <button type="button" className="ci-stepper-btn" aria-label="One coupon fewer" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="ci-stepper-n" aria-live="polite">{value}</span>
      <button type="button" className="ci-stepper-btn" aria-label="One coupon more" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </span>
  );
}

export default function Drinks({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const staff = !!d.session?.staff;
  const per = s.drinks?.perPerson || 2;
  const min = s.drinks?.min || 1;
  const max = s.drinks?.max || 5;
  // The stepper per guest (starts at the desk setting; back to it after each tap).
  const [qty, setQty] = useState({});
  const qtyOf = useCallback((g) => Math.min(max, Math.max(min, qty[g.key] ?? per)), [qty, per, min, max]);
  const setQtyOf = (g, n) => setQty((x) => ({ ...x, [g.key]: n }));
  const forget = (g) => setQty((x) => { const n = { ...x }; delete n[g.key]; return n; });

  const issue = useCallback((g, done) => {
    const st = statusOf(s, g, pending());
    if (st.drinks) { toast(`${g.name}: ${drinksAgainText(st.drinks)}.`, { tone: "warn", key: `drinks-${g.key}` }); return; }
    if (needsPassDesk(g, st)) { toast(`${g.name}: no pass on file. Send them to the pass desk first.`, { tone: "warn", key: `drinks-${g.key}` }); return; }
    issueDrinks(g, { count: qtyOf(g), onDone: done });
    forget(g);
  }, [s, qtyOf]);
  const again = (g, m, done) => {
    const n = qtyOf(g);
    askConfirm({
      title: `Issue ${couponsText(n)} more?`,
      text: `${g.name} already had ${Number(m.count) || 1} today (${timeText(m.at)}${m.by?.name ? `, by ${m.by.name}` : ""}).`,
      detail: "Logged as a staff override with your name.",
      yes: `Issue ${n} more`, tone: "warn",
      onYes: () => { issueDrinks(g, { count: n, again: true, onDone: done }); forget(g); },
    });
  };
  // People who still need theirs first, then those issued; no pass on file last.
  const rank = useCallback((g) => (noPassOf(g) ? 2 : 0), []);
  const { q, setQ, sel, results, inputRef, lookingUp, done, matchOf } = useGuestSearch(s.guests, { rank, onEnter: issue, version: s.version + p.length });
  useUndoExpiry();
  const issuedAll = useMemo(() => markedToday(s, "drinks", p, Infinity), [s, s.version, p.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const issued = issuedAll.slice(0, 80);

  const row = (g, i, { inList = false } = {}) => {
    const st = statusOf(s, g, p);
    const m = st.drinks;
    const undo = m ? undoFor(g, "drinks") : null;
    const blocked = !m && needsPassDesk(g, st);
    // This device's tap a moment ago (or the Issued today list): green; someone about to issue again: amber.
    const state = m ? stateChip("drinks", m, { again: !undo && !inList, by: true }) : null;
    const status = blocked ? "No pass on file · send them to the pass desk first"
      : noPassOf(g) ? "Pass issued at the desk today"
        : g.passCollected ? (collectedBefore(g, s.today) ? `Has pass (collected ${weekday(g.passCollectedAt)})` : "Pass collected today") : "Pass on file (not scanned)";
    const n = qtyOf(g);
    let actions = null;
    if (m) {
      actions = (
        <>
          {undo && <button key="undo" type="button" className="ci-btn ci-btn-ghost" onClick={undo}>Undo coupons</button>}
          {!undo && !inList && <button key="off" type="button" className="ci-btn ci-btn-drinks ci-btn-cta" disabled>{issueDrinksLabel(n)}</button>}
          {staff && !undo && (
            <span className="ci-drinks-again">
              <Stepper value={n} min={min} max={max} onChange={(v) => setQtyOf(g, v)} label={`Coupons for ${g.name}`} />
              <button key="again" type="button" className="ci-btn ci-btn-warn" onClick={() => again(g, m, done)}>Issue again</button>
            </span>
          )}
        </>
      );
    } else if (!blocked) {
      actions = (
        <>
          <Stepper value={n} min={min} max={max} onChange={(v) => setQtyOf(g, v)} label={`Coupons for ${g.name}`} />
          <button key="act" type="button" className="ci-btn ci-btn-drinks ci-btn-cta" onClick={() => issue(g, done)}><span aria-hidden="true">🥤</span> {issueDrinksLabel(n)}</button>
        </>
      );
    }
    return (
      <GuestRow key={g.key} id={`res-${i}`} guest={g} selected={i === sel && !!q} onOpen={onOpen} match={q ? matchOf(g) : null}
        state={state} status={status} statusTone={blocked ? "issue" : ""} actions={actions} tone={blocked ? "stop" : ""} />
    );
  };

  return (
    <div className="ci-station ci-drinks">
      {s.today?.date && !s.today.eventDay && <p className="ci-notice">Not an event day: coupons here are practice marks (they count nobody, and can be undone).</p>}
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} autoFocus placeholder="Guest's name or organisation for drink coupons" />
      {q ? (
        <section aria-label="Search results">
          {lookingUp && <p className="ci-muted ci-pad">Looking up the ticket ID…</p>}
          {!results.length && !lookingUp && <p className="ci-empty">No guest matches “{q}”. Not on the list (no details found)? Send them to the pass desk first.</p>}
          <ul className="ci-list">{results.map((g, i) => row(g, i))}</ul>
        </section>
      ) : (
        <section aria-labelledby="ci-drinks-h">
          <p className="ci-small ci-muted ci-pad">Search a name or organisation. Everyone with a pass gets {couponsText(per)} once today (this marks them arrived). No pass on file or not on the list: send them to the pass desk first.</p>
          <h2 className="ci-h2" id="ci-drinks-h">Issued today <span className="ci-count">{issuedAll.length}</span></h2>
          {!issued.length && <p className="ci-empty">No drink coupons issued yet today.</p>}
          <ul className="ci-list ci-list-compact">{issued.map(({ g }, i) => row(g, i, { inList: true }))}</ul>
          {issuedAll.length > issued.length && <p className="ci-muted ci-pad">Showing the latest {issued.length} of {issuedAll.length}. Search to find anyone else.</p>}
        </section>
      )}
    </div>
  );
}
