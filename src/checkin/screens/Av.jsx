import { useCallback, useMemo, useState } from "react";
import { useDesk, pending } from "../lib/desk.js";
import { statusOf } from "../lib/state.js";
import { clock12, nextSession, untilText } from "../lib/timers.js";
import { act, undoFor } from "../act.js";
import { SearchBox } from "../components.jsx";
import { byLine } from "../lib/byLine.js";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useNow } from "../hooks.js";

/* AV STATION. Speakers and their sessions today (the live agenda: time, room, title), sorted by who speaks next;
   anyone due within 60 minutes who hasn't been AV checked is highlighted. "AV checked" (slides and mic done), with an
   optional short note ("slides on USB"). The lobby's arrivals of speakers ring here too. */

export default function Av({ onOpen }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const now = useNow(30000);
  const eventDay = s.today?.eventDay || null;
  const [notes, setNotes] = useState({});
  const [all, setAll] = useState(false);
  const speakers = useMemo(() => s.guests.filter((g) => g.marks?.speaker), [s.guests]);
  const check = useCallback((g) => {
    const st = statusOf(s, g, pending());
    if (st.av) return;
    act({ point: "av", guest: g, note: (notes[g.key] || "").trim().slice(0, 80), undoText: `${g.name}: AV checked.` });
  }, [s, notes]);
  const { q, setQ, sel, results, inputRef } = useGuestSearch(speakers, { onEnter: check, version: s.version + p.length });

  const rows = useMemo(() => {
    const list = speakers.map((g) => ({ g, next: nextSession(g.sessions || [], { eventDay, now }), st: statusOf(s, g, p) }));
    const today = all ? list : list.filter((x) => (x.g.sessions || []).some((ss) => ss.day === eventDay));
    return today.sort((a, b) => {
      const ka = a.next ? a.next.minutesUntil : 99999;
      const kb = b.next ? b.next.minutesUntil : 99999;
      return (!!a.st.av - !!b.st.av) || ka - kb || a.g.name.localeCompare(b.g.name);
    });
  }, [speakers, eventDay, now, s, s.version, p.length, all]); // eslint-disable-line react-hooks/exhaustive-deps

  const row = ({ g, next, st }, i) => {
    const due = next?.soon && !st.av;
    const undo = undoFor(g, "av");
    const extra = (
      <span className="ci-row-extra">
        {next ? <span className={`ci-session${due ? " is-due" : ""}`}>{due ? "⚡ " : ""}{clock12(next.session.start)} · {next.session.room} · {next.session.title} <b>({untilText(next.minutesUntil)})</b></span>
          : <span className="ci-muted">{(g.sessions || []).some((x) => x.day === eventDay) ? "Done speaking today" : "No session today"}</span>}
        <span className={`ci-rsvp ${st.arrived ? "is-yes" : ""}`}>{st.arrived ? `Arrived ${byLine(st.arrived)}` : "Not arrived yet"}</span>
      </span>
    );
    return (
      <GuestRow key={g.key} guest={g} selected={i === sel && !!q} onOpen={onOpen} extra={extra}
        status={st.av ? `AV checked ${byLine(st.av)}${st.av.note ? ` · “${st.av.note}”` : ""}` : due ? "Due soon" : ""} statusTone={st.av ? "good" : due ? "warn" : ""}
        actions={st.av ? (undo ? <button type="button" className="ci-btn ci-btn-ghost" onClick={undo}>Undo</button> : <span className="ci-done">✓</span>) : (
          <span className="ci-av-act">
            <input className="ci-input ci-input-s" placeholder="Note (optional)" maxLength={80} value={notes[g.key] || ""} onChange={(e) => setNotes({ ...notes, [g.key]: e.target.value })} aria-label={`AV note for ${g.name}`} />
            <button type="button" className="ci-btn ci-btn-good ci-btn-cta" onClick={() => check(g)}>AV checked</button>
          </span>
        )} />
    );
  };

  const shown = q ? results.map((g) => ({ g, next: nextSession(g.sessions || [], { eventDay, now }), st: statusOf(s, g, p) })) : rows;
  return (
    <div className="ci-station ci-av">
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} placeholder="Search a speaker" />
      {!q && (
        <label className="ci-toggle"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show speakers without a session today</label>
      )}
      {!shown.length && <p className="ci-empty">{q ? `No speaker matches “${q}”.` : eventDay ? "No speakers with a session today." : `${s.today?.label || "Not an event day"}: no sessions today.`}</p>}
      <ul className="ci-list">{shown.map(row)}</ul>
    </div>
  );
}
