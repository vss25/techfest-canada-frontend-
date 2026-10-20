import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Eye, Info, Mail, MailCheck, MailOpen, MailWarning, Monitor, Moon, MousePointerClick,
  RotateCcw, Save, Search, Send, Smartphone, Sun, Users,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader, SectionTitle, StatTile,
  Switch, TableWrap,
} from "../ui";
import { num, when } from "../format";
import { EmailCopyEditor } from "../tickets/EmailCopyEditor";
import { useLivePreview } from "../tickets/speakerEmailHooks";

/* =========================================================
   Admin → Website & app → App invite email (Oct 20 2026)
   The organiser: "send emails to all people associated with the
   event to download the web app … allow customization as usual …
   sent from enquire". One email, "Open the TTFC app", to everyone
   with a pass or a role at TTFC 2026 (People), once per address:
   the web app, how to add it to the home screen on an iPhone and on
   Android, and the email to sign in with.
     - Every word editable (management saves), with Reset to default,
       the Google Play and App Store lines switched on or off, a live
       preview (desktop / phone, dark / light) and Send me a test.
     - Who gets it: counts, "Skip people already using the app" (on by
       default) and the list with why someone is left out.
     - Send to one person (staff too; also from their profile in
       People) or to everyone (management, a confirm with the count,
       a background job with progress; a re-run skips anyone sent,
       Retry failed sends only the failures).
     - Sent · opened · clicked the button · now using the app.
   Backend: /console/app-invite (routes/appInvite.js).
========================================================= */

const BASE = "/console/app-invite";
const plural = (n, one, many = `${one}s`) => `${num(n || 0)} ${n === 1 ? one : many}`;
const STATUS = {
  sent: { tone: "good", icon: MailCheck, label: "Sent" },
  failed: { tone: "bad", icon: MailWarning, label: "Failed" },
  sending: { tone: "warn", icon: Clock, label: "Unconfirmed" },
  pending: { tone: "neutral", icon: null, label: "Not sent" },
};
// Who can't be emailed at all (vs. "already sent" / "using the app", which a single send can override).
const HARD_SKIPS = new Set(["noEmail", "placeholder", "banned", "unsubscribed", "duplicate", "sending"]);
const FILTERS = [
  ["will", "Will get it"], ["using", "Using the app"], ["sent", "Sent"], ["failed", "Failed"], ["out", "Left out"], ["all", "Everyone"],
];

/** The email in a sandboxed frame, at a desktop or phone width, in the dark or light version (the email follows the frame's colour scheme). */
function InvitePreview({ preview, loading, error }) {
  const [mode, setMode] = useState("html");
  const [width, setWidth] = useState("desktop");
  const [scheme, setScheme] = useState("dark");
  const seg = (value, set, items, label) => (
    <div className="flex gap-1" role="group" aria-label={label}>
      {items.map(([k, text, Icon]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => set(k)}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold ${value === k ? "bg-ttfc-purple/30 text-white" : "text-ttfc-muted hover:text-ttfc-text"}`}>
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{text}
        </button>
      ))}
    </div>
  );
  if (!preview) return loading ? <LoadingState label="Loading the preview…" /> : error ? <ErrorState error={error} title="Couldn't load the preview" /> : null;
  return (
    <div className="overflow-hidden rounded-xl border border-ttfc-line">
      <div className="space-y-2 border-b border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-xs">
        <p className="truncate"><span className="text-ttfc-dim">Subject</span> <b>{preview.subject || "—"}</b></p>
        {preview.preheader && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Preview text</span> {preview.preheader}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {seg(mode, setMode, [["html", "Email"], ["text", "Plain text"]], "Email format")}
          {mode === "html" && seg(width, setWidth, [["desktop", "Desktop", Monitor], ["phone", "Phone", Smartphone]], "Width")}
          {mode === "html" && seg(scheme, setScheme, [["dark", "Dark", Moon], ["light", "Light", Sun]], "Colours")}
          {loading && <span className="text-[11px] text-ttfc-dim">Updating…</span>}
        </div>
      </div>
      {error && <p className="border-b border-ttfc-line bg-red-500/10 px-3 py-2 text-xs text-red-200">{error.message || String(error)}</p>}
      {mode === "html" ? (
        <div className="flex justify-center bg-ttfc-ink p-3">
          <iframe title="App invite email preview" sandbox="" srcDoc={preview.html || ""} style={{ colorScheme: scheme }}
            className={`block h-[72vh] min-h-[480px] rounded-lg border border-ttfc-line ${width === "phone" ? "w-[375px] max-w-full" : "w-full"} ${scheme === "light" ? "bg-[#f6f2fb]" : "bg-[#06020f]"}`} />
        </div>
      ) : <pre className="h-[72vh] min-h-[480px] overflow-auto whitespace-pre-wrap bg-ttfc-ink px-4 py-3 font-mono text-xs leading-relaxed text-ttfc-muted">{preview.text}</pre>}
    </div>
  );
}

/** Send to everyone (or retry the failures): the count, and type SEND. */
function SendAllDialog({ toSend, skipUsing, retry, onClose, onStarted }) {
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const armed = typed.trim() === "SEND" && toSend > 0;
  const send = async () => {
    if (!armed || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await api.post(`${BASE}/send-all`, { confirm: "SEND", skipUsing, ...(retry ? { only: "failed" } : {}) });
      toast.success(`Sending to ${plural(r?.toSend ?? toSend, "person", "people")}…`);
      onStarted?.();
      onClose();
    } catch (e) { setErr(e?.message || "Something went wrong"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} size="md" tone="danger"
      title={retry ? `Retry ${plural(toSend, "failed send")}?` : `Email ${plural(toSend, "person", "people")} now?`}
      description="This sends the app invite email from enquire@thetechfestival.com. It can't be undone."
      footer={(
        <>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" icon={Send} loading={busy} disabled={!armed} onClick={send}>Send {plural(toSend, "email")}</Button>
        </>
      )}>
      <div className="flex flex-col gap-4 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-ttfc-muted">
          <li>Sent one by one in the background (about {Math.max(1, Math.ceil((toSend * 0.6) / 60))} min). You can close this page.</li>
          {!retry && <li>{skipUsing ? "People already using the app are skipped." : "People already using the app get it too."} Anyone who already got it is skipped.</li>}
          <li>Each email's button opens the web app; opens and clicks show on this page.</li>
        </ul>
        <Field label={<>Type <span className="font-mono">SEND</span> to confirm</>}>
          {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="SEND" className="font-mono" disabled={busy} data-autofocus />}
        </Field>
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
      </div>
    </Modal>
  );
}

export default function AppInvite() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [skipUsing, setSkipUsing] = useState(true);
  const [kickedAt, setKickedAt] = useState(0);
  const [lastJob, setLastJob] = useState(null);
  const polling = !!lastJob?.running || (kickedAt > 0 && !(lastJob?.finishedAt && new Date(lastJob.finishedAt).getTime() >= kickedAt));
  const recipients = useApi(`${BASE}/recipients?skipUsing=${skipUsing ? 1 : 0}`, { interval: polling ? 3000 : undefined });
  const template = useApi(`${BASE}/template`);
  const [draft, setDraft] = useState(null); // staff's wording while editing ({ ...fields, options })
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("will");
  const [confirm, setConfirm] = useState(null); // "all" | "retry"
  const [one, setOne] = useState(null);

  const t = template.data;
  useEffect(() => { if (t && !draft) setDraft({ ...t.copy, options: t.options }); }, [t, draft]);
  const value = draft || {};
  const { options = t?.options || {}, ...copy } = value;
  const preview = useLivePreview(`${BASE}/preview`, { ...copy, options }, { enabled: !!t });
  const dirty = !!t && JSON.stringify({ ...t.copy, options: t.options }) !== JSON.stringify(value);
  const isSet = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.length > 0);
  const isDefault = !!t && !Object.values(copy).some(isSet) && JSON.stringify(options) === JSON.stringify(t.defaultOptions);

  const data = recipients.data;
  const counts = data?.counts;
  const stats = data?.stats;
  const job = data?.job;
  const running = !!job?.running;
  if (job !== lastJob) setLastJob(job);
  const done = job?.total ? job.sent + job.failed + job.skipped : 0;
  const pct = job?.total ? Math.round((done / job.total) * 100) : 0;

  const rows = useMemo(() => data?.rows || [], [data]);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) => {
    const f = filter === "will" ? r.willGet : filter === "using" ? r.usingApp : filter === "sent" ? r.status === "sent"
      : filter === "failed" ? r.status === "failed" : filter === "out" ? !r.willGet : true;
    return f && (!needle || [r.name, r.email, ...(r.roles || [])].some((v) => String(v || "").toLowerCase().includes(needle)));
  }), [rows, filter, needle]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${BASE}/template`, { ...copy, options });
      template.setData?.(r);
      setDraft({ ...r.copy, options: r.options });
      toast.success("Email wording saved");
    } catch (e) { toast.error(e); } finally { setSaving(false); }
  };
  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await api.post(`${BASE}/send-test`, { ...copy, options });
      toast.success(`Test sent to ${r.to}. It shows the sample name (Jane) and your address.`);
    } catch (e) { toast.error(e); } finally { setTesting(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Website & app"
        title="App invite email"
        description="One email to everyone with a pass or a role at TTFC 2026: “Open the TTFC app”, how to add it to their home screen, and the email to sign in with. Sent from enquire@thetechfestival.com."
        actions={(
          <>
            <Button icon={ExternalLink} onClick={() => window.open("/app/", "_blank", "noopener")}>Open the web app</Button>
            {isManagement && stats?.failed > 0 && (
              <Button icon={RotateCcw} disabled={running} onClick={() => setConfirm("retry")}>Retry failed ({num(stats.failed)})</Button>
            )}
            {isManagement && (
              <Button variant="primary" icon={Send} disabled={!data || running || !counts?.willGet} onClick={() => setConfirm("all")}
                title={running ? "A send is running" : counts?.willGet ? "Email everyone on the list who hasn't had it" : "Nobody left to email"}>
                Send to everyone{counts?.willGet ? ` (${num(counts.willGet)})` : ""}
              </Button>
            )}
          </>
        )}
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Saving the wording and sending to everyone are for management">
          You can preview the email, send yourself a test and send it to one person (here, or from their profile in{" "}
          <Link to="/admin/people" className="font-semibold text-ttfc-pink hover:underline">People</Link>).
        </Banner>
      )}

      {running && (
        <Card className="mb-6" aria-live="polite">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-semibold">Sending… {num(done)} of {num(job.total)}</p>
            <p className="text-ttfc-muted">Started {when(job.startedAt)}{job.by ? ` by ${job.by}` : ""}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Send progress">
            <div className="h-2 rounded-full bg-gradient-to-r from-ttfc-purple via-ttfc-pink to-ttfc-orange transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
          <p className="mt-2 text-xs text-ttfc-dim">Sent {num(job.sent)} · failed {num(job.failed)} · skipped {num(job.skipped)}. You can leave this page; it keeps going.</p>
        </Card>
      )}
      {!running && job?.finishedAt && (
        <Banner tone={job.failed ? "warn" : "good"} icon={job.failed ? AlertTriangle : CheckCircle2} className="mb-6"
          title={`Last send finished ${when(job.finishedAt)}: sent ${num(job.sent)}, failed ${num(job.failed)}`}>
          {job.failed ? "Failed ones show in the list. Retry failed sends them again." : "Everyone in that run was emailed."}
        </Banner>
      )}

      {recipients.loading && !data ? <LoadingState label="Counting people…" /> : recipients.error && !data ? <ErrorState error={recipients.error} onRetry={recipients.reload} /> : stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label="Sent" value={num(stats.sent)} icon={MailCheck} tone="purple" hint={stats.failed || stats.unconfirmed ? `${num(stats.failed)} failed · ${num(stats.unconfirmed)} unconfirmed` : "Test emails aren't counted"} />
          <StatTile label="Opened" value={num(stats.opened)} icon={MailOpen} tone="good" hint="An estimate: some mail apps load images, others don't" />
          <StatTile label="Clicked the button" value={num(stats.clicked)} icon={MousePointerClick} tone="orange" hint="Opened the web app from the email" />
          <StatTile label="Now using the app" value={num(stats.usingAfter)} icon={Smartphone} tone="good" hint="Signed in after the email" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <SectionTitle hint={t?.updatedAt ? `Last saved ${when(t.updatedAt)}${t.updatedBy ? ` by ${t.updatedBy}` : ""}` : "The built-in wording"}>The email's wording</SectionTitle>
          {template.loading && !t ? <LoadingState label="Loading the wording…" /> : template.error && !t ? <ErrorState error={template.error} onRetry={template.reload} /> : t && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-ttfc-line px-3 py-3">
                <p className="mb-2 text-sm font-semibold">Optional lines</p>
                <div className="flex flex-col gap-3">
                  {(t.optionsMeta || []).map((o) => (
                    <Switch key={o.key} checked={options[o.key] !== false} onChange={(v) => setDraft({ ...value, options: { ...options, [o.key]: v } })}
                      label={o.label} description={o.key === "appStore" && !t.appStoreUrl ? `${o.hint} The iPhone app isn't live yet, so it doesn't show for now.` : o.hint} />
                  ))}
                </div>
              </div>
              <EmailCopyEditor fields={t.fields} sections={t.sections} value={copy} defaults={t.defaults} placeholders={t.placeholders}
                onChange={(c) => setDraft({ ...c, options })}
                note={t.canEdit ? "Changes show in the preview straight away. Save to use them for every send." : "You can try wording in the preview and your test; only management can save it."} />
              <div className="flex flex-wrap gap-2 border-t border-ttfc-line pt-4">
                {t.canEdit && <Button variant="primary" icon={Save} loading={saving} disabled={!dirty} onClick={save}>Save wording</Button>}
                <Button icon={RotateCcw} disabled={!dirty} onClick={() => setDraft({ ...t.copy, options: t.options })}>Undo changes</Button>
                {t.canEdit && (
                  <Button variant="ghost" icon={RotateCcw} disabled={isDefault} onClick={() => setDraft({ options: t.defaultOptions })}
                    title="Every field back to the built-in wording and both lines on (then Save)">Reset all to default</Button>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <SectionTitle hint="A made-up attendee (Jane). Each person gets their own first name and email address.">Preview</SectionTitle>
            <InvitePreview preview={preview.data} loading={preview.loading} error={preview.error} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button icon={Mail} loading={testing} onClick={sendTest}>Send me a test</Button>
              <span className="text-xs text-ttfc-dim">To your own email, with the wording above (saved or not). Subject starts “[Test]”, not counted.</span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <SectionTitle hint="Everyone in People with a pass (bought, given, complimentary, exhibitor or Speaker Pass) or a role (speaker, exhibitor, staff, volunteer, media, VIP), once per email address.">Who gets it</SectionTitle>
        {counts && (
          <>
            <p className="text-sm">
              <b>{plural(counts.people, "person", "people")}</b> · {num(counts.usingApp)} already use the app · <b className="text-ttfc-pink">{num(counts.willGet)} will get it</b>
              {counts.alreadySent > 0 && <span className="text-ttfc-muted"> · {num(counts.alreadySent)} already got it</span>}
            </p>
            <div className="mt-3 max-w-xl">
              <Switch checked={skipUsing} onChange={setSkipUsing} label="Skip people already using the app"
                description="On: anyone who has signed in to the app or the web app isn't emailed. A send to one person always goes." />
            </div>
            {Object.keys(counts.skippedBy || {}).length > 0 && (
              <p className="mt-3 text-xs text-ttfc-dim">
                Left out: {Object.entries(counts.skippedBy).map(([k, n]) => `${num(n)} ${(rows.find((r) => r.reason === k)?.label || k).toLowerCase()}`).join(" · ")}.
              </p>
            )}
          </>
        )}
      </Card>

      <div className="mb-4 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or role" className="pl-9" aria-label="Search people" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Show">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-white/10 text-ttfc-text" : "text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text"}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ttfc-muted sm:ml-auto" aria-live="polite">{num(shown.length)} of {plural(rows.length, "person", "people")}</p>
      </div>

      {data && (shown.length ? (
        <TableWrap>
          <thead><tr><th>Name</th><th>Email</th><th>At TTFC as</th><th>App</th><th>Email status</th><th><span className="sr-only">Send</span></th></tr></thead>
          <tbody>
            {shown.slice(0, 500).map((r) => {
              const s = STATUS[r.status] || STATUS.pending;
              const can = !!r.email && !HARD_SKIPS.has(r.reason) && !running;
              return (
                <tr key={`${r.id}-${r.email}`}>
                  <td className="font-semibold"><Link to={`/admin/people/${encodeURIComponent(r.id)}`} className="hover:text-ttfc-pink hover:underline">{r.name || "No name"}</Link></td>
                  <td className="text-ttfc-muted">{r.email || <span className="text-ttfc-dim">—</span>}</td>
                  <td className="text-xs text-ttfc-muted">{(r.roles || []).join(", ")}</td>
                  <td className="text-xs">{r.usingApp ? <Badge tone="good" icon={Smartphone}>Using it</Badge> : <span className="text-ttfc-dim">Not yet</span>}</td>
                  <td>
                    <span className="flex flex-wrap items-center gap-1.5" title={r.error || (r.sentAt ? `Sent ${when(r.sentAt)}` : undefined)}>
                      <Badge tone={s.tone} icon={s.icon}>{s.label}{r.status === "sent" && r.sentAt ? ` · ${when(r.sentAt)}` : ""}</Badge>
                      {r.opened && <Badge tone="good" icon={Eye}>Opened</Badge>}
                      {r.clicked && <Badge tone="orange" icon={MousePointerClick}>Clicked</Badge>}
                    </span>
                    {r.reason && <span className="mt-1 block text-[11px] text-ttfc-dim">{r.label}</span>}
                    {r.error && <span className="mt-1 block max-w-[240px] truncate text-[11px] text-red-200">{r.error}</span>}
                  </td>
                  <td className="text-right">
                    {can && (
                      <Button size="sm" icon={Send} onClick={() => setOne(r)} aria-label={`${r.status === "sent" ? "Send again to" : "Send to"} ${r.name || r.email}`}>
                        {r.status === "sent" ? "Send again" : "Send"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      ) : <EmptyState icon={Users} title={rows.length ? "No one here" : "No one yet"} body={rows.length ? "Try another search or filter." : "Nobody has a pass or a role yet."} />)}
      {shown.length > 500 && <p className="mt-2 text-xs text-ttfc-dim">Showing the first 500. Search to find someone.</p>}

      <ConfirmDialog
        open={!!one}
        onClose={() => setOne(null)}
        tone={one?.status === "sent" ? "danger" : "primary"}
        title={`Email ${one?.name || one?.email || ""} the app invite?`}
        body={one?.status === "sent"
          ? `They already got it${one.sentAt ? ` ${when(one.sentAt)}` : ""}. This sends it again to ${one.email} (not within ${data?.cooldownDays || 3} days of the last one).`
          : `Sends “Open the TTFC app” to ${one?.email}.${one?.usingApp ? " They already use the app." : ""} Sending to everyone skips them afterwards.`}
        confirmLabel={one?.status === "sent" ? "Send again" : "Send"}
        onConfirm={async () => {
          await api.post(`${BASE}/send-one`, { email: one.email });
          toast.success(`Sent to ${one.email}`);
          recipients.reload();
        }}
      />

      {confirm && (
        <SendAllDialog toSend={confirm === "retry" ? stats?.failed || 0 : counts?.willGet || 0} skipUsing={skipUsing} retry={confirm === "retry"}
          onClose={() => setConfirm(null)} onStarted={() => { setKickedAt(Date.now()); recipients.reload(); }} />
      )}
    </>
  );
}
