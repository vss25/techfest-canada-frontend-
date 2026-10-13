import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Copy, Eye, MailCheck, Pencil, Search, Send, TicketPlus, Trash2 } from "lucide-react";
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

/* =========================================================
   Admin → Tickets & attendees → Issue passes
   A pass for anyone, like the Speaker Pass: staff choose the
   person, their email(s), the pass (Connect, Influence, Power,
   Apex or All Access), the name printed on it, whether the email
   has an RSVP button, and the email's wording, with a live
   preview. Then Preview & send (To / Cc can change per send).
   The pass gets a new ticket ID that works everywhere: the apps
   (last name + ticket ID), the RSVP page, Apple Wallet, check-in.
   Backend (all under /console/issued-passes):
     GET /tiers, GET /, POST /preview, POST /, PATCH /:id,
     GET|POST /:id/preview, POST /:id/send, DELETE /:id
   Nothing is emailed without a send click.
========================================================= */

const BASE = "/console/issued-passes";
const plural = (n, one, many = `${one}s`) => `${num(n || 0)} ${n === 1 ? one : many}`;
const shortDay = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const EMPTY = { name: "", email: "", title: "", company: "", tier: "influence", label: "", rsvp: true, subject: "", headline: "", message: "" };

/** The wording placeholders for a pass, with the pass name it'll carry. */
function defaultsFor(tiers, form) {
  const t = tiers.find((x) => x.key === form.tier);
  if (!t) return {};
  const label = form.label.trim() || t.label;
  return {
    subject: `{firstName}, your ${label} for TTFC 2026`,
    headline: t.copy.headline,
    message: t.copy.message.replace(t.label, label),
  };
}

/** Create or edit a pass: who, which pass, the email's wording; live preview on the right. */
function PassDrawer({ row, tiers, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => (row ? {
    name: row.name, email: listText(row.emails), title: row.title, company: row.company, tier: row.tier, label: row.label,
    rsvp: row.rsvp, subject: row.copy?.subject || "", headline: row.copy?.headline || "", message: row.copy?.message || "",
  } : EMPTY));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const complete = form.name.trim().split(/\s+/).length >= 2;
  const preview = useLivePreview(`${BASE}/preview`, complete ? form : { ...form, name: "Jane Doe" });
  const tier = tiers.find((t) => t.key === form.tier);

  const save = async () => {
    setSaving(true);
    try {
      const r = row ? await api.patch(`${BASE}/${encodeURIComponent(row.id)}`, form) : await api.post(BASE, form);
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
      title={row ? `Edit ${row.name}'s pass` : "Issue a pass"}
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
            <Field label="Company (optional)">{(id) => <Input id={id} value={form.company} onChange={set("company")} placeholder="Acme Inc." />}</Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pass" hint={tier ? `Access: ${tier.access}` : undefined}>
              {(id) => (
                <Select id={id} value={form.tier} onChange={set("tier")}>
                  {tiers.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Name on the pass (optional)" hint="Printed on the pass and in the email.">
              {(id) => <Input id={id} value={form.label} onChange={set("label")} placeholder={tier?.label || ""} maxLength={40} />}
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
            <p className="mb-3 text-sm font-semibold">Email wording</p>
            <CopyFields value={form} onChange={(c) => setForm((f) => ({ ...f, ...c }))} defaults={defaultsFor(tiers, form)} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold">Preview{complete ? "" : " (sample name until you enter theirs)"}</p>
          {preview.error && !preview.data ? <ErrorState error={preview.error} title="Couldn't render the preview" /> : <EmailFrame preview={preview.data} title="Pass email preview" />}
          {preview.error && preview.data && <p className="mt-2 text-xs text-red-200">{preview.error.message}</p>}
        </div>
      </div>
    </Drawer>
  );
}

/** Preview & send: To and Cc for this send, the email as it'll go out. */
function SendDrawer({ row, canSend, onClose, onSent }) {
  const toast = useToast();
  const [to, setTo] = useState(listText(row.emails));
  const [cc, setCc] = useState(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    api.get(`${BASE}/${encodeURIComponent(row.id)}/preview`).then((r) => setCc(listText(r.cc)), () => setCc(""));
  }, [row.id]);
  const body = { ...(to.trim() ? { to } : {}), ...(cc !== null ? { cc } : {}) };
  const preview = useLivePreview(`${BASE}/${encodeURIComponent(row.id)}/preview`, body, { enabled: cc !== null });
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
          <p className="text-xs text-ttfc-dim">To change the wording, pass or RSVP button, use Edit on the list.</p>
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
        body={`To: ${preview.data?.to || to}. Cc: ${listText(preview.data?.cc) || "nobody"}.${row.sentCount ? ` It was already sent ${shortDay(row.emailSentAt)}.` : ""}`}
        confirmLabel={row.sentCount ? "Resend" : "Send"}
        onConfirm={send}
      />
    </Drawer>
  );
}

export default function IssuedPasses() {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const { data, error, loading, reload, setData } = useApi(BASE);
  const tiersApi = useApi(`${BASE}/tiers`);
  const tiers = tiersApi.data?.tiers || [];
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // { row } or { row: null } for a new pass
  const [sending, setSending] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const rows = useMemo(() => data?.rows || [], [data]);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => (needle
    ? rows.filter((r) => [r.name, r.company, r.emailSentTo, r.ticketId, r.tierLabel, r.label, ...(r.emails || [])].some((v) => String(v || "").toLowerCase().includes(needle)))
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
        eyebrow="Tickets & attendees"
        title="Issue passes"
        description="Give anyone a pass: pick the pass, the name on it and the email's wording, preview it, then send. Each pass gets its own ticket ID for the apps, RSVP, Apple Wallet and check-in."
        actions={isManagement && (
          <Button variant="primary" icon={TicketPlus} disabled={!tiers.length} onClick={() => setEditing({ row: null })}>Issue a pass</Button>
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
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, email, pass or ticket ID" className="pl-9" aria-label="Search issued passes" />
        </div>
        <p className="text-sm text-ttfc-muted">{loading ? "Loading…" : plural(shown.length, "pass", "passes")}</p>
      </div>

      {loading ? <LoadingState label="Loading passes…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={TicketPlus} title="No passes issued yet"
          body={isManagement ? "Click Issue a pass to create one." : "A manager can issue passes here."}
          action={isManagement && tiers.length > 0 && <Button variant="primary" icon={TicketPlus} onClick={() => setEditing({ row: null })}>Issue a pass</Button>} />
      ) : !shown.length ? (
        <EmptyState icon={Search} title="No passes match" body="Try another name, email or ticket ID." />
      ) : (
        <TableWrap>
          <thead><tr><th>Person</th><th>Pass</th><th>Ticket ID</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((r) => {
              const sub = [r.title, r.company].filter(Boolean).join(" · ");
              return (
                <tr key={r.id}>
                  <td className="min-w-[220px] max-w-[300px]">
                    <span className="block truncate font-semibold">{r.name}</span>
                    {sub && <span className="block truncate text-xs text-ttfc-muted">{sub}</span>}
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
        <PassDrawer row={editing.row} tiers={tiers} onClose={() => setEditing(null)} onSaved={upsert} />
      )}
      {sending && <SendDrawer row={sending} canSend={isManagement} onClose={() => setSending(null)} onSent={(row) => upsert(row, false)} />}
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
