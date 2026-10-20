import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Info, Linkedin } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, ErrorState, LoadingState, Modal } from "../ui";
import { personPath } from "./peopleMeta";

/* =========================================================
   Admin → People → "Send LinkedIn nudge" (management)
   The "I'm attending" email (Marketing › I'm attending campaign,
   unchanged: their personal page to make the image and post it
   on LinkedIn), to the people in the current view. The same
   confirm, count and skip list as the RSVP reminder: GET
   /console/people/nudge shows exactly who, and who's left out
   and why (no pass, no email, suspended, unsubscribed, already
   posted on LinkedIn, a send not confirmed, emailed in the last
   3 days). Sent in the
   background, 600 ms apart; if the list changed since it was
   shown, nothing is sent. One person: their profile.
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
 */
export default function NudgeDialog({ open, onClose, view, onSent }) {
  const toast = useToast();
  const qs = view.toString();
  const { data, error, loading, reload } = useApi(open ? `/console/people/nudge${qs ? `?${qs}` : ""}` : null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState("");
  const [job, setJob] = useState(null);

  // While a send runs, check on it every 2 seconds.
  useEffect(() => {
    if (!job?.running) return undefined;
    const t = setInterval(async () => {
      try {
        const r = await api.get("/console/people/nudge/job");
        setJob(r.job);
        if (!r.job.running) {
          toast.success(`LinkedIn nudge sent to ${r.job.sent.toLocaleString()} ${r.job.sent === 1 ? "person" : "people"}${r.job.failed ? `, ${r.job.failed} failed` : ""}`);
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
      const r = await api.post("/console/people/nudge", { query: Object.fromEntries(view), confirm: "SEND", expected: toSend });
      setJob(r.job);
    } catch (err) {
      if (err?.status === 409 && err?.code === "changed") {
        reload();
        setProblem("The list changed since you opened this. Check the new count, then send again.");
      } else setProblem(err?.message || "Couldn't send the nudges");
    } finally { setSending(false); }
  };

  const done = job && !job.running;
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Send LinkedIn nudge"
      description="The “Show the world you're attending” email, to the people in this view who can get it now. Its button opens their personal page, where they make an “I'm attending” image and post it on LinkedIn."
      footer={done ? <Button variant="primary" onClick={onClose}>Done</Button> : (
        <>
          <Button onClick={onClose} disabled={sending}>Cancel</Button>
          <Button variant="primary" icon={Linkedin} loading={sending} disabled={!toSend || running || loading || !!job} onClick={send}>
            {toSend ? `Send ${toSend.toLocaleString()} ${toSend === 1 ? "nudge" : "nudges"}` : "Nobody to nudge"}
          </Button>
        </>
      )}>
      {loading ? <LoadingState label="Checking who to nudge…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : data && (
        <div className="space-y-4 pb-2">
          {job ? (
            <Banner tone={job.running ? "info" : job.failed ? "warn" : "good"} icon={job.running ? Info : CheckCircle2} title={job.running ? "Sending…" : "Finished"}>
              {job.sent.toLocaleString()} of {job.total.toLocaleString()} sent{job.skipped ? `, ${job.skipped} skipped (emailed just now)` : ""}{job.failed ? `, ${job.failed} failed (they can be tried again)` : ""}.
            </Banner>
          ) : (
            <div className="rounded-2xl border border-ttfc-line bg-ttfc-panel2 p-4">
              <p className="text-2xl font-bold">{toSend.toLocaleString()} {toSend === 1 ? "email" : "emails"}</p>
              <p className="text-sm text-ttfc-muted">
                to {c.people.toLocaleString()} {c.people === 1 ? "person" : "people"} of the {c.matching.toLocaleString()} in this view
                {c.emails > c.toSend ? ` (the first ${c.max}; send again for the rest)` : ""}. People who share an address get one email.
              </p>
              {people.length > 0 && <div className="mt-3"><Names list={people.slice(0, SHOW)} total={c.people} /></div>}
            </div>
          )}
          {data.job?.running && !job && <Banner tone="warn">An “I'm attending” send is already running. Try again when it finishes.</Banner>}
          {problem && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{problem}</p>}
          {groups.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Not sent</p>
              <ul className="space-y-2 text-sm">
                {groups.map(([reason, list]) => (
                  <li key={reason} className="space-y-1">
                    <span className="flex flex-wrap items-baseline gap-2"><Badge tone="warn">{list.length.toLocaleString()}</Badge><span className="text-ttfc-muted">{data.skipLabels?.[reason] || reason}</span></span>
                    <div className="pl-1"><Names list={list.slice(0, SHOW)} total={list.length} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-ttfc-dim">
            Anyone emailed in the last {data.cooldownDays} days is skipped, here, on their profile and by the campaign's send to everyone.
            {data.tracking?.posts
              ? " Anyone who posted with “Post to LinkedIn” is left out too. A phone share or a post made by hand can't be confirmed, so those people still get it."
              : " Opens, clicks and LinkedIn posts aren't tracked, so people who already posted can't be left out automatically."}{" "}
            <Link to="/admin/marketing/attending" className="font-semibold text-ttfc-pink hover:underline">See the email</Link>
          </p>
        </div>
      )}
    </Modal>
  );
}
