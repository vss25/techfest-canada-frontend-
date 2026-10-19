import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BellRing, CalendarCheck, CalendarClock, CheckCircle2, ChevronDown, Copy, Eye, IdCard, Info, Mail, MailCheck, PenLine, Save,
  Search, Send, Smartphone, UserPlus, X,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, IconButton, Input, LoadingState, Modal, PageHeader,
  Spinner, StatTile, TableWrap,
} from "../ui";
import { num, when } from "../format";
import { CopyFields, ListField } from "./SpeakerEmailCompose";
import { SpeakerTemplateDrawer as TemplateDrawer, SpeakerWording } from "./PassEmailTemplates";
import { tidyCopy, useSpeakerWording } from "./passEmailHooks";
import { listText, useLivePreview } from "./speakerEmailHooks";
import { useInitialQuery } from "../search/deepLink";

/* =========================================================
   Admin → Tickets & attendees → Speaker passes
   Every speaker on the website (the CMS speaker list) gets a
   Speaker Pass (tier "speaker"): the internal fifth pass, never
   sold, never on the public Tickets page (Oct 19 2026: Power Pass
   privileges, both CxO Breakfasts and VIP Lounge Access, no Apex
   extras). Passes start without an email; staff add each
   speaker's email here (saved on blur / Enter), preview the
   personalised email, and management sends it.
   Backend (all under /console/speaker-passes):
     GET  /                 → { rows, counts }
     POST /sync             → create passes for every speaker (management)
     PATCH /:id { email, contact?, runOfShow? } → { row }   ("" clears the email; 400 { error } when invalid)
     Each row also has: sessions (run of show), contact ("own" | "handler" | "team"),
     invitesSentAt, and rsvp ({ at, days, options } or null, matched by ticket ID).
     Sending a pass also sends a calendar invite per session; Lubna is cc'd on both.
     GET  /:id/preview, GET /preview-sample → { to, subject, html, text }
     POST /:id/send         → { row }   (management)
     POST /send-all { confirm: "SEND" } → { sent, failed, skipped, failures } (management)
     Nudges (a reminder to RSVP; RSVP'd speakers are skipped):
       GET /nudge/defaults, POST /:id/nudge/preview, POST /:id/nudge, POST /nudge { confirm: "SEND", ids? }
   Rows follow the website: name/title/company from Admin → Speakers, sessions from the agenda
   (sessionsSource "agenda"; "saved" = the run of show staff saved, for speakers not on the agenda).
   Manual passes (manual: true, speakers not on the website) can be renamed here.
   Nothing is emailed without an explicit confirm.
========================================================= */

const BASE = "/console/speaker-passes";
const plural = (n, one, many = `${one}s`) => `${num(n || 0)} ${n === 1 ? one : many}`;
/** "12 Oct" */
const shortDay = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const lower = (s) => String(s || "").toLowerCase();
const alreadySent = (r) => !!r?.emailSentAt || r?.status === "sent";
/** Sent before, but to an address that isn't the one on the pass now. */
const sentElsewhere = (r) => !!r?.emailSentAt && !!r?.emailSentTo && lower(r.emailSentTo) !== lower(r.email);

/** Inline email editor: saves on blur or Enter (only when it changed), Escape puts the saved email back. */
function EmailCell({ row, onSaved, onSaving }) {
  const toast = useToast();
  const [draft, setDraft] = useState(null); // null = showing the saved email
  const [saving, setSaving] = useState(false);
  const saved = listText(row.emails?.length ? row.emails : row.email ? [row.email] : []);
  const value = draft ?? saved;
  const dirty = draft !== null && draft.trim() !== saved;
  const who = row.name || "this speaker";

  const commit = async () => {
    if (draft === null || saving) return;
    const next = draft.trim();
    if (next === saved) { setDraft(null); return; }
    setSaving(true);
    onSaving(true);
    try {
      const r = await api.patch(`${BASE}/${encodeURIComponent(row.id)}`, { email: next });
      if (r?.row) onSaved(r.row);
      toast.success(next ? `Email${next.includes(",") ? "s" : ""} saved for ${who}` : `Email removed for ${who}`);
    } catch (err) {
      toast.error(err); // e.g. 400 for an invalid email: the field goes back to the saved one
    } finally {
      setSaving(false);
      onSaving(false);
      setDraft(null);
    }
  };

  return (
    <div className="relative min-w-[210px]">
      <Input
        type="text"
        inputMode="email"
        value={value}
        placeholder="Add email (or several, with commas)"
        title="Several addresses? Separate them with commas: they all get the same email."
        autoComplete="off"
        spellCheck={false}
        readOnly={saving}
        aria-busy={saving || undefined}
        aria-label={`Email for ${who}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
          else if (e.key === "Escape" && draft !== null) { e.preventDefault(); setDraft(null); }
        }}
        className={`h-9 py-1.5 pr-9 text-[13px] ${dirty ? "border-ttfc-purple/60" : ""}`}
      />
      {saving && (
        <>
          <Spinner className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <span className="sr-only" role="status">Saving…</span>
        </>
      )}
    </div>
  );
}

function RsvpCell({ rsvp }) {
  if (!rsvp) return <span className="text-xs text-ttfc-dim">Not yet</span>;
  const extras = (rsvp.options || []).filter((o) => !/^(sessions|expo|breaks)_/.test(o)).length;
  return (
    <span className="flex flex-col items-start gap-1" title={rsvp.at ? `RSVP'd ${when(rsvp.at)}` : undefined}>
      <Badge tone="good" icon={CalendarCheck}>RSVP'd{rsvp.at ? ` ${shortDay(rsvp.at)}` : ""}</Badge>
      <span className="text-[11px] text-ttfc-dim">{(rsvp.days || []).length === 2 ? "Both days" : (rsvp.days || []).map((d) => d.replace("day", "Day ")).join(", ") || "No days"}{extras ? ` · ${plural(extras, "event")}` : ""}</span>
    </span>
  );
}

function Status({ row }) {
  const pill = row.status === "sent"
    ? <Badge tone="good" icon={MailCheck}>Sent {shortDay(row.emailSentAt)}{row.sentCount > 1 ? ` · ×${row.sentCount}` : ""}</Badge>
    : row.status === "ready"
      ? <Badge tone="purple" icon={Send}>Ready</Badge>
      : <Badge tone="neutral">No email</Badge>;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="flex flex-wrap items-center gap-1.5">
        <span title={row.emailSentAt ? `Last sent ${when(row.emailSentAt)}${row.emailSentTo ? ` to ${row.emailSentTo}` : ""}` : undefined}>{pill}</span>
        {row.sessions > 0 && (
          <span title={row.sessionsSource === "agenda" ? "From the agenda: updates when the agenda changes" : "Saved run of show (this speaker isn't on the agenda)"}>
            <Badge tone="purple" icon={CalendarClock}>{plural(row.sessions, "session")}{row.sessionsSource === "agenda" ? " · agenda" : ""}</Badge>
          </span>
        )}
        {row.nudgedAt && <Badge tone="neutral" icon={BellRing}>Nudged {shortDay(row.nudgedAt)}{row.nudgeCount > 1 ? ` · ×${row.nudgeCount}` : ""}</Badge>}
        {row.manual && <span title="Added by hand: this speaker isn't on the website"><Badge tone="neutral">Not on website</Badge></span>}
        {row.contact === "handler" && <Badge tone="neutral">Via assistant</Badge>}
        {row.invitesSentAt && <Badge tone="good" icon={CalendarCheck}>Invite sent</Badge>}
        {row.claimed && <Badge tone="neutral" icon={Smartphone}>In app</Badge>}
        {row.checkedIn && <Badge tone="neutral" icon={CheckCircle2}>Checked in</Badge>}
      </span>
      {sentElsewhere(row) && <span className="text-[11px] text-ttfc-dim">Last sent to {row.emailSentTo}</span>}
    </div>
  );
}

const toMin = (t) => Number(String(t).slice(0, 2)) * 60 + Number(String(t).slice(3, 5));
const fmt12 = (m) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m >= 720 ? "PM" : "AM"}`;
const DAY_SHORT = { 1: "Mon 26 Oct", 2: "Tue 27 Oct" };
/** The calendar invites a send adds: one per session, from mic fitting (30 min early) to the end. */
function invitesFor(row) {
  const sessions = row?.runOfShow?.sessions || [];
  return sessions.map((s) => {
    const backToBack = sessions.some((o) => o !== s && o.day === s.day && toMin(o.start) < toMin(s.start) && toMin(s.start) - toMin(o.end) < 30);
    const from = toMin(s.start) - (backToBack ? 0 : 30);
    return { key: `${s.day}-${s.start}`, title: s.title, when: `${DAY_SHORT[s.day] || ""} · ${fmt12(from)} to ${fmt12(toMin(s.end))}`, micUp: !backToBack };
  });
}

function WhatGoesOut({ row, to, cc }) {
  const invites = invitesFor(row);
  const toText = to ?? listText(row.emails?.length ? row.emails : row.email ? [row.email] : []);
  return (
    <div className="mb-4 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-4 py-3 text-sm">
      <p className="font-semibold">What {toText ? <>goes to <span className="text-ttfc-pink">{toText}</span></> : "will go out"}</p>
      <ul className="mt-2 space-y-1.5 text-ttfc-muted">
        <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> This Speaker Pass email{invites.length ? ", with their run of show" : ""}.</li>
        {invites.map((i) => (
          <li key={i.key} className="flex gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Calendar invite: <b className="text-ttfc-text">{i.title}</b> · {i.when}{i.micUp ? " (starts at mic fitting)" : ""}</span>
          </li>
        ))}
        {!invites.length && <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> No sessions on this pass, so no calendar invite.</li>}
        <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {cc?.length ? <>Cc on each: {listText(cc)}.</> : "Nobody is cc'd."}</li>
      </ul>
    </div>
  );
}

/** The email, isolated in a sandboxed frame (no scripts, no same-origin access). */
function PassPreview({ preview }) {
  const [mode, setMode] = useState("html");
  if (!preview) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-ttfc-line">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-xs">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate"><span className="text-ttfc-dim">Subject</span> <b>{preview.subject || "—"}</b></p>
          {preview.to && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">To:</span> {preview.to}</p>}
          {preview.cc?.length > 0 && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Cc:</span> {listText(preview.cc)}</p>}
        </div>
        {preview.text && (
          <div className="flex gap-1" role="tablist" aria-label="Email format">
            {[["html", "Email"], ["text", "Plain text"]].map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                className={`rounded-lg px-2.5 py-1 font-semibold ${mode === k ? "bg-ttfc-purple/30 text-white" : "text-ttfc-muted hover:text-ttfc-text"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {mode === "html" || !preview.text
        ? <iframe title="Speaker Pass email preview" sandbox="" srcDoc={preview.html || ""} className="block h-[65vh] min-h-[420px] w-full bg-white" />
        : <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap bg-ttfc-ink px-4 py-3 font-mono text-xs leading-relaxed text-ttfc-muted">{preview.text}</pre>}
    </div>
  );
}

/** Name, title and company on the pass. A website speaker's come from Admin → Speakers; a manual pass's are edited here. */
function PassDetails({ row, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: row.name || "", title: row.title || "", company: row.company || "" });
  const [saving, setSaving] = useState(false);
  if (!row.manual) {
    return (
      <p className="mb-4 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-4 py-3 text-xs text-ttfc-muted">
        <b className="text-ttfc-text">{[row.name, row.title, row.company].filter(Boolean).join(" · ")}</b>
        <span className="mt-1 block">Name, title and company come from this speaker in Admin → Speakers: change them there and the pass follows.</span>
      </p>
    );
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const dirty = form.name !== (row.name || "") || form.title !== (row.title || "") || form.company !== (row.company || "");
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.patch(`${BASE}/${encodeURIComponent(row.id)}`, form);
      if (r?.row) onSaved?.(r.row);
      toast.success("Details saved");
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mb-4 grid gap-3 rounded-xl border border-ttfc-line px-4 py-3 sm:grid-cols-3">
      <Field label="Name on the pass">{(fid) => <Input id={fid} value={form.name} onChange={set("name")} maxLength={120} />}</Field>
      <Field label="Title">{(fid) => <Input id={fid} value={form.title} onChange={set("title")} maxLength={200} />}</Field>
      <Field label="Company">{(fid) => <Input id={fid} value={form.company} onChange={set("company")} maxLength={200} />}</Field>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-3">
        <p className="text-xs text-ttfc-dim">This speaker isn't on the website, so their details are edited here.</p>
        <Button size="sm" icon={Save} loading={saving} disabled={!dirty || form.name.trim().length < 3} onClick={save}>Save details</Button>
      </div>
    </div>
  );
}

/**
 * Right-side drawer with one speaker's email (`id`), or the sample (`id` null). Mounted per open.
 * mode "nudge": the reminder to RSVP instead of the pass email.
 * For management it's also where you send: To and Cc for this send, and this speaker's own email
 * wording (saved on their pass with "Save for this speaker"; unsaved edits go with this send only).
 * The preview follows the edits.
 */
function PreviewDrawer({ id, row, canSend, mode = "pass", onSend, onClose, onRowSaved }) {
  const nudge = mode === "nudge";
  const composing = !!(id && canSend && row);
  const [tpl, setTpl] = useState(null);
  const [to, setTo] = useState(() => listText(row?.emails?.length ? row.emails : row?.email ? [row.email] : []));
  const [cc, setCc] = useState("");
  const [copy, setCopy] = useState({ subject: "", headline: "", message: "" });
  const [showWording, setShowWording] = useState(true);
  const wording = useSpeakerWording(id, composing && !nudge);
  useEffect(() => {
    if (!composing) return;
    if (nudge) {
      api.get(`${BASE}/nudge/defaults`).then((r) => {
        setTpl({ template: { cc: r.cc || [] }, defaults: r.defaults || {} });
        setCc(listText(r.cc));
      }, () => setTpl({ template: { cc: [] }, defaults: {} }));
      return;
    }
    api.get(`${BASE}/template`).then((r) => {
      setTpl(r);
      setCc(listText(r.template.cc));
    }, () => setTpl({ template: { cc: [] }, defaults: {} }));
  }, [composing, nudge]);
  // The pass email carries this speaker's whole wording as it's on screen ({ draft: true }); a nudge, its reminder wording.
  const body = composing ? { ...(to.trim() ? { to } : {}), cc, ...(nudge ? copy : { draft: true, ...tidyCopy(wording.value || {}) }) } : {};
  const previewUrl = id ? `${BASE}/${encodeURIComponent(id)}/${nudge ? "nudge/preview" : "preview"}` : `${BASE}/preview-sample`;
  const live = useLivePreview(previewUrl, body, { enabled: !composing || (!!tpl && (nudge || wording.loaded || !!wording.error)) });
  const data = live.data;
  const loading = live.loading && !data;
  const error = !data ? live.error : null;
  const reload = () => setCopy((c) => ({ ...c }));
  const footer = composing ? (
    <>
      {to.trim()
        ? <Button variant="primary" icon={nudge ? BellRing : Send} disabled={!tpl || live.loading || !!live.error} onClick={() => onSend(row, body, data, mode)}>{nudge ? "Send nudge" : alreadySent(row) ? "Resend" : "Send"}</Button>
        : <p className="text-sm text-ttfc-muted">Add an address in To (or in the list) to send this.</p>}
      <Button variant="ghost" onClick={onClose}>Close</Button>
      {live.error && data && <p className="text-xs text-red-200">{live.error.message}</p>}
    </>
  ) : undefined;
  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={id ? (nudge ? `Nudge ${row?.name || "this speaker"}` : `${row?.name || "Speaker"}'s Speaker Pass`) : "Speaker Pass email"}
      description={id
        ? (nudge
          ? "A reminder to RSVP: their Speaker Pass email again, with the reminder wording below (change it for this send)."
          : row?.ticketId ? `Ticket ${row.ticketId}` : undefined)
        : "An example of the email every speaker gets, each with their own name and ticket ID."}
      footer={footer}
    >
      {loading
        ? <LoadingState label="Loading the preview…" />
        : error
          ? <ErrorState error={error} onRetry={reload} title="Couldn't load the preview" />
          : (
            <>
              {id && !data?.to && !row?.email && (
                <p className="mb-4 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-4 py-3 text-sm text-ttfc-muted">No email on this pass yet. Add one in the list before sending.</p>
              )}
              {composing && !nudge && row && <PassDetails row={row} onSaved={onRowSaved} />}
              {composing && (
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-ttfc-line px-4 py-3">
                  <ListField label="To" hint="Commas between addresses. Everyone in To gets the same email and calendar invites."
                    value={to} onChange={setTo} placeholder="speaker@company.com, assistant@company.com" />
                  <ListField label="Cc" hint="For this send. The usual list is set in Edit email." value={cc} onChange={setCc} placeholder="Nobody" />
                  <button type="button" onClick={() => setShowWording((v) => !v)} aria-expanded={showWording}
                    className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ttfc-pink hover:text-white">
                    <PenLine className="h-4 w-4" aria-hidden="true" /> {nudge ? "Reminder wording" : "Email wording for this speaker"}
                    <ChevronDown className={`h-4 w-4 transition ${showWording ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  {showWording && (nudge
                    ? <CopyFields value={copy} onChange={setCopy} defaults={tpl?.defaults || {}} />
                    : wording.error ? <ErrorState error={wording.error} title="Couldn't load this speaker's wording" />
                      : <SpeakerWording id={id} wording={wording} defaults={wording.defaults} canSave={canSend} />)}
                </div>
              )}
              {id && row && !nudge && <WhatGoesOut row={row} to={data?.to} cc={data?.cc} />}
              <PassPreview preview={data} />
            </>
          )}
    </Drawer>
  );
}

/**
 * "Send to all ready" (mode "all") or "Send to selected" (mode "selected"): lists everyone and only
 * arms once SEND is typed. The wording is the saved one (Edit email); a selected send can change the cc.
 * Mounted per open.
 */
function SendAllDialog({ rows, mode = "all", onClose, onDone }) {
  const toast = useToast();
  const [cc, setCc] = useState(null); // null until the saved list loads
  useEffect(() => {
    api.get(`${BASE}/template`).then((r) => setCc(listText(r.template.cc)), () => setCc(""));
  }, []);
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const n = rows.length;
  const armed = typed.trim() === "SEND" && n > 0;

  const close = () => { if (!sending) onClose(); };
  const send = async () => {
    if (!armed || sending) return;
    setSending(true);
    setErr("");
    try {
      const r = mode === "nudge"
        ? await api.post(`${BASE}/nudge`, { confirm: "SEND", ids: rows.map((x) => x.id), cc: cc ?? undefined })
        : mode === "selected"
          ? await api.post(`${BASE}/send-selected`, { confirm: "SEND", ids: rows.map((x) => x.id), cc: cc ?? undefined })
          : await api.post(`${BASE}/send-all`, { confirm: "SEND" });
      setResult(r || {});
      const summary = `Sent ${num(r?.sent ?? 0)}, failed ${num(r?.failed ?? 0)}`;
      if (r?.failed) toast.error(summary); else toast.success(summary);
      onDone?.();
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      tone="danger"
      title={result ? "Done" : mode === "nudge" ? `Nudge ${plural(n, "speaker")} now?` : `Send ${plural(n, "Speaker Pass", "Speaker Passes")} now?`}
      description={result ? undefined : mode === "nudge"
        ? `This emails ${plural(n, "speaker")} who haven't RSVP'd a reminder with their Speaker Pass and RSVP button (the standard reminder wording; to change it, nudge one speaker at a time). This cannot be undone.`
        : `This emails ${plural(n, "speaker")} their Speaker Pass${mode === "selected" ? " (everyone you ticked)" : ""} now, with the wording from Edit email. This cannot be undone.`}
      footer={result
        ? <Button variant="primary" onClick={close} data-autofocus>Close</Button>
        : (
          <>
            <Button onClick={close} disabled={sending}>Cancel</Button>
            <Button variant="danger" icon={Send} loading={sending} disabled={!armed} onClick={send}>Send {plural(n, "email")}</Button>
          </>
        )}
    >
      {result ? (
        <div className="flex flex-col gap-3 text-sm">
          <Banner tone={result.failed ? "warn" : "good"} icon={result.failed ? AlertTriangle : CheckCircle2}
            title={`Sent ${num(result.sent ?? 0)}, failed ${num(result.failed ?? 0)}`}>
            {[result.skipped ? `${plural(result.skipped, "speaker")} skipped.` : "", result.failed ? "Failed ones stay Ready: try them again from the list." : ""].filter(Boolean).join(" ") || "Every ready speaker was emailed."}
          </Banner>
          {result.failures?.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-red-400/30">
              <ul className="divide-y divide-ttfc-line/70 text-xs">
                {result.failures.map((f, i) => (
                  <li key={f.id || i} className="px-3 py-2">
                    <b>{f.name || f.email || "Unknown"}</b>{f.email ? ` · ${f.email}` : ""}
                    <span className="block text-red-200">{f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-sm">
          <div className="max-h-64 overflow-y-auto rounded-xl border border-ttfc-line">
            <ul className="divide-y divide-ttfc-line/70">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate font-semibold">{r.name || "No name"}</span>
                  <span className="min-w-0 truncate text-xs text-ttfc-muted">{listText(r.emails?.length ? r.emails : [r.email])}</span>
                </li>
              ))}
            </ul>
          </div>
          {mode === "selected" || mode === "nudge"
            ? <ListField label="Cc on each email and invite" hint="Commas between addresses. Empty = nobody." value={cc ?? ""} onChange={setCc} placeholder="Nobody" disabled={sending || cc === null} />
            : <p className="text-xs text-ttfc-muted">Cc on each: {cc === null ? "…" : cc || "nobody"} (change it in Edit email).</p>}
          <Field label={<>Type <span className="font-mono">SEND</span> to confirm</>}>
            {(id) => (
              <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters"
                spellCheck={false} placeholder="SEND" className="font-mono" disabled={sending} data-autofocus />
            )}
          </Field>
          {sending && <p role="status" className="rounded-xl border border-ttfc-purple/30 bg-ttfc-purple/10 px-3 py-2 text-violet-100">Sending… please keep this window open until it finishes.</p>}
          {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
        </div>
      )}
    </Modal>
  );
}

export default function SpeakerPasses() {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const { data, error, loading, reload, refreshing, setData } = useApi(BASE);
  const initialQ = useInitialQuery(); // a speaker's pass from the global search (?q=<ticket ID>)
  const [q, setQ] = useState(initialQ);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [preview, setPreview] = useState(null); // { id, mode } for one speaker, { id: null } for the sample
  const [previewN, setPreviewN] = useState(0);
  const [sendTarget, setSendTarget] = useState(null); // the row being confirmed
  const [sendAllOpen, setSendAllOpen] = useState(false); // false | "all" | "selected"
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [savingIds, setSavingIds] = useState({}); // id → true while its email saves

  const rows = useMemo(() => data?.rows || [], [data]);
  // Worked out from the rows, so the tiles follow inline edits and sends straight away.
  const counts = useMemo(() => ({
    passes: rows.length,
    withEmail: rows.filter((r) => r.email).length,
    sent: rows.filter((r) => r.status === "sent").length,
    ready: rows.filter((r) => r.status === "ready").length,
    rsvpd: rows.filter((r) => r.rsvp).length,
  }), [rows]);
  const readyRows = useMemo(() => rows.filter((r) => r.status === "ready"), [rows]);
  // Nudge targets: sent their pass, still have an address, no RSVP yet.
  const nudgeRows = useMemo(() => rows.filter((r) => r.emailSentAt && !r.rsvp && (r.emails?.length || r.email)), [rows]);
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.id) && (r.emails?.length || r.email)), [rows, selected]);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!needle) return rows;
    const compact = needle.replace(/\s+/g, "");
    return rows.filter((r) => [r.name, r.company, r.email].some((v) => lower(v).includes(needle))
      || lower(r.ticketId).replace(/\s+/g, "").includes(compact));
  }, [rows, needle]);

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const toggleAllShown = () => setSelected((s) => {
    const n = new Set(s);
    if (allShownSelected) shown.forEach((r) => n.delete(r.id)); else shown.forEach((r) => n.add(r.id));
    return n;
  });
  const updateRow = (row) => setData((d) => (d ? { ...d, rows: (d.rows || []).map((r) => (r.id === row.id ? { ...r, ...row } : r)) } : d));
  const markSaving = (id, on) => setSavingIds((s) => ({ ...s, [id]: on }));
  const openPreview = (id, mode = "pass") => { setPreview({ id, mode }); setPreviewN((n) => n + 1); };
  const previewRow = preview?.id ? rows.find((r) => r.id === preview.id) || null : null;

  const copy = (text) => navigator.clipboard?.writeText(text).then(
    () => toast.success("Copied"),
    () => toast.error("Couldn't copy. Select the ticket ID and copy it by hand."),
  );

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await api.post(`${BASE}/sync`);
      setSyncResult(r || {});
      toast.success(r?.created ? `Created ${plural(r.created, "Speaker Pass", "Speaker Passes")}` : "Every speaker already has a pass");
      reload();
    } catch (err) { toast.error(err); } finally { setSyncing(false); }
  };

  const sendOne = async () => {
    const { row, body, mode } = sendTarget;
    if (mode === "nudge") {
      const r = await api.post(`${BASE}/${encodeURIComponent(row.id)}/nudge`, body);
      if (r?.row) updateRow({ ...r.row, rsvp: row.rsvp });
      setPreview(null);
      toast.success(`Nudge sent to ${sendTarget.preview?.to || row.email}`);
      return;
    }
    const r = await api.post(`${BASE}/${encodeURIComponent(row.id)}/send`, body);
    if (r?.row) updateRow({ ...r.row, rsvp: row.rsvp });
    setPreview(null);
    const to = r?.row?.emailSentTo || row.email;
    if (r?.inviteError) toast.error(`Speaker Pass sent to ${to}, but the calendar invite failed: ${r.inviteError}`);
    else toast.success(row.sessions ? `Speaker Pass and ${plural(row.sessions, "calendar invite")} sent to ${to}` : `Speaker Pass sent to ${to}`);
  };

  const syncSummary = syncResult && [
    `${num(syncResult.created ?? 0)} created`,
    ...(syncResult.mergedNames?.length ? [`${num(syncResult.mergedNames.length)} duplicate${syncResult.mergedNames.length === 1 ? "" : "s"} merged (${syncResult.mergedNames.join(", ")})`] : []),
    ...(syncResult.linkedNames?.length ? [`${num(syncResult.linkedNames.length)} linked to the website (${syncResult.linkedNames.join(", ")})`] : []),
    `${num(syncResult.existing ?? 0)} already had a pass`,
    `${num(syncResult.excluded ?? 0)} excluded${syncResult.excludedNames?.length ? ` (${syncResult.excludedNames.join(", ")})` : ""}`,
  ].join(" · ");
  const createdNames = syncResult?.createdNames || [];

  return (
    <>
      <PageHeader
        eyebrow="People & passes"
        title="Speaker passes"
        description="Every speaker on the website gets a Speaker Pass: an internal pass, never sold or listed on the website. It has the Power Pass privileges, both CxO Breakfasts and the VIP Lounge. Add each speaker's email, preview, then send."
        actions={
          <>
            <Button icon={Eye} onClick={() => openPreview(null)} title="See the email speakers get, with sample details">Preview email</Button>
            <Button icon={PenLine} onClick={() => setTemplateOpen(true)} title="Change the subject, headline, message and who's cc'd">Edit email</Button>
            {isManagement && (
              <Button icon={UserPlus} loading={syncing} onClick={sync} title="Give every speaker on the website a Speaker Pass. Speakers who already have one are left as they are. Nothing is emailed.">
                Create passes for all speakers
              </Button>
            )}
            {isManagement && selected.size > 0 && (
              <Button icon={Send} disabled={!selectedRows.length} onClick={() => setSendAllOpen("selected")}
                title={selectedRows.length ? "Email the speakers you ticked" : "None of the ticked speakers has an email"}>
                Send to selected ({num(selectedRows.length)})
              </Button>
            )}
            {isManagement && (
              <Button icon={BellRing} disabled={!nudgeRows.length} onClick={() => setSendAllOpen("nudge")}
                title={nudgeRows.length ? "Remind every speaker who was sent their pass and hasn't RSVP'd" : "Everyone who was sent a pass has RSVP'd"}>
                Nudge everyone not RSVP'd{nudgeRows.length ? ` (${num(nudgeRows.length)})` : ""}
              </Button>
            )}
            {isManagement && (
              <Button variant="primary" icon={Send} disabled={!counts.ready} onClick={() => setSendAllOpen("all")}
                title={counts.ready ? "Email every speaker marked Ready" : "No speakers are ready: add emails first"}>
                Send to all ready{counts.ready ? ` (${num(counts.ready)})` : ""}
              </Button>
            )}
          </>
        }
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Sending is for management">
          You can add speakers' emails and preview their Speaker Pass. A manager creates the passes and sends them.
        </Banner>
      )}

      {syncResult && (
        <Banner tone="good" icon={CheckCircle2} className="mb-6" title="Speaker list checked"
          action={<IconButton icon={X} label="Dismiss" onClick={() => setSyncResult(null)} className="self-start sm:self-center" />}>
          {syncSummary}
          {createdNames.length > 0 && (
            <span className="mt-1 block text-xs">
              New: {createdNames.slice(0, 20).join(", ")}{createdNames.length > 20 ? ` and ${num(createdNames.length - 20)} more` : ""}
            </span>
          )}
        </Banner>
      )}

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          <StatTile label="Passes" value={num(counts.passes)} icon={IdCard} tone="purple" />
          <StatTile label="Emails added" value={num(counts.withEmail)} icon={Mail} tone="pink" />
          <StatTile label="Sent" value={num(counts.sent)} icon={MailCheck} tone="good" />
          <StatTile label="Ready to send" value={num(counts.ready)} icon={Send} tone="orange" />
          <StatTile label="RSVP'd" value={num(counts.rsvpd)} icon={CalendarCheck} tone="good" hint="Matched by their Speaker Pass ticket ID" />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, email or ticket ID" className="pl-9" aria-label="Search speaker passes" />
        </div>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : needle ? `${num(shown.length)} of ${plural(rows.length, "pass", "passes")}` : plural(rows.length, "pass", "passes")}
          {refreshing && !loading ? " · updating…" : ""}
        </p>
      </div>

      {loading ? <LoadingState label="Loading speaker passes…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState
          icon={IdCard}
          title="No speaker passes yet"
          body={isManagement ? "Click Create passes for all speakers." : "A manager can create them with Create passes for all speakers."}
          action={isManagement && <Button variant="primary" icon={UserPlus} loading={syncing} onClick={sync}>Create passes for all speakers</Button>}
        />
      ) : !shown.length ? (
        <EmptyState icon={Search} title="No speakers match" body="Try a different name, company, email or ticket ID." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {isManagement && (
                <th className="w-10">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} aria-label="Select every speaker shown" className="h-4 w-4 accent-ttfc-pink" />
                </th>
              )}
              <th>Speaker</th><th>Ticket ID</th><th>Email</th><th>Status</th><th>RSVP</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const sub = [r.title, r.company].filter(Boolean).join(" · ");
              const busy = !!savingIds[r.id];
              return (
                <tr key={r.id} data-selected={selected.has(r.id) || undefined}>
                  {isManagement && (
                    <td>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} className="h-4 w-4 accent-ttfc-pink" />
                    </td>
                  )}
                  <td className="min-w-[200px] max-w-[280px]">
                    <button type="button" onClick={() => openPreview(r.id)} className="block max-w-full truncate text-left font-semibold hover:text-ttfc-pink" title={`Preview ${r.name}'s email`}>
                      {r.name || <span className="text-ttfc-dim">No name</span>}
                    </button>
                    {sub && <span className="block truncate text-xs text-ttfc-muted" title={sub}>{sub}</span>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="ghost" icon={Eye} onClick={() => openPreview(r.id)}>Preview</Button>
                      {isManagement && (
                        <span title={!r.email ? "Add an email first" : busy ? "Saving the email…" : "Opens the preview, then send from there"}>
                          <Button size="sm" icon={Send} disabled={!r.email || busy} onClick={() => openPreview(r.id)}>
                            {alreadySent(r) ? "Preview & resend" : "Preview & send"}
                          </Button>
                        </span>
                      )}
                      {isManagement && r.emailSentAt && !r.rsvp && (
                        <Button size="sm" variant="ghost" icon={BellRing} disabled={busy} onClick={() => openPreview(r.id, "nudge")}
                          title="Remind them to RSVP: preview, change the wording if you like, then send">
                          Nudge
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-mono text-xs">{r.ticketId || "—"}</span>
                      {r.ticketId && <IconButton icon={Copy} label={`Copy ticket ID ${r.ticketId}`} onClick={() => copy(r.ticketId)} className="h-7 w-7" />}
                    </span>
                  </td>
                  <td>
                    <EmailCell row={r} onSaved={updateRow} onSaving={(on) => markSaving(r.id, on)} />
                  </td>
                  <td><Status row={r} /></td>
                  <td><RsvpCell rsvp={r.rsvp} /></td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {preview && (
        <PreviewDrawer
          key={previewN}
          id={preview.id}
          row={previewRow}
          mode={preview.mode}
          canSend={isManagement}
          onSend={(row, body, preview, mode) => setSendTarget({ row, body, preview, mode })}
          onRowSaved={updateRow}
          onClose={() => setPreview(null)}
        />
      )}

      <ConfirmDialog
        open={!!sendTarget}
        onClose={() => setSendTarget(null)}
        tone="primary"
        title={sendTarget ? (sendTarget.mode === "nudge" ? `Nudge ${sendTarget.row.name || "this speaker"}?` : `Send ${sendTarget.row.name || "this speaker"}'s Speaker Pass?`) : ""}
        body={sendTarget && sendTarget.mode === "nudge" ? [
          `To: ${sendTarget.preview?.to || sendTarget.row.email}.`,
          `Cc: ${listText(sendTarget.preview?.cc) || "nobody"}.`,
          "They'll get the reminder you see in the preview, with their Speaker Pass and RSVP button.",
          sendTarget.row.nudgedAt ? `They were last nudged on ${shortDay(sendTarget.row.nudgedAt)}.` : "",
        ].filter(Boolean).join(" ") : sendTarget && [
          `To: ${sendTarget.preview?.to || sendTarget.row.email}.`,
          `Cc: ${listText(sendTarget.preview?.cc) || "nobody"}.`,
          alreadySent(sendTarget.row)
            ? `It was already sent on ${shortDay(sendTarget.row.emailSentAt) || "an earlier date"}${sentElsewhere(sendTarget.row) ? ` to ${sendTarget.row.emailSentTo}` : ""}.`
            : "They'll get the email you see in the preview.",
          sendTarget.row.sessions ? `Plus ${plural(sendTarget.row.sessions, "calendar invite")} for their ${sendTarget.row.sessions > 1 ? "sessions" : "session"}.` : "",
        ].filter(Boolean).join(" ")}
        confirmLabel={sendTarget?.mode === "nudge" ? "Send nudge" : sendTarget && alreadySent(sendTarget.row) ? "Resend" : "Send"}
        onConfirm={sendOne}
      />

      {sendAllOpen && (
        <SendAllDialog
          mode={sendAllOpen}
          rows={sendAllOpen === "selected" ? selectedRows : sendAllOpen === "nudge" ? nudgeRows : readyRows}
          onClose={() => setSendAllOpen(false)}
          onDone={() => { reload(); if (sendAllOpen === "selected") setSelected(new Set()); }}
        />
      )}
      {templateOpen && <TemplateDrawer canEdit={isManagement} onClose={() => setTemplateOpen(false)} />}
    </>
  );
}
