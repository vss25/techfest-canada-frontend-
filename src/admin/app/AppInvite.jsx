import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock, CreditCard, ExternalLink, Eye, Gift, Info, Layers, ListChecks, Mail, MailCheck, MailOpen, MailWarning,
  Monitor, Moon, MousePointerClick, RotateCcw, Save, Search, Send, Smartphone, Sun, Users, X,
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
   Groups and a selection (Oct 20 2026, the organiser: "allow me to
   send in groups of 10, 20, 50, 100, and select who i want to send to
   and to see whether they purchased ticket or alloted ticket"):
     - Ticket column: Bought (with the coupon code), Given by staff,
       Complimentary, Exhibitor, Speaker Pass or No ticket, "+1" for
       more passes; Bought / Given / No ticket filters.
     - Tick people (anyone it can go to now, or again after the 3-day
       wait), Select all shown, Clear, Send to selected (N).
     - Send in groups: 10 / 20 / 50 / 100, "Send next N" = the next
       people who'll get it in the list's order and filter (highlighted).
     - Management only; a confirm listing the names (type SEND from 50);
       the server only sends to people on its own list (the rest are
       reported). Same background job as Send to everyone.
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
// Bought or given (the server's ticket.groups: a person matches if any of their passes does).
const TICKET_FILTERS = [["any", "Any ticket"], ["bought", "Bought"], ["given", "Given"], ["none", "No ticket"]];
const GROUP_SIZES = [10, 20, 50, 100];
const NAMES_SHOWN = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const chip = (on) => `rounded-lg px-3 py-1.5 text-xs font-semibold ${on ? "bg-white/10 text-ttfc-text" : "text-ttfc-muted hover:bg-white/5 hover:text-ttfc-text"}`;
/** What a multi-person send was, for the progress card and the banner. */
const jobWhat = (job) => ({ all: "to everyone", retry: "of the failed ones", next: `to the next ${job?.size || ""}`.trim(), selected: "to the people picked" }[job?.kind] || "");

/** How they got their ticket: Bought (· code) / Given by staff / … / No ticket, "+1" when they hold more passes. */
function TicketCell({ ticket: t }) {
  if (!t) return <span className="text-ttfc-dim">—</span>;
  const tip = [t.detail, ...(t.more ? ["", ...t.all] : [])].filter((x) => x !== undefined).join("\n");
  if (t.group === "none") return <span className="text-xs text-ttfc-dim" title={tip}>No ticket</span>;
  const tone = t.group === "bought" ? "purple" : t.group === "given" ? "orange" : "neutral";
  return (
    <span className="inline-flex items-center gap-1.5" title={tip}>
      <Badge tone={tone} icon={t.group === "bought" ? CreditCard : t.group === "given" ? Gift : null}>{t.label}</Badge>
      {t.more > 0 && <span className="text-[11px] font-semibold text-ttfc-muted" aria-label={`and ${t.more} more`}>+{t.more}</span>}
    </span>
  );
}

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

/**
 * A group ("Send next N") or the people ticked: the names (up to NAMES_SHOWN) and the count, then Send. Type SEND
 * from `typeFrom` people. The server sends only to people on its own list who can get it now; the rest come back.
 */
function BatchDialog({ kind, people, size, skipUsing, typeFrom = 50, context, cooldownDays = 3, onClose, onStarted }) {
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const n = people.length;
  const needsTyped = n >= typeFrom;
  const armed = n > 0 && (!needsTyped || typed.trim() === "SEND");
  const again = people.filter((r) => r.sendAgain).length;
  const send = async () => {
    if (!armed || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await api.post(`${BASE}/send-batch`, {
        kind, size: kind === "next" ? size : undefined, emails: people.map((x) => x.email), skipUsing, confirm: needsTyped ? "SEND" : "CONFIRM",
      });
      toast.success(`Sending to ${plural(r?.toSend ?? n, "person", "people")}…`);
      if (r?.dropped?.length) toast.info(`Not sent to ${plural(r.dropped.length, "person", "people")}: ${r.droppedText}.`, { duration: 9000 });
      onStarted?.(r);
      onClose();
    } catch (e) { setErr(e?.message || "Something went wrong"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} size="lg" tone={needsTyped ? "danger" : "primary"}
      title={kind === "next" ? `Email the next ${plural(n, "person", "people")}?` : `Email the ${plural(n, "person", "people")} you picked?`}
      description="This sends the app invite email from enquire@thetechfestival.com. It can't be undone."
      footer={(
        <>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={needsTyped ? "danger" : "primary"} icon={Send} loading={busy} disabled={!armed} onClick={send} data-autofocus={!needsTyped || undefined}>
            Send {plural(n, "email")}
          </Button>
        </>
      )}>
      <div className="flex flex-col gap-4 text-sm">
        {context && <p className="text-ttfc-muted">{context}</p>}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-ttfc-line" aria-label={`The ${plural(n, "person", "people")} it goes to`}>
          <ol className="divide-y divide-ttfc-line/70">
            {people.slice(0, NAMES_SHOWN).map((r, i) => (
              <li key={r.email} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
                <span className="text-right font-mono text-[11px] text-ttfc-dim">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.name || "No name"}</span>
                  <span className="block truncate text-xs text-ttfc-muted">{r.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {r.sendAgain && <Badge tone="warn">Again</Badge>}
                  <TicketCell ticket={r.ticket} />
                </span>
              </li>
            ))}
          </ol>
          {n > NAMES_SHOWN && <p className="border-t border-ttfc-line px-3 py-2 text-xs text-ttfc-dim">and {plural(n - NAMES_SHOWN, "more person", "more people")}</p>}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-ttfc-muted">
          <li>{plural(n, "email")}, sent one by one in the background (about {Math.max(1, Math.ceil((n * 0.6) / 60))} min). You can close this page.</li>
          {again > 0 && <li>{plural(again, "person", "people")} already got it more than {cooldownDays} days ago and {again === 1 ? "gets" : "get"} it again.</li>}
          <li>Anyone who got it in the meantime, or can&apos;t get it now, is skipped and listed afterwards.</li>
        </ul>
        {needsTyped && (
          <Field label={<>Type <span className="font-mono">SEND</span> to confirm</>}>
            {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="SEND" className="font-mono" disabled={busy} data-autofocus />}
          </Field>
        )}
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
      </div>
    </Modal>
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
  const [ticketFilter, setTicketFilter] = useState("any");
  const [confirm, setConfirm] = useState(null); // "all" | "retry"
  const [one, setOne] = useState(null);
  const [selected, setSelected] = useState(() => new Set()); // emails ticked
  const [groupSize, setGroupSize] = useState(20);
  const [batch, setBatch] = useState(null); // { kind: "next" | "selected", people }

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
  const what = jobWhat(job);
  const pct = job?.total ? Math.round((done / job.total) * 100) : 0;

  const rows = useMemo(() => data?.rows || [], [data]);
  const needle = q.trim().toLowerCase();
  // The status filter and the search; then the ticket filter (its chips count what each would show).
  const matching = useMemo(() => rows.filter((r) => {
    const f = filter === "will" ? r.willGet : filter === "using" ? r.usingApp : filter === "sent" ? r.status === "sent"
      : filter === "failed" ? r.status === "failed" : filter === "out" ? !r.willGet : true;
    return f && (!needle || [r.name, r.email, ...(r.roles || []), r.ticket?.label, ...(r.ticket?.all || [])].some((v) => String(v || "").toLowerCase().includes(needle)));
  }), [rows, filter, needle]);
  const ticketCounts = useMemo(() => {
    const c = { any: matching.length, bought: 0, given: 0, none: 0 };
    for (const r of matching) for (const g of r.ticket?.groups || []) if (g in c && g !== "any") c[g]++;
    return c;
  }, [matching]);
  const shown = useMemo(() => (ticketFilter === "any" ? matching : matching.filter((r) => (r.ticket?.groups || []).includes(ticketFilter))), [matching, ticketFilter]);

  // Ticking (management): anyone it can go to now, or again after the wait. A tick that can't any more drops off.
  const canPick = isManagement && !running;
  const pickable = useMemo(() => new Set(rows.filter((r) => r.canSelect && r.email).map((r) => r.email)), [rows]);
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((e) => pickable.has(e)));
      return next.size === prev.size ? prev : next;
    });
  }, [pickable]);
  const picked = useMemo(() => rows.filter((r) => r.canSelect && r.email && selected.has(r.email)), [rows, selected]); // in the list's order
  const shownPickable = useMemo(() => shown.filter((r) => r.canSelect && r.email), [shown]);
  const allShownPicked = shownPickable.length > 0 && shownPickable.every((r) => selected.has(r.email));
  const someShownPicked = shownPickable.some((r) => selected.has(r.email));
  const hiddenPicked = picked.filter((r) => !shown.includes(r)).length;
  const toggle = (email) => setSelected((prev) => { const n = new Set(prev); if (n.has(email)) n.delete(email); else n.add(email); return n; });
  const selectAllShown = () => setSelected((prev) => new Set([...prev, ...shownPickable.map((r) => r.email)]));
  const unselectShown = () => setSelected((prev) => { const n = new Set(prev); for (const r of shownPickable) n.delete(r.email); return n; });

  // The next group: the next people who'll get it, in the list's order and filter.
  const nextGroup = useMemo(() => shown.filter((r) => r.willGet && r.email).slice(0, groupSize), [shown, groupSize]);
  const inNext = useMemo(() => new Set(nextGroup.map((r) => r.email)), [nextGroup]);
  const viewText = [
    FILTERS.find(([k]) => k === filter)?.[1], ticketFilter !== "any" ? TICKET_FILTERS.find(([k]) => k === ticketFilter)?.[1] : "", q.trim() ? `“${q.trim()}”` : "",
  ].filter(Boolean).join(" · ");

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
            <p className="font-semibold">Sending{what ? ` ${what}` : ""}… {num(done)} of {num(job.total)}</p>
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
          title={`Last send${what ? ` (${what})` : ""} finished ${when(job.finishedAt)}: sent ${num(job.sent)}, failed ${num(job.failed)}`}>
          {job.failed ? "Failed ones show in the list. Retry failed sends them again." : "Everyone in that run was emailed."}
          {job.dropped > 0 && ` ${plural(job.dropped, "person", "people")} picked couldn't get it then and weren't sent to.`}
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

      <div className="mb-3 mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, role or coupon code" className="pl-9" aria-label="Search people" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Show">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={chip(filter === k)}>{label}</button>
          ))}
        </div>
        <p className="text-sm text-ttfc-muted lg:ml-auto" aria-live="polite">{num(shown.length)} of {plural(rows.length, "person", "people")}</p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1" role="group" aria-label="Ticket">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-ttfc-dim">Ticket</span>
        {TICKET_FILTERS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTicketFilter(k)} aria-pressed={ticketFilter === k} className={chip(ticketFilter === k)}
            title={k === "bought" ? "Bought on the website (with or without a coupon code)" : k === "given" ? "Any staff-made pass: given by staff, complimentary, exhibitor, Speaker Pass" : k === "none" ? "A role but no pass (e.g. a speaker without a pass yet)" : undefined}>
            {label} <span className="font-normal text-ttfc-dim">{num(ticketCounts[k] || 0)}</span>
          </button>
        ))}
      </div>

      {isManagement && data && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 rounded-[18px] border border-ttfc-line bg-ttfc-panel px-4 py-3">
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            <ListChecks className="h-4 w-4 text-ttfc-pink" aria-hidden="true" />
            <Button size="sm" variant="ghost" disabled={!canPick || !shownPickable.length || allShownPicked} onClick={selectAllShown}
              title="Ticks everyone in this view it can go to now (this filter and search)">
              Select all shown ({num(shownPickable.length)})
            </Button>
            <span className="text-sm"><b>{num(picked.length)}</b> selected{hiddenPicked > 0 && <span className="text-ttfc-dim"> ({num(hiddenPicked)} not in this view)</span>}</span>
            {picked.length > 0 && <Button size="sm" variant="ghost" icon={X} onClick={() => setSelected(new Set())}>Clear</Button>}
            <Button size="sm" variant="primary" icon={Send} disabled={!canPick || !picked.length} onClick={() => setBatch({ kind: "selected", people: picked })}
              title={running ? "A send is running" : picked.length ? "Email the people you ticked" : "Tick people in the list first"}>
              Send to selected ({num(picked.length)})
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="h-4 w-4 text-ttfc-orange" aria-hidden="true" />
            <span className="text-sm font-semibold">Send in groups</span>
            <div className="flex gap-1 rounded-lg border border-ttfc-line p-0.5" role="group" aria-label="Group size">
              {(data.groupSizes || GROUP_SIZES).map((n) => (
                <button key={n} type="button" aria-pressed={groupSize === n} onClick={() => setGroupSize(n)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${groupSize === n ? "bg-ttfc-orange/20 text-orange-100" : "text-ttfc-muted hover:text-ttfc-text"}`}>
                  {n}
                </button>
              ))}
            </div>
            <Button size="sm" icon={Send} disabled={!canPick || !nextGroup.length}
              onClick={() => setBatch({ kind: "next", people: nextGroup, size: groupSize, context: `The next ${plural(nextGroup.length, "person", "people")} who'll get it, in the list's order${viewText ? ` (showing: ${viewText})` : ""}.` })}
              title={running ? "A send is running" : nextGroup.length ? "The next people who'll get it, in this list's order and filter (marked Next below)" : "Nobody in this view is left to get it"}>
              Send next {num(Math.min(groupSize, nextGroup.length) || groupSize)}
            </Button>
            {nextGroup.length < groupSize && <span className="text-xs text-ttfc-dim">{nextGroup.length ? `Only ${num(nextGroup.length)} left in this view` : "Nobody left in this view"}</span>}
          </div>
        </div>
      )}

      {data && (shown.length ? (
        <TableWrap>
          <thead>
            <tr>
              {isManagement && (
                <th className="w-10">
                  <input type="checkbox" checked={allShownPicked} ref={(el) => { if (el) el.indeterminate = !allShownPicked && someShownPicked; }}
                    onChange={() => (allShownPicked ? unselectShown() : selectAllShown())} disabled={!canPick || !shownPickable.length}
                    aria-label="Select everyone shown it can go to" className="h-4 w-4 accent-ttfc-pink" />
                </th>
              )}
              <th>Person</th><th>Ticket</th><th>At TTFC as</th><th>App</th><th>Email status</th><th><span className="sr-only">Send</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 500).map((r) => {
              const s = STATUS[r.status] || STATUS.pending;
              const can = !!r.email && !HARD_SKIPS.has(r.reason) && !running;
              const waiting = r.reason === "alreadySent" && !r.sendAgain; // sent within the cool-down
              const isNext = isManagement && inNext.has(r.email);
              const isPicked = !!r.email && selected.has(r.email) && r.canSelect;
              return (
                <tr key={`${r.id}-${r.email}`} className={`${isPicked ? "app-invite-picked" : ""} ${isNext ? "app-invite-next" : ""}`.trim() || undefined}>
                  {isManagement && (
                    <td className="w-10">
                      {r.canSelect && r.email ? (
                        <input type="checkbox" checked={isPicked} onChange={() => toggle(r.email)} disabled={!canPick}
                          aria-label={`Select ${r.name || r.email}`} className="h-4 w-4 accent-ttfc-pink"
                          title={r.sendAgain ? `Already got it more than ${data.cooldownDays || 3} days ago: picks them to get it again` : undefined} />
                      ) : <span className="sr-only">Can't be picked</span>}
                    </td>
                  )}
                  <td className="min-w-[220px]">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Link to={`/admin/people/${encodeURIComponent(r.id)}`} className="font-semibold hover:text-ttfc-pink hover:underline">{r.name || "No name"}</Link>
                      {isNext && <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300" title={`In the next ${groupSize}`}>Next</span>}
                    </span>
                    <span className="block text-xs text-ttfc-muted">{r.email || <span className="text-ttfc-dim">No email</span>}</span>
                  </td>
                  <td><TicketCell ticket={r.ticket} /></td>
                  <td className="text-xs text-ttfc-muted">{(r.roles || []).join(", ")}</td>
                  <td className="whitespace-nowrap text-xs">{r.usingApp ? <Badge tone="good" icon={Smartphone}>Using it</Badge> : <span className="text-ttfc-dim">Not yet</span>}</td>
                  <td>
                    <span className="flex flex-wrap items-center gap-1.5" title={r.error || (r.sentAt ? `Sent ${when(r.sentAt)}` : undefined)}>
                      <Badge tone={s.tone} icon={s.icon}>{s.label}{r.status === "sent" && r.sentAt ? ` · ${when(r.sentAt)}` : ""}</Badge>
                      {r.opened && <Badge tone="good" icon={Eye}>Opened</Badge>}
                      {r.clicked && <Badge tone="orange" icon={MousePointerClick}>Clicked</Badge>}
                    </span>
                    {r.reason && <span className="mt-1 block text-[11px] text-ttfc-dim">{waiting && r.sentAt ? `${r.label} · can go again ${when(new Date(r.sentAt).getTime() + (data.cooldownDays || 3) * DAY_MS)}` : r.label}</span>}
                    {r.error && <span className="mt-1 block max-w-[240px] truncate text-[11px] text-red-200">{r.error}</span>}
                  </td>
                  <td className="text-right">
                    {can && (
                      <Button size="sm" icon={Send} disabled={waiting} onClick={() => setOne(r)} aria-label={`${r.status === "sent" ? "Send again to" : "Send to"} ${r.name || r.email}`}
                        title={waiting ? `Emailed in the last ${data.cooldownDays || 3} days` : undefined}>
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

      {batch && (
        <BatchDialog kind={batch.kind} people={batch.people} size={batch.size} context={batch.context} skipUsing={skipUsing}
          typeFrom={data?.typeSendFrom || 50} cooldownDays={data?.cooldownDays || 3}
          onClose={() => setBatch(null)}
          onStarted={() => { if (batch.kind === "selected") setSelected(new Set()); setKickedAt(Date.now()); recipients.reload(); }} />
      )}

      {confirm && (
        <SendAllDialog toSend={confirm === "retry" ? stats?.failed || 0 : counts?.willGet || 0} skipUsing={skipUsing} retry={confirm === "retry"}
          onClose={() => setConfirm(null)} onStarted={() => { setKickedAt(Date.now()); recipients.reload(); }} />
      )}
    </>
  );
}
