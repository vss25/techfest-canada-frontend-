import { useEffect, useRef, useState } from "react";
import { countsVersion, fetchCounts, useDesk } from "../lib/desk.js";
import { OVERALL_LABEL, attendanceView } from "../lib/attendance.js";
import { createCountsRefresher } from "../lib/countsRefresh.js";
import { timeText } from "../lib/timers.js";
import { Sheet } from "../components.jsx";

/* STAFF: Counts (contract C10: "the ability to count the check-ins for breakfast, lunch, dinner and over each day").
   The server's attendance by day (GET /api/checkin/desk/counts, staff only; the same numbers and words as Admin ›
   RSVPs & meals › Event summary): both days together (each person once), arrived, checked in, each meal's admitted /
   entitled with RSVP'd, % of RSVP'd, no-shows and overrides, by pass type, ISSUE PASS and NO DETAILS FOUND. Read again
   once a burst of taps anywhere settles (live events), every 30 s while open, and on the button, never more than once
   every 3 s on this device; "Too many requests" keeps the last numbers with "updating…" and retries quietly
   (lib/countsRefresh.js). Volunteers never see it (the menu has no entry; the server says no). */

const EVERY_MS = 30 * 1000;

export default function Counts({ onClose }) {
  const d = useDesk();
  const staff = !!d.session?.staff;
  const [att, setAtt] = useState(null);
  const [at, setAt] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const reader = useRef(null);
  useEffect(() => {
    if (!staff) return undefined;
    const r = createCountsRefresher({
      read: fetchCounts,
      onData: (x) => { setAtt(x?.attendance || (Array.isArray(x?.days) ? x : null)); setAt(new Date().toISOString()); },
      onError: (err) => setError(!err ? "" : err.status === 404 ? "The server doesn't have the counts yet." : err.message || "Couldn't read the counts."),
      onBusy: setUpdating,
    });
    reader.current = r;
    r.request();
    const t = setInterval(() => { if (document.visibilityState === "visible") r.request(); }, EVERY_MS);
    return () => { clearInterval(t); r.stop(); reader.current = null; };
  }, [staff]);
  // A tap anywhere (a live mark / undo / reset / NO DETAILS FOUND event): read again once they settle.
  const cv = countsVersion();
  const seenCv = useRef(cv);
  useEffect(() => {
    if (!staff || cv === seenCv.current) return;
    seenCv.current = cv;
    reader.current?.event();
  }, [cv, staff]);
  if (!staff) return null;
  const v = attendanceView(att);
  const todayKey = d.state?.today?.eventDay || "";
  return (
    <Sheet title="Counts" onClose={onClose} wide>
      <p className="ci-small ci-muted">
        Each person once per point per day (practice taps never count). Admitted / entitled, then RSVP’d, % of RSVP’d, no-shows and
        overrides. {at ? `As of ${timeText(at)}; updates as taps come in.` : "Loading…"}
        {updating && <span className="ci-counts-updating" role="status"> Updating…</span>}
      </p>
      {error && <p className="ci-error" role="alert">{error}</p>}
      {v.overall && <p className="ci-counts-overall"><b>{OVERALL_LABEL}:</b> {v.overall.text}</p>}
      <div className="ci-counts-wrap">
        <table className="ci-counts">
          <thead>
            <tr><th scope="col"><span className="ci-sr">Count</span></th>{v.days.map((x) => <th key={x.key} scope="col" className={x.key === todayKey ? "is-today" : ""}>{x.label}{x.key === todayKey ? " · today" : ""}</th>)}</tr>
          </thead>
          <tbody>
            {v.rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                {r.cells.map((c, i) => (
                  <td key={v.days[i].key} className={v.days[i].key === todayKey ? "is-today" : ""}>
                    {c.label && <span className="ci-counts-label">{c.label}</span>}
                    <b className="ci-counts-main">{c.main}</b>
                    {c.sub && <span className="ci-counts-sub">{c.sub}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {v.byPass.filter((x) => !todayKey || x.day === todayKey || v.byPass.length === 1).map((x) => (
        <div key={x.day}>
          <h3 className="ci-h3">By pass type · {x.label}</h3>
          <div className="ci-counts-wrap">
            <table className="ci-counts ci-counts-pass">
              <thead><tr><th scope="col">Pass type</th>{x.rows.some((r) => r.people !== null) && <th scope="col">People</th>}<th scope="col">Arrived</th><th scope="col">Checked in</th><th scope="col">CxO</th><th scope="col">Lunch</th><th scope="col">Dinner</th></tr></thead>
              <tbody>
                {x.rows.map((r) => <tr key={r.key}><th scope="row">{r.label}</th>{x.rows.some((y) => y.people !== null) && <td>{r.people ?? "—"}</td>}<td>{r.arrived}</td><td>{r.checkedIn}</td><td>{r.cxo}</td><td>{r.lunch}</td><td>{r.dinner}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="ci-center"><button type="button" className="ci-btn ci-btn-ghost" onClick={() => reader.current?.request()}>Read the counts again</button></p>
    </Sheet>
  );
}
