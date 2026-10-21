import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing, CalendarClock, CheckCircle2, ExternalLink, Gavel, KeyRound, Lock, Mail, MailCheck, Pencil, Search, ShieldAlert, Trash2, UserPlus, Users,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, IconButton, Input, LoadingState, Modal, PageHeader, PasswordInput,
  StatTile, Switch, TableWrap,
} from "../ui";
import { ago, day, when } from "../format";
import JuryEmails from "./JuryEmails";
import { EYEBROW, JURY, PORTAL_URL, plural, progressText } from "./juryShared";
import { ProgressBar, StateBadge, StatusBadge } from "./juryBadges";

/* =========================================================
   Admin › Catalyst Awards › Jury (Oct 2026)
   The organiser: "a TTFC portal where jury can login and see the
   awards and rank it objectively … The jury will be allocated
   startups to evaluate by the admin itself."
     - Jurors: add, edit, switch off, remove (management); staff can
       look. An optional password, else they sign in with a 6-digit
       code by email at thetechfestival.com/awards/jury-admin.
     - Each juror's progress, last active, invite and reminders;
       "Send invite" / "Send reminder" (management clicks only),
       "Remind everyone with work left".
     - The two emails' wording (JuryEmails).
   Allocation, the rubric and the results have their own pages.
   Backend: /console/jury (routes/juryAdmin.js).
========================================================= */

function JurorForm({ juror, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !juror?.id;
  const [f, setF] = useState(() => ({
    name: juror?.name || "", email: juror?.email || "", organisation: juror?.organisation || "", title: juror?.title || "",
    active: juror?.active !== false, password: "", clearPassword: false,
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => {
    e?.preventDefault();
    setBusy(true); setErr("");
    const body = { name: f.name, email: f.email, organisation: f.organisation, title: f.title, active: f.active };
    if (f.password) body.password = f.password;
    else if (!isNew && f.clearPassword) body.password = null;
    try {
      const r = isNew ? await api.post(`${JURY}/jurors`, body) : await api.patch(`${JURY}/jurors/${juror.id}`, body);
      toast.success(isNew ? `${r.juror.name} added to the jury` : "Juror saved");
      onSaved(r.juror);
      onClose();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={() => { if (!busy) onClose(); }} title={isNew ? "Add a juror" : `Edit ${juror.name}`}
      description={isNew ? "They'll sign in with this email. Nothing is sent until you click Send invite." : "Changing the email, the password or switching them off signs them out."}
      footer={<>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" loading={busy} onClick={save} disabled={!f.name.trim() || !f.email.trim()}>{isNew ? "Add juror" : "Save"}</Button>
      </>}>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <Field label="Name" required>{(id) => <Input id={id} value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" data-autofocus />}</Field>
        <Field label="Email" required hint="Where the invite, reminders and sign-in codes go.">
          {(id) => <Input id={id} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organisation">{(id) => <Input id={id} value={f.organisation} onChange={(e) => set("organisation", e.target.value)} />}</Field>
          <Field label="Title">{(id) => <Input id={id} value={f.title} onChange={(e) => set("title", e.target.value)} />}</Field>
        </div>
        <Field label={isNew ? "Password (optional)" : juror.hasPassword ? "New password (optional)" : "Password (optional)"}
          hint={isNew || !juror.hasPassword ? "Leave it empty and they sign in with a 6-digit code by email. At least 10 characters. Tell them yourself: it's never emailed." : "Leave it empty to keep the current one."}>
          {(id) => <PasswordInput id={id} value={f.password} onChange={(e) => set("password", e.target.value)} disabled={f.clearPassword} />}
        </Field>
        {!isNew && juror.hasPassword && (
          <Switch checked={f.clearPassword} onChange={(v) => set("clearPassword", v)} label="Remove their password" description="They'll sign in with an emailed code instead." />
        )}
        <Switch checked={f.active} onChange={(v) => set("active", v)} label="Can sign in" description="Off: they can't sign in or get emails; anything they submitted still counts." />
        {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>}
        <button type="submit" hidden aria-hidden="true" />
      </form>
    </Modal>
  );
}

function JurorDrawer({ id, onClose }) {
  const { data, error, loading, reload } = useApi(id ? `${JURY}/jurors/${id}` : null);
  const j = data?.juror;
  return (
    <Drawer open={!!id} onClose={onClose} width="max-w-2xl" title={j?.name || (loading ? "Loading…" : "Juror")}
      description={j ? [j.email, [j.title, j.organisation].filter(Boolean).join(", ")].filter(Boolean).join(" · ") : ""}>
      {loading ? <LoadingState /> : error && !j ? <ErrorState error={error} onRetry={reload} /> : j && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3"><p className="text-xs text-ttfc-dim">Progress</p><p className="mt-1 text-sm font-semibold">{progressText(j.progress)}</p></div>
            <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3"><p className="text-xs text-ttfc-dim">Last active</p><p className="mt-1 text-sm font-semibold">{j.lastActiveAt ? ago(j.lastActiveAt) : "Never signed in"}</p></div>
            <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 p-3"><p className="text-xs text-ttfc-dim">Signs in with</p><p className="mt-1 text-sm font-semibold">{j.hasPassword ? "Password or code" : "Emailed code"}</p></div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ttfc-dim">Allocated to them ({data.rows.length})</h3>
            {!data.rows.length ? <p className="text-sm text-ttfc-muted">Nothing yet. Allocate nominations on the <Link className="text-ttfc-pink underline" to="/admin/awards/allocation">Allocation</Link> page.</p> : (
              <ul className="divide-y divide-ttfc-line rounded-2xl border border-ttfc-line">
                {data.rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{r.nomineeName}</span>
                      <span className="block truncate text-xs text-ttfc-muted">{r.category}{r.hidden ? " · not progressing: hidden from the jury" : ""}</span>
                      {r.conflictReason && <span className="block text-xs text-red-200">Conflict: {r.conflictReason}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      {r.submittedAt && <span className="text-[11px] text-ttfc-dim">{when(r.submittedAt)}</span>}
                      <StatusBadge status={r.status} />
                      <StateBadge state={r.state} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-ttfc-dim">Scores and comments are on the Jury results page (management).</p>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function JuryJurors() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const { data, error, loading, reload } = useApi(`${JURY}/overview`);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // {} = new, row = edit
  const [removing, setRemoving] = useState(null);
  const [sending, setSending] = useState(null); // { juror, kind }
  const [remindAll, setRemindAll] = useState(false);
  const [openId, setOpenId] = useState("");

  const rows = useMemo(() => data?.jurors || [], [data]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => !needle || [r.name, r.email, r.organisation, r.title].some((v) => String(v || "").toLowerCase().includes(needle)));
  const leftToRemind = rows.filter((r) => r.active && r.progress.remaining > 0);
  const c = data?.counts || {};
  const s = data?.settings;

  const send = async () => {
    const { juror, kind } = sending;
    const r = await api.post(`${JURY}/jurors/${juror.id}/${kind === "invite" ? "invite" : "remind"}`);
    toast.success(`${kind === "invite" ? "Invite" : "Reminder"} sent to ${r.email}`);
    reload();
  };
  const sendAll = async () => {
    const r = await api.post(`${JURY}/remind-all`, { confirm: "SEND" });
    toast.success(`Reminder sent to ${plural(r.sent, "juror")}`);
    if (r.failed?.length) toast.error(`Not sent: ${r.failed.map((x) => `${x.name} (${x.error})`).join(", ")}`);
    reload();
  };

  return (
    <>
      <PageHeader
        eyebrow={EYEBROW}
        title="Jury"
        description="The people judging the Catalyst Awards. Jurors sign in at thetechfestival.com/awards/jury-admin with a 6-digit code by email (or a password you set) and see only the nominations you allocate to them: never anyone's contact details, never each other's scores."
        actions={<>
          <a href={data?.portalUrl || PORTAL_URL} target="_blank" rel="noopener noreferrer" tabIndex={-1}><Button icon={ExternalLink}>Open the jury portal</Button></a>
          {isManagement && <Button icon={BellRing} disabled={!leftToRemind.length} onClick={() => setRemindAll(true)}>Remind everyone with work left</Button>}
          {isManagement && <Button variant="primary" icon={UserPlus} onClick={() => setForm({})}>Add juror</Button>}
        </>}
      />

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile label="Jurors" value={`${c.active}`} hint={c.jurors !== c.active ? `${c.jurors - c.active} switched off` : "All can sign in"} icon={Users} tone="purple" />
          <StatTile label="Allocations" value={c.allocations} hint={`${plural(c.nominationsCovered, "nomination")} covered`} icon={Gavel} tone="orange" to="/admin/awards/allocation" />
          <StatTile label="Submitted" value={c.submitted} hint={c.allocations ? `${Math.round((c.submitted / c.allocations) * 100)}% of allocations` : "—"} icon={CheckCircle2} tone="good" />
          <StatTile label="Conflicts declared" value={c.conflicts} hint={c.conflicts ? "Reassign on the Allocation page" : "None"} icon={ShieldAlert} tone={c.conflicts ? "bad" : "neutral"} to="/admin/awards/allocation" />
        </div>
      )}

      {s && (
        <Banner tone={s.locked ? "warn" : "info"} icon={s.locked ? Lock : CalendarClock} className="mb-6"
          title={s.locked ? `Judging closed on ${s.deadlineText}` : s.deadline ? `Deadline: ${s.deadlineText}` : "No deadline set"}
          action={<Link to="/admin/awards/rubric"><Button size="sm">Change</Button></Link>}>
          {s.locked ? "Jurors can read their assessments but can't change them. Move the deadline to reopen." : "After the deadline, assessments lock. Jurors can edit a submitted assessment until then."}
        </Banner>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, organisation" className="pl-9" aria-label="Search jurors" />
        </div>
        <p className="text-sm text-ttfc-muted">{loading ? "Loading…" : `${plural(shown.length, "juror")}`}</p>
      </div>

      {loading ? <LoadingState label="Loading the jury…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={Gavel} title="No jurors yet" body={isManagement ? "Add the jurors, allocate nominations to them, then send each one the invite." : "Management adds the jurors."}
          action={isManagement && <Button variant="primary" icon={UserPlus} onClick={() => setForm({})}>Add juror</Button>} />
      ) : (
        <TableWrap className="mb-8">
          <thead><tr><th>Juror</th><th>Progress</th><th>Last active</th><th>Emails</th>{isManagement && <th className="text-right">Actions</th>}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="is-clickable" onClick={() => setOpenId(r.id)}>
                <td className="min-w-[220px]">
                  <button type="button" className="block text-left font-semibold hover:underline" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>{r.name}</button>
                  <span className="block truncate text-xs text-ttfc-muted">{r.email}</span>
                  {(r.title || r.organisation) && <span className="block truncate text-xs text-ttfc-dim">{[r.title, r.organisation].filter(Boolean).join(", ")}</span>}
                  <span className="mt-1 flex flex-wrap gap-1">
                    {!r.active && <Badge tone="warn">Switched off</Badge>}
                    {r.hasPassword ? <Badge icon={KeyRound}>Password set</Badge> : <Badge icon={Mail}>Code by email</Badge>}
                  </span>
                </td>
                <td className="min-w-[220px]">
                  <ProgressBar done={r.progress.submitted} total={r.progress.assigned} className="mb-1.5" />
                  <span className="text-xs text-ttfc-muted">{progressText(r.progress)}</span>
                </td>
                <td className="whitespace-nowrap text-xs text-ttfc-muted">
                  {r.lastActiveAt ? ago(r.lastActiveAt) : "Never signed in"}
                  {r.lastSavedAt && <span className="block text-ttfc-dim">last saved {ago(r.lastSavedAt)}</span>}
                </td>
                <td className="whitespace-nowrap text-xs">
                  {r.invitedAt ? <span className="flex items-center gap-1 text-emerald-200"><MailCheck className="h-3.5 w-3.5" aria-hidden="true" /> Invited {day(r.invitedAt)}{r.inviteCount > 1 ? ` (${r.inviteCount}×)` : ""}</span> : <span className="text-ttfc-dim">Not invited</span>}
                  {r.remindedAt && <span className="block text-ttfc-muted">Reminded {day(r.remindedAt)}{r.reminderCount > 1 ? ` (${r.reminderCount}×)` : ""}</span>}
                </td>
                {isManagement && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button size="sm" icon={Mail} disabled={!r.active} onClick={() => setSending({ juror: r, kind: "invite" })}>{r.invitedAt ? "Invite again" : "Send invite"}</Button>
                      <Button size="sm" icon={BellRing} disabled={!r.active || r.progress.remaining <= 0} onClick={() => setSending({ juror: r, kind: "reminder" })}>Send reminder</Button>
                      <IconButton icon={Pencil} label={`Edit ${r.name}`} onClick={() => setForm(r)} />
                      <IconButton icon={Trash2} label={`Remove ${r.name}`} onClick={() => setRemoving(r)} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <JuryEmails canEdit={isManagement} />

      {form && <JurorForm juror={form} onClose={() => setForm(null)} onSaved={() => reload()} />}
      <JurorDrawer id={openId} onClose={() => setOpenId("")} />

      <ConfirmDialog
        open={!!sending}
        onClose={() => setSending(null)}
        tone="primary"
        title={sending?.kind === "invite" ? `Email the jury invite to ${sending?.juror.name}?` : `Send ${sending?.juror.name} a reminder?`}
        body={sending ? `To ${sending.juror.email}, from enquire@thetechfestival.com. ${sending.kind === "invite"
          ? `It says they have ${plural(sending.juror.progress.assigned, "nomination")} to review${sending.juror.progress.assigned ? "" : " (nothing allocated yet)"}.`
          : `They have ${plural(sending.juror.progress.remaining, "nomination")} left.`}` : ""}
        confirmLabel={sending?.kind === "invite" ? "Send invite" : "Send reminder"}
        onConfirm={send}
      />
      <ConfirmDialog
        open={remindAll}
        onClose={() => setRemindAll(false)}
        tone="primary"
        title={`Remind ${plural(leftToRemind.length, "juror")} with work left?`}
        body={`One reminder each, from enquire@thetechfestival.com: ${leftToRemind.map((r) => `${r.name} (${r.progress.remaining} left)`).join(", ")}.`}
        confirmLabel="Send reminders"
        onConfirm={sendAll}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name} from the jury?`}
        body={removing ? `They're signed out at once and can't sign in. Their ${plural(removing.progress.assigned + removing.progress.conflicts, "allocation")} come off${removing.progress.submitted ? `, and their ${plural(removing.progress.submitted, "submitted assessment")} stop counting in the results (kept in the records)` : ""}. You can add them again with the same email.` : ""}
        confirmLabel="Remove juror"
        onConfirm={async () => { await api.del(`${JURY}/jurors/${removing.id}`); toast.success(`${removing.name} removed from the jury`); reload(); }}
      />
    </>
  );
}
