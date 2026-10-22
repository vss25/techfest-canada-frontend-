import { useMemo, useState } from "react";
import { Check, Minus, Plus, Save, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useApi } from "../hooks";
import { useToast } from "../toastContext";
import { Button, Card, ConfirmDialog, Field, Input, Select, Switch, focusRing } from "../ui";
import { useAdmin } from "../adminContext";
import { FIELDS_OF_WORK, GENDERS, JOB_LEVELS, OBJECTIVES, SALUTATIONS, TOPICS } from "./profileOptions";
import {
  PERSON_TYPES, RIGHTS, RIGHT_LABELS, TEAM_TYPES, TYPE_LABELS, effectiveRights, effectiveTypes, toggleType,
} from "./personTypes";

/* Full profile editor for an app user (PATCH /api/console/users/:id, only changed fields). */

const ROLES = [
  { value: "user", label: "Attendee", hint: "A regular app account." },
  { value: "admin", label: "Staff", hint: "Can sign in to this admin panel. New staff get the Staff level; change it under Staff accounts." },
  { value: "volunteer", label: "Volunteer", hint: "Volunteers can use the app's staff sign-in for door check-in. They can't open this admin panel." },
];
const roleLabel = (r) => ROLES.find((x) => x.value === r)?.label || "Attendee";

/** What a role change does, for the confirm dialog. */
function roleChangeText(from, to) {
  if (to === "admin") return "give them staff access to this admin panel";
  if (to === "volunteer") return from === "admin" ? "replace their staff access with volunteer access (app check-in only)" : "make them a volunteer (app staff sign-in and door check-in)";
  return from === "volunteer" ? "remove their volunteer access" : "remove their staff access";
}

const TEXT = ["salutation", "name", "email", "gender", "tagline", "jobTitle", "organization", "jobLevel", "fieldOfWork", "linkedinUrl", "country", "meetingSpot", "bannedReason"];
const LISTS = ["topics", "objectives", "availabilitySlots"];

const fromUser = (u) => ({
  ...Object.fromEntries(TEXT.map((k) => [k, u[k] ?? ""])),
  ...Object.fromEntries(LISTS.map((k) => [k, Array.isArray(u[k]) ? u[k] : []])),
  showInList: !u.directoryHidden,
  canMessage: !u.messagesOff,
  canRequest: !u.requestsOff,
  appOnboarded: !!u.appOnboarded,
  role: ROLES.some((r) => r.value === u.role) ? u.role : "user",
  banned: !!u.banned,
  types: Array.isArray(u.types) ? u.types.filter((t) => PERSON_TYPES.includes(t)) : [],
  typesOff: Array.isArray(u.typesOff) ? u.typesOff.filter((t) => PERSON_TYPES.includes(t)) : [],
  vip: !!u.vip,
});
const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/** Only what changed, in the shape the backend expects. */
function diff(form, orig) {
  const out = {};
  for (const k of TEXT) if (String(form[k]).trim() !== String(orig[k]).trim()) out[k] = String(form[k]).trim();
  for (const k of LISTS) if (JSON.stringify(form[k]) !== JSON.stringify(orig[k])) out[k] = form[k];
  if (form.showInList !== orig.showInList) out.directoryHidden = !form.showInList;
  if (form.canMessage !== orig.canMessage) out.messagesOff = !form.canMessage;
  if (form.canRequest !== orig.canRequest) out.requestsOff = !form.canRequest;
  if (form.appOnboarded !== orig.appOnboarded) out.appOnboarded = form.appOnboarded;
  if (form.role !== orig.role) out.role = form.role;
  if (form.banned !== orig.banned) out.banned = form.banned;
  if (!sameList(form.types, orig.types)) out.types = form.types;
  if (!sameList(form.typesOff, orig.typesOff)) out.typesOff = form.typesOff;
  if (form.vip !== orig.vip) out.vip = form.vip;
  return out;
}

/* Automatic types (from the person's role or pass), as they'd be with the role in the form. */
function autoFor(user, role) {
  const fromServer = Array.isArray(user.autoTypes) ? user.autoTypes.filter((a) => a.from === "pass") : [];
  const fromRole = role === "admin" ? [{ type: "staff", from: "role" }] : role === "volunteer" ? [{ type: "volunteer", from: "role" }] : [];
  return [...fromRole, ...fromServer];
}

function TypeChips({ form, auto, holdsPass, onChange, canTeam }) {
  const state = { types: form.types, typesOff: form.typesOff, auto, holdsPass };
  const effective = effectiveTypes(state);
  const autoOf = (t) => auto.find((a) => a.type === t) || (t === "attendee" && holdsPass && !effective.some((x) => x !== "attendee") ? { type: t, from: "pass" } : null);
  return (
    <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
      {PERSON_TYPES.map((t) => {
        const on = effective.includes(t);
        const a = autoOf(t);
        const switchedOff = !on && form.typesOff.includes(t) && (a || (t === "attendee" && holdsPass));
        const locked = TEAM_TYPES.includes(t) && !canTeam;
        const note = on && a && !form.types.includes(t) ? (a.from === "role" ? "from role" : "from pass") : switchedOff ? "switched off" : "";
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            disabled={locked}
            title={locked ? "Only management can change the Staff and Volunteer types" : undefined}
            onClick={() => onChange(toggleType(t, state, !on))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${on ? "border-ttfc-pink/60 bg-ttfc-pink/15 text-ttfc-contrast" : "border-ttfc-line text-ttfc-muted hover:border-ttfc-purple/50 hover:text-ttfc-text"} ${focusRing}`}
          >
            {on && <Check className="h-3 w-3" aria-hidden="true" />}
            {TYPE_LABELS[t]}
            {note && <span className={`font-normal ${switchedOff ? "text-ttfc-dim line-through" : "text-ttfc-muted"}`}>· {note}</span>}
          </button>
        );
      })}
    </div>
  );
}

function RightsSummary({ rights }) {
  return (
    <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2" aria-label="What they can do in the app">
      {RIGHTS.map((r) => (
        <li key={r} className={`flex items-center gap-2 text-sm ${rights[r] ? "text-ttfc-text" : "text-ttfc-dim"}`}>
          {rights[r]
            ? <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            : <Minus className="h-4 w-4 shrink-0 text-ttfc-dim" aria-hidden="true" />}
          <span>{RIGHT_LABELS[r]}<span className="sr-only">{rights[r] ? ": yes" : ": no"}</span></span>
        </li>
      ))}
    </ul>
  );
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
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-ttfc-pink/60 bg-ttfc-pink/15 text-ttfc-contrast" : "border-ttfc-line text-ttfc-muted hover:border-ttfc-purple/50 hover:text-ttfc-text"} ${focusRing}`}
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
                className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-ttfc-dim hover:bg-ttfc-contrast/10 hover:text-ttfc-text ${focusRing}`}>
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
  // Live preview of their rights from the App rights matrix (the server decides on save).
  const matrix = useApi("/console/app-rights");
  const auto = autoFor(user, form.role);
  const holdsPass = !!user.holdsPass;
  const liveTypes = effectiveTypes({ types: form.types, typesOff: form.typesOff, auto, holdsPass });
  const rights = matrix.data?.matrix
    ? effectiveRights(liveTypes, matrix.data.matrix, { role: form.role, messagesOff: !form.canMessage, requestsOff: !form.canRequest }, matrix.data.flags)
    : user.rights || {};

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
    if ("role" in body) sensitive.push(roleChangeText(orig.role, body.role));
    if ("banned" in body) sensitive.push(body.banned ? "suspend their account" : "reinstate their account");
    const before = effectiveTypes({ types: orig.types, typesOff: orig.typesOff, auto: autoFor(user, orig.role), holdsPass });
    if (liveTypes.includes("staff") && !before.includes("staff")) sensitive.push("give them the Staff type (moderation, post removal and check-in in the app)");
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

        <Section title="Type" hint="What they are at TTFC. Their types decide what they can do in the app.">
          <TypeChips form={form} auto={auto} holdsPass={holdsPass} canTeam={isManagement}
            onChange={(next) => setForm((f) => ({ ...f, ...next }))} />
          <p className="mt-3 text-xs leading-relaxed text-ttfc-muted">
            Types marked from pass or from role are automatic. Switch one off to hide it for this person.
            {holdsPass && " Delegate is automatic for pass holders with no other type; add it to give them delegate abilities as well."}
          </p>
          <div className="mt-4 rounded-2xl border border-ttfc-line p-4">
            <Switch label="VIP" checked={form.vip} onChange={set("vip")}
              description={`Shows the VIP badge in the app. It doesn't change what they can do: their types do.${user.vipFrom === "pass" ? " Now set on a pass of theirs." : ""}`} />
          </div>
          <div className="mt-5 rounded-2xl border border-ttfc-line bg-ttfc-panel2/60 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-ttfc-text">What they can do in the app</h4>
              <Link to="/admin/app/rights" className="text-xs font-semibold text-ttfc-muted hover:text-ttfc-text hover:underline">Edit app rights by type</Link>
            </div>
            <RightsSummary rights={rights} />
            <p className="mt-3 text-xs text-ttfc-dim">
              {dirty ? "Preview with your unsaved changes, including the contact switches below." : "From their types, the App rights screen and the contact switches below."}
            </p>
          </div>
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
            <Switch label="Show in the attendee list" description="Other attendees can find them in the app's directory. Everyone is listed unless staff switch this off; people can't hide themselves." checked={form.showInList} onChange={set("showInList")} />
            <Switch label="Can be messaged" description="Other attendees can send them a message in the app." checked={form.canMessage} onChange={set("canMessage")} />
            <Switch label="Can receive connection requests" description="Other attendees can ask to connect in the app. Scanning their badge in person still works." checked={form.canRequest} onChange={set("canRequest")} />
            <p className="text-xs leading-relaxed text-ttfc-muted">For VIPs such as ministers who may not reply. People they've accepted or written to can still message them; staff always can. Hiding them from the list is separate.</p>
            <Switch label="Finished app profile" description="Off sends them through the app's profile set-up again next time they open it." checked={form.appOnboarded} onChange={set("appOnboarded")} />
            {isManagement ? (
              <Field label="Role" hint={ROLES.find((r) => r.value === form.role)?.hint}>
                {(fid) => (
                  <Select id={fid} value={form.role} onChange={set("role")} className="sm:max-w-xs">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                )}
              </Field>
            ) : (
              <p className="text-xs text-ttfc-muted">Role: <b className="text-ttfc-text">{roleLabel(form.role)}</b>. Only management can change this.</p>
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
