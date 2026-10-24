import { useCallback, useEffect, useRef, useState } from "react";
import { countsVersion, fetchCounts, useDesk } from "../lib/desk.js";
import { OVERALL_LABEL, attendanceView } from "../lib/attendance.js";
import { timeText } from "../lib/timers.js";
import { Sheet } from "../components.jsx";

/* STAFF: Counts (contract C10: "the ability to count the check-ins for breakfast, lunch, dinner and over each day").
   The server's attendance by day (GET /api/checkin/desk/counts, staff only; the same numbers and words as Admin ›
   RSVPs & meals › Event summary): both days together (each person once), arrived, checked in, each meal's admitted /
   entitled with RSVP'd, % of RSVP'd, no-shows and overrides, by pass type, ISSUE PASS and NO DETAILS FOUND. Read again shortly after each tap anywhere
   (a live event), and every 30 s while open. Volunteers never see it (the menu has no entry; the server says no). */

const EVERY_MS = 30 * 1000;
const AFTER_EVENT_MS = 1500;

export default function Counts({ onClose }) {
  const d = useDesk();
  const staff = !!d.session?.staff;
  const [att, setAtt] = useState(null);
  const [at, setAt] = useState(null);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const soon = useRef(null);
  const read = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await fetchCounts();
      setAtt(r?.attendance || (Array.isArray(r?.days) ? r : null));
      setAt(new Date().toISOString());
      setError("");
    } catch (err) {
      setError(err.status === 404 ? "The server doesn't have the counts yet." : err.message || "Couldn't read the counts.");
    } finally { busy.current = false; }
  }, []);
  useEffect(() => {
    if (!staff) return undefined;
    read();
    const t = setInterval(() => { if (document.visibilityState === "visible") read(); }, EVERY_MS);
    return () => { clearInterval(t); clearTimeout(soon.current); };
  }, [staff, read]);
  // A tap anywhere (a live mark / undo / reset / NO DETAILS FOUND event): read again shortly, once for a burst of them.
  const cv = countsVersion();
  const seenCv = useRef(cv);
  useEffect(() => {
    if (!staff || cv === seenCv.current || soon.current) return;
    seenCv.current = cv;
    soon.current = setTimeout(() => { soon.current = null; read(); }, AFTER_EVENT_MS);
  }, [cv, staff, read]);
  if (!staff) return null;
  const v = attendanceView(att);
  const todayKey = d.state?.today?.eventDay || "";
  return (
    <Sheet title="Counts" onClose={onClose} wide>
      <p className="ci-small ci-muted">
        Each person once per point per day (practice taps never count). Admitted / entitled, then RSVP’d, % of RSVP’d, no-shows and
        overrides. {at ? `As of ${timeText(at)}; updates as taps come in.` : "Loading…"}
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
      <p className="ci-center"><button type="button" className="ci-btn ci-btn-ghost" onClick={read}>Read the counts again</button></p>
    </Sheet>
  );
}
