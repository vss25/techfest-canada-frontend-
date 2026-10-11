import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Inbox, Info, Search } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, api, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, SectionTitle, Select, Tabs, TableWrap, Textarea,
} from "../ui";
import { when } from "../format";

/* Admin → Leads → Form submissions
   Volunteer, speaker, booth, sponsor, partnership and general enquiry forms.
   Saved by the backend (POST /api/forms/:form), then emailed to baldeep@.
   Before Oct 2026 these went through EmailJS only; rows recovered from its
   history carry a "Recovered" badge. */

const PAGE = 50;

/* Keep in step with services/formSubmissions.js FORMS in the backend. */
const FORMS = {
  volunteer: { label: "Volunteer", tone: "good" },
  speaker: { label: "Speaker", tone: "purple" },
  exhibit: { label: "Booth", tone: "orange" },
  sponsor: { label: "Sponsor", tone: "pink" },
  partnership: { label: "Partnership", tone: "warn" },
  inquiry: { label: "General enquiry", tone: "neutral" },
};
const FORM_KEYS = Object.keys(FORMS);

const STATUS = {
  new: { tone: "purple", label: "New" },
  contacted: { tone: "orange", label: "Contacted" },
  accepted: { tone: "good", label: "Accepted" },
  declined: { tone: "neutral", label: "Declined" },
  archived: { tone: "neutral", label: "Archived" },
};
const STATUS_KEYS = Object.keys(STATUS);

function FormBadge({ form }) {
  const f = FORMS[form] || { label: form || "—", tone: "neutral" };
  return <Badge tone={f.tone}>{f.label}</Badge>;
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.new;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const RecoveredBadge = () => (
  <span className="ml-1 inline-block" title="Recovered from EmailJS's history (the form failed when it was sent). Not emailed again.">
    <Badge tone="warn">Recovered</Badge>
  </span>
);

function EmailOutcome({ s }) {
  const m = s.meta || {};
  if (s.emailStatus === "sent") return <Badge tone="good">Emailed{m.emailTo?.length ? ` to ${m.emailTo.join(", ")}` : ""}</Badge>;
  if (s.emailStatus === "failed") return <Badge tone="bad">Email failed</Badge>;
  if (s.emailStatus === "sending") return <Badge tone="neutral">Sending…</Badge>;
  if (s.emailStatus === "blocked") return <span className="text-ttfc-dim">Not sent (bot)</span>;
  if (s.emailStatus === "skipped") return <span className="text-ttfc-dim">Not emailed (recovered from EmailJS)</span>;
  return <span className="text-ttfc-dim">—</span>;
}

function Value({ f }) {
  if (f.value === "" || f.value == null) return <span className="text-ttfc-dim">—</span>;
  if (f.type === "email") return <a href={`mailto:${f.value}`} className="break-all text-ttfc-pink underline-offset-2 hover:underline">{f.value}</a>;
  if (f.type === "url" && /^https?:\/\//i.test(f.value)) {
    return <a href={f.value} target="_blank" rel="noopener noreferrer" className="break-all text-ttfc-pink underline-offset-2 hover:underline">{f.value}</a>;
  }
  return <span className={f.type === "long" ? "whitespace-pre-wrap break-words" : "break-words"}>{f.value}</span>;
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

function SubmissionDrawer({ id, onClose, onSaved }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(id ? `/console/form-submissions/${id}` : null);
  const s = data?.submission;
  const [edit, setEdit] = useState(null); // { id, status, notes } while staff change something
  const [saving, setSaving] = useState(false);
  const form = edit && edit.id === id ? edit : { id, status: s?.status || "new", notes: s?.notes || "" };
  const dirty = !!s && (form.status !== s.status || form.notes !== (s.notes || ""));
  const change = (k, v) => setEdit({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.patch(`/console/form-submissions/${id}`, { status: form.status, notes: form.notes });
      setData(r);
      setEdit(null);
      onSaved(r.submission);
      toast.success("Saved");
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const close = () => { setEdit(null); onClose(); };
  const m = s?.meta || {};

  return (
    <Drawer
      open={!!id}
      onClose={close}
      width="max-w-2xl"
      title={s?.name || s?.email || (loading ? "Loading…" : "Submission")}
      description={s ? [s.formLabel, `received ${when(s.createdAt)}`].filter(Boolean).join(" · ") : ""}
      footer={s && (
        <>
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>Save</Button>
          {dirty && <Button variant="ghost" onClick={() => setEdit(null)}>Discard changes</Button>}
        </>
      )}
    >
      {loading ? <LoadingState label="Loading submission…" /> : error && !s ? <ErrorState error={error} onRetry={reload} /> : s && (
        <>
          {s.spam && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-6" title="Flagged as a bot">
              {s.spamReason ? `Reason: ${s.spamReason}. ` : ""}Nobody was emailed about it.
            </Banner>
          )}
          {s.source === "recovered" && (
            <Banner tone="info" icon={Info} className="mb-6" title="Recovered from EmailJS">
              This was sent while the old EmailJS connection was broken, so it never reached the inbox. It was loaded from EmailJS's history and hasn't been emailed.
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
            <Field label="Staff notes" hint={m.updatedBy ? `Last changed by ${m.updatedBy}${m.updatedAt ? `, ${when(m.updatedAt)}` : ""}. Only staff see this.` : "Only staff see this. It's included in the spreadsheet."}>
              {(fid) => <Textarea id={fid} rows={3} value={form.notes} onChange={(e) => change("notes", e.target.value)} placeholder="Calls, follow-ups, who's handling it…" />}
            </Field>
          </div>

          <DetailSection title="What they sent">
            {s.fields.map((f) => <Row key={f.key} label={f.label}><Value f={f} /></Row>)}
          </DetailSection>

          <DetailSection title="Submission">
            <Row label="Form"><FormBadge form={s.form} />{s.source === "recovered" && <RecoveredBadge />}</Row>
            <Row label="Received">{when(s.createdAt)}</Row>
            <Row label="Email"><EmailOutcome s={s} /></Row>
            {m.emailError && <Row label="Email error"><span className="break-words text-xs text-red-200">{m.emailError}</span></Row>}
            <Row label="Page"><span className="font-mono text-xs">{m.page || "—"}</span></Row>
            {m.referrer && <Row label="Came from"><span className="break-all font-mono text-xs">{m.referrer}</span></Row>}
            {m.fillMs != null && <Row label="Form open for">{m.fillMs < 60000 ? `${Math.round(m.fillMs / 1000)} s` : `${Math.round(m.fillMs / 60000)} min`}</Row>}
            {m.userAgent && <Row label="Browser"><span className="break-words text-xs text-ttfc-muted">{m.userAgent}</span></Row>}
          </DetailSection>
        </>
      )}
    </Drawer>
  );
}

export default function FormSubmissions() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [exporting, setExporting] = useState(false);
  const page = Math.max(0, Number(params.get("page")) || 0);
  const form = FORM_KEYS.includes(params.get("form")) ? params.get("form") : "";
  const status = STATUS_KEYS.includes(params.get("status")) ? params.get("status") : "";
  const showSpam = params.get("spam") === "1";
  const openId = params.get("id") || "";
  const dq = useDebounced(q.trim(), 300);

  const view = new URLSearchParams();
  if (form) view.set("form", form);
  if (dq) view.set("q", dq);
  if (status) view.set("status", status);
  if (showSpam) view.set("spam", "1");
  const qs = new URLSearchParams(view);
  qs.set("page", String(page));
  const { data, error, loading, reload, refreshing, setData } = useApi(`/console/form-submissions?${qs}`);

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
  const statusCounts = data?.statusCounts || {};
  const spamCount = data?.spam ?? 0;
  const allCount = FORM_KEYS.reduce((n, k) => n + (counts[k] || 0), 0);

  const tabs = [
    { key: "", label: "All", count: data ? allCount : undefined },
    ...FORM_KEYS.map((k) => ({ key: k, label: FORMS[k].label, count: data ? counts[k] || 0 : undefined })),
  ];

  // Keep the table in step after a save in the drawer
  const onSaved = (s) => setData((d) => d && ({ ...d, rows: d.rows.map((r) => (r.id === s.id ? { ...r, status: s.status, hasNotes: !!s.notes } : r)) }));

  // Spreadsheet of every submission in this view (management only: phone numbers)
  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${ADMIN_API}/console/form-submissions/export${view.toString() ? `?${view}` : ""}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttfc-form-submissions${form ? `-${form}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err); } finally { setExporting(false); }
  };

  const filtered = !!(dq || status);
  const noun = showSpam ? "bot submission" : "submission";

  return (
    <>
      <PageHeader
        eyebrow="Leads"
        title="Form submissions"
        description="Volunteer, speaker, booth, sponsor, partnership and general enquiries from the website, newest first. Each one is saved here, then emailed to baldeep@thetechfestival.com with reply-to set to the person. Click a row to see everything they sent."
        actions={isManagement && <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Every submission in this tab, search and filter">Download CSV</Button>}
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Need a spreadsheet?">
          Downloading submissions as a CSV is for management. Ask a manager if you need one.
        </Banner>
      )}

      <Tabs tabs={tabs} value={form} onChange={(k) => update({ form: k, page: 0 })} label="Which form" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email, phone, company or message" className="pl-9" aria-label="Search form submissions" />
        </div>
        <Select value={status} onChange={(e) => update({ status: e.target.value, page: 0 })} className="sm:w-52" aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}{data ? ` (${(statusCounts[k] || 0).toLocaleString()})` : ""}</option>)}
        </Select>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} ${noun}${total === 1 ? "" : "s"}`}{refreshing && !loading ? " · updating…" : ""}
        </p>
        {(showSpam || spamCount > 0) && (
          <Button size="sm" variant="ghost" onClick={() => update({ spam: showSpam ? "" : "1", page: 0 })}
            title="Submissions with a filled-in hidden field, random text in the name, or sent instantly. They are never emailed.">
            {showSpam ? "Back to real submissions" : `${spamCount.toLocaleString()} bot submission${spamCount === 1 ? "" : "s"} hidden · show`}
          </Button>
        )}
      </div>

      {loading ? <LoadingState label="Loading submissions…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState
          icon={Inbox}
          title={filtered ? "No submissions match" : showSpam ? "No bot submissions" : "No submissions yet"}
          body={filtered ? "Try a different search or status." : "Submissions appear here as soon as someone sends one of the website forms."}
        />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr><th>Received</th><th>Form</th><th>Name</th><th>Email</th><th>Phone</th><th>Summary</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer align-top hover:bg-white/[0.03]" onClick={() => update({ id: r.id })}>
                  <td className="whitespace-nowrap text-ttfc-muted">{when(r.createdAt)}</td>
                  <td className="whitespace-nowrap">
                    <FormBadge form={r.form} />
                    {r.source === "recovered" && <RecoveredBadge />}
                  </td>
                  <td className="max-w-[200px] text-xs">
                    <button type="button" onClick={(e) => { e.stopPropagation(); update({ id: r.id }); }}
                      className="block max-w-full truncate text-left text-sm font-semibold hover:text-ttfc-pink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple"
                      title="See everything they sent">
                      {r.name || "No name"}
                    </button>
                    {r.company && <span className="block truncate text-ttfc-muted" title={r.company}>{r.company}</span>}
                  </td>
                  <td className="max-w-[220px] truncate font-mono text-xs">
                    {r.email
                      ? <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="text-ttfc-muted hover:text-ttfc-pink hover:underline" title={r.email}>{r.email}</a>
                      : <span className="text-ttfc-dim">—</span>}
                  </td>
                  <td className="whitespace-nowrap font-mono text-xs text-ttfc-muted">{r.phone || "—"}</td>
                  <td className="max-w-[320px] text-xs text-ttfc-muted"><span className="line-clamp-2" title={r.summary}>{r.summary || "—"}</span></td>
                  <td>
                    <div className="space-y-1">
                      <StatusBadge status={r.status} />
                      {r.hasNotes && <p className="text-[11px] text-ttfc-dim">Has notes</p>}
                      {r.emailStatus === "failed" && <p className="text-[11px] text-red-200">Email failed</p>}
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

      <SubmissionDrawer id={openId} onClose={() => update({ id: "" })} onSaved={onSaved} />
    </>
  );
}
