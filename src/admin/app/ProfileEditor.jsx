import { useMemo, useState } from "react";
import { Check, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Button, Card, ConfirmDialog, Field, Input, Select, Switch, focusRing } from "../ui";
import { useAdmin } from "../adminContext";
import { FIELDS_OF_WORK, GENDERS, JOB_LEVELS, OBJECTIVES, SALUTATIONS, TOPICS } from "./profileOptions";

/* Full profile editor for an app user (PATCH /api/console/users/:id, only changed fields). */

const TEXT = ["salutation", "name", "email", "gender", "tagline", "jobTitle", "organization", "jobLevel", "fieldOfWork", "linkedinUrl", "country", "meetingSpot", "bannedReason"];
const LISTS = ["topics", "objectives", "availabilitySlots"];

const fromUser = (u) => ({
  ...Object.fromEntries(TEXT.map((k) => [k, u[k] ?? ""])),
  ...Object.fromEntries(LISTS.map((k) => [k, Array.isArray(u[k]) ? u[k] : []])),
  showInList: !u.directoryHidden,
  appOnboarded: !!u.appOnboarded,
  role: u.role === "admin" ? "admin" : "user",
  banned: !!u.banned,
});

/** Only what changed, in the shape the backend expects. */
function diff(form, orig) {
  const out = {};
  for (const k of TEXT) if (String(form[k]).trim() !== String(orig[k]).trim()) out[k] = String(form[k]).trim();
  for (const k of LISTS) if (JSON.stringify(form[k]) !== JSON.stringify(orig[k])) out[k] = form[k];
  if (form.showInList !== orig.showInList) out.directoryHidden = !form.showInList;
  if (form.appOnboarded !== orig.appOnboarded) out.appOnboarded = form.appOnboarded;
  if (form.role !== orig.role) out.role = form.role;
  if (form.banned !== orig.banned) out.banned = form.banned;
  return out;
}

function Section({ title, hint, children }) {
  return (
    <section className="grid gap-4 border-b border-ttfc-line px-5 py-6 last:border-0 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <div>
        <h3 className="text-sm font-semibold text-ttfc-text">{title}</h3>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-ttfc-muted">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Select that keeps an unexpected existing value instead of losing it. */
function OptionSelect({ id, value, options, onChange }) {
  const opts = value && !options.includes(value) ? [...options, value] : options;
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Not set</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </Select>
  );
}

function Chips({ options, value, onChange, label }) {
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {all.map((o) => {
        const on = value.includes(o);
        const extra = !options.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-ttfc-pink/60 bg-ttfc-pink/15 text-white" : "border-ttfc-line text-ttfc-muted hover:border-ttfc-purple/50 hover:text-ttfc-text"} ${focusRing}`}
            title={extra ? "Not one of the app's standard choices" : undefined}
          >
            {on && <Check className="h-3 w-3" aria-hidden="true" />}
            {o}{extra && <span className="text-ttfc-dim">*</span>}
          </button>
        );
      })}
    </div>
  );
}

function SlotList({ value, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v)) { setDraft(""); return; }
    onChange([...value, v].slice(0, 40)); setDraft("");
  };
  return (
    <div className="space-y-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((s) => (
            <li key={s} className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-ttfc-line bg-ttfc-panel2 py-1 pl-3 pr-1 text-xs">
              <span className="truncate">{s}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-ttfc-dim hover:bg-white/10 hover:text-ttfc-text ${focusRing}`}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-ttfc-dim">No times added.</p>}
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} aria-label="New availability slot"
          placeholder="Mon Oct 26 · 2–3 PM · Harbour Ballroom Foyer"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} className="py-2 text-sm" />
        <Button icon={Plus} onClick={add} disabled={!draft.trim()}>Add</Button>
      </div>
    </div>
  );
}

export default function ProfileEditor({ id, user, onSaved, onDelete }) {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const orig = useMemo(() => fromUser(user), [user]);
  const [form, setForm] = useState(orig);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const changes = diff(form, orig);
  const dirty = Object.keys(changes).length > 0;
  const emailBad = form.email.trim() && !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(form.email.trim());
  const nameBad = !form.name.trim();

  const send = async (body) => {
    setSaving(true);
    try {
      const r = await api.patch(`/console/users/${id}`, body);
      toast.success(r.changed?.length ? "Profile saved. Changes appear in the person's app next time it opens." : "Nothing changed");
      onSaved();
    } catch (e) { toast.error(e); throw e; } finally { setSaving(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (nameBad || emailBad) { toast.error(nameBad ? "Name can't be empty" : "Check the email address"); return; }
    if (!dirty) return;
    const body = { ...changes };
    if (body.banned === true || ("bannedReason" in body && form.banned)) body.bannedReason = form.bannedReason.trim();
    const sensitive = [];
    if ("role" in body) sensitive.push(body.role === "admin" ? "give them staff access to this admin panel" : "remove their staff access");
    if ("banned" in body) sensitive.push(body.banned ? "suspend their account" : "reinstate their account");
    if (sensitive.length) { setConfirm({ body, sensitive }); return; }
    try { await send(body); } catch { /* toast shown */ }
  };

  return (
    <form onSubmit={submit} noValidate className="relative">
      <Card className="p-0 sm:p-0">
        <Section title="Identity" hint="How they appear to other attendees.">
          <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
            <Field label="Salutation">{(fid) => <OptionSelect id={fid} value={form.salutation} options={SALUTATIONS} onChange={set("salutation")} />}</Field>
            <Field label="Full name" required error={nameBad ? "Name can't be empty" : undefined}>{(fid) => <Input id={fid} value={form.name} onChange={set("name")} maxLength={120} />}</Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={emailBad ? "That doesn't look like an email address" : undefined} hint="They sign in with this.">{(fid) => <Input id={fid} type="email" value={form.email} onChange={set("email")} />}</Field>
            <Field label="Gender">{(fid) => <OptionSelect id={fid} value={form.gender} options={GENDERS} onChange={set("gender")} />}</Field>
          </div>
          <Field className="mt-4" label="Tagline" hint={`${form.tagline.length}/140 — a one-line intro on their profile.`}>
            {(fid) => <Input id={fid} value={form.tagline} onChange={(e) => set("tagline")(e.target.value.slice(0, 140))} maxLength={140} placeholder="e.g. Building AI tools for hospitals" />}
          </Field>
        </Section>

        <Section title="Work">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title">{(fid) => <Input id={fid} value={form.jobTitle} onChange={set("jobTitle")} />}</Field>
            <Field label="Organization">{(fid) => <Input id={fid} value={form.organization} onChange={set("organization")} />}</Field>
            <Field label="Job level">{(fid) => <OptionSelect id={fid} value={form.jobLevel} options={JOB_LEVELS} onChange={set("jobLevel")} />}</Field>
            <Field label="Field of work">{(fid) => <OptionSelect id={fid} value={form.fieldOfWork} options={FIELDS_OF_WORK} onChange={set("fieldOfWork")} />}</Field>
            <Field label="LinkedIn" className="sm:col-span-2">{(fid) => <Input id={fid} type="url" value={form.linkedinUrl} onChange={set("linkedinUrl")} placeholder="linkedin.com/in/…" />}</Field>
          </div>
        </Section>

        <Section title="Location">
          <Field label="Country">{(fid) => <Input id={fid} value={form.country} onChange={set("country")} placeholder="Canada" className="sm:max-w-xs" />}</Field>
        </Section>

        <Section title="Interests" hint="Topics they follow. Used to match people and personalise Home.">
          <Chips label="Interests" options={TOPICS} value={form.topics} onChange={set("topics")} />
        </Section>

        <Section title="Goals" hint="Why they're attending.">
          <Chips label="Goals" options={OBJECTIVES} value={form.objectives} onChange={set("objectives")} />
          {[...form.topics, ...form.objectives].some((v) => !TOPICS.includes(v) && !OBJECTIVES.includes(v)) && (
            <p className="mt-3 text-xs text-ttfc-dim">* Not one of the app's standard choices — kept from their profile.</p>
          )}
        </Section>

        <Section title="Meeting" hint="Shown when other attendees ask to meet.">
          <Field label="Preferred meeting spot">{(fid) => <Input id={fid} value={form.meetingSpot} onChange={set("meetingSpot")} placeholder="e.g. Coffee bar, Zone A" />}</Field>
          <div className="mt-4">
            <p className="mb-1.5 text-[13px] font-semibold text-ttfc-text/90">Available times</p>
            <SlotList value={form.availabilitySlots} onChange={set("availabilitySlots")} />
          </div>
        </Section>

        <Section title="Visibility & access">
          <div className="space-y-4">
            <Switch label="Show in the attendee list" description="Other attendees can find them in the app's directory." checked={form.showInList} onChange={set("showInList")} />
            <Switch label="Finished app profile" description="Off sends them through the app's profile set-up again next time they open it." checked={form.appOnboarded} onChange={set("appOnboarded")} />
            {isManagement ? (
              <Switch label="Staff (admin) access" description="Can sign in to this admin panel. New staff get the Staff level; change it under Staff accounts." checked={form.role === "admin"} onChange={(v) => set("role")(v ? "admin" : "user")} />
            ) : (
              <p className="text-xs text-ttfc-muted">Staff access: <b className="text-ttfc-text">{form.role === "admin" ? "Yes" : "No"}</b> — only management can change this.</p>
            )}
            <Switch label="Suspended" description="Suspended accounts can't use the app's community features." checked={form.banned} onChange={set("banned")} />
            {form.banned && (
              <Field label="Suspension reason" hint="Visible to staff only.">{(fid) => <Input id={fid} value={form.bannedReason} onChange={set("bannedReason")} />}</Field>
            )}
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 px-5 py-5 sm:px-6">
          <Button variant="dangerOutline" icon={Trash2} onClick={onDelete}>Delete account</Button>
        </div>
      </Card>

      {dirty && (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-col gap-3 rounded-2xl border border-ttfc-pink/40 bg-ttfc-panel2/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur sm:flex-row sm:items-center" role="region" aria-label="Unsaved changes">
          <p className="flex-1 text-sm">
            <b>{Object.keys(changes).length} unsaved change{Object.keys(changes).length === 1 ? "" : "s"}.</b>{" "}
            <span className="text-ttfc-muted">Changes appear in the person's app next time it opens.</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setForm(orig)} disabled={saving}>Discard</Button>
            <Button type="submit" variant="primary" icon={Save} loading={saving}>Save changes</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Confirm access changes"
        body={confirm ? `Saving will ${confirm.sensitive.join(" and ")}.` : ""}
        confirmLabel="Save changes"
        onConfirm={() => send(confirm.body)}
      />
    </form>
  );
}
