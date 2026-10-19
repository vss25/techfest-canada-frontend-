import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, CheckCircle2, Info } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, ErrorState, LoadingState, Modal } from "../ui";
import { personPath } from "./peopleMeta";

/* =========================================================
   Admin → People → "Send RSVP reminder"
   The Marketing › RSVP reminders email, to the people in the
   current view who are Unconfirmed and have an email and a
   pass (GET /console/people/reminder shows exactly who, and
   who's left out and why). Sending is management only and
   goes in the background, 600 ms apart (POST, with the count
   shown here: if the list changed, nothing is sent).
========================================================= */

const SHOW = 8;

function Names({ list, total }) {
  const more = total - list.length;
  return (
    <p className="text-sm leading-relaxed text-ttfc-text">
      {list.map((p, i) => (
        <span key={p.id}>{i ? ", " : ""}<Link to={personPath(p.id)} className="hover:underline">{p.name}</Link></span>
      ))}
      {more > 0 && <span className="text-ttfc-muted">{list.length ? " and " : ""}{more.toLocaleString()} more</span>}
    </p>
  );
}

/**
 * @param {object} p
 * @param {boolean} p.open
 * @param {URLSearchParams} p.view   the directory's filters (no page / sort)
 * @param {boolean} p.canSend        management
 */
export default function ReminderDialog({ open, onClose, view, canSend, onSent }) {
  const toast = useToast();
  const qs = view.toString();
  const { data, error, loading, reload } = useApi(open ? `/console/people/reminder${qs ? `?${qs}` : ""}` : null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState("");
  const [job, setJob] = useState(null);

  // While a send runs, check on it every 2 seconds.
  useEffect(() => {
    if (!job?.running) return undefined;
    const t = setInterval(async () => {
      try {
        const r = await api.get("/console/people/reminder/job");
        setJob(r.job);
        if (!r.job.running) {
          toast.success(`RSVP reminder sent to ${r.job.sent.toLocaleString()} ${r.job.sent === 1 ? "person" : "people"}${r.job.failed ? `, ${r.job.failed} failed` : ""}`);
          onSent?.();
        }
      } catch { /* try again next tick */ }
    }, 2000);
    return () => clearInterval(t);
  }, [job?.running, toast, onSent]);

  const c = data?.counts;
  const toSend = c?.toSend || 0;
  const people = (data?.targets || []).flatMap((t) => t.people);
  const groups = Object.entries((data?.skipped || []).reduce((acc, s) => {
    (acc[s.reason] ||= []).push(s);
    return acc;
  }, {}));
  const running = !!job?.running || !!data?.job?.running;

  const send = async () => {
    setSending(true); setProblem("");
    try {
      const r = await api.post("/console/people/reminder", { query: Object.fromEntries(view), confirm: "SEND", expected: toSend });
      setJob(r.job);
    } catch (err) {
      if (err?.status === 409 && err?.code === "changed") {
        reload();
        setProblem("The list changed since you opened this. Check the new count, then send again.");
      } else setProblem(err?.message || "Couldn't send the reminders");
    } finally { setSending(false); }
  };

  const done = job && !job.running;
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Send RSVP reminder"
      description="The RSVP reminder email from Marketing › RSVP reminders, to the people in this view who are Unconfirmed and have an email and a pass. Each email has a personal RSVP button per ticket."
      footer={done ? <Button variant="primary" onClick={onClose}>Done</Button> : (
        <>
          <Button onClick={onClose} disabled={sending}>Cancel</Button>
          {canSend && (
            <Button variant="primary" icon={BellRing} loading={sending} disabled={!toSend || running || loading || !!job} onClick={send}>
              {toSend ? `Send ${toSend.toLocaleString()} ${toSend === 1 ? "reminder" : "reminders"}` : "Nobody to remind"}
            </Button>
          )}
        </>
      )}>
      {loading ? <LoadingState label="Checking who to remind…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : data && (
        <div className="space-y-4 pb-2">
          {job ? (
            <Banner tone={job.running ? "info" : job.failed ? "warn" : "good"} icon={job.running ? Info : CheckCircle2} title={job.running ? "Sending…" : "Finished"}>
              {job.sent.toLocaleString()} of {job.total.toLocaleString()} sent{job.skipped ? `, ${job.skipped} skipped (reminded just now)` : ""}{job.failed ? `, ${job.failed} failed (they can be tried again)` : ""}.
            </Banner>
          ) : (
            <div className="rounded-2xl border border-ttfc-line bg-ttfc-panel2 p-4">
              <p className="text-2xl font-bold">{toSend.toLocaleString()} {toSend === 1 ? "email" : "emails"}</p>
              <p className="text-sm text-ttfc-muted">
                to {c.people.toLocaleString()} {c.people === 1 ? "person" : "people"} of the {c.matching.toLocaleString()} in this view
                {c.emails > c.toSend ? ` (the first ${c.max}; send again for the rest)` : ""}. People who share an address get one email with a button each.
              </p>
              {people.length > 0 && <div className="mt-3"><Names list={people.slice(0, SHOW)} total={c.people} /></div>}
            </div>
          )}
          {data.job?.running && !job && <Banner tone="warn">A reminder send is already running. Try again when it finishes.</Banner>}
          {problem && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{problem}</p>}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Not sent</p>
            <ul className="space-y-2 text-sm">
              <li className="flex flex-wrap items-baseline gap-2"><Badge>{c.confirmed.toLocaleString()}</Badge><span className="text-ttfc-muted">Already confirmed</span></li>
              {groups.map(([reason, list]) => (
                <li key={reason} className="space-y-1">
                  <span className="flex flex-wrap items-baseline gap-2"><Badge tone="warn">{list.length.toLocaleString()}</Badge><span className="text-ttfc-muted">{data.skipLabels?.[reason] || reason}</span></span>
                  <div className="pl-1"><Names list={list.slice(0, SHOW)} total={list.length} /></div>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-ttfc-dim">
            Anyone reminded in the last {data.cooldownHours} hours is skipped, here and on the RSVP reminders page. They're marked RSVP Email Sent once it goes.{" "}
            <Link to="/admin/marketing/rsvp-reminders" className="font-semibold text-ttfc-pink hover:underline">See the email</Link>
          </p>
          {!canSend && <Banner tone="info" icon={Info}>Only management can send reminders.</Banner>}
        </div>
      )}
    </Modal>
  );
}
