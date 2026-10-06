import { useState } from "react";
import { CheckCircle2, Clock, Copy, Mail, Send, UserCheck } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, ConfirmDialog, Modal } from "../ui";
import { day } from "../format";

/* =========================================================
   "Complete your profile" requests (management only).
   Staff email ticket holders a personal link to the website
   form /complete-profile. Backend: POST /console/tickets/profile-request
   ({ preview } → who + sample email; without → sends) and
   GET /console/tickets/profile-link?key= (copy the link).
   Nothing is sent without the explicit "Send to N people" click.
========================================================= */

const DAY = 864e5;
const RESEND_DAYS = 3;
const tierLabel = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "—");
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

const REASONS = {
  has_details: (n) => `${plural(n, "person", "people")} already gave a job title and organisation`,
  completed: (n) => `${plural(n, "person", "people")} already completed it themselves`,
  recently_asked: (n) => `${plural(n, "person", "people")} asked in the last ${RESEND_DAYS} days`,
  duplicate: (n) => `${plural(n, "duplicate ticket")}`,
  hidden: (n) => `${plural(n, "hidden ticket")}`,
  no_email: (n) => `${plural(n, "ticket")} without an email`,
  booth: (n) => `${plural(n, "booth booking")}`,
  not_found: (n) => `${plural(n, "ticket")} not found`,
};

const recentlyAsked = (row) =>
  !!row?.profileRequestedAt && Date.now() - new Date(row.profileRequestedAt).getTime() < RESEND_DAYS * DAY;

/** Short, readable reason for a skipped single send. */
const reasonText = (r) => ({
  recently_asked: `They were already asked in the last ${RESEND_DAYS} days.`,
  completed: "They already completed their profile.",
  no_email: "This ticket has no email address.",
  not_found: "This ticket wasn't found.",
  booth: "Booth bookings don't get profile links.",
}[r] || "This ticket was skipped.");

function PeopleList({ rows, max = 300 }) {
  if (!rows?.length) return null;
  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-ttfc-line">
      <ul className="divide-y divide-ttfc-line/70 text-sm">
        {rows.slice(0, max).map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{r.name || "No name"}</span>
              <span className="block truncate text-xs text-ttfc-muted">{r.email} · <span className="font-mono">{r.ticketId}</span></span>
            </span>
            <span className="shrink-0 text-right text-xs text-ttfc-dim">
              {tierLabel(r.tier)} · {day(r.purchaseDate)}
              {r.profileRequestedAt && <span className="block">asked {day(r.profileRequestedAt)}</span>}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > max && <p className="border-t border-ttfc-line px-3 py-2 text-xs text-ttfc-dim">…and {(rows.length - max).toLocaleString()} more</p>}
    </div>
  );
}

/** Email preview, isolated in a sandboxed frame (no scripts, no same-origin access). */
export function EmailPreview({ sample }) {
  const [mode, setMode] = useState("html");
  if (!sample) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-ttfc-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-xs">
        <div className="min-w-0">
          <p className="truncate"><span className="text-ttfc-dim">Subject</span> <b>{sample.subject}</b></p>
          <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Example for</span> {sample.name || sample.to} · {sample.to}</p>
        </div>
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
        ? <iframe title="Email preview" sandbox="" srcDoc={sample.html} className="block h-[520px] w-full bg-white" />
        : <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap bg-ttfc-ink px-4 py-3 font-mono text-xs leading-relaxed text-ttfc-muted">{sample.text}</pre>}
    </div>
  );
}

/**
 * The bulk "Ask for missing details" dialog.
 * `preview` is the server's { count, rows, skipped, sample, maxPerSend } (null = closed).
 */
export function ProfileRequestDialog({ preview, onClose, onSent }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const open = !!preview;
  const count = preview?.count || 0;
  const batch = Math.min(count, preview?.maxPerSend || count);
  const skipped = Object.entries(preview?.skipped || {}).filter(([, n]) => n > 0);
  const seconds = Math.ceil(batch * 0.7);

  const close = () => { if (sending) return; setResult(null); onClose(); };
  const send = async () => {
    setSending(true);
    try {
      // Exactly the people listed here; the server re-checks every rule before sending.
      const r = await api.post("/console/tickets/profile-request", { keys: preview.rows.map((x) => x.key) });
      setResult(r);
      if (r.sent) toast.success(`Profile link sent to ${plural(r.sent, "person", "people")}`);
      if (r.failed) toast.error(`${plural(r.failed, "email")} couldn't be sent`);
      onSent?.(r);
    } catch (err) { toast.error(err); } finally { setSending(false); }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={result ? "Done" : count ? `Ask ${plural(count, "person", "people")} for their missing details?` : "Nobody to ask right now"}
      description={result || !count ? undefined : "Each person gets a personal link to fill in their job, organisation, phone, LinkedIn, topics and goals. Their answers appear here on their ticket."}
      footer={result
        ? <Button variant="primary" onClick={close}>Close</Button>
        : <>
            <Button onClick={close} disabled={sending}>{count ? "Cancel" : "Close"}</Button>
            {count > 0 && <Button variant="primary" icon={Send} loading={sending} onClick={send} data-autofocus>Send to {plural(batch, "person", "people")}</Button>}
          </>}
    >
      {result ? (
        <div className="flex flex-col gap-3 text-sm">
          <Banner tone={result.failed ? "warn" : "good"} icon={CheckCircle2} title={`Sent ${plural(result.sent, "email")}`}>
            {[result.skipped ? `${result.skipped.toLocaleString()} skipped` : "", result.failed ? `${result.failed.toLocaleString()} failed` : ""].filter(Boolean).join(" · ") || "Everyone on the list was emailed."}
            {result.remaining > 0 && <> {plural(result.remaining, "person", "people")} still to go: open this again to send the next batch.</>}
          </Banner>
          {result.failures?.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-red-400/30">
              <ul className="divide-y divide-ttfc-line/70 text-xs">
                {result.failures.map((f) => <li key={f.key} className="px-3 py-2"><b>{f.name || f.email}</b> · {f.email} <span className="block text-red-200">{f.error}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          {skipped.length > 0 && (
            <p className="text-ttfc-muted">
              Not included: {skipped.map(([k, n]) => (REASONS[k] ? REASONS[k](n) : `${n} ${k}`)).join(" · ")}.
            </p>
          )}
          {count > batch && (
            <Banner tone="warn" icon={Clock}>This sends the first {batch.toLocaleString()} now. Open this again afterwards for the rest.</Banner>
          )}
          {count > 0 ? (
            <>
              <PeopleList rows={preview?.rows} />
              <div>
                <p className="mb-2 font-semibold">What they'll receive</p>
                <EmailPreview sample={preview?.sample} />
              </div>
              <p className="text-xs text-ttfc-dim">
                Emails go out one at a time{batch > 1 ? `, about ${seconds < 90 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`} in all` : ""}. Keep this window open until it finishes.
                Nobody is emailed twice within {RESEND_DAYS} days.
              </p>
              {sending && <p role="status" className="rounded-xl border border-ttfc-purple/30 bg-ttfc-purple/10 px-3 py-2 text-violet-100">Sending… please keep this window open.</p>}
            </>
          ) : (
            <p className="text-ttfc-muted">Everyone with a visible ticket either gave a job title and organisation, already completed their profile, or was asked in the last {RESEND_DAYS} days.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Drawer panel for one ticket: status, "Send profile link", "Copy link". */
export function ProfileLinkPanel({ row, canSend, onSent }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [copying, setCopying] = useState(false);
  if (!row) return null;
  const asked = row.profileRequestedAt;
  const done = row.profileCompletedAt;
  const count = row.details?.profileRequestCount || 0;
  const needsForce = !!done || recentlyAsked(row);

  const copy = async () => {
    setCopying(true);
    try {
      const { link } = await api.get(`/console/tickets/profile-link?key=${encodeURIComponent(row.key)}`);
      try { await navigator.clipboard.writeText(link); toast.success("Link copied. Paste it into your own email or message."); }
      catch { window.prompt("Copy this link:", link); }
    } catch (err) { toast.error(err); } finally { setCopying(false); }
  };

  const send = async () => {
    const r = await api.post("/console/tickets/profile-request", { keys: [row.key], ...(needsForce ? { force: true } : {}) });
    if (r.sent) {
      toast.success(`Profile link sent to ${row.email}`);
      onSent?.({ ...row, profileRequestedAt: new Date().toISOString(), details: { ...(row.details || {}), profileRequestedAt: new Date().toISOString(), profileRequestCount: count + 1 } });
      return;
    }
    if (r.failed) throw new Error(r.failures?.[0]?.error || "The email couldn't be sent");
    throw new Error(reasonText(Object.keys(r.skippedReasons || {})[0]));
  };

  return (
    <div className="mb-5 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Attendee profile</span>
        {done
          ? <Badge tone="good" icon={UserCheck}>Completed by attendee on {day(done)}</Badge>
          : asked
            ? <Badge tone="purple" icon={Mail}>Asked on {day(asked)}{count > 1 ? ` (${count} times)` : ""}</Badge>
            : <Badge tone="neutral">Not asked yet</Badge>}
        {done && asked && <span className="text-xs text-ttfc-dim">Asked on {day(asked)}</span>}
      </div>
      {canSend ? (
        <>
          <p className="mt-1.5 text-xs text-ttfc-muted">Email them a personal link to fill in their job, organisation, phone, LinkedIn, topics and goals, or copy it to send yourself.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={Send} onClick={() => setConfirm(true)} disabled={!row.email}>Send profile link</Button>
            <Button size="sm" variant="ghost" icon={Copy} loading={copying} onClick={copy}>Copy link</Button>
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-ttfc-dim">Management can email this person a link to complete their profile.</p>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        tone="primary"
        title={needsForce ? "Send the profile link again?" : "Send the profile link?"}
        body={[
          `We'll email ${row.email} a personal link to fill in their details.`,
          done ? `They already completed it on ${day(done)}.` : asked && recentlyAsked(row) ? `They were asked on ${day(asked)}.` : "",
        ].filter(Boolean).join(" ")}
        confirmLabel={needsForce ? "Send again anyway" : "Send link"}
        onConfirm={send}
      />
    </div>
  );
}
