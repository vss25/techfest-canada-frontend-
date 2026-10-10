import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Info, Landmark, RefreshCw, Search } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, api, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, SectionTitle, Select, TableWrap, Textarea,
} from "../ui";
import { day, when } from "../format";

const PAGE = 50;

/* Where staff are with an application (set in the drawer). */
const STATUS = {
  new: { tone: "purple", label: "New" },
  contacted: { tone: "orange", label: "Contacted" },
  accepted: { tone: "good", label: "Accepted" },
  declined: { tone: "neutral", label: "Declined" },
};
const STATUS_KEYS = Object.keys(STATUS);

const MATCHED_BY = {
  reference: "the application reference they typed on the deposit page",
  email: "their email address",
  company: "the company name",
  deposit: "created from this deposit (the application form was only emailed to sales@)",
};

const money = (v, currency = "CAD") => (v == null ? "—" : new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD", maximumFractionDigits: 2 }).format(Number(v) || 0));

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.new;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function Deposit({ d }) {
  if (!d || d.status === "unpaid") return <span className="text-xs text-ttfc-dim">Unpaid</span>;
  return (
    <div className="space-y-1">
      <Badge tone={d.status === "refunded" ? "warn" : "good"}>{d.status === "refunded" ? "Refunded" : "Paid"}</Badge>
      <p className="text-[11px] text-ttfc-dim">{money(d.amount, d.currency)}{d.paidAt ? ` · ${day(d.paidAt)}` : ""}</p>
    </div>
  );
}

/* Deposits paid on the website that no application matches (different email, no reference…). */
function UnmatchedDeposits({ rows }) {
  if (!rows?.length) return null;
  return (
    <Banner tone="warn" icon={AlertTriangle} className="mb-6"
      title={`${rows.length} deposit${rows.length === 1 ? "" : "s"} paid without a matching application`}>
      <p className="mb-2">These were paid through Stripe but no application has the same reference, email or company name. They link by themselves when a matching application arrives.</p>
      <ul className="space-y-1">
        {rows.map((d) => (
          <li key={d.id} className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="font-semibold">{d.companyName || "No company given"}</span>
            {d.email && <a href={`mailto:${d.email}`} className="font-mono text-xs underline-offset-2 hover:underline">{d.email}</a>}
            {d.applicationRef && <span className="font-mono text-xs">Ref {d.applicationRef}</span>}
            <span className="text-xs">{money(d.amount, d.currency)} + HST · {day(d.paidAt)}</span>
            {d.refunded > 0 && <span className="text-xs">Refunded {money(d.refunded, d.currency)}</span>}
          </li>
        ))}
      </ul>
    </Banner>
  );
}

function Value({ f }) {
  if (f.value === "" || f.value == null) return <span className="text-ttfc-dim">—</span>;
  if (f.type === "email") return <a href={`mailto:${f.value}`} className="break-all text-ttfc-pink underline-offset-2 hover:underline">{f.value}</a>;
  if ((f.key === "website" || f.key === "linkedIn") && /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(f.value)) {
    const href = /^https?:\/\//i.test(f.value) ? f.value : `https://${f.value}`;
    return <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-ttfc-pink underline-offset-2 hover:underline">{f.value}</a>;
  }
  return <span className={f.type === "long" ? "whitespace-pre-wrap" : "break-words"}>{f.value}</span>;
}

function DetailSection({ title, children }) {
  return (
    <section className="mb-7">
      <SectionTitle>{title}</SectionTitle>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[170px_1fr]">{children}</dl>
    </section>
  );
}

const Row = ({ label, children }) => [
  <dt key="t" className="text-ttfc-muted">{label}</dt>,
  <dd key="d" className="min-w-0">{children}</dd>,
];

function ApplicationDrawer({ id, onClose, onSaved }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(id ? `/console/pavilion-applications/${id}` : null);
  const a = data?.application;
  const [edit, setEdit] = useState(null); // { id, status, notes } while staff change something
  const [saving, setSaving] = useState(false);
  const form = edit && edit.id === id ? edit : { id, status: a?.status || "new", notes: a?.notes || "" };
  const dirty = !!a && (form.status !== a.status || form.notes !== (a.notes || ""));
  const change = (k, v) => setEdit({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.patch(`/console/pavilion-applications/${id}`, { status: form.status, notes: form.notes });
      setData(r);
      setEdit(null);
      onSaved(r.application);
      toast.success("Saved");
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const close = () => { setEdit(null); onClose(); };
  const m = a?.meta || {};

  return (
    <Drawer
      open={!!id}
      onClose={close}
      width="max-w-2xl"
      title={a?.company || (loading ? "Loading…" : "Application")}
      description={a ? [a.reference, `applied ${when(a.createdAt)}`, a.boothLabel && `${a.boothLabel} booth`].filter(Boolean).join(" · ") : ""}
      footer={a && (
        <>
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>Save</Button>
          {dirty && <Button variant="ghost" onClick={() => setEdit(null)}>Discard changes</Button>}
        </>
      )}
    >
      {loading ? <LoadingState label="Loading application…" /> : error && !a ? <ErrorState error={error} onRetry={reload} /> : a && (
        <>
          {a.spam && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-6" title="Flagged as a bot">
              {a.spamReason ? `Reason: ${a.spamReason}. ` : ""}Nobody was emailed about it.
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
            <Field label="Staff notes" hint={m.lastEditedBy ? `Last changed by ${m.lastEditedBy}, ${when(m.lastEditedAt)}. Only staff see this.` : "Only staff see this. It's included in the spreadsheet."}>
              {(fid) => <Textarea id={fid} rows={3} value={form.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Calls, documents received, booth placement…" />}
            </Field>
          </div>

          <DetailSection title="Deposit">
            <Row label="$500 deposit"><Deposit d={a.deposit} /></Row>
            {a.deposit.status !== "unpaid" && [
              <Row key="tot" label="Charged">{money(m.depositTotal, a.deposit.currency)} <span className="text-xs text-ttfc-dim">incl. HST</span>{m.depositRefunded > 0 ? <span className="text-xs text-amber-200"> · refunded {money(m.depositRefunded, a.deposit.currency)}</span> : null}</Row>,
              <Row key="by" label="Matched by">{MATCHED_BY[m.depositMatchedBy] || m.depositMatchedBy || "—"}</Row>,
              <Row key="id" label="Stripe session"><span className="break-all font-mono text-xs">{m.depositStripeId}</span></Row>,
            ]}
            {a.netPayable != null && <Row label="Net payable">{money(a.netPayable)} <span className="text-xs text-ttfc-dim">for the booth, after subsidy</span></Row>}
            {(data.deposits || []).length > 1 && (
              <Row label="All deposits">
                <ul className="space-y-1 text-xs">
                  {data.deposits.map((d) => <li key={d.id}>{money(d.amount, d.currency)} · {day(d.paidAt)} · <span className="font-mono">{d.stripeSessionId}</span></li>)}
                </ul>
              </Row>
            )}
          </DetailSection>

          {a.sections.map((s) => (
            <DetailSection key={s.id} title={s.title}>
              {s.fields.map((f) => <Row key={f.key} label={f.label}><Value f={f} /></Row>)}
            </DetailSection>
          ))}

          <DetailSection title="Submission">
            <Row label="Received">{when(a.createdAt)}</Row>
            <Row label="Reference"><span className="font-mono">{a.reference || "—"}</span></Row>
            <Row label="Sales email">{m.salesNotified ? <Badge tone="good">Sent to sales@</Badge> : a.spam ? <span className="text-ttfc-dim">Not sent (bot)</span> : <Badge tone="bad">Not sent</Badge>}</Row>
            <Row label="Confirmation">{m.confirmationSent ? <Badge tone="good">Sent to applicant</Badge> : a.spam ? <span className="text-ttfc-dim">Not sent (bot)</span> : <Badge tone="bad">Not sent</Badge>}</Row>
            {m.emailError && <Row label="Email error"><span className="break-words text-xs text-red-200">{m.emailError}</span></Row>}
            <Row label="Page"><span className="font-mono text-xs">{m.page || "—"}</span></Row>
            <Row label="Form open for">{m.fillMs != null ? `${Math.round(m.fillMs / 60000)} min` : "—"}</Row>
            <Row label="Browser"><span className="break-words text-xs text-ttfc-muted">{m.userAgent || "—"}</span></Row>
          </DetailSection>
        </>
      )}
    </Drawer>
  );
}

export default function IndiaPavilion() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const page = Math.max(0, Number(params.get("page")) || 0);
  const status = STATUS_KEYS.includes(params.get("status")) ? params.get("status") : "";
  const showSpam = params.get("spam") === "1";
  const openId = params.get("id") || "";
  const dq = useDebounced(q.trim(), 300);

  const qs = new URLSearchParams({ page: String(page) });
  if (dq) qs.set("q", dq);
  if (status) qs.set("status", status);
  if (showSpam) qs.set("spam", "1");
  const { data, error, loading, reload, refreshing, setData } = useApi(`/console/pavilion-applications?${qs}`);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === "" || v == null || v === 0) p.delete(k); else p.set(k, String(v)); }
    setParams(p, { replace: true });
  };
  const onSearch = (v) => { setQ(v); update({ q: v.trim(), page: 0 }); };

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const counts = data?.counts || {};
  const spamCount = data?.spam ?? 0;

  // Keep the table in step after a save in the drawer
  // Read deposits from Stripe again now (otherwise the server re-reads every 5 minutes)
  const syncDeposits = async () => {
    setSyncing(true);
    try {
      const r = await api.get(`/console/pavilion-applications?${qs}&refresh=1`);
      setData(r);
      toast.success(r.stripeError ? "Couldn't read Stripe" : "Deposits are up to date");
    } catch (err) { toast.error(err); } finally { setSyncing(false); }
  };

  const onSaved = (app) => setData((d) => d && ({ ...d, rows: d.rows.map((r) => (r.id === app.id ? { ...r, ...app } : r)) }));

  // Spreadsheet of every application matching the search (management only: phone numbers, company financials)
  const exportCsv = async () => {
    setExporting(true);
    try {
      const eq = new URLSearchParams();
      if (dq) eq.set("q", dq);
      if (status) eq.set("status", status);
      if (showSpam) eq.set("spam", "1");
      const res = await fetch(`${ADMIN_API}/console/pavilion-applications/export${eq.toString() ? `?${eq}` : ""}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttfc-india-pavilion-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err); } finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Leads"
        title="India Pavilion"
        description="Applications from the India Startup Pavilion page, newest first, with their $500 deposits from Stripe. Each application is emailed to sales@thetechfestival.com and the applicant gets a confirmation. Click a row to see everything they sent."
        actions={
          <>
            <Button icon={RefreshCw} loading={syncing} onClick={syncDeposits} title="Read deposits from Stripe again now (otherwise every 5 minutes)">Refresh deposits</Button>
            {isManagement && <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Every application matching the search and filter">Download CSV</Button>}
          </>
        }
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Need a spreadsheet?">
          Downloading the applications as a CSV is for management. Ask a manager if you need one.
        </Banner>
      )}

      {data?.stripeError && (
        <Banner tone="warn" icon={AlertTriangle} className="mb-6" title="Deposits may be incomplete">{data.stripeError}</Banner>
      )}

      {!showSpam && <UnmatchedDeposits rows={data?.unmatchedDeposits} />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search company, contact, email, phone or reference" className="pl-9" aria-label="Search India Pavilion applications" />
        </div>
        <Select value={status} onChange={(e) => update({ status: e.target.value, page: 0 })} className="sm:w-52" aria-label="Filter by status">
          <option value="">All statuses{data ? ` (${(data.all ?? 0).toLocaleString()})` : ""}</option>
          {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}{data ? ` (${(counts[k] || 0).toLocaleString()})` : ""}</option>)}
        </Select>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} ${showSpam ? "bot application" : "application"}${total === 1 ? "" : "s"}`}{refreshing && !loading ? " · updating…" : ""}
        </p>
        {(showSpam || spamCount > 0) && (
          <Button size="sm" variant="ghost" onClick={() => update({ spam: showSpam ? "" : "1", page: 0 })}
            title="Applications with a filled-in hidden field, random text in the names, or sent instantly. They are never emailed.">
            {showSpam ? "Back to real applications" : `${spamCount.toLocaleString()} bot application${spamCount === 1 ? "" : "s"} hidden · show`}
          </Button>
        )}
      </div>

      {loading ? <LoadingState label="Loading applications…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState
          icon={Landmark}
          title={dq || status ? "No applications match" : showSpam ? "No bot applications" : "No applications yet"}
          body={dq || status ? "Try a different search or status." : "Applications appear here as soon as they're sent from the India Startup Pavilion page. Ones sent before October 2026 were only emailed."}
        />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr><th>Applied</th><th>Company</th><th>Contact</th><th>Email</th><th>Booth</th><th>Deposit</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer align-top hover:bg-white/[0.03]" onClick={() => update({ id: r.id })}>
                  <td className="whitespace-nowrap text-ttfc-muted">{when(r.createdAt)}</td>
                  <td className="max-w-[240px] text-xs">
                    <button type="button" onClick={(e) => { e.stopPropagation(); update({ id: r.id }); }}
                      className="block max-w-full truncate text-left text-sm font-semibold hover:text-ttfc-pink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple"
                      title="See the whole application">
                      {r.company || "No company name"}
                    </button>
                    {r.reference && <span className="block font-mono text-ttfc-dim">{r.reference}</span>}
                    {r.fromDeposit && <span className="block text-ttfc-dim" title="Paid through Stripe before applications were saved. The form itself is in the sales@ inbox.">From Stripe deposit · form not on file</span>}
                  </td>
                  <td className="max-w-[180px] text-xs">
                    <span className="block truncate font-semibold" title={r.contactName}>{r.contactName || "—"}</span>
                    {r.contactTitle && <span className="block truncate text-ttfc-muted" title={r.contactTitle}>{r.contactTitle}</span>}
                  </td>
                  <td className="max-w-[220px] truncate font-mono text-xs">
                    <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="text-ttfc-muted hover:text-ttfc-pink hover:underline" title={r.email}>{r.email}</a>
                  </td>
                  <td className="whitespace-nowrap text-xs text-ttfc-muted">
                    {r.boothLabel || "—"}
                    {r.netPayable != null && <span className="block text-[11px] text-ttfc-dim">{money(r.netPayable)} net</span>}
                  </td>
                  <td><Deposit d={r.deposit} /></td>
                  <td>
                    <div className="space-y-1">
                      <StatusBadge status={r.status} />
                      {r.hasNotes && <p className="text-[11px] text-ttfc-dim">Has notes</p>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button icon={ChevronLeft} disabled={page === 0} onClick={() => update({ page: page - 1 })}>Previous</Button>
              <span className="text-sm text-ttfc-muted">Page {page + 1} of {pages}</span>
              <Button disabled={page + 1 >= pages} onClick={() => update({ page: page + 1 })}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </>
      )}

      <ApplicationDrawer id={openId} onClose={() => update({ id: "" })} onSaved={onSaved} />
    </>
  );
}
