import { useMemo, useState } from "react";
import {
  AlertTriangle, BellRing, CalendarCheck, CheckCircle2, Clock, Info, MailCheck, MailWarning, Search, Send, Users,
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
import { EmailPreview, SendTest } from "./AttendingCampaign";

/* =========================================================
   Admin → Marketing → RSVP reminders
   Ticket holders who haven't RSVP'd yet, and an email reminding
   them, with a pre-filled RSVP button for each open ticket
   (thetechfestival.com/rsvp#t=…&fn=…&ln=…).
   Backend (all under /console/rsvp-reminders):
     GET  /                     → { counts, rows, cooldownHours, job }
     GET  /preview-sample       → { subject, html, text }
     POST /send-test { to }     → { sent, to }           (management)
     POST /send-one { email }   → { sent, sentAt }       (management)
     POST /send-all { confirm: "SEND" } → 202 { started, toSend }
                                  (management; skips anyone reminded
                                  in the last cooldownHours)
   The list is worked out live: people drop off as soon as they RSVP.
========================================================= */

const BASE = "/console/rsvp-reminders";
const plural = (n, one, many = `${one}s`) => `${num(n || 0)} ${n === 1 ? one : many}`;
const STATUS = {
  never: { tone: "neutral", icon: null, label: "Not reminded" },
  reminded: { tone: "good", icon: MailCheck, label: "Reminded" },
  failed: { tone: "bad", icon: MailWarning, label: "Failed" },
  sending: { tone: "warn", icon: Clock, label: "Unconfirmed" },
};
const FILTERS = [["all", "All"], ["due", "Due"], ["never", "Not reminded"], ["reminded", "Reminded"], ["failed", "Failed"]];

function SendAllDialog({ toSend, notDue, cooldownHours, onClose, onStarted }) {
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
      toast.success(`Reminding ${plural(r?.toSend ?? toSend, "person", "people")}…`);
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
      title={`Remind ${plural(toSend, "person", "people")} to RSVP?`}
      description="This emails everyone below who hasn't RSVP'd and is due a reminder. It cannot be undone."
      footer={(
        <>
          <Button onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="danger" icon={Send} loading={sending} disabled={!armed} onClick={send}>Send {plural(toSend, "reminder")}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4 text-sm">
        <ul className="list-disc space-y-1 pl-5 text-ttfc-muted">
          <li>Sent one by one in the background (about {Math.max(1, Math.ceil((toSend * 0.6) / 60))} min). You can close this page.</li>
          {notDue > 0 && <li>{plural(notDue, "person", "people")} reminded in the last {cooldownHours} hours will be skipped.</li>}
          <li>Anyone who RSVPs before their turn is skipped automatically.</li>
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

export default function RsvpReminders() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [kickedAt, setKickedAt] = useState(0);
  const [lastJob, setLastJob] = useState(null);
  const polling = !!lastJob?.running || (kickedAt > 0 && !(lastJob?.finishedAt && new Date(lastJob.finishedAt).getTime() >= kickedAt));
  const list = useApi(BASE, { interval: polling ? 3000 : undefined });
  const preview = useApi(`${BASE}/preview-sample`);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [one, setOne] = useState(null);

  const data = list.data;
  const counts = data?.counts || { holders: 0, rsvpd: 0, notRsvpd: 0, due: 0, reminded: 0 };
  const cooldownHours = data?.cooldownHours || 20;
  const job = data?.job;
  const running = !!job?.running;
  if (job !== lastJob) setLastJob(job);

  const rows = useMemo(() => data?.rows || [], [data]);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => rows.filter((r) => (filter === "all" || (filter === "due" ? r.due : r.status === filter))
    && (!needle || [r.name, r.email, ...(r.holders || [])].some((v) => String(v || "").toLowerCase().includes(needle)))), [rows, filter, needle]);
  const done = job?.total ? job.sent + job.failed + job.skipped : 0;
  const pct = job?.total ? Math.round((done / job.total) * 100) : 0;
  const recently = (r) => r.status === "reminded" && !r.due;

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="RSVP reminders"
        description="Ticket holders who haven't RSVP'd yet. The reminder has a pre-filled RSVP button for each of their tickets, so it takes them about a minute."
        actions={isManagement && (
          <Button variant="primary" icon={BellRing} disabled={!data || running || !counts.due} onClick={() => setConfirmOpen(true)}
            title={running ? "A send is running" : counts.due ? "Remind everyone who is due" : "Nobody is due a reminder"}>
            Remind all due{counts.due ? ` (${num(counts.due)})` : ""}
          </Button>
        )}
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Sending is for management">
          You can see who hasn't RSVP'd and preview the email. A manager sends the reminders.
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
          {job.failed ? "Failed ones show below and are retried by the next “Remind all due”." : "Everyone in that run was reminded."}
        </Banner>
      )}

      {list.loading ? <LoadingState label="Checking who has RSVP'd…" /> : list.error && !data ? <ErrorState error={list.error} onRetry={list.reload} /> : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label="Ticket holders" value={num(counts.holders)} icon={Users} tone="purple" hint="Unique emails with a ticket" />
          <StatTile label="RSVP'd" value={num(counts.rsvpd)} icon={CalendarCheck} tone="good" />
          <StatTile label="Not RSVP'd yet" value={num(counts.notRsvpd)} icon={Clock} tone="orange" />
          <StatTile label="Due a reminder" value={num(counts.due)} icon={BellRing} tone="bad" hint={`Not reminded in the last ${cooldownHours} h`} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle hint="A made-up attendee. People with several tickets get one button per ticket.">Sample email</SectionTitle>
          {preview.loading ? <LoadingState label="Loading the preview…" /> : preview.error ? <ErrorState error={preview.error} onRetry={preview.reload} title="Couldn't load the preview" /> : (
            <EmailPreview preview={preview.data} title="RSVP reminder email preview" />
          )}
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          {isManagement && (
            <Card>
              <SectionTitle>Test it first</SectionTitle>
              <SendTest base={BASE} hint="The sample (Jane Doe), subject starting “[Test]”. Not counted as a reminder." />
            </Card>
          )}
          <Card>
            <SectionTitle hint="Worked out live every time you open this page.">Who gets it</SectionTitle>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ttfc-muted">
              <li>Everyone with a ticket (accounts, guest checkouts and speakers' passes with an email), once per email address.</li>
              <li>Minus anyone whose tickets all have an RSVP (matched by ticket ID, or by full name for RSVPs sent before ticket IDs were required).</li>
              <li>“Remind all due” skips anyone reminded in the last {cooldownHours} hours. “Send” on a row sends right away.</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="mb-4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="pl-9" aria-label="Search people" />
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
          <thead>
            <tr><th>Name</th><th>Email</th><th>Pass</th><th>Tickets to RSVP</th><th>Reminders</th>{isManagement && <th><span className="sr-only">Send</span></th>}</tr>
          </thead>
          <tbody>
            {shown.slice(0, 500).map((r) => {
              const s = STATUS[r.status] || STATUS.never;
              return (
                <tr key={r.email}>
                  <td className="font-semibold">{r.name || <span className="text-ttfc-dim">No name</span>}</td>
                  <td className="text-ttfc-muted">{r.email}</td>
                  <td className="text-xs text-ttfc-muted">{(r.tiers || []).join(", ") || "—"}</td>
                  <td className="text-xs text-ttfc-muted">
                    {r.tickets > 1 ? <span title={(r.holders || []).join(", ")}>{num(r.tickets)}: {(r.holders || []).join(", ")}</span> : "1"}
                  </td>
                  <td>
                    <span title={r.error || undefined}><Badge tone={s.tone} icon={s.icon}>{s.label}{r.reminders > 1 ? ` ×${r.reminders}` : ""}</Badge></span>
                    {r.sentAt && <span className="mt-1 block text-[11px] text-ttfc-dim">Last {when(r.sentAt)}</span>}
                    {r.error && <span className="mt-1 block max-w-[240px] truncate text-[11px] text-red-200">{r.error}</span>}
                  </td>
                  {isManagement && (
                    <td className="text-right">
                      <Button size="sm" icon={Send} disabled={running} onClick={() => setOne(r)} aria-label={`Send a reminder to ${r.name || r.email}`}>
                        {r.reminders ? "Remind again" : "Send"}
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      ) : <EmptyState icon={CalendarCheck} title={rows.length ? "No one matches" : "Everyone has RSVP'd"} body={rows.length ? "Try another search or filter." : "Every ticket holder with an email has an RSVP."} />)}
      {shown.length > 500 && <p className="mt-2 text-xs text-ttfc-dim">Showing the first 500. Search to find someone.</p>}

      <ConfirmDialog
        open={!!one}
        onClose={() => setOne(null)}
        tone={one && (recently(one) || one.status === "sending") ? "danger" : "primary"}
        title={`Remind ${one?.name || one?.email || ""} to RSVP?`}
        body={one && recently(one)
          ? `They were reminded ${when(one.sentAt)}. This emails ${one.email} again now.`
          : one?.status === "sending"
            ? `A reminder to ${one.email} wasn't confirmed last time. Check Resend first, or they may get it twice.`
            : `Emails the RSVP reminder to ${one?.email} now${one?.tickets > 1 ? `, with a button for each of their ${one.tickets} tickets` : ""}.`}
        confirmLabel="Send reminder"
        onConfirm={async () => {
          await api.post(`${BASE}/send-one`, { email: one.email });
          toast.success(`Reminder sent to ${one.email}`);
          list.reload();
        }}
      />

      {confirmOpen && (
        <SendAllDialog toSend={counts.due} notDue={counts.notRsvpd - counts.due} cooldownHours={cooldownHours}
          onClose={() => setConfirmOpen(false)} onStarted={() => { setKickedAt(Date.now()); list.reload(); }} />
      )}
    </>
  );
}
