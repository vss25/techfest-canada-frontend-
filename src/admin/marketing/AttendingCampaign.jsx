import { useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Info, Mail, MailCheck, MailWarning, Search, Send, Users,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, Modal, PageHeader,
  SectionTitle, StatTile, TableWrap,
} from "../ui";
import { num, when } from "../format";

/* =========================================================
   Admin → Marketing → I'm attending campaign
   One email to every ticket holder, "Show the world you're
   attending", whose button opens their personal page
   thetechfestival.com/attending#fn=…&ln=…&title=…&co=… where they
   make an "I'm attending TTFC 2026" image and post it to LinkedIn.
   Backend (all under /console/attending-campaign):
     GET  /preview-sample        → { subject, html, text, link }
     GET  /recipients            → { counts, skipped, recipients, job }
     POST /send-test { to }      → { sent, to }            (management)
     POST /send-one { email, again? } → { sent, sentAt } (management; one person now)
     POST /send-all { confirm: "SEND" } → 202 { started, toSend, alreadySent }
                                   (management; runs in the background)
   Recipients are worked out live from the tickets. Re-running the
   send skips everyone already emailed; failed ones are retried.
   Nothing is emailed without an explicit confirm.
========================================================= */

const BASE = "/console/attending-campaign";
const plural = (n, one, many = `${one}s`) => `${num(n || 0)} ${n === 1 ? one : many}`;
const STATUS = {
  sent: { tone: "good", icon: MailCheck, label: "Sent" },
  failed: { tone: "bad", icon: MailWarning, label: "Failed" },
  sending: { tone: "warn", icon: Clock, label: "Unconfirmed" },
  pending: { tone: "neutral", icon: null, label: "Not sent" },
};
const SKIP_LABELS = {
  hidden: "hidden tickets (test / duplicate)",
  placeholder: "placeholder addresses (@ticket.thetechfestival.com)",
  noEmail: "passes with no email",
  invalidEmail: "invalid emails",
  booth: "booth orders",
  banned: "banned accounts",
  unsubscribed: "unsubscribed",
  duplicate: "extra tickets for the same email",
};

/** The email, isolated in a sandboxed frame (no scripts, no same-origin access). */
export function EmailPreview({ preview, title = "Email preview" }) {
  const [mode, setMode] = useState("html");
  if (!preview) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-ttfc-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-xs">
        <p className="min-w-0 truncate"><span className="text-ttfc-dim">Subject</span> <b>{preview.subject || "—"}</b></p>
        <div className="flex gap-1" role="tablist" aria-label="Email format">
          {[["html", "Email"], ["text", "Plain text"]].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className={`rounded-lg px-2.5 py-1 font-semibold ${mode === k ? "bg-ttfc-purple/30 text-white" : "text-ttfc-muted hover:text-ttfc-text"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {mode === "html"
        ? <iframe title={title} sandbox="" srcDoc={preview.html || ""} className="block h-[70vh] min-h-[480px] w-full bg-[#06020f]" />
        : <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap bg-ttfc-ink px-4 py-3 font-mono text-xs leading-relaxed text-ttfc-muted">{preview.text}</pre>}
    </div>
  );
}

/** "Send to all": arms only once SEND is typed. Mounted per open. */
function SendAllDialog({ toSend, alreadySent, unconfirmed, onClose, onStarted }) {
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const armed = typed.trim() === "SEND" && toSend > 0;
  const send = async () => {
    if (!armed || sending) return;
    setSending(true);
    setErr("");
    try {
      const r = await api.post(`${BASE}/send-all`, { confirm: "SEND" });
      toast.success(`Sending to ${plural(r?.toSend ?? toSend, "person", "people")}…`);
      onStarted?.();
      onClose();
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal
      open
      onClose={() => { if (!sending) onClose(); }}
      size="md"
      tone="danger"
      title={`Email ${plural(toSend, "ticket holder")} now?`}
      description="This sends the “Show the world you're attending” email. It cannot be undone."
      footer={(
        <>
          <Button onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="danger" icon={Send} loading={sending} disabled={!armed} onClick={send}>Send {plural(toSend, "email")}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-ttfc-muted">
          <li>Sent one by one in the background (about {Math.max(1, Math.ceil((toSend * 0.6) / 60))} min). You can close this page.</li>
          {alreadySent > 0 && <li>{plural(alreadySent, "person", "people")} already got it and will be skipped.</li>}
          {unconfirmed > 0 && <li>{plural(unconfirmed, "send")} didn’t confirm last time and won’t be retried. Check Resend before sending those by hand.</li>}
        </ul>
        <Field label={<>Type <span className="font-mono">SEND</span> to confirm</>}>
          {(id) => (
            <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters"
              spellCheck={false} placeholder="SEND" className="font-mono" disabled={sending} data-autofocus />
          )}
        </Field>
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
      </div>
    </Modal>
  );
}

export function SendTest({ base = BASE, hint = "The sample (Jane Doe), subject starting “[Test]”. Not counted as sent." }) {
  const toast = useToast();
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    if (!to.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api.post(`${base}/send-test`, { to: to.trim() });
      toast.success(`Test email sent to ${r?.to || to.trim()}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={send} className="flex flex-col gap-3">
      <Field label="Send a test to" hint={hint}>
        {(id) => <Input id={id} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@thetechfestival.com" autoComplete="email" />}
      </Field>
      <Button type="submit" icon={Mail} loading={busy} disabled={!to.trim()} className="self-start">Send test</Button>
    </form>
  );
}

export default function AttendingCampaign() {
  const { isManagement } = useAdmin();
  const [kickedAt, setKickedAt] = useState(0); // when this page started a send
  const [lastJob, setLastJob] = useState(null);
  const polling = !!lastJob?.running || (kickedAt > 0 && !(lastJob?.finishedAt && new Date(lastJob.finishedAt).getTime() >= kickedAt));
  const recipients = useApi(`${BASE}/recipients`, { interval: polling ? 3000 : undefined });
  const preview = useApi(`${BASE}/preview-sample`);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [one, setOne] = useState(null); // the row "Send" was clicked on
  const toast = useToast();

  const data = recipients.data;
  const counts = data?.counts || { recipients: 0, sent: 0, failed: 0, sending: 0, pending: 0 };
  const job = data?.job;
  const running = !!job?.running;
  // Poll while a send runs, and from the moment this page starts one until it has finished.
  if (job !== lastJob) setLastJob(job);
  const toSend = counts.pending + counts.failed;

  const rows = useMemo(() => data?.recipients || [], [data]);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) => (filter === "all" || r.status === filter)
    && (!needle || [r.name, r.email, r.company, r.title].some((v) => String(v || "").toLowerCase().includes(needle)))), [rows, filter, needle]);
  const skipped = Object.entries(data?.skipped || {}).filter(([, n]) => n > 0);
  const done = job?.total ? job.sent + job.failed + job.skipped : 0;
  const pct = job?.total ? Math.round((done / job.total) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="I'm attending campaign"
        description="One email to every ticket holder: “Show the world you're attending”. Its button opens their personal page, where they make an “I'm attending TTFC 2026” image and post it to LinkedIn."
        actions={
          <>
            <Button icon={ExternalLink} onClick={() => window.open("/attending#fn=Jane&ln=Doe&title=Chief%20AI%20Officer&co=Example%20Corp", "_blank", "noopener")}>
              Open the page
            </Button>
            {isManagement && (
              <Button variant="primary" icon={Send} disabled={!data || running || !toSend} onClick={() => setConfirmOpen(true)}
                title={running ? "A send is running" : toSend ? "Email everyone who hasn't had it yet" : "Everyone has been emailed"}>
                Send to all{toSend ? ` (${num(toSend)})` : ""}
              </Button>
            )}
          </>
        }
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Sending is for management">
          You can see who gets the email and preview it. A manager sends the test and the campaign.
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
          {job.failed ? "Failed ones show below and are retried by the next “Send to all”." : "Everyone in that run was emailed."}
        </Banner>
      )}

      {recipients.loading ? <LoadingState label="Counting recipients…" /> : recipients.error && !data ? <ErrorState error={recipients.error} onRetry={recipients.reload} /> : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label="Recipients" value={num(counts.recipients)} icon={Users} tone="purple" hint="Unique emails with a ticket" />
          <StatTile label="Sent" value={num(counts.sent)} icon={MailCheck} tone="good" />
          <StatTile label="Not sent yet" value={num(counts.pending)} icon={Send} tone="orange" />
          <StatTile label="Failed / unconfirmed" value={`${num(counts.failed)} / ${num(counts.sending)}`} icon={MailWarning} tone="bad" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle hint="A made-up attendee. Each person gets their own name in the greeting and in their personal link.">Sample email</SectionTitle>
          {preview.loading ? <LoadingState label="Loading the preview…" /> : preview.error ? <ErrorState error={preview.error} onRetry={preview.reload} title="Couldn't load the preview" /> : (
            <>
              <EmailPreview preview={preview.data} />
              {preview.data?.link && (
                <p className="mt-3 break-all text-xs text-ttfc-dim">Button link: <a className="text-ttfc-pink underline" href={preview.data.link} target="_blank" rel="noopener noreferrer">{preview.data.link}</a></p>
              )}
            </>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          {isManagement && (
            <Card>
              <SectionTitle>Test it first</SectionTitle>
              <SendTest />
            </Card>
          )}
          <Card>
            <SectionTitle hint="Worked out live from the tickets every time you open this page.">Who gets it</SectionTitle>
            <p className="text-sm leading-relaxed text-ttfc-muted">
              Everyone with a ticket (accounts and guest checkouts) and every speaker's pass with an email, once per email address.
            </p>
            {skipped.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-ttfc-dim">
                <li className="font-semibold text-ttfc-muted">Left out:</li>
                {skipped.map(([k, n]) => <li key={k}>{num(n)} {SKIP_LABELS[k] || k}</li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mb-4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or company" className="pl-9" aria-label="Search recipients" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Show">
          {[["all", "All"], ["pending", "Not sent"], ["sent", "Sent"], ["failed", "Failed"], ["sending", "Unconfirmed"]].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-white/10 text-ttfc-text" : "text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text"}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ttfc-muted sm:ml-auto" aria-live="polite">{num(shown.length)} of {plural(rows.length, "recipient")}</p>
      </div>

      {data && (shown.length ? (
        <TableWrap>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Title · company</th><th>Pass</th><th>Status</th>{isManagement && <th><span className="sr-only">Send</span></th>}</tr>
          </thead>
          <tbody>
            {shown.slice(0, 500).map((r) => {
              const s = STATUS[r.status] || STATUS.pending;
              return (
                <tr key={r.email}>
                  <td className="font-semibold">{r.name || <span className="text-ttfc-dim">No name</span>}</td>
                  <td className="text-ttfc-muted">{r.email}</td>
                  <td className="text-ttfc-muted">{[r.title, r.company].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="text-xs text-ttfc-muted">{(r.tiers || []).join(", ") || "—"}</td>
                  <td>
                    <span title={r.error || (r.sentAt ? `Sent ${when(r.sentAt)}` : undefined)}><Badge tone={s.tone} icon={s.icon}>{s.label}</Badge></span>
                    {r.error && <span className="mt-1 block max-w-[240px] truncate text-[11px] text-red-200">{r.error}</span>}
                  </td>
                  {isManagement && (
                    <td className="text-right">
                      <Button size="sm" icon={Send} disabled={running} onClick={() => setOne(r)}
                        aria-label={`${r.status === "sent" ? "Send again to" : "Send to"} ${r.name || r.email}`}>
                        {r.status === "sent" ? "Send again" : "Send"}
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      ) : <EmptyState icon={Users} title={rows.length ? "No one matches" : "No recipients yet"} body={rows.length ? "Try another search or filter." : "Nobody with a ticket has an email yet."} />)}
      {shown.length > 500 && <p className="mt-2 text-xs text-ttfc-dim">Showing the first 500. Search to find someone.</p>}

      <ConfirmDialog
        open={!!one}
        onClose={() => setOne(null)}
        tone={one?.status === "sent" || one?.status === "sending" ? "danger" : "primary"}
        title={`Email ${one?.name || one?.email || ""} now?`}
        body={one?.status === "sent"
          ? `They already got it${one.sentAt ? ` ${when(one.sentAt)}` : ""}. This sends it again to ${one.email}.`
          : one?.status === "sending"
            ? `A send to ${one?.email} wasn't confirmed last time. Check Resend first, or they may get it twice.`
            : `Sends the “Show the world you're attending” email to ${one?.email}. “Send to all” will skip them afterwards.`}
        confirmLabel={one?.status === "sent" || one?.status === "sending" ? "Send again" : "Send"}
        onConfirm={async () => {
          await api.post(`${BASE}/send-one`, { email: one.email, again: one.status === "sent" || one.status === "sending" });
          toast.success(`Sent to ${one.email}`);
          recipients.reload();
        }}
      />

      {confirmOpen && (
        <SendAllDialog toSend={toSend} alreadySent={counts.sent} unconfirmed={counts.sending}
          onClose={() => setConfirmOpen(false)} onStarted={() => { setKickedAt(Date.now()); recipients.reload(); }} />
      )}
    </>
  );
}
