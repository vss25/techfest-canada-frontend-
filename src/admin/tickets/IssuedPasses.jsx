import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarCheck, Copy, Eye, FileText, Mail, MailCheck, Paperclip, Pencil, Search, Send, TicketPlus, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, IconButton, Input, LoadingState, PageHeader,
  Select, StatTile, TableWrap,
} from "../ui";
import { num, when } from "../format";
import { CopyFields, EmailFrame, ListField } from "./SpeakerEmailCompose";
import { listText, useLivePreview } from "./speakerEmailHooks";
import { EmailDrawer, ManualDrawer, PdfModal } from "./ExhibitorManual";

/* =========================================================
   Admin → Marketing → Issue passes / Exhibitor passes
   A pass for anyone, like the Speaker Pass: staff choose the
   person, their email(s), the pass (Connect, Influence, Power,
   Apex or All Access), the name printed on it, whether the email
   has an RSVP button, and the email's wording, with a live
   preview. Then Preview & send (To / Cc can change per send).
   The pass gets a new ticket ID that works everywhere: the apps
   (last name + ticket ID), the RSVP page, Apple Wallet, check-in.
   Exhibitor passes are the same, plus the exhibitor's booth: the
   email carries the Exhibitor Manual & return form as a PDF,
   filled in with their booth (ExhibitorManual.jsx: every word of
   the manual and the default email wording can be changed).
   Backend (all under /console/issued-passes or /console/exhibitor-passes):
     GET /tiers, GET /, POST /preview, POST /, PATCH /:id,
     GET|POST /:id/preview, POST /:id/send, DELETE /:id
     exhibitors: GET|PUT /email, GET|PUT /manual, POST /manual/preview, GET /:id/manual.pdf
   Nothing is emailed without a send click.
========================================================= */

const KINDS = {
  issued: {
    base: "/console/issued-passes",
    title: "Issue passes",
    description: "Give anyone a pass: pick the pass, the name on it and the email's wording, preview it, then send. Each pass gets its own ticket ID for the apps, RSVP, Apple Wallet and check-in.",
    create: "Issue a pass",
    who: "pass",
    booth: false,
  },
  exhibitor: {
    base: "/console/exhibitor-passes",
    title: "Exhibitor passes",
    description: "Passes for the people on each exhibitor's booth: the same pass email, with the Exhibitor Manual & return form attached as a PDF, filled in with their company and booth. Change any word of the email or the manual, preview both, then send.",
    create: "Issue an exhibitor pass",
    who: "exhibitor pass",
    booth: true,
  },
};

const plural = (n, one, many = `${one}s`) => `${num(n || 0)} ${n === 1 ? one : many}`;
const shortDay = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const EMPTY = { name: "", email: "", title: "", company: "", tier: "", label: "", rsvp: true, subject: "", headline: "", message: "", booth: "", zone: "", passes: "" };
const ZONES = ["Zone A - Harbour Ballroom Foyer", "Zone B - Pier 4 & 5 Foyer"];

/** The wording placeholders for a pass, with the pass name it'll carry. */
function defaultsFor(tiers, form, defaultLabel = "") {
  const t = tiers.find((x) => x.key === form.tier);
  if (!t) return {};
  const base = defaultLabel || t.label;
  const label = form.label.trim() || base;
  return {
    subject: t.copy.subject.replace(base, label),
    headline: t.copy.headline,
    message: t.copy.message.replaceAll(base, label),
  };
}

const boothText = (b) => [b?.booth && `Booth ${b.booth}`, b?.zone].filter(Boolean).join(" · ");

/** Create or edit a pass: who, which pass, the email's wording; live preview on the right. */
function PassDrawer({ kind, row, tiers, defaultTier, defaultLabel, onClose, onSaved }) {
  const toast = useToast();
  const BASE = kind.base;
  const [form, setForm] = useState(() => (row ? {
    name: row.name, email: listText(row.emails), title: row.title, company: row.company, tier: row.tier, label: row.label,
    rsvp: row.rsvp, subject: row.copy?.subject || "", headline: row.copy?.headline || "", message: row.copy?.message || "",
    booth: row.booth?.booth || "", zone: row.booth?.zone || "", passes: row.booth?.passes || "",
  } : { ...EMPTY, tier: defaultTier || "influence" }));
  const [saving, setSaving] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const complete = form.name.trim().split(/\s+/).length >= 2;
  const body = kind.booth ? form : (({ booth, zone, passes, ...rest }) => rest)(form); // eslint-disable-line no-unused-vars
  const preview = useLivePreview(`${BASE}/preview`, complete ? body : { ...body, name: "Jane Doe" });
  const tier = tiers.find((t) => t.key === form.tier);
  const attachment = preview.data?.attachments?.[0];

  const save = async () => {
    setSaving(true);
    try {
      const r = row ? await api.patch(`${BASE}/${encodeURIComponent(row.id)}`, body) : await api.post(BASE, body);
      toast.success(row ? "Pass saved" : `Pass created for ${form.name.trim()}. Nothing has been emailed yet.`);
      onSaved(r.row, !row);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-5xl"
      title={row ? `Edit ${row.name}'s pass` : kind.create}
      description={row ? `Ticket ${row.ticketId}` : "Creates a pass with its own ticket ID. You send the email afterwards, from the list."}
      footer={(
        <>
          <Button variant="primary" icon={row ? Pencil : TicketPlus} loading={saving} disabled={!complete || !form.email.trim()} onClick={save}>
            {row ? "Save changes" : "Create pass"}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </>
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-4">
          <Field label="Full name" hint="First and last: the app sign-in uses the last name.">
            {(id) => <Input id={id} value={form.name} onChange={set("name")} placeholder="Jane Doe" autoComplete="off" />}
          </Field>
          <ListField label="Email" hint="Several addresses? Separate them with commas: everyone gets the same email."
            value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="jane@company.com" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title (optional)">{(id) => <Input id={id} value={form.title} onChange={set("title")} placeholder="Chief Technology Officer" />}</Field>
            <Field label={kind.booth ? "Exhibiting company" : "Company (optional)"} hint={kind.booth ? "On page 1 of the manual and the booth sign." : undefined}>
              {(id) => <Input id={id} value={form.company} onChange={set("company")} placeholder="Acme Inc." />}
            </Field>
          </div>
          {kind.booth && (
            <div className="grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)_110px]">
              <Field label="Booth no.">{(id) => <Input id={id} value={form.booth} onChange={set("booth")} placeholder="07" maxLength={20} />}</Field>
              <Field label="Zone / location">
                {(id) => (
                  <>
                    <Input id={id} list="exhibitor-zones" value={form.zone} onChange={set("zone")} placeholder={ZONES[0]} maxLength={60} />
                    <datalist id="exhibitor-zones">{ZONES.map((z) => <option key={z} value={z} />)}</datalist>
                  </>
                )}
              </Field>
              <Field label="Passes allotted">{(id) => <Input id={id} value={form.passes} onChange={set("passes")} placeholder="4" maxLength={20} />}</Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pass" hint={tier ? `Access: ${tier.access}` : undefined}>
              {(id) => (
                <Select id={id} value={form.tier} onChange={set("tier")}>
                  {tiers.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Name on the pass (optional)" hint="Printed on the pass and in the email.">
              {(id) => <Input id={id} value={form.label} onChange={set("label")} placeholder={defaultLabel || tier?.label || ""} maxLength={40} />}
            </Field>
          </div>
          {tier && (
            <p className="text-xs leading-relaxed text-ttfc-dim">
              Includes: {tier.includes.map(([head]) => head).join(" · ")}
            </p>
          )}
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={form.rsvp} onChange={set("rsvp")} className="mt-0.5 h-4 w-4 accent-ttfc-pink" />
            <span><b>RSVP button in the email</b><span className="block text-xs text-ttfc-muted">Opens the RSVP page with their name and ticket ID filled in. The events offered follow the pass.</span></span>
          </label>
          <div className="border-t border-ttfc-line pt-4">
            <p className="mb-3 text-sm font-semibold">Email wording{kind.booth ? " for this pass" : ""}</p>
            <CopyFields value={form} onChange={(c) => setForm((f) => ({ ...f, ...c }))} defaults={defaultsFor(tiers, form, defaultLabel)} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold">Preview{complete ? "" : " (sample name until you enter theirs)"}</p>
          {kind.booth && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-ttfc-line px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{attachment?.filename || "TTFC_2026_Exhibitor_Manual.pdf"}</span>
              <Button size="sm" variant="ghost" icon={FileText} onClick={() => setPdfOpen(true)}>Preview PDF</Button>
            </div>
          )}
          {preview.error && !preview.data ? <ErrorState error={preview.error} title="Couldn't render the preview" /> : <EmailFrame preview={preview.data} title="Pass email preview" />}
          {preview.error && preview.data && <p className="mt-2 text-xs text-red-200">{preview.error.message}</p>}
        </div>
      </div>
      {kind.booth && (
        <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} title={attachment?.filename?.replace(/\.pdf$/, "") || "Exhibitor Manual"}
          path={`${BASE}/manual/preview`} body={{ company: form.company, booth: form.booth, zone: form.zone, passes: form.passes, name: form.name, title: form.title, email: form.email.split(",")[0]?.trim() || "" }} />
      )}
    </Drawer>
  );
}

/** Preview & send: To and Cc for this send, the email as it'll go out. */
function SendDrawer({ kind, row, canSend, onClose, onSent }) {
  const toast = useToast();
  const BASE = kind.base;
  const [to, setTo] = useState(listText(row.emails));
  const [cc, setCc] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  useEffect(() => {
    api.get(`${BASE}/${encodeURIComponent(row.id)}/preview`).then((r) => setCc(listText(r.cc)), () => setCc(""));
  }, [BASE, row.id]);
  const body = { ...(to.trim() ? { to } : {}), ...(cc !== null ? { cc } : {}) };
  const preview = useLivePreview(`${BASE}/${encodeURIComponent(row.id)}/preview`, body, { enabled: cc !== null });
  const attachment = preview.data?.attachments?.[0];
  const send = async () => {
    const r = await api.post(`${BASE}/${encodeURIComponent(row.id)}/send`, body);
    toast.success(`${row.label || row.tierLabel} sent to ${r?.row?.emailSentTo || to}`);
    onSent(r.row);
    onClose();
  };
  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={`${row.name}'s ${row.label || row.tierLabel}`}
      description={`Ticket ${row.ticketId}${row.emailSentAt ? ` · last sent ${shortDay(row.emailSentAt)} to ${row.emailSentTo}` : " · not sent yet"}`}
      footer={canSend ? (
        <>
          <Button variant="primary" icon={Send} disabled={!to.trim() || preview.loading || !!preview.error} onClick={() => setConfirm(true)}>
            {row.sentCount ? "Resend" : "Send"}
          </Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </>
      ) : undefined}
    >
      {canSend && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-ttfc-line px-4 py-3">
          <ListField label="To" hint="Commas between addresses." value={to} onChange={setTo} placeholder="jane@company.com" />
          <ListField label="Cc" hint="For this send." value={cc ?? ""} onChange={setCc} placeholder="Nobody" disabled={cc === null} />
          <p className="text-xs text-ttfc-dim">To change the wording, pass{kind.booth ? ", booth" : ""} or RSVP button, use Edit on the list.{kind.booth ? " The manual's wording is under Edit manual." : ""}</p>
        </div>
      )}
      {kind.booth && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-ttfc-line px-3 py-2 text-sm">
          <Paperclip className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Attached: {attachment?.filename || "Exhibitor Manual (PDF)"}</span>
          <Button size="sm" variant="ghost" icon={FileText} onClick={() => setPdfOpen(true)}>Open PDF</Button>
        </div>
      )}
      {preview.loading && !preview.data ? <LoadingState label="Loading the preview…" />
        : preview.error && !preview.data ? <ErrorState error={preview.error} title="Couldn't load the preview" />
          : <EmailFrame preview={preview.data} title="Pass email preview" />}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="primary"
        title={`Send ${row.name}'s pass?`}
        body={`To: ${preview.data?.to || to}. Cc: ${listText(preview.data?.cc) || "nobody"}.${kind.booth ? " The Exhibitor Manual PDF is attached." : ""}${row.sentCount ? ` It was already sent ${shortDay(row.emailSentAt)}.` : ""}`}
        confirmLabel={row.sentCount ? "Resend" : "Send"}
        onConfirm={send}
      />
      {kind.booth && (
        <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} title={attachment?.filename?.replace(/\.pdf$/, "") || "Exhibitor Manual"}
          path={`${BASE}/${encodeURIComponent(row.id)}/manual.pdf`} />
      )}
    </Drawer>
  );
}

function PassesPage({ kindName }) {
  const kind = KINDS[kindName];
  const BASE = kind.base;
  const toast = useToast();
  const { isManagement } = useAdmin();
  const { data, error, loading, reload, setData } = useApi(BASE);
  const tiersApi = useApi(`${BASE}/tiers`);
  const tiers = tiersApi.data?.tiers || [];
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // { row } or { row: null } for a new pass
  const [sending, setSending] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const rows = useMemo(() => data?.rows || [], [data]);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => (needle
    ? rows.filter((r) => [r.name, r.company, r.emailSentTo, r.ticketId, r.tierLabel, r.label, r.booth?.booth, r.booth?.zone, ...(r.emails || [])].some((v) => String(v || "").toLowerCase().includes(needle)))
    : rows), [rows, needle]);
  const counts = data?.counts || { passes: 0, sent: 0, ready: 0, rsvpd: 0 };

  const upsert = (row, isNew) => setData((d) => {
    if (!d) return d;
    const list = isNew ? [row, ...(d.rows || [])] : (d.rows || []).map((r) => (r.id === row.id ? { ...r, ...row } : r));
    return { ...d, rows: list };
  });
  const copyId = (text) => navigator.clipboard?.writeText(text).then(() => toast.success("Copied"), () => toast.error("Couldn't copy."));

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title={kind.title}
        description={kind.description}
        actions={(
          <div className="flex flex-wrap gap-2">
            {kind.booth && <Button icon={BookOpen} onClick={() => setManualOpen(true)}>{isManagement ? "Edit manual" : "Manual"}</Button>}
            {kind.booth && <Button icon={Mail} onClick={() => setEmailOpen(true)}>{isManagement ? "Edit email" : "Email wording"}</Button>}
            {isManagement && <Button variant="primary" icon={TicketPlus} disabled={!tiers.length} onClick={() => setEditing({ row: null })}>{kind.create}</Button>}
          </div>
        )}
      />

      {!isManagement && (
        <Banner tone="info" className="mb-6" title="Issuing passes is for management">You can see the passes and preview their emails.</Banner>
      )}

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label="Passes issued" value={num(counts.passes)} icon={TicketPlus} tone="purple" />
          <StatTile label="Emailed" value={num(counts.sent)} icon={MailCheck} tone="good" />
          <StatTile label="Not emailed yet" value={num(counts.ready)} icon={Send} tone="orange" />
          <StatTile label="RSVP'd" value={num(counts.rsvpd)} icon={CalendarCheck} tone="good" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search name, company, email${kind.booth ? ", booth" : ""}, pass or ticket ID`} className="pl-9" aria-label={`Search ${kind.title.toLowerCase()}`} />
        </div>
        <p className="text-sm text-ttfc-muted">{loading ? "Loading…" : plural(shown.length, "pass", "passes")}</p>
      </div>

      {loading ? <LoadingState label="Loading passes…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={TicketPlus} title={`No ${kind.who}es issued yet`}
          body={isManagement ? `Click ${kind.create} to create one.` : "A manager can issue passes here."}
          action={isManagement && tiers.length > 0 && <Button variant="primary" icon={TicketPlus} onClick={() => setEditing({ row: null })}>{kind.create}</Button>} />
      ) : !shown.length ? (
        <EmptyState icon={Search} title="No passes match" body="Try another name, email or ticket ID." />
      ) : (
        <TableWrap>
          <thead><tr><th>Person</th><th>Pass</th><th>Ticket ID</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((r) => {
              const sub = [r.title, r.company].filter(Boolean).join(" · ");
              const booth = kind.booth ? boothText(r.booth) : "";
              return (
                <tr key={r.id}>
                  <td className="min-w-[220px] max-w-[300px]">
                    <span className="block truncate font-semibold">{r.name}</span>
                    {sub && <span className="block truncate text-xs text-ttfc-muted">{sub}</span>}
                    {booth && <span className="block truncate text-xs text-ttfc-dim">{booth}{r.booth?.passes ? ` · ${r.booth.passes} passes` : ""}</span>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" icon={isManagement ? Send : Eye} onClick={() => setSending(r)}>{isManagement ? (r.sentCount ? "Preview & resend" : "Preview & send") : "Preview"}</Button>
                      {isManagement && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ row: r })}>Edit</Button>}
                      {isManagement && !r.claimed && !r.checkedIn && (
                        <IconButton icon={Trash2} label={`Delete ${r.name}'s pass`} onClick={() => setDeleting(r)} className="h-8 w-8" />
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="block font-semibold">{r.label || r.tierLabel}</span>
                    {r.label && <span className="block text-xs text-ttfc-muted">{r.tierLabel}</span>}
                    {!r.rsvp && <span className="block text-[11px] text-ttfc-dim">No RSVP button</span>}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-mono text-xs">{r.ticketId}</span>
                      <IconButton icon={Copy} label={`Copy ticket ID ${r.ticketId}`} onClick={() => copyId(r.ticketId)} className="h-7 w-7" />
                    </span>
                  </td>
                  <td className="max-w-[240px] text-xs text-ttfc-muted"><span className="block truncate" title={listText(r.emails)}>{listText(r.emails)}</span></td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      {r.status === "sent"
                        ? <span title={`Last sent ${when(r.emailSentAt)} to ${r.emailSentTo}`}><Badge tone="good" icon={MailCheck}>Sent {shortDay(r.emailSentAt)}{r.sentCount > 1 ? ` · ×${r.sentCount}` : ""}</Badge></span>
                        : <Badge tone="purple" icon={Send}>{r.emailSentAt ? "Changed since sent" : "Not sent"}</Badge>}
                      {r.rsvpd && <Badge tone="good" icon={CalendarCheck}>RSVP'd {shortDay(r.rsvpd.at)}</Badge>}
                      <span className="text-[11px] text-ttfc-dim">Issued {shortDay(r.issuedAt)}{r.issuedBy ? ` by ${r.issuedBy}` : ""}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {editing && tiers.length > 0 && (
        <PassDrawer kind={kind} row={editing.row} tiers={tiers} defaultTier={tiersApi.data?.defaultTier} defaultLabel={tiersApi.data?.defaultLabel || ""}
          onClose={() => setEditing(null)} onSaved={upsert} />
      )}
      {sending && <SendDrawer kind={kind} row={sending} canSend={isManagement} onClose={() => setSending(null)} onSent={(row) => upsert(row, false)} />}
      {manualOpen && <ManualDrawer base={BASE} canEdit={isManagement} onClose={() => setManualOpen(false)} />}
      {emailOpen && <EmailDrawer base={BASE} canEdit={isManagement} onClose={() => setEmailOpen(false)} onSaved={tiersApi.reload} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name || ""}'s pass?`}
        body={`Ticket ${deleting?.ticketId || ""} stops working everywhere (apps, RSVP, Wallet, check-in). This can't be undone.`}
        confirmLabel="Delete pass"
        onConfirm={async () => {
          await api.del(`${BASE}/${encodeURIComponent(deleting.id)}`);
          setData((d) => (d ? { ...d, rows: (d.rows || []).filter((r) => r.id !== deleting.id) } : d));
          toast.success("Pass deleted");
        }}
      />
    </>
  );
}

export default function IssuedPasses() {
  return <PassesPage kindName="issued" />;
}

export function ExhibitorPasses() {
  return <PassesPage kindName="exhibitor" />;
}
