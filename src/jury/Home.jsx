import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronRight, Clock, Lock, RefreshCw, Search } from "lucide-react";
import { jury } from "./api";
import { fmtToronto, fmtTotal, groupByCategory, isDoneState, matchesSearch, progressLine, cx } from "./juryLib";
import { Button, Chip, Spinner } from "./ui";

/* Jury home: progress and deadline, "Next to review", the nominations
   allocated to this juror grouped by category with where each one is,
   a search and a To do / Done filter. Conflicts they declared are listed
   apart (they're off the list; staff reassign them). */

const FILTERS = [["all", "All"], ["todo", "To do"], ["done", "Submitted"]];

export default function Home({ juror, basePath }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const [nonce, setNonce] = useState(0);
  const load = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    let alive = true;
    jury.get("/assignments").then((d) => { if (alive) { setData(d); setError(null); } }, (e) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [nonce]);

  const rows = useMemo(() => data?.rows || [], [data]);
  const shown = useMemo(() => rows.filter((r) => matchesSearch(r, q)
    && (filter === "all" || (filter === "done" ? isDoneState(r.state) : !isDoneState(r.state)))), [rows, q, filter]);
  const groups = useMemo(() => groupByCategory(shown), [shown]);

  if (!data && !error) return <div className="j-loading" role="status"><Spinner /> Loading your nominations…</div>;
  if (error && !data) {
    return (
      <div className="j-card j-center-card" role="alert">
        <p className="j-strong">Couldn't load your nominations</p>
        <p className="j-muted">{error.message}</p>
        <Button icon={RefreshCw} onClick={load}>Try again</Button>
      </div>
    );
  }

  const p = data.progress || {};
  const pct = p.assigned ? Math.round((p.submitted / p.assigned) * 100) : 0;
  const next = rows.find((r) => r.id === data.nextId);
  const allDone = p.assigned > 0 && p.submitted >= p.assigned && !rows.some((r) => r.state === "editing");
  const first = (juror?.name || "").trim().split(/\s+/)[0];

  return (
    <div className="j-home">
      <section className="j-card j-progress-card" aria-labelledby="j-progress-title">
        <p className="j-eyebrow">Welcome{first ? `, ${first}` : ""}</p>
        <h1 id="j-progress-title" className="j-h1">Your nominations</h1>
        <p className="j-progress-line">
          <span className="j-strong">{progressLine(p)}</span>
          {data.deadline && <><span aria-hidden="true"> · </span><span>deadline {fmtToronto(data.deadline, { weekday: "" })}</span></>}
        </p>
        <div className="j-bar" role="progressbar" aria-label="Submitted" aria-valuemin={0} aria-valuemax={p.assigned || 0} aria-valuenow={p.submitted || 0}>
          <span style={{ width: `${pct}%` }} />
        </div>
        {data.locked ? (
          <p className="j-note j-note-warn"><Lock className="j-ico-sm" aria-hidden="true" /> Judging has closed. You can still read your assessments, but they can't be changed.</p>
        ) : allDone ? (
          <p className="j-note j-note-good"><CheckCircle2 className="j-ico-sm" aria-hidden="true" /> All submitted. Thank you! You can still edit any of them until the deadline.</p>
        ) : next ? (
          <Button variant="primary" size="lg" className="j-block-phone" onClick={() => navigate(`${basePath}/n/${next.id}`)}>
            {next.state === "not_started" ? "Next to review" : "Continue"}: {next.nomineeName} <ArrowRight className="j-ico" aria-hidden="true" />
          </Button>
        ) : null}
        <p className="j-hint"><Clock className="j-ico-sm" aria-hidden="true" /> About 5 minutes each. Your scores save as you go.</p>
      </section>

      {rows.length > 0 && (
        <div className="j-toolbar">
          <div className="j-search">
            <Search className="j-ico j-search-ico" aria-hidden="true" />
            <input type="search" className="j-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nominee, organisation or category" aria-label="Search your nominations" />
          </div>
          <div className="j-seg-filter" role="group" aria-label="Show">
            {FILTERS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={filter === k} className={cx("j-pill", filter === k && "is-on")} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {!rows.length ? (
        <div className="j-card j-center-card">
          <p className="j-strong">No nominations yet</p>
          <p className="j-muted">The Catalyst Awards team will let you know when your nominations are ready to review.</p>
        </div>
      ) : !shown.length ? (
        <p className="j-muted j-pad">Nothing matches. Try another name, or show All.</p>
      ) : groups.map((g) => (
        <section key={g.key} className="j-group" aria-label={g.label}>
          <h2 className="j-group-title">{g.short || g.label}<span className="j-group-count">{g.rows.length}</span></h2>
          <ul className="j-list">
            {g.rows.map((r) => (
              <li key={r.id}>
                <Link to={`${basePath}/n/${r.id}`} className={cx("j-item", r.id === data.nextId && "is-next")}>
                  <span className="j-item-main">
                    <span className="j-item-name">{r.nomineeName}</span>
                    <span className="j-item-sub">{[r.nomineeOrganisation !== r.nomineeName ? r.nomineeOrganisation : "", r.nomineeType].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="j-item-side">
                    {isDoneState(r.state) && r.total !== null && <span className="j-item-total" aria-label={`Total ${fmtTotal(r.total)} out of 100`}>{fmtTotal(r.total)}</span>}
                    {r.state === "draft" && data.criteriaCount > 0 && <span className="j-item-scored">{r.scored}/{data.criteriaCount}<span className="sr-only"> scored</span></span>}
                    <Chip state={r.state} />
                    <ChevronRight className="j-ico j-chev" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {data.conflicts?.length > 0 && (
        <section className="j-group" aria-label="Conflicts you declared">
          <h2 className="j-group-title">Conflicts you declared<span className="j-group-count">{data.conflicts.length}</span></h2>
          <p className="j-muted j-small">These are off your list. The Catalyst Awards team will reassign them, so there's nothing more to do.</p>
          <ul className="j-list">
            {data.conflicts.map((r) => (
              <li key={r.id} className="j-item is-static">
                <span className="j-item-main">
                  <span className="j-item-name">{r.nomineeName}</span>
                  <span className="j-item-sub">{r.category}</span>
                </span>
                <span className="j-item-side"><Chip state="conflict" /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
