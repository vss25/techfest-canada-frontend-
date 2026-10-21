import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, Crown, Download, History, Info, Inbox, Search, Star, Trash2, XCircle } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, api, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Select, StatTile,
  Tabs, TableWrap, Textarea,
} from "../ui";
import { num, when } from "../format";

/* Admin → Catalyst Awards → Nominations (the jury: Jury, Allocation, Scoring rubric, Jury results)
   Every nomination from thetechfestival.com/awards/nominations. Saved by the
   backend (POST /api/nominations) and still emailed to baldeep@ and nicole@.
   Before Oct 2026 they were only emailed: "Recover emailed nominations" reads
   them back from the email service's log (badge "From email").
   Backend: /api/console/nominations (routes/nominationsAdmin.js). */

const STATUS = {
  pending: { label: "Pending", tone: "neutral", icon: Inbox },
  shortlisted: { label: "Shortlisted", tone: "purple", icon: Star },
  winner: { label: "Winner", tone: "good", icon: Crown },
  rejected: { label: "Not progressing", tone: "warn", icon: XCircle },
};
const STATUS_KEYS = Object.keys(STATUS);
const BASE = "/console/nominations";

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <Badge tone={s.tone} icon={s.icon}>{s.label}</Badge>;
}

function Section({ title, children }) {
  return (
    <section className="mb-7">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-ttfc-dim">{title}</h3>
      <dl className="divide-y divide-ttfc-line rounded-2xl border border-ttfc-line">{children}</dl>
    </section>
  );
}

function Row({ label, children }) {
  if (children === "" || children == null || children === false) return null;
  return (
    <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-xs text-ttfc-muted">{label}</dt>
      <dd className="min-w-0 whitespace-pre-line break-words text-sm">{children}</dd>
    </div>
  );
}

const link = (href, text = href) => {
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-ttfc-pink underline-offset-2 hover:underline">{text}</a>;
};
const mail = (e) => (e ? <a href={`mailto:${e}`} className="break-all text-ttfc-pink underline-offset-2 hover:underline">{e}</a> : "");

function NominationDrawer({ id, canManage, onClose, onSaved, onDeleted }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(id ? `${BASE}/${id}` : null);
  const n = data?.nomination;
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const form = edit && edit.id === id ? edit : { id, status: n?.status || "pending", adminNotes: n?.adminNotes || "" };
  const dirty = !!n && (form.status !== n.status || form.adminNotes !== (n.adminNotes || ""));
  const change = (k, v) => setEdit({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.patch(`${BASE}/${id}`, { status: form.status, adminNotes: form.adminNotes });
      setData(r);
      setEdit(null);
      onSaved(r.nomination);
      toast.success("Saved");
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const close = () => { setEdit(null); onClose(); };

  return (
    <Drawer
      open={!!id}
      onClose={close}
      width="max-w-2xl"
      title={n?.nomineeName || (loading ? "Loading…" : "Nomination")}
      description={n ? `${n.categoryLabel} · submitted ${when(n.submittedAt)}` : ""}
      footer={n && (
        <>
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>Save</Button>
          {dirty && <Button variant="ghost" onClick={() => setEdit(null)}>Discard changes</Button>}
          {canManage && <Button variant="ghost" icon={Trash2} className="ml-auto" onClick={() => setDeleting(true)}>Delete</Button>}
        </>
      )}
    >
      {loading ? <LoadingState label="Loading nomination…" /> : error && !n ? <ErrorState error={error} onRetry={reload} /> : n && (
        <>
          {n.source === "email" && (
            <Banner tone="info" icon={Info} className="mb-6" title="Recovered from the nomination email">
              Sent before nominations were saved here, so it was read back from the email staff received. Check the details against the original email if anything looks off.
            </Banner>
          )}
          <div className="mb-7 grid gap-4 rounded-2xl border border-ttfc-line bg-ttfc-panel2 p-4 sm:grid-cols-[200px_1fr]">
            <Field label="Status">
              {(fid) => (
                <Select id={fid} value={form.status} onChange={(e) => change("status", e.target.value)}>
                  {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Jury & staff notes" hint={n.updatedBy ? `Last changed by ${n.updatedBy}. Only staff see this.` : "Only staff see this. It's included in the spreadsheet."}>
              {(fid) => <Textarea id={fid} rows={3} value={form.adminNotes} onChange={(e) => change("adminNotes", e.target.value)} placeholder="Jury comments, follow-ups, who's reviewing…" />}
            </Field>
          </div>

          <Section title="Category">
            <Row label="Award">{n.categoryLabel}</Row>
            {n.categoryType === "matrix" && <Row label="Pillar">{n.pillar}</Row>}
            {n.categoryType === "matrix" && <Row label="Sector">{n.sector}</Row>}
          </Section>

          <Section title="Nominee">
            <Row label="Name">{n.nomineeName}</Row>
            <Row label="Type">{n.nomineeType}</Row>
            <Row label="Title">{n.nomineeTitle}</Row>
            <Row label="Organisation">{n.nomineeOrganisation}</Row>
            <Row label="Sector">{n.nomineeSector}</Row>
            <Row label="Location">{n.nomineeLocation}</Row>
            <Row label="Email">{mail(n.nomineeEmail)}</Row>
            <Row label="Phone">{n.nomineePhone}</Row>
            <Row label="Website">{n.nomineeWebsite && link(n.nomineeWebsite)}</Row>
            <Row label="LinkedIn">{n.nomineeLinkedIn && link(n.nomineeLinkedIn)}</Row>
          </Section>

          <Section title={n.selfNomination ? "Nominator (self-nomination)" : "Nominator"}>
            <Row label="Name">{n.nominatorName}</Row>
            <Row label="Title">{n.nominatorTitle}</Row>
            <Row label="Organisation">{n.nominatorOrganisation}</Row>
            <Row label="Relationship">{n.nominatorRelationship}</Row>
            <Row label="Email">{mail(n.nominatorEmail)}</Row>
            <Row label="Phone">{n.nominatorPhone}</Row>
          </Section>

          <Section title="Statement">
            <Row label="Overview">{n.statementOverview}</Row>
            <Row label="Innovation & impact">{n.statementImpact}</Row>
            <Row label="Key achievements">{n.statementAchievements}</Row>
            <Row label="Supporting evidence">{n.statementEvidence}</Row>
            <Row label="Signed by">{n.signatureName}</Row>
          </Section>
        </>
      )}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete the nomination for ${n?.nomineeName || ""}?`}
        body="Only for spam or duplicates. It's removed from this list and the spreadsheet; the email staff received stays in their inbox."
        confirmLabel="Delete nomination"
        onConfirm={async () => {
          await api.del(`${BASE}/${id}`);
          toast.success("Nomination deleted");
          onDeleted(id);
          close();
        }}
      />
    </Drawer>
  );
}

export default function CatalystNominations() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload, setData } = useApi(BASE);
  const [q, setQ] = useState(params.get("q") || "");
  const dq = useDebounced(q.trim().toLowerCase(), 200);
  const [category, setCategory] = useState("");
  const [exporting, setExporting] = useState(false);
  const [recovering, setRecovering] = useState(null); // { found, imported } while reading the email log
  const status = STATUS_KEYS.includes(params.get("status")) ? params.get("status") : "";
  const openId = params.get("id") || "";
  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  const rows = useMemo(() => data?.rows || [], [data]);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
  const shown = useMemo(() => rows.filter((r) => (!status || r.status === status) && (!category || r.category === category) && (!dq
    || [r.nomineeName, r.nomineeOrganisation, r.nominatorName, r.nominatorOrganisation, r.category].some((v) => String(v || "").toLowerCase().includes(dq)))),
  [rows, status, category, dq]);
  const counts = data?.counts || {};

  const tabs = [
    { key: "", label: "All", count: data ? counts.all || 0 : undefined },
    ...STATUS_KEYS.map((k) => ({ key: k, label: STATUS[k].label, count: data ? counts[k] || 0 : undefined })),
  ];

  const onSaved = (n) => setData((d) => d && ({
    ...d,
    rows: d.rows.map((r) => (r.id === n.id ? { ...r, status: n.status, hasNotes: !!n.adminNotes } : r)),
    counts: (() => {
      const before = d.rows.find((r) => r.id === n.id)?.status;
      if (!before || before === n.status) return d.counts;
      return { ...d.counts, [before]: (d.counts[before] || 1) - 1, [n.status]: (d.counts[n.status] || 0) + 1 };
    })(),
  }));
  const onDeleted = (id) => { setParam("id", ""); reload(); return id; };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${ADMIN_API}${BASE}/export`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttfc-catalyst-nominations-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err); } finally { setExporting(false); }
  };

  // Reads the email log in batches until it reaches the oldest email it keeps.
  const recover = async () => {
    let cursor = "", found = 0, imported = 0;
    setRecovering({ found, imported });
    try {
      for (let round = 0; round < 40; round++) {
        const r = await api.post(`${BASE}/recover`, cursor ? { cursor } : {});
        found += r.found || 0;
        imported += r.imported || 0;
        cursor = r.cursor || "";
        setRecovering({ found, imported });
        if (r.done || !cursor) break;
      }
      toast.success(imported ? `Recovered ${num(imported)} nomination${imported === 1 ? "" : "s"} from the email log` : `Nothing new: ${num(found)} nomination email${found === 1 ? "" : "s"} found, all already here`);
      reload();
    } catch (err) { toast.error(err); } finally { setRecovering(null); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Catalyst Awards"
        title="Nominations"
        description="Every nomination from the website's Catalyst Awards form, newest first. Open one to read it in full, shortlist it, pick winners and keep jury notes. Staff still get each one by email."
        actions={isManagement && (
          <div className="flex flex-wrap gap-2">
            <Button icon={History} loading={!!recovering} onClick={recover}>Recover emailed nominations</Button>
            <Button icon={Download} loading={exporting} disabled={!rows.length} onClick={exportCsv}>Export CSV</Button>
          </div>
        )}
      />

      {recovering && (
        <Banner tone="info" icon={History} className="mb-6" title="Reading the email log…">
          {num(recovering.found)} nomination email{recovering.found === 1 ? "" : "s"} found so far, {num(recovering.imported)} new. This can take a minute.
        </Banner>
      )}

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label="Nominations" value={num(counts.all || 0)} icon={Award} tone="purple" />
          <StatTile label="Pending review" value={num(counts.pending || 0)} icon={Inbox} tone="orange" />
          <StatTile label="Shortlisted" value={num(counts.shortlisted || 0)} icon={Star} tone="purple" />
          <StatTile label="Winners" value={num(counts.winner || 0)} icon={Crown} tone="good" />
        </div>
      )}

      <Tabs tabs={tabs} value={status} onChange={(k) => setParam("status", k)} label="Status" className="mb-4" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search nominee, nominator, organisation" className="pl-9" aria-label="Search nominations" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className="sm:max-w-xs">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <p className="text-sm text-ttfc-muted">{loading ? "Loading…" : `${num(shown.length)} shown`}</p>
      </div>

      {loading ? <LoadingState label="Loading nominations…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={Award} title="No nominations saved yet"
          body={isManagement ? "New nominations appear here as they come in. Click Recover emailed nominations to load the earlier ones from the email log." : "New nominations appear here as they come in."} />
      ) : !shown.length ? (
        <EmptyState icon={Search} title="No nominations match" body="Try another name, category or status." />
      ) : (
        <TableWrap>
          <thead><tr><th>Nominee</th><th>Category</th><th>Nominated by</th><th>Submitted</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setParam("id", r.id)}>
                <td className="min-w-[200px] max-w-[280px]">
                  <button type="button" className="block max-w-full truncate text-left font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); setParam("id", r.id); }}>{r.nomineeName}</button>
                  <span className="block truncate text-xs text-ttfc-muted">{[r.nomineeType, r.nomineeOrganisation].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="max-w-[260px]"><span className="block truncate text-sm" title={r.category}>{r.category}</span></td>
                <td className="max-w-[220px]">
                  <span className="block truncate text-sm">{r.selfNomination ? "Self-nomination" : r.nominatorName}</span>
                  {!r.selfNomination && r.nominatorOrganisation && <span className="block truncate text-xs text-ttfc-muted">{r.nominatorOrganisation}</span>}
                </td>
                <td className="whitespace-nowrap text-xs text-ttfc-muted">{when(r.submittedAt)}</td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={r.status} />
                    {r.source === "email" && <span className="text-[11px] text-ttfc-dim">From email</span>}
                    {r.hasNotes && <span className="text-[11px] text-ttfc-dim">Has notes</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <NominationDrawer id={openId} canManage={isManagement} onClose={() => setParam("id", "")} onSaved={onSaved} onDeleted={onDeleted} />
    </>
  );
}
