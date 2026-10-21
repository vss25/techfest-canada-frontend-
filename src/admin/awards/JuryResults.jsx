import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Crown, Download, MessageSquareText, RefreshCw, Search, Star, Trophy } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, LoadingState, PageHeader, SectionTitle, Select, TableWrap, Tabs,
} from "../ui";
import { ago, when } from "../format";
import { groupByCategory } from "../../jury/juryLib";
import { EYEBROW, JURY, downloadCsv, fmtScore, plural, progressText } from "./juryShared";
import { ProgressBar, StateBadge, StatusBadge } from "./juryBadges";

/* =========================================================
   Admin › Catalyst Awards › Jury results (Oct 2026, management)
   Per nomination: jurors counted / submitted, the average per
   criterion, the weighted total (0–100, averaged over jurors, with
   the lowest and highest), the recommendation tally, rank within
   its category, and in the drawer each juror's scores and comment
   (with their name: management only). Shortlist / winner use the
   nominations' own status. CSV export. Per juror: progress, last
   active, Send reminder.
   Backend: /console/jury/results, /results.csv (routes/juryAdmin.js);
   status: PATCH /console/nominations/:id.
========================================================= */

const VIEWS = [{ key: "nominations", label: "By nomination" }, { key: "jurors", label: "By juror" }];
const REC_SHORT = [["strong_yes", "Strong yes", "good"], ["yes", "Yes", "purple"], ["maybe", "Maybe", "warn"], ["no", "No", "bad"]];

function Tally({ tally = {} }) {
  const any = REC_SHORT.some(([k]) => tally[k]);
  if (!any) return <span className="text-xs text-ttfc-dim">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {REC_SHORT.filter(([k]) => tally[k]).map(([k, label, tone]) => <Badge key={k} tone={tone}>{label} {tally[k]}</Badge>)}
    </span>
  );
}

function ResultDrawer({ row, criteria, onClose, onStatus }) {
  const [confirm, setConfirm] = useState(null);
  if (!row) return null;
  return (
    <Drawer open onClose={onClose} width="max-w-3xl" title={row.nomineeName}
      description={`${row.categoryLabel}${row.rank ? ` · rank ${row.rank} of ${row.inCategory}` : ""}`}
      footer={<>
        <span className="mr-2 text-xs text-ttfc-muted">Status:</span><StatusBadge status={row.status} />
        <span className="ml-auto flex flex-wrap gap-2">
          {row.status !== "shortlisted" && <Button size="sm" icon={Star} onClick={() => setConfirm("shortlisted")}>Shortlist</Button>}
          {row.status !== "winner" && <Button size="sm" variant="primary" icon={Crown} onClick={() => setConfirm("winner")}>Mark winner</Button>}
          {row.status !== "pending" && <Button size="sm" variant="ghost" onClick={() => setConfirm("pending")}>Back to pending</Button>}
        </span>
      </>}>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3"><p className="text-xs text-ttfc-dim">Weighted total</p><p className="mt-1 text-2xl font-bold tabular-nums">{fmtScore(row.total)}<span className="text-sm font-medium text-ttfc-muted"> / 100</span></p></div>
        <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3"><p className="text-xs text-ttfc-dim">Range</p><p className="mt-1 text-lg font-semibold tabular-nums">{row.min === null ? "—" : `${fmtScore(row.min)}–${fmtScore(row.max)}`}</p></div>
        <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3"><p className="text-xs text-ttfc-dim">Submitted</p><p className="mt-1 text-lg font-semibold">{row.submitted} of {row.assigned}</p></div>
        <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3"><p className="text-xs text-ttfc-dim">Recommendations</p><div className="mt-1.5"><Tally tally={row.tally} /></div></div>
      </div>
      {row.olderRubric > 0 && <Banner tone="info" className="mb-4" title={`${plural(row.olderRubric, "assessment")} given on an earlier rubric`}>Criteria they didn't score are left out of their totals.</Banner>}
      <SectionTitle>Scores by juror</SectionTitle>
      {/* The drawer sits outside the panel's table styles: a plain table here. */}
      <div className="mb-6 overflow-x-auto rounded-2xl border border-ttfc-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ttfc-line bg-white/[0.03] text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ttfc-muted">
              <th className="px-3 py-2.5">Juror</th>
              {criteria.map((c) => <th key={c.key} className="px-3 py-2.5" title={c.label}>{c.label.split(/\s+/)[0]}</th>)}
              <th className="px-3 py-2.5">Total</th><th className="px-3 py-2.5">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ttfc-line/70">
            {row.jurors.map((j) => (
              <tr key={j.id}>
                <td className="whitespace-nowrap px-3 py-2.5"><span className="mb-1 block font-semibold">{j.name}</span><StateBadge state={j.state} /></td>
                {criteria.map((c) => <td key={c.key} className="px-3 py-2.5 tabular-nums">{j.scores?.[c.key] ?? "—"}</td>)}
                <td className="px-3 py-2.5 font-semibold tabular-nums">{fmtScore(j.total)}</td>
                <td className="px-3 py-2.5 text-xs">{j.recommendation || "—"}</td>
              </tr>
            ))}
            <tr className="bg-white/[0.03]">
              <td className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ttfc-dim">Average</td>
              {criteria.map((c) => <td key={c.key} className="px-3 py-2.5 font-semibold tabular-nums">{fmtScore(row.perCriterion?.[c.key]?.avg)}</td>)}
              <td className="px-3 py-2.5 font-bold tabular-nums">{fmtScore(row.total)}</td><td />
            </tr>
          </tbody>
        </table>
      </div>
      <SectionTitle hint="With the juror's name. Only management sees this.">Comments</SectionTitle>
      {!row.comments.length ? <p className="text-sm text-ttfc-muted">No comments.</p> : (
        <ul className="flex flex-col gap-3">
          {row.comments.map((cm) => (
            <li key={cm.jurorId} className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3">
              <p className="whitespace-pre-line text-sm">{cm.comment}</p>
              <p className="mt-1.5 text-xs text-ttfc-muted">{cm.juror}{cm.recommendation ? ` · ${cm.recommendation}` : ""} · {when(cm.submittedAt)}</p>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} tone="primary"
        title={confirm === "winner" ? `Mark ${row.nomineeName} as a winner?` : confirm === "shortlisted" ? `Shortlist ${row.nomineeName}?` : `Move ${row.nomineeName} back to pending?`}
        body="This is the nomination's own status, the same as on the Nominations page. Jurors don't see it."
        confirmLabel={confirm === "winner" ? "Mark winner" : confirm === "shortlisted" ? "Shortlist" : "Move to pending"}
        onConfirm={() => onStatus(row, confirm)} />
    </Drawer>
  );
}

export default function JuryResults() {
  const toast = useToast();
  const { data, error, loading, reload, refreshing } = useApi(`${JURY}/results`);
  const [view, setView] = useState("nominations");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [reminding, setReminding] = useState(null);

  const rows = useMemo(() => data?.rows || [], [data]);
  const criteria = data?.criteria || [];
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!cat || r.categoryLabel === cat) && (!needle || [r.nomineeName, r.nomineeOrganisation].some((v) => String(v || "").toLowerCase().includes(needle))));
  const groups = groupByCategory(shown);
  const categories = [...new Map(rows.map((r) => [r.categoryLabel, r.category])).entries()];
  const openRow = rows.find((r) => r.id === openId) || null;

  const exportCsv = async () => {
    setExporting(true);
    try { await downloadCsv(`${JURY}/results.csv`, `ttfc-catalyst-jury-results-${new Date().toISOString().slice(0, 10)}.csv`); }
    catch (err) { toast.error(err); } finally { setExporting(false); }
  };
  const setStatus = async (row, status) => {
    await api.patch(`/console/nominations/${row.id}`, { status });
    toast.success(status === "winner" ? `${row.nomineeName} marked as a winner` : "Status saved");
    reload();
  };

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Jury results"
        description="The jury's scores per nomination: the average of each criterion, the weighted total out of 100 (averaged over the jurors who submitted), the recommendations and the rank in each category. Drafts and declared conflicts don't count. Open a nomination for each juror's scores and comments."
        actions={<>
          <Button icon={RefreshCw} loading={refreshing && !!data} onClick={reload}>Refresh</Button>
          <Button icon={Download} loading={exporting} disabled={!rows.length} onClick={exportCsv}>Export CSV</Button>
        </>} />

      <Tabs tabs={VIEWS} value={view} onChange={setView} label="View" />

      {loading ? <LoadingState label="Adding up the scores…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : view === "jurors" ? (
        <TableWrap>
          <thead><tr><th>Juror</th><th>Progress</th><th>Last active</th><th>Reminded</th><th className="text-right">Reminder</th></tr></thead>
          <tbody>
            {(data.jurors || []).map((j) => (
              <tr key={j.id}>
                <td><span className="block font-semibold">{j.name}</span><span className="block text-xs text-ttfc-muted">{j.email}</span>{!j.active && <Badge tone="warn">Switched off</Badge>}</td>
                <td className="min-w-[220px]"><ProgressBar done={j.progress.submitted} total={j.progress.assigned} className="mb-1.5" /><span className="text-xs text-ttfc-muted">{progressText(j.progress)}</span></td>
                <td className="whitespace-nowrap text-xs text-ttfc-muted">{j.lastActiveAt ? ago(j.lastActiveAt) : "Never signed in"}</td>
                <td className="whitespace-nowrap text-xs text-ttfc-muted">{j.remindedAt ? `${ago(j.remindedAt)}${j.reminderCount > 1 ? ` (${j.reminderCount}×)` : ""}` : "—"}</td>
                <td className="text-right"><Button size="sm" icon={BellRing} disabled={!j.active || j.progress.remaining <= 0} onClick={() => setReminding(j)}>Send reminder</Button></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : !rows.length ? (
        <EmptyState icon={Trophy} title="No results yet" body={<>Nothing has been allocated to the jury yet. Start on the <Link className="underline" to="/admin/awards/allocation">Allocation</Link> page.</>} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nominee" aria-label="Search nominees"
                className="w-full rounded-xl border border-ttfc-line bg-ttfc-ink/70 px-3.5 py-2.5 pl-9 text-sm text-ttfc-text placeholder:text-ttfc-dim focus:border-ttfc-purple focus:outline-none focus:ring-2 focus:ring-ttfc-purple/30" />
            </div>
            <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="sm:max-w-xs">
              <option value="">All categories</option>
              {categories.map(([label, short]) => <option key={label} value={label}>{short}</option>)}
            </Select>
            <p className="text-xs text-ttfc-dim">Total: a 1 counts 0, a 3 counts 50, a 5 counts 100, by the rubric's weights.</p>
          </div>
          <TableWrap>
            <thead>
              <tr>
                <th>Rank</th><th>Nominee</th><th>Jurors</th><th>Total</th>
                {criteria.map((c) => <th key={c.key} title={`${c.label} (${c.share}% of the total)`}>{c.label.split(/\s+/)[0]}</th>)}
                <th>Recommendations</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  <tr><td colSpan={6 + criteria.length} className="bg-white/[0.03] text-xs font-bold uppercase tracking-[0.12em] text-ttfc-orange">{g.short || g.label}</td></tr>
                  {g.rows.map((r) => (
                    <tr key={r.id} className="is-clickable" onClick={() => setOpenId(r.id)}>
                      <td className="text-lg font-bold tabular-nums">{r.rank ?? <span className="text-xs font-normal text-ttfc-dim">—</span>}</td>
                      <td className="min-w-[200px] max-w-[260px]">
                        <button type="button" className="block max-w-full truncate text-left font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>{r.nomineeName}</button>
                        <span className="block truncate text-xs text-ttfc-muted">{r.nomineeOrganisation}</span>
                        {r.comments.length > 0 && <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ttfc-dim"><MessageSquareText className="h-3 w-3" aria-hidden="true" />{plural(r.comments.length, "comment")}</span>}
                      </td>
                      <td className="whitespace-nowrap text-xs"><span className="block">{r.submitted} of {r.assigned} submitted</span>{r.conflicts > 0 && <span className="text-red-200">{plural(r.conflicts, "conflict")}</span>}{r.drafts > 0 && <span className="block text-ttfc-dim">{plural(r.drafts, "draft")}</span>}</td>
                      <td className="whitespace-nowrap"><span className="text-lg font-bold tabular-nums">{fmtScore(r.total)}</span>{r.min !== null && r.min !== r.max && <span className="block text-[11px] text-ttfc-dim">{fmtScore(r.min)}–{fmtScore(r.max)}</span>}</td>
                      {criteria.map((c) => <td key={c.key} className="tabular-nums">{fmtScore(r.perCriterion?.[c.key]?.avg)}</td>)}
                      <td><Tally tally={r.tally} /></td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </TableWrap>
        </>
      )}

      {openRow && <ResultDrawer row={openRow} criteria={criteria} onClose={() => setOpenId("")} onStatus={setStatus} />}
      <ConfirmDialog open={!!reminding} onClose={() => setReminding(null)} tone="primary"
        title={`Send ${reminding?.name} a reminder?`}
        body={reminding ? `To ${reminding.email}, from enquire@thetechfestival.com. They have ${plural(reminding.progress.remaining, "nomination")} left.` : ""}
        confirmLabel="Send reminder"
        onConfirm={async () => { const r = await api.post(`${JURY}/jurors/${reminding.id}/remind`); toast.success(`Reminder sent to ${r.email}`); reload(); }} />
    </>
  );
}
