import { useCallback, useEffect, useMemo, useState } from "react";
import { useDesk, pending, tap, fetchTeam, toast } from "../lib/desk.js";
import { statusOf } from "../lib/state.js";
import { timeText } from "../lib/timers.js";
import { act, undoFor } from "../act.js";
import { SearchBox } from "../components.jsx";
import { byLine } from "../lib/byLine.js";
import GuestRow from "./GuestRow.jsx";
import { useGuestSearch } from "../useGuestSearch.js";
import { useUndoExpiry } from "../hooks.js";

/* MEDIA DESK ("media query queue"). Media guests (Media = Yes, whatever their pass) check in here, and the lobby's
   arrivals of media guests ring here. The queue of media queries: who, outlet, what they asked for, New → In progress
   → Done, and who has it. Anyone adds one; volunteers can take a new one; staff reassign and close. */

const STATUS = { new: "New", in_progress: "In progress", done: "Done" };

export default function Media({ onOpen, layout }) {
  const d = useDesk();
  const s = d.state;
  const p = pending();
  const staff = !!d.session?.staff;
  const media = useMemo(() => s.guests.filter((g) => g.marks?.media), [s.guests]);
  const checkIn = useCallback((g, done) => {
    if (statusOf(s, g, pending()).media) return;
    act({ point: "media", guest: g, undoText: `${g.name}: checked in at the media desk.`, onDone: done });
  }, [s]);
  const { q, setQ, sel, results, inputRef, done } = useGuestSearch(media, { onEnter: checkIn, version: s.version + p.length });
  useUndoExpiry();
  const list = q ? results : [...media].sort((a, b) => {
    const sa = statusOf(s, a, p);
    const sb = statusOf(s, b, p);
    return (!!sa.media - !!sb.media) || (!!sb.arrived - !!sa.arrived) || a.name.localeCompare(b.name);
  });
  const [tab, setTab] = useState("guests");
  const two = layout?.columns === 2;

  const guests = (
    <section className="ci-col" aria-label="Media guests">
      <SearchBox value={q} onChange={setQ} inputRef={inputRef} placeholder="Search a media guest" />
      {!list.length && <p className="ci-empty">{q ? `No media guest matches “${q}”.` : "No media guests on the list (Media = Yes in Admin › People)."}</p>}
      <ul className="ci-list">
        {list.map((g, i) => {
          const st = statusOf(s, g, p);
          const undo = undoFor(g, "media");
          return (
            <GuestRow key={g.key} guest={g} selected={i === sel && !!q} onOpen={onOpen}
              extra={<span className="ci-row-extra"><span className={`ci-rsvp ${st.arrived ? "is-yes" : ""}`}>{st.arrived ? `Arrived ${byLine(st.arrived)}` : "Not arrived yet"}</span></span>}
              status={st.media ? `Checked in ${byLine(st.media)}` : ""} statusTone={st.media ? "good" : ""}
              actions={st.media ? (undo ? <button key="undo" type="button" className="ci-btn ci-btn-ghost" onClick={undo}>Undo</button> : <span key="done" className="ci-done">✓</span>)
                : <button key="act" type="button" className="ci-btn ci-btn-good ci-btn-cta" onClick={() => checkIn(g, done)}>Checked in</button>} />
          );
        })}
      </ul>
    </section>
  );
  return (
    <div className="ci-station ci-media">
      {!two && (
        <div className="ci-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "guests"} className={tab === "guests" ? "is-on" : ""} onClick={() => setTab("guests")}>Media guests</button>
          <button type="button" role="tab" aria-selected={tab === "queue"} className={tab === "queue" ? "is-on" : ""} onClick={() => setTab("queue")}>Queries ({[...s.queries.values()].filter((x) => x.status !== "done").length})</button>
        </div>
      )}
      {two ? <div className="ci-two-col">{guests}<Queue staff={staff} media={media} /></div> : tab === "guests" ? guests : <Queue staff={staff} media={media} />}
    </div>
  );
}

function Queue({ staff, media }) {
  const d = useDesk();
  const s = d.state;
  const [who, setWho] = useState("");
  const [outlet, setOutlet] = useState("");
  const [request, setRequest] = useState("");
  const [team, setTeam] = useState([]);
  const [showDone, setShowDone] = useState(false);
  useEffect(() => { if (staff) fetchTeam().then((r) => setTeam(r.team || [])).catch(() => {}); }, [staff]);
  const qs = [...s.queries.values()].sort((a, b) => (a.status === "done") - (b.status === "done") || Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  const shown = qs.filter((x) => showDone || x.status !== "done");
  const match = media.find((g) => who && g.name.toLowerCase() === who.trim().toLowerCase());
  const add = (e) => {
    e.preventDefault();
    if (!request.trim()) { toast("Say what they're asking for.", { tone: "bad" }); return; }
    if (!who.trim()) { toast("Say who's asking.", { tone: "bad" }); return; }
    tap({ kind: "query_add", who: who.trim(), outlet: outlet.trim() || match?.company || "", request: request.trim(), ...(match ? { key: match.key } : {}) });
    setWho(""); setOutlet(""); setRequest("");
    toast("Query added.", { tone: "ok", ms: 3000 });
  };
  const update = (q, patch) => tap({ kind: "query_update", id: q.id, ...patch });
  return (
    <section className="ci-col ci-queue" aria-label="Media queries">
      <h2 className="ci-h2">Media queries</h2>
      <form className="ci-queue-add" onSubmit={add}>
        <input className="ci-input" list="ci-media-names" placeholder="Who (name)" value={who} onChange={(e) => setWho(e.target.value)} maxLength={80} aria-label="Who is asking" />
        <datalist id="ci-media-names">{media.map((g) => <option key={g.key} value={g.name} />)}</datalist>
        <input className="ci-input" placeholder="Outlet" value={outlet} onChange={(e) => setOutlet(e.target.value)} maxLength={80} aria-label="Outlet" />
        <input className="ci-input ci-input-wide" placeholder="Request, e.g. interview with …, press kit, photo pit access" value={request} onChange={(e) => setRequest(e.target.value)} maxLength={240} aria-label="Request" />
        <button type="submit" className="ci-btn ci-btn-primary">Add query</button>
      </form>
      <label className="ci-toggle"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show done</label>
      {!shown.length && <p className="ci-empty">No open queries.</p>}
      <ul className="ci-queries">
        {shown.map((x) => {
          const mine = x.assignee?.id && x.assignee.id === d.session?.user?.id;
          return (
            <li key={x.id} className={`ci-query is-${x.status}`}>
              <div className="ci-query-main">
                <span className={`ci-qstatus is-${x.status}`}>{STATUS[x.status]}</span>
                <b>{x.who || "Someone"}</b>{x.outlet ? ` · ${x.outlet}` : ""}
                <p>{x.request}</p>
                <span className="ci-small ci-muted">Added {timeText(x.createdAt)} by {x.createdBy?.name || "?"}{x.assignee ? ` · with ${x.assignee.name}` : " · nobody has it yet"}{x.doneAt ? ` · done ${timeText(x.doneAt)}` : ""}</span>
              </div>
              <div className="ci-query-actions">
                {x.status !== "done" && !x.assignee && <button type="button" className="ci-btn ci-btn-primary" onClick={() => update(x, { status: "in_progress", assignee: "me" })}>Take it</button>}
                {x.status === "new" && mine && <button type="button" className="ci-btn ci-btn-primary" onClick={() => update(x, { status: "in_progress" })}>Start</button>}
                {staff && (
                  <>
                    <select className="ci-input ci-input-s" aria-label="Assign to" value={x.assignee?.id || ""} onChange={(e) => update(x, { assignee: e.target.value || null })}>
                      <option value="">Nobody</option>
                      {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {x.status !== "done" ? <button type="button" className="ci-btn ci-btn-good" onClick={() => update(x, { status: "done" })}>Done</button>
                      : <button type="button" className="ci-btn ci-btn-ghost" onClick={() => update(x, { status: "new" })}>Reopen</button>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
