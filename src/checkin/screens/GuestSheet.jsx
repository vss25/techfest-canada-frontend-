import { useEffect, useState } from "react";
import { useDesk, pending, setInclusion, setPersonFlag, tap, toast, fetchHistory } from "../lib/desk.js";
import { collectedBefore, statusOf } from "../lib/state.js";
import { timeText, weekday, clock12 } from "../lib/timers.js";
import { BoxHint, Chips, Dietary, Inclusions, PassBand, Sheet } from "../components.jsx";
import { byLine } from "../lib/byLine.js";
import { EXTRA_LABELS, EXTRA_ORDER } from "../lib/constants.js";
import { resetMark } from "../act.js";

/* One guest: who they are, their pass and inclusions, what's happened today at every station, their dietary needs and
   sessions. Staff also see the email (to check who someone is), change the inclusions (Admin › People's switches,
   audited), Media / VIP / Exhibitor, write a desk note ("Collect at VIP desk"), reset any of today's marks and see the
   guest's history. Volunteers never see emails or phone numbers. */

const POINTS = [
  ["arrived", "Arrived (lobby)"], ["checked_in", "Checked in (pass desk)"], ["cxo", "CxO Breakfast"], ["lunch", "Lunch"], ["evening", "Evening entry"],
  ["media", "Media desk"], ["av", "AV checked"], ["exhibitor", "Exhibitor desk"], ["flag_cxo", "Sent to staff (breakfast)"], ["flag_lunch", "Sent to staff (lunch)"], ["flag_evening", "Sent to staff (evening)"],
];

export default function GuestSheet({ guest, onClose }) {
  const d = useDesk();
  const s = d.state;
  const staff = !!d.session?.staff;
  const g = s.byKey.get(guest.key) || guest;
  const st = statusOf(s, g, pending());
  const note = s.notes[g.key];
  const [noteText, setNoteText] = useState(note?.text || "");
  const [busy, setBusy] = useState("");
  const [history, setHistory] = useState(null);
  useEffect(() => { setNoteText(s.notes[g.key]?.text || ""); }, [g.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (label, fn) => {
    setBusy(label);
    try { await fn(); toast("Saved (logged).", { tone: "ok", ms: 2500 }); } catch (err) { toast(err.message || "Not saved. Check the connection.", { tone: "bad" }); } finally { setBusy(""); }
  };
  const view = g.extrasView || {};
  return (
    <Sheet title={g.name} onClose={onClose} wide>
      <div className="ci-sheet-top">
        <PassBand guest={g} size="l" />
        <Chips guest={g} />
        <BoxHint guest={g} />
      </div>
      {(g.title || g.company) && <p className="ci-sheet-job">{[g.title, g.company].filter(Boolean).join(" · ")}</p>}
      {staff && g.email && <p className="ci-sheet-email">✉ {g.email}{g.ticketId ? <span className="ci-muted"> · ticket {String(g.ticketId).toUpperCase()}</span> : null}</p>}
      {g.pending && <p className="ci-notice is-warn">Pending pass: staff made it and haven't sent it yet.</p>}
      <p className="ci-small">{g.passCollected ? `Pass collected${g.passCollectedAt ? ` ${collectedBefore(g, s.today) ? weekday(g.passCollectedAt) : "today"} at ${timeText(g.passCollectedAt)}` : ""}` : "Pass not collected yet"}{g.booth ? ` · Booth ${String(g.booth).toUpperCase()}` : ""}</p>
      {note?.text && <p className="ci-card-note">📝 {note.text} <span className="ci-muted">({note.by})</span></p>}

      <h3 className="ci-h3">Includes</h3>
      <Inclusions guest={g} />
      {g.rsvp?.rsvpd ? <p className="ci-small">RSVP'd: {g.rsvp.days.map((x) => (x === "day1" ? "Day 1" : "Day 2")).join(" and ") || "no days"}{g.rsvp.options.length ? ` · ${g.rsvp.options.length} meals / events` : ""}</p> : <p className="ci-small ci-muted">No RSVP</p>}
      <Dietary guest={g} big />
      {(g.sessions || []).length > 0 && (
        <>
          <h3 className="ci-h3">Sessions</h3>
          <ul className="ci-plain">{g.sessions.map((x) => <li key={`${x.day}${x.start}${x.title}`}>{x.day === "day1" ? "Day 1" : "Day 2"} · {clock12(x.start)} · {x.room} · {x.title}</li>)}</ul>
        </>
      )}

      <h3 className="ci-h3">Today ({s.today?.label})</h3>
      <ul className="ci-today">
        {POINTS.filter(([k]) => st[k] || ["arrived", "checked_in"].includes(k)).map(([k, label]) => (
          <li key={k}>
            <span>{label}</span>
            <span className={st[k] ? "ci-good" : "ci-muted"}>{st[k] ? byLine(st[k]) : "—"}{st[k]?.note ? ` · “${st[k].note}”` : ""}</span>
            {staff && st[k] && !st[k].pending && <button type="button" className="ci-btn ci-btn-ghost ci-btn-s" onClick={() => resetMark(g, k, label)}>Reset</button>}
          </li>
        ))}
      </ul>

      {staff && (
        <>
          <h3 className="ci-h3">Inclusions on this pass (staff)</h3>
          <p className="ci-small ci-muted">Automatic follows the pass's rules. Changes are saved in Admin › People and logged.</p>
          <ul className="ci-switches">
            {EXTRA_ORDER.map((k) => {
              const v = view[k] || { override: null, auto: false, included: !!g.extras?.[k] };
              return (
                <li key={k}>
                  <span>{EXTRA_LABELS[k]} <b className={v.included ? "ci-good" : "ci-bad"}>{v.included ? "Yes" : "No"}</b></span>
                  <span className="ci-seg" role="group" aria-label={EXTRA_LABELS[k]}>
                    {[["auto", null, `Auto (${v.auto ? "Yes" : "No"})`], ["yes", true, "Yes"], ["no", false, "No"]].map(([id, val, lab]) => (
                      <button key={id} type="button" className={(v.override ?? null) === val ? "is-on" : ""} disabled={!!busy}
                        onClick={() => run(`x-${k}`, () => setInclusion(g, k, val))}>{lab}</button>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
          <h3 className="ci-h3">Marks (staff)</h3>
          <ul className="ci-switches">
            {[["media", "Media"], ["vip", "VIP"], ["exhibitor", "Exhibitor"]].map(([k, lab]) => (
              <li key={k}>
                <span>{lab} <b>{g.marks?.[k] ? "Yes" : "No"}</b></span>
                <span className="ci-seg" role="group" aria-label={lab}>
                  <button type="button" className={g.marks?.[k] ? "is-on" : ""} disabled={!!busy} onClick={() => run(`m-${k}`, () => setPersonFlag(g, k, true))}>Yes</button>
                  <button type="button" className={!g.marks?.[k] ? "is-on" : ""} disabled={!!busy} onClick={() => run(`m-${k}`, () => setPersonFlag(g, k, false))}>No</button>
                </span>
              </li>
            ))}
          </ul>
          <h3 className="ci-h3">Desk note (staff)</h3>
          <form className="ci-note-form" onSubmit={(e) => { e.preventDefault(); tap({ kind: "note", key: g.key, note: noteText.trim().slice(0, 140) }); toast(noteText.trim() ? "Note saved." : "Note cleared.", { tone: "ok", ms: 2500 }); }}>
            <input className="ci-input ci-input-wide" maxLength={140} placeholder="e.g. Collect at VIP desk" value={noteText} onChange={(e) => setNoteText(e.target.value)} aria-label="Desk note" />
            <button type="submit" className="ci-btn ci-btn-primary">Save note</button>
          </form>
          <h3 className="ci-h3">History</h3>
          {history ? (
            <ul className="ci-plain ci-small">
              {history.length ? history.map((e) => <li key={e.seq}>{timeText(e.at)} · {e.day} · {e.kind}{e.point ? ` ${e.point}` : ""} · {e.by?.name} ({e.station}){e.override ? " · override" : ""}{e.note ? ` · “${e.note}”` : ""}</li>) : <li>Nothing yet.</li>}
            </ul>
          ) : (
            <button type="button" className="ci-btn ci-btn-ghost" onClick={() => fetchHistory(g.key).then((r) => setHistory(r.events || [])).catch((err) => toast(err.message, { tone: "bad" }))}>Show history</button>
          )}
        </>
      )}
    </Sheet>
  );
}
