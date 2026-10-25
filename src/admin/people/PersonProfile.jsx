import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, ArrowLeft, BellRing, Check, Coffee, Crown, ExternalLink, ImagePlus, Info, Linkedin, Mail, Mic2, Pencil, Smartphone, Store, Ticket, Trash2,
  Trophy, Utensils, Wine,
} from "lucide-react";
import { useApi } from "../hooks";
import { ADMIN_API, adminFetch, api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, ConfirmDialog, ErrorState, Field, Input, LoadingState, Modal, SectionTitle, Select, Switch, focusRing,
} from "../ui";
import { when, day, initials } from "../format";
import RsvpEditor from "./RsvpEditor";
import LogoPicker, { CompanyMark } from "./LogoPicker";
import CodeLabel from "./CodeLabel";
import { HideCard, HiddenBadge } from "./HideFromApp";
import { MediaMark, PassBand } from "./MediaBadges";
import { MEDIA, MEDIA_HELP, isMedia, otherTypes } from "./mediaMark";
import { TEAM_TYPES, effectiveTypes, toggleType } from "../app/personTypes";
import {
  ATTENDING_HINT, ATTENDING_LABELS, ATTENDING_STAGE_HINTS, ATTENDING_STAGE_LABELS, ATTENDING_TONE, OPENS_NOTE, TRACKED_FROM, nudgeCount, times,
  DAY_SHORT, EXTRAS, PASS_STATUS_HINTS, PASS_STATUS_LABELS, PASS_STATUS_TONE, PASS_TIERS, PERSON_TYPES, passExtras, passName, RSVP_EMAIL_HINT, RSVP_STATUS_LABELS, RSVP_STATUS_TONE,
  TYPE_LABELS, TYPE_TONE, VALUE_BAND_HINTS, VALUE_BAND_LABELS, VALUE_BAND_TONE, VIP_LABEL, VIP_TONE, personPath,
} from "./peopleMeta";

/* =========================================================
   Admin → People → a person (/admin/people/:id)
   Everything about one person, joined from their account,
   passes, RSVP and the speaker list (GET /console/people/:id).
   Staff edit any detail (PATCH: first and last name, email
   (management: their sign-in), phone, company, job title,
   LinkedIn, their types (Media and Staff among them since Oct 20
   2026), Is Exhibitor, VIP and "RSVP Email Sent"),
   and every record they're made of follows (account, passes,
   RSVPs). Per pass (PATCH …/passes/:ticketId): its meals and
   events (CxO Breakfasts, Networking Luncheons, the Gala Dinner &
   Networking Reception, the Catalyst Awards Night: each Automatic,
   Yes or No), and for management the pass itself (Connect,
   Influence, Power, Apex or the internal Speaker Pass, no charge)
   and the ticket value of a
   pass paid outside Stripe, and (Oct 24 2026) "Undo check-in" on a
   checked-in pass (POST …/passes/:ticketId/checkin-reset, after an
   inline confirm). The RSVP (RsvpEditor, add-only on an
   attendee's own), the company logo (LogoPicker), and Delete
   person (management: GET …/delete-plan, then DELETE with their
   full name). Their app contact card is read-only. Holding a
   Speaker Pass makes someone the Speaker type; exhibitors hold
   Connect Passes and Exhibitor is their type.
   Emails card (Oct 19 2026, staff too): one RSVP reminder or one
   "I'm attending" LinkedIn nudge to this person (POST …/reminder,
   …/nudge), with the same cool-downs and skip rules as the sends
   to a view; the server says whether each can go now and why not
   (`outreach`). Each row also says what they did (`person.engagement`,
   emails sent from Oct 19 and every RSVP link): I'm attending: opened
   the email, opened their page, posted on LinkedIn (with the post) or
   shared / opened LinkedIn without a confirmation; RSVP: which RSVP
   email they opened, when they opened the form, whether they sent it.
   Hide from app (Oct 21 2026, HideFromApp.jsx): staff and moderators
   hide someone causing trouble (shadow mode, they aren't told), with
   a private note; shown again with the option to take down what they
   posted while hidden. "Hidden from app" by their name.
   Media Yes / No (Oct 23 2026, the organiser: "Media has privilege of
   power pass with breakfast. Media yes is dark blue pass."): a switch
   next to VIP (PATCH { media }, for accounts and pass-only people
   alike; it's no longer one of the type chips, so there is one control),
   the dark-blue Media mark by their name and their pass in its door
   colour ("Media · Connect Pass", the server's `band`).
========================================================= */

const DETAIL_KEYS = ["firstName", "lastName", "email", "phone", "linkedinUrl", "company", "jobTitle"];
const STORED = { cloudinary: "Cloudinary", sanity: "Sanity", database: "our database", existing: "the website's own logos" };
const SOURCE = {
  current: "the current default", cms: "the website's partners and sponsors", site: "their website", google: "Google's favicon service",
  duckduckgo: "DuckDuckGo", wikimedia: "Wikimedia Commons", url: "a link staff pasted", upload: "a file staff uploaded",
};
const sameList = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const MARKS = [{ key: "auto", label: "Automatic" }, { key: "yes", label: "Yes" }, { key: "no", label: "No" }];
const markKey = (m) => (m === true ? "yes" : m === false ? "no" : "auto");

/* Their types as chips. An account: the App › People rules (stored types, automatic ones from their role
   and passes, typesOff), Exhibitor is the Exhibitor switch. A pass-only person: Exhibitor is saved on their
   passes, Speaker comes from holding a Speaker Pass; the other types need an app account. Media isn't a chip:
   it has its own Yes / No switch (MediaSwitch), so there's one control for it. */
const CHIP_TYPES = PERSON_TYPES.filter((t) => t !== "media");
function TypeChips({ p, state, setState, exhibitor, setExhibitor, disabled, canTeam }) {
  const acc = p.account;
  const chips = CHIP_TYPES.map((t) => {
    if (t === "exhibitor") return { t, on: exhibitor, toggle: () => setExhibitor(!exhibitor), note: p.exhibitorPass && exhibitor ? "from pass" : "" };
    if (!acc) {
      if (t === "speaker") {
        const on = p.types.includes("speaker");
        const from = p.passes?.some((x) => x.tier === "speaker") ? "from pass" : p.speaker ? "speaker list" : "automatic";
        return { t, on, locked: "Automatic: from a Speaker Pass or the website's speaker list", note: on ? from : "" };
      }
      if (t === "attendee") return { t, on: p.types.includes("attendee"), locked: "Automatic for someone with a pass and no other type", note: p.types.includes("attendee") ? "automatic" : "" };
      return { t, on: false, locked: "Needs an app account: this type is saved on their account" };
    }
    const auto = acc.autoTypes || [];
    const live = { types: state.types, typesOff: state.typesOff, auto, holdsPass: acc.holdsPass };
    const on = effectiveTypes(live).includes(t);
    const a = auto.find((x) => x.type === t) || (t === "attendee" && acc.holdsPass && !effectiveTypes(live).some((x) => x !== "attendee") ? { from: "pass" } : null);
    const switchedOff = !on && state.typesOff.includes(t) && !!a;
    return {
      t, on,
      toggle: () => setState(toggleType(t, live, !on)),
      locked: TEAM_TYPES.includes(t) && !canTeam ? "Only management can change the Staff and Volunteer types" : "",
      note: on && a && !state.types.includes(t) ? (a.from === "role" ? "from role" : "from pass") : switchedOff ? "switched off" : "",
      off: switchedOff,
    };
  });
  return (
    <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button key={c.t} type="button" aria-pressed={c.on} disabled={disabled || !!c.locked || !c.toggle} title={c.locked || undefined} onClick={c.toggle}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${c.on ? "border-ttfc-pink/60 bg-ttfc-pink/15 text-ttfc-contrast" : "border-ttfc-line text-ttfc-muted hover:border-ttfc-purple/50 hover:text-ttfc-text"} ${focusRing}`}>
          {c.on && <Check className="h-3 w-3" aria-hidden="true" />}
          {TYPE_LABELS[c.t]}
          {c.note && <span className={`font-normal ${c.off ? "text-ttfc-dim line-through" : "text-ttfc-muted"}`}>· {c.note}</span>}
        </button>
      ))}
    </div>
  );
}

/* Media Yes / No, next to VIP, in Media's dark blue. Saved with PATCH { media }: an account's media type, or their
   passes when they have no account (the account that claims one is Media too). */
function MediaSwitch({ p, media, setMedia, disabled }) {
  const fromPass = media && p.account && p.mediaPass && !(p.account.types || []).includes("media");
  return (
    <div className="mt-3 rounded-2xl border p-4 transition"
      style={media ? { borderColor: MEDIA.bg, background: "rgba(11, 61, 145, 0.14)", boxShadow: `inset 4px 0 0 ${MEDIA.bg}` } : { boxShadow: `inset 4px 0 0 ${MEDIA.bg}` }}
      data-media={media ? "yes" : "no"}>
      <Switch checked={media} onChange={setMedia} disabled={disabled} label="Media" onColor={MEDIA.bg} description={MEDIA_HELP} />
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-relaxed text-ttfc-muted">
        {media ? <MediaMark /> : <span className="font-semibold text-ttfc-text">No</span>}
        <span>
          {media ? "On any pass: the CxO Breakfasts, Networking Luncheons, Gala Dinner and Catalyst Awards Night. Their pass shows dark blue at the door and here."
            : "Yes gives Power Pass privileges with the CxO Breakfasts on any pass, and the dark-blue pass colour."}
          {" "}A pass's own Yes / No below still wins.
        </span>
      </p>
      {fromPass && <p className="mt-1 text-xs text-ttfc-muted">From a pass of theirs marked Media.</p>}
      {media && !p.account && <p className="mt-1 text-xs text-ttfc-muted">Saved on their passes (no app account yet).</p>}
    </div>
  );
}

function DetailsCard({ p, onSaved }) {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const e = p.edit || {};
  const start = {
    firstName: p.firstName || (p.name === "No name" ? "" : p.name), lastName: p.lastName || "", email: p.email, phone: p.phone || "",
    linkedinUrl: p.linkedinUrl, company: p.company, jobTitle: p.jobTitle,
  };
  const startTypes = { types: p.account?.types || [], typesOff: p.account?.typesOff || [] };
  const startMark = markKey(p.rsvpEmail?.mark);
  const [form, setForm] = useState(start);
  const [types, setTypes] = useState(startTypes);
  const [exhibitor, setExhibitor] = useState(!!p.exhibitor);
  const [vip, setVip] = useState(!!p.vip);
  // Media Yes / No: an account's media type, or saved on a pass-only person's passes (PATCH { media } either way).
  const startMedia = isMedia(p);
  const [media, setMedia] = useState(startMedia);
  const [mark, setMark] = useState(startMark);
  const [saving, setSaving] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [error, setError] = useState(null);
  const changed = DETAIL_KEYS.filter((k) => (form[k] || "").trim() !== (start[k] || "").trim() && (k !== "email" || e.canEditEmail) && (k !== "phone" || e.canEditPhone));
  const typesChanged = !!p.account && (!sameList(types.types, startTypes.types) || !sameList(types.typesOff, startTypes.typesOff));
  const exChanged = exhibitor !== !!p.exhibitor;
  const vipChanged = vip !== !!p.vip;
  const mediaChanged = media !== startMedia;
  const markChanged = mark !== startMark;
  const dirty = changed.length || typesChanged || exChanged || vipChanged || mediaChanged || markChanged;
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const disabled = !e.canEdit;
  const emailChanged = changed.includes("email");

  const reset = () => { setForm(start); setTypes(startTypes); setExhibitor(!!p.exhibitor); setVip(!!p.vip); setMedia(startMedia); setMark(startMark); setError(null); };
  const save = async () => {
    setSaving(true); setError(null);
    const body = {};
    for (const k of changed) {
      if (k === "firstName" || k === "lastName") { body.firstName = form.firstName.trim(); body.lastName = form.lastName.trim(); }
      else body[k] = form[k].trim();
    }
    if (typesChanged) { body.types = types.types; body.typesOff = types.typesOff; }
    if (exChanged) body.exhibitor = exhibitor;
    if (vipChanged) body.vip = vip;
    if (mediaChanged) body.media = media;
    if (markChanged) body.rsvpEmailSent = mark === "auto" ? null : mark === "yes";
    try {
      await api.patch(`/console/people/${encodeURIComponent(p.id)}`, body);
      toast.success(emailChanged && p.account ? "Saved. They sign in with the new email from now on." : "Saved");
      onSaved();
    } catch (err) { setError(err); throw err; } finally { setSaving(false); }
  };
  const onSave = () => (emailChanged && p.account ? setConfirmEmail(true) : save().catch(() => {}));

  return (
    <Card>
      <SectionTitle hint={e.where === "account" ? "Saved on their app account, their passes and their RSVP" : e.where === "pass" ? "Saved on their passes and RSVP (they have no app account yet)" : undefined}>Details</SectionTitle>
      {e.reason && <Banner tone="info" icon={Info} className="mb-4">{e.reason}</Banner>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">{(id) => <Input id={id} value={form.firstName} onChange={set("firstName")} maxLength={80} disabled={disabled} autoComplete="off" />}</Field>
        <Field label="Last name">{(id) => <Input id={id} value={form.lastName} onChange={set("lastName")} maxLength={80} disabled={disabled} autoComplete="off" />}</Field>
        <Field label="Email" hint={e.canEdit && !e.canEditEmail ? "Only management can change email addresses." : p.account ? "Their sign-in email for the app and website." : undefined}>
          {(id) => <Input id={id} type="email" value={form.email} onChange={set("email")} maxLength={200} disabled={disabled || !e.canEditEmail} autoComplete="off" />}
        </Field>
        <Field label="Phone" hint={!e.canEditPhone && e.canEdit ? "Kept with their pass: they need a pass first." : undefined}>
          {(id) => <Input id={id} type="tel" value={form.phone} onChange={set("phone")} maxLength={30} placeholder="+1 416 555 0100" disabled={disabled || !e.canEditPhone} autoComplete="off" />}
        </Field>
        <Field label="Company">{(id) => <Input id={id} value={form.company} onChange={set("company")} maxLength={160} disabled={disabled} />}</Field>
        <Field label="Job title">{(id) => <Input id={id} value={form.jobTitle} onChange={set("jobTitle")} maxLength={160} disabled={disabled} />}</Field>
        <Field label="LinkedIn" className="sm:col-span-2">{(id) => <Input id={id} value={form.linkedinUrl} onChange={set("linkedinUrl")} maxLength={300} placeholder="https://www.linkedin.com/in/…" inputMode="url" disabled={disabled} />}</Field>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Type</p>
        <TypeChips p={p} state={types} setState={setTypes} exhibitor={exhibitor} setExhibitor={setExhibitor}
          disabled={disabled} canTeam={isManagement} />
        <p className="mt-2 text-xs leading-relaxed text-ttfc-dim">
          Holding a Speaker Pass makes them a Speaker. Speakers and VIPs get the CxO Breakfasts on any pass; Media get Power Pass privileges with the CxO Breakfasts on any pass (the Media switch below).
          Their pass colour, at the door and in the app: VIP gold, Media dark blue, Speaker red, Staff purple, Volunteer orange, any other pass green.
          {!p.account && " Without an app account, Exhibitor and Media are saved on their passes and Speaker comes from a Speaker Pass; the other types need an account."}
        </p>
      </div>
      <div className="mt-5 rounded-2xl border border-ttfc-line p-4">
        <Switch checked={exhibitor} onChange={setExhibitor} disabled={disabled || !e.canEditExhibitor} label="Is Exhibitor"
          description="Yes for exhibitor pass holders and anyone staff mark, No for everyone else. The apps use the same answer." />
        {p.exhibitor && !exhibitor && p.exhibitorPass && (
          <p className="mt-2 text-xs text-amber-200/90">This also removes their exhibitor badge and booth in the app.</p>
        )}
      </div>
      <div className="mt-3 rounded-2xl border border-ttfc-line p-4">
        <Switch checked={vip} onChange={setVip} disabled={disabled || !e.canEditVip} label="VIP"
          description="Shows the VIP badge in the app and gives the CxO Breakfasts on any pass. It doesn't change what they can do there: their type does." />
        {p.vip && p.vipFrom === "pass" && (
          <p className="mt-2 text-xs text-ttfc-muted">Set on their pass before they had an app account.</p>
        )}
      </div>
      <MediaSwitch p={p} media={media} setMedia={setMedia} disabled={disabled || !e.canEditMedia} />
      <div className="mt-3 rounded-2xl border border-ttfc-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Mail className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
          <span className="text-sm font-semibold">RSVP Email Sent</span>
          <Badge tone={p.rsvpEmail?.sent ? "good" : "neutral"}>{p.rsvpEmail?.sent ? "Yes" : "No"}</Badge>
          <div role="radiogroup" aria-label="RSVP email sent" className="ml-auto inline-flex rounded-xl border border-ttfc-line p-0.5">
            {MARKS.map((m) => (
              <button key={m.key} type="button" role="radio" aria-checked={mark === m.key} disabled={disabled || !e.canEditRsvpEmail}
                onClick={() => setMark(m.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed ${mark === m.key ? "bg-ttfc-contrast/10 text-ttfc-text" : "text-ttfc-muted hover:text-ttfc-text"}`}>
                {m.key === "auto" ? `Automatic (${p.rsvpEmail?.auto?.sent ? "Yes" : "No"})` : m.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ttfc-dim">
          Automatic counts the emails sent from this panel. Mark Yes for an RSVP email sent another way (from your own inbox, say), or No to override.
          {p.rsvpEmail?.mark !== null && p.rsvpEmail?.markedBy ? ` Marked by ${p.rsvpEmail.markedBy}${p.rsvpEmail.markedAt ? `, ${when(p.rsvpEmail.markedAt)}` : ""}.` : ""}
        </p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error.message}</p>}
      {!disabled && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={onSave}>Save details</Button>
          {dirty ? <Button onClick={reset} disabled={saving}>Undo changes</Button> : null}
        </div>
      )}
      <ConfirmDialog open={confirmEmail} onClose={() => setConfirmEmail(false)} onConfirm={save} tone="primary" confirmLabel="Change email"
        title="Change their sign-in email?"
        body={`They'll sign in to the app and the website with ${form.email.trim() || "the new address"} from now on, and ${start.email || "the old address"} stops working for sign-in. The change is logged.`} />
    </Card>
  );
}

function LogoCard({ p, onSaved }) {
  const toast = useToast();
  const [picker, setPicker] = useState(false);
  const [clear, setClear] = useState(false);
  const c = p.companyRecord;
  const canOwn = p.edit?.where !== "none";
  const remove = async () => {
    const body = p.logoFrom === "person" ? { personId: p.id } : { name: p.company };
    await api.post("/console/companies/logo/clear", body);
    toast.success(p.logoFrom === "person" ? "Back to the company's logo" : `Logo removed for everyone at ${p.company}`);
    onSaved();
  };
  return (
    <Card>
      <SectionTitle hint="Everyone at a company shows its default logo. A person can have their own instead.">Company logo</SectionTitle>
      <div className="flex items-center gap-4">
        <CompanyMark url={p.logoUrl} name={p.company} size="lg" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{p.company || <span className="text-ttfc-dim">No company yet</span>}</p>
          <p className="text-ttfc-muted">
            {p.logoFrom === "person" ? "Their own logo" : p.logoFrom === "company" ? "The company's default" : "No logo yet"}
            {p.logoFrom === "company" && c?.logoSource ? ` · from ${SOURCE[c.logoSource] || c.logoSource}` : ""}
          </p>
          {p.logoFrom === "company" && c?.updatedBy && (
            <p className="text-xs text-ttfc-dim">Set by {c.updatedBy}, {when(c.updatedAt)}{c.logoStore ? ` · kept in ${STORED[c.logoStore] || c.logoStore}` : ""}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button icon={ImagePlus} onClick={() => setPicker(true)} disabled={!p.company && !canOwn}>{p.logoUrl ? "Change logo" : "Find a logo"}</Button>
        {p.logoUrl && <Button variant="ghost" icon={Trash2} onClick={() => setClear(true)}>{p.logoFrom === "person" ? "Use the company's" : "Remove"}</Button>}
      </div>
      {!p.company && <p className="mt-2 text-xs text-ttfc-dim">Add their company in Details to give it a logo.</p>}
      {picker && (
        <LogoPicker open onClose={() => setPicker(false)} company={p.company} domain={c?.domain || p.suggestedDomain} personId={p.id}
          personName={p.name} canOwn={canOwn} onSaved={onSaved} />
      )}
      <ConfirmDialog open={clear} onClose={() => setClear(false)} onConfirm={remove}
        title={p.logoFrom === "person" ? "Use the company's logo?" : `Remove ${p.company}'s logo?`}
        body={p.logoFrom === "person" ? "Their own logo is removed and they show the company's default again." : "Nobody at this company shows a logo until you set a new one."}
        confirmLabel={p.logoFrom === "person" ? "Use the company's" : "Remove logo"} tone={p.logoFrom === "person" ? "primary" : "danger"} />
    </Card>
  );
}

const money = (v) => `${Number(v).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`;
const EXTRA_CHOICES = [{ key: "auto", label: "Automatic" }, { key: "yes", label: "Yes" }, { key: "no", label: "No" }];
const EXTRA_ICON = { cxo: Coffee, lunch: Utensils, gala: Wine, awards: Trophy };
const VALUE_SOURCE = { stripe: "from Stripe", manual: "manual", staff: "staff-made pass", unknown: "" };

/* The meals and events on one pass, each Automatic (the pass's rule), Yes or No for this pass only
   (PATCH …/passes/:ticketId { extras: { <key>: true | false | null } }, audited). An older server sends only
   the CxO Breakfasts (cxoBreakfast): then only that row shows, saved the old way. */
function ExtrasSwitches({ personId, t, canEdit, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const extras = passExtras(t);
  const rows = t.extras ? EXTRAS : EXTRAS.filter((x) => x.key === "cxo");
  const pick = async (x, key) => {
    const e = extras[x.key] || {};
    const current = e.override === true ? "yes" : e.override === false ? "no" : "auto";
    if (key === current || busy) return;
    setBusy(`${x.key}:${key}`);
    const value = key === "auto" ? null : key === "yes";
    try {
      await api.patch(`/console/people/${encodeURIComponent(personId)}/passes/${encodeURIComponent(t.ticketId)}`, t.extras ? { extras: { [x.key]: value } } : { cxoBreakfast: value });
      toast.success(`${x.label} ${key === "auto" ? "back to automatic" : key === "yes" ? "added to" : "taken off"} ${t.ticketId.toUpperCase()}`);
      onSaved();
    } catch (err) { toast.error(err); } finally { setBusy(""); }
  };
  return (
    <div className="w-full border-t border-ttfc-line pt-2">
      <p className="mb-1.5 text-xs font-semibold text-ttfc-text">Meals and events on this pass</p>
      <ul className="space-y-1.5">
        {rows.map((x) => {
          const e = extras[x.key] || {};
          const current = e.override === true ? "yes" : e.override === false ? "no" : "auto";
          const Icon = EXTRA_ICON[x.key];
          return (
            <li key={x.key} className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-ttfc-muted" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs text-ttfc-text" title={`Automatic: ${x.auto}`}>{x.label}</span>
                <Badge tone={e.included ? "good" : "neutral"}>{e.included ? "Yes" : "No"}</Badge>
              </span>
              <div role="radiogroup" aria-label={`${x.label} for ${t.ticketId.toUpperCase()}`} className="inline-flex shrink-0 rounded-xl border border-ttfc-line p-0.5">
                {EXTRA_CHOICES.map((c) => (
                  <button key={c.key} type="button" role="radio" aria-checked={current === c.key} disabled={!canEdit || !!busy}
                    onClick={() => pick(x, c.key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed ${current === c.key ? "bg-ttfc-contrast/10 text-ttfc-text" : "text-ttfc-muted hover:text-ttfc-text"} ${busy === `${x.key}:${c.key}` ? "opacity-60" : ""}`}>
                    {c.key === "auto" ? `Automatic (${e.auto ? "Yes" : "No"})` : c.label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Change a pass (management): one of the four on sale or the internal Speaker Pass; no charge; inventory moves
   like an upgrade for the passes on sale (the Speaker Pass has no inventory). */
function PassTypeChange({ p, t, onSaved }) {
  const toast = useToast();
  const [tier, setTier] = useState(t.tier);
  const [confirm, setConfirm] = useState(false);
  const name = passName(tier);
  const an = /^[AEIOU]/.test(name) ? "an" : "a";
  const save = async () => {
    const r = await api.patch(`/console/people/${encodeURIComponent(p.id)}/passes/${encodeURIComponent(t.ticketId)}`, { tier });
    toast.success(`${t.ticketId.toUpperCase()} is now ${an} ${name}`);
    for (const w of r?.warnings || []) toast.error(w);
    onSaved();
  };
  const note = tier === "speaker"
    ? " Holding a Speaker Pass makes them a Speaker, with the CxO Breakfasts and the VIP Lounge."
    : t.tier === "speaker" ? " Without the Speaker Pass they're a Speaker only if staff gave them the type or they're on the speaker list." : "";
  const counts = tier === "speaker" || t.tier === "speaker"
    ? " The Speaker Pass isn't in the inventory, so only the pass on sale's count changes."
    : " The ticket counts move from one pass to the other in the inventory.";
  return (
    <div className="flex w-full flex-wrap items-center gap-2 border-t border-ttfc-line pt-2">
      <Ticket className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
      <label htmlFor={`tier-${t.ticketId}`} className="text-xs font-semibold text-ttfc-text">Pass</label>
      <Select id={`tier-${t.ticketId}`} value={tier} onChange={(e) => setTier(e.target.value)} className="ml-auto w-auto min-w-[170px] py-1.5 text-xs">
        {PASS_TIERS.map((x) => <option key={x.key} value={x.key}>{x.key === "speaker" ? x.label : `${x.label} Pass`}</option>)}
      </Select>
      <Button size="sm" disabled={tier === t.tier} onClick={() => setConfirm(true)}>Change pass</Button>
      <ConfirmDialog open={confirm} onClose={() => { setConfirm(false); }} onConfirm={save} tone="primary" confirmLabel={`Make it ${an} ${name}`}
        title={`Change ${t.ticketId.toUpperCase()} to ${an} ${name}?`}
        body={`From ${t.label} to ${name}, with no charge. Their app, Wallet pass and RSVP page follow; what they already chose in their RSVP stays.${note}${counts} The change is logged.`} />
    </div>
  );
}

/* Ticket value after payment for a pass paid outside Stripe (management): typed, shown as "manual". */
function ManualValue({ p, t, onSaved }) {
  const toast = useToast();
  const has = t.manualValue !== null && t.manualValue !== undefined;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(has ? String(t.manualValue) : "");
  const [note, setNote] = useState(t.manualValueNote || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const send = async (manualValue) => {
    setBusy(true); setError("");
    try {
      await api.patch(`/console/people/${encodeURIComponent(p.id)}/passes/${encodeURIComponent(t.ticketId)}`, { manualValue, manualValueNote: note.trim() });
      toast.success(manualValue === null ? "Ticket value worked out again" : `Ticket value set to ${money(manualValue)}`);
      setOpen(false);
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  if (!open) {
    return (
      <span className="flex w-full flex-wrap items-center gap-2 text-xs text-ttfc-muted">
        <span>{has ? `Paid outside Stripe${t.manualValueNote ? `: ${t.manualValueNote}` : ""}${t.manualValueBy ? ` · set by ${t.manualValueBy}` : ""}` : "Paid by invoice or bank transfer?"}</span>
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setOpen(true)}>{has ? "Change amount" : "Set amount paid"}</Button>
      </span>
    );
  }
  return (
    <div className="w-full rounded-xl border border-ttfc-line p-3">
      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
        <Field label="Amount paid (CAD, before HST)">{(id) => <Input id={id} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
        <Field label="Note (optional)">{(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Invoice 1042, bank transfer 14 Oct" />}</Field>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-200">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" loading={busy} disabled={amount.trim() === "" || Number(amount) < 0} onClick={() => send(Number(amount))}>Save amount</Button>
        {has && <Button size="sm" variant="ghost" disabled={busy} onClick={() => send(null)}>Clear</Button>}
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/* Undo a door check-in (management, Oct 24 2026: passes collected by test scans before the event would scan amber
   "Already checked in" on the day). POST …/passes/:ticketId/checkin-reset, after an inline confirm: the pass is
   not collected any more (the check-in desk too), their next scan checks them in, and it's logged. */
function UndoCheckIn({ p, t, onSaved }) {
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const undo = async () => {
    setBusy(true); setError("");
    try {
      await api.post(`/console/people/${encodeURIComponent(p.id)}/passes/${encodeURIComponent(t.ticketId)}/checkin-reset`);
      toast.success(`${t.ticketId.toUpperCase()}: check-in undone. Their next scan checks them in.`);
      setAsking(false);
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  if (!asking) return <Button size="sm" variant="ghost" onClick={() => setAsking(true)}>Undo check-in</Button>;
  return (
    <div role="group" aria-label={`Undo the check-in of ${t.ticketId.toUpperCase()}`} className="w-full rounded-xl border border-amber-300/40 bg-amber-400/5 p-3 text-xs">
      <p className="text-ttfc-text">
        Undo the door check-in{t.checkedInAt ? ` from ${when(t.checkedInAt)}` : ""}? The pass shows as not collected (the check-in desk too) and their next scan checks them in. It's logged.
      </p>
      {error && <p role="alert" className="mt-2 text-red-200">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="dangerOutline" loading={busy} onClick={undo}>Undo check-in</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setAsking(false); setError(""); }}>Cancel</Button>
      </div>
    </div>
  );
}

function PassesCard({ p, onSaved }) {
  const { isManagement } = useAdmin();
  const e = p.edit || {};
  return (
    <Card>
      <SectionTitle hint="Connect, Influence, Power, Apex, or the internal Speaker Pass. Exhibitors hold Connect Passes: Exhibitor is their type.">Pass</SectionTitle>
      {!p.passes?.length ? (
        <p className="text-sm text-ttfc-muted">None.</p>
      ) : (
        <ul className="space-y-3">
          {p.passes.map((t) => (
            <li key={t.ticketId} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-3 py-2.5 text-sm ${t.hidden ? "opacity-60" : ""}`}>
              <Ticket className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
              <span className="font-semibold">{t.label}</span>
              <span title={PASS_STATUS_HINTS[t.status]}><Badge tone={PASS_STATUS_TONE[t.status]}>{PASS_STATUS_LABELS[t.status]}</Badge></span>
              {t.tier === "speaker" && <span title="Never sold or listed on the website: Power Pass privileges, both CxO Breakfasts and the VIP Lounge"><Badge tone="purple" icon={Mic2}>Internal</Badge></span>}
              {t.exhibitorPass && <Badge tone="purple" icon={Store}>Exhibitor's pass</Badge>}
              {t.hidden && <Badge>Hidden by staff</Badge>}
              {t.checkedIn && <span title={t.checkedInAt ? `Checked in ${when(t.checkedInAt)}` : undefined}><Badge tone="good">Checked in</Badge></span>}
              {t.booth && <Badge tone="purple">Booth {t.booth}</Badge>}
              <span className="font-mono text-xs text-ttfc-muted">{t.ticketId.toUpperCase()}</span>
              {/* The coupon code it was bought with ("Code: SPRING20 · 20% off"), "No code", or "Given by staff" (Oct 20 2026). */}
              {t.code && <CodeLabel code={t.code} prefix />}
              {t.purchaseDate && <span className="text-xs text-ttfc-dim">{day(t.purchaseDate)}</span>}
              <Link to={`/admin/attendees?q=${encodeURIComponent(t.ticketId)}`} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ttfc-pink hover:underline">
                Open in Tickets <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
              {t.printedLabel && <span className="w-full text-xs text-ttfc-dim">Printed on their email as "{t.printedLabel}"</span>}
              <span className="flex w-full flex-wrap items-center gap-2 text-xs text-ttfc-muted" title={VALUE_BAND_HINTS[t.valueBand]}>
                Ticket value after payment:
                {"value" in t && t.value !== null ? <span className="font-semibold text-ttfc-text">{money(t.value)}</span> : null}
                <Badge tone={VALUE_BAND_TONE[t.valueBand]}>{VALUE_BAND_LABELS[t.valueBand]}</Badge>
                {VALUE_SOURCE[t.valueSource] && <span className={t.valueSource === "manual" ? "font-semibold text-amber-200" : "text-ttfc-dim"}>{VALUE_SOURCE[t.valueSource]}</span>}
              </span>
              {isManagement && t.checkedIn && <UndoCheckIn key={`undo-${t.checkedInAt || ""}`} p={p} t={t} onSaved={onSaved} />}
              {e.canEditValue && !t.hasStripe && !t.hidden && <ManualValue p={p} t={t} onSaved={onSaved} />}
              {e.canEditPass && !t.hidden && <PassTypeChange key={t.tier} p={p} t={t} onSaved={onSaved} />}
              {!t.hidden && <ExtrasSwitches personId={p.id} t={t} canEdit={!!(e.canEditExtras ?? e.canEditCxo)} onSaved={onSaved} />}
            </li>
          ))}
        </ul>
      )}
      {p.passes?.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-ttfc-dim">
          Automatic follows the pass: the luncheons come with Influence and up, the Gala Dinner and the Awards Night with Power, Apex and the Speaker Pass, the CxO Breakfasts with Apex, the Speaker Pass, and speakers and VIPs on any pass. Media = Yes gets all four on any pass (Power Pass privileges with the CxO Breakfasts). Yes or No is for this pass only: it shows on their ticket in the app, in their pass emails and on the RSVP page, and counts them in the RSVP headcounts. Anything they already chose in their RSVP is never taken away.
          {e.canEditPass ? " Changing a pass is free and logged; it moves the inventory counts like an upgrade (the Speaker Pass has none)." : ""}
        </p>
      )}
      {p.boothOrders?.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ttfc-muted"><Store className="h-4 w-4" aria-hidden="true" /> Booth order on their account: {p.boothOrders.join(", ")}</p>
      )}
    </Card>
  );
}

const foldName = (s) => String(s || "").normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/* Delete person (management): what goes, with counts, then their full name to confirm. */
function DeleteDialog({ p, open, onClose }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading } = useApi(open ? `/console/people/${encodeURIComponent(p.id)}/delete-plan` : null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const blockers = data?.blockers || [];
  const ok = !!data && !blockers.length && foldName(typed) === foldName(data.name);
  const remove = async () => {
    setBusy(true); setErr("");
    try {
      const r = await adminFetch(`/console/people/${encodeURIComponent(p.id)}`, { method: "DELETE", body: { confirmName: typed } });
      toast.success(`${p.name} was deleted (${r.total} records)`);
      navigate("/admin/people", { replace: true });
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const items = (data?.items || []).filter((i) => i.count > 0);
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} tone="danger" size="lg" title={`Delete ${p.name}?`}
      description="This removes them from the whole database, for good. There's no undo."
      footer={
        <>
          <Button onClick={onClose} disabled={busy} data-autofocus>Cancel</Button>
          <Button variant="danger" icon={Trash2} loading={busy} disabled={!ok} onClick={remove}>Delete for good</Button>
        </>
      }>
      {loading && !data ? <LoadingState label="Counting their records…" /> : error && !data ? <ErrorState error={error} /> : data && (
        <div className="space-y-4 text-sm">
          {blockers.map((b) => <Banner key={b} tone="danger" icon={AlertTriangle}>{b}</Banner>)}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Deleted ({data.total} records)</p>
            {!items.length ? <p className="text-ttfc-muted">Nothing.</p> : (
              <ul className="divide-y divide-ttfc-line rounded-xl border border-ttfc-line">
                {items.map((i) => (
                  <li key={i.key} className="flex items-baseline gap-3 px-3 py-1.5">
                    <span className="min-w-0 flex-1">{i.label}</span>
                    <span className="tabular-nums font-semibold">{i.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Not deleted</p>
            <ul className="space-y-1 text-ttfc-muted">
              {data.kept.map((k) => (
                <li key={k.key} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>
                    {k.label}{k.count ? ` (${k.count})` : ""}
                    {k.key === "speakerList" && k.onWebsite && <> · <Link to="/admin/content/speakers" className="font-semibold text-ttfc-pink hover:underline">Admin › Speakers</Link></>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {!blockers.length && (
            <Field label={`Type their full name to confirm: ${data.name}`}>
              {(id) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" placeholder={data.name} />}
            </Field>
          )}
          {err && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">{err}</p>}
        </div>
      )}
    </Modal>
  );
}

function DeleteCard({ p }) {
  const [open, setOpen] = useState(false);
  const e = p.edit || {};
  return (
    <Card className="border-red-400/25">
      <SectionTitle hint="Removes them from the whole database: account, passes, RSVPs and everything they did in the app.">Delete person</SectionTitle>
      {e.canDelete ? (
        <Button variant="dangerOutline" icon={Trash2} onClick={() => setOpen(true)}>Delete person…</Button>
      ) : <p className="text-sm text-ttfc-muted">{e.deleteReason || "You can't delete this person."}</p>}
      {open && <DeleteDialog p={p} open={open} onClose={() => setOpen(false)} />}
    </Card>
  );
}

const CONTACT_KIND = {
  email: "Email", phone: "Phone", whatsapp: "WhatsApp", linkedin: "LinkedIn", website: "Website",
  x: "X", instagram: "Instagram", wechat: "WeChat", other: "Other",
};
const bareLink = (v) => String(v || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

/* Their app contact card, read only: each person picks per connection what they share. */
function ContactCardCard({ items, hasAccount }) {
  return (
    <Card>
      <SectionTitle hint="From their app contact card. They choose what to share with each person they connect with.">Contact card</SectionTitle>
      {!hasAccount ? <p className="text-sm text-ttfc-muted">Not on the app, so no contact card.</p> : !items?.length ? (
        <p className="text-sm text-ttfc-muted">No contact details added yet.</p>
      ) : (
        <ul className="divide-y divide-ttfc-line text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 py-2">
              <span className="w-28 shrink-0 text-ttfc-muted">{it.label || CONTACT_KIND[it.kind] || "Other"}</span>
              <span className="min-w-0 flex-1 break-all font-medium">{["linkedin", "website"].includes(it.kind) ? bareLink(it.value) : it.value}</span>
              {it.shareByDefault && <Badge>Shared by default</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* A line of what they did: "Email  Opened Oct 19, 10:02 · last Oct 20, 8:11 · 3 times". */
function Seen({ label, children }) {
  return (
    <li className="flex gap-2">
      <span className="w-[4.5rem] shrink-0 text-ttfc-dim">{label}</span>
      <span className="min-w-0 flex-1 text-ttfc-text/90">{children}</span>
    </li>
  );
}
const firstLast = (first, last, n) => [when(first), last && n > 1 && String(last) !== String(first) ? `last ${when(last)}` : "", times(n)].filter(Boolean)
  .flatMap((part, i) => [i ? <span key={`s${i}`}> · </span> : null, <span key={i} className="whitespace-nowrap">{part}</span>]);

/* "I'm attending": opened the email, opened their page, what they did there (backend services/engagement.js). */
function AttendingSeen({ at, e }) {
  if (!e || (at.status === "none" && !e.stage)) return null;
  const sent = at.status === "sent";
  const notKnown = sent && !e.tracked;
  return (
    <ul className="mt-2 space-y-1">
      <Seen label="Email">
        {e.opens > 0 ? <>Opened {firstLast(e.firstOpenAt, e.lastOpenAt, e.opens)}</>
          : notKnown ? <span className="text-ttfc-muted">Opens not known (sent before Oct 19)</span>
            : sent ? <span className="text-ttfc-muted">Not opened yet</span> : <span className="text-ttfc-muted">Not sent</span>}
      </Seen>
      <Seen label="Page">
        {e.visits > 0 ? <>Opened {firstLast(e.firstVisitAt, e.lastVisitAt, e.visits)}</>
          : <span className="text-ttfc-muted">{notKnown ? "Not known" : "Not opened"}</span>}
      </Seen>
      <Seen label="LinkedIn">
        {e.posts > 0 ? (
          <span title={ATTENDING_STAGE_HINTS.posted}>
            <b className="font-semibold text-emerald-200">{ATTENDING_STAGE_LABELS.posted}</b> {when(e.postedAt)}{e.posts > 1 ? ` · ${e.posts} posts` : ""}
            {e.postUrl && <> · <a href={e.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ttfc-pink hover:underline">View post <ExternalLink className="h-3 w-3" aria-hidden="true" /></a></>}
          </span>
        ) : e.shares > 0 ? (
          <span title={ATTENDING_STAGE_HINTS.shared}>{ATTENDING_STAGE_LABELS.shared} {when(e.sharedAt)} <span className="text-ttfc-muted">(can't confirm it was posted)</span></span>
        ) : e.manuals > 0 ? (
          <span title={ATTENDING_STAGE_HINTS.manual}>{ATTENDING_STAGE_LABELS.manual} {when(e.manualAt)} <span className="text-ttfc-muted">(not confirmed)</span></span>
        ) : <span className="text-ttfc-muted">{notKnown ? "Not known" : "Not posted"}</span>}
      </Seen>
    </ul>
  );
}

/* RSVP: the RSVP emails opened, the form opened with their ticket, and their RSVP. */
function RsvpSeen({ p, e }) {
  if (!e) return null;
  const r = p.rsvp || {};
  const sent = !!p.rsvpEmail?.sent;
  return (
    <ul className="mt-2 space-y-1">
      <Seen label="Email">
        {e.emailOpened ? <>Opened {firstLast(e.firstOpenAt, e.lastOpenAt, e.opens)}{e.openedVia?.length ? <span className="text-ttfc-muted"> ({e.openedVia.join(", ")})</span> : null}</>
          : !sent ? <span className="text-ttfc-muted">No RSVP email sent</span>
            : e.tracked ? <span className="text-ttfc-muted">Not opened yet</span> : <span className="text-ttfc-muted">Opens not known (sent before Oct 19, or with a cc)</span>}
      </Seen>
      <Seen label="Form">
        {e.formOpened ? <>Opened {firstLast(e.firstFormAt, e.lastFormAt, e.formOpens)}</> : <span className="text-ttfc-muted">Not opened</span>}
      </Seen>
      <Seen label="RSVP">
        {r.status === "attendee" ? <>Submitted {when(r.at)}</> : r.status === "staff" ? <>Not submitted <span className="text-ttfc-muted">(confirmed by staff{r.by ? `, ${r.by}` : ""})</span></>
          : <span className="text-ttfc-muted">Not submitted</span>}
      </Seen>
    </ul>
  );
}

/* The app invite email to this person: sent or not, opened, the web app opened from its button, using the app. */
function AppInviteSeen({ ai }) {
  const sent = ai.status === "sent";
  return (
    <>
      <Badge tone={sent ? "good" : ai.status === "failed" ? "bad" : ai.status === "sending" ? "warn" : "neutral"}>
        {sent ? `Sent${ai.sentAt ? ` · ${when(ai.sentAt)}` : ""}` : ai.status === "failed" ? "Failed" : ai.status === "sending" ? "Unconfirmed" : "Not sent"}
      </Badge>
      {sent && (
        <ul className="mt-2 space-y-1">
          <Seen label="Email">{ai.opened ? "Opened" : <span className="text-ttfc-muted">Not opened yet</span>}</Seen>
          <Seen label="Button">{ai.clicked ? "Opened the web app from it" : <span className="text-ttfc-muted">Not clicked yet</span>}</Seen>
          <Seen label="App">{ai.usingAfter ? "Signed in after the email" : ai.usingApp ? "Using the app" : <span className="text-ttfc-muted">Not signed in yet</span>}</Seen>
        </ul>
      )}
      {!sent && ai.usingApp && <span className="ml-2">Already using the app</span>}
      <span className="mt-1 block">Skipped if emailed in the last {ai.cooldownDays} days.</span>
    </>
  );
}

/* One email to this person, after a confirm: the RSVP reminder or the "I'm attending" LinkedIn nudge. */
function OutreachRow({ icon: Icon, title, status, verdict, button, confirmTitle, confirmBody, path, sentMsg, onSent }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-ttfc-pink" aria-hidden="true" /> {title}</p>
        <div className="mt-1 text-xs text-ttfc-muted">{status}</div>
        {!verdict?.canSend && verdict?.label && <p className="mt-1 text-xs text-ttfc-dim">Can't send now: {verdict.label}.</p>}
      </div>
      <Button size="sm" icon={Icon} disabled={!verdict?.canSend || verdict?.running} onClick={() => setConfirm(true)}
        title={verdict?.canSend ? undefined : verdict?.label}>{button}</Button>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} tone="primary" title={confirmTitle} body={confirmBody} confirmLabel="Send"
        onConfirm={async () => {
          const r = await api.post(path, {});
          toast.success(sentMsg(r.email));
          onSent?.();
        }} />
    </div>
  );
}

function OutreachCard({ p, outreach, onSent }) {
  if (!outreach) return null;
  const rr = outreach.rsvpReminder || {};
  const at = outreach.attending || {};
  const base = `/console/people/${encodeURIComponent(p.id)}`;
  const to = p.email || "their email";
  return (
    <Card>
      <SectionTitle hint="One email to this person. Sends to a whole list are on the People page (management).">Emails</SectionTitle>
      <div className="divide-y divide-ttfc-line">
        <OutreachRow icon={BellRing} title="RSVP reminder" verdict={rr} button="Send RSVP reminder"
          status={(
            <>
              {rr.lastSentAt ? `Last reminded ${when(rr.lastSentAt)}. Skipped if reminded in the last ${rr.cooldownHours} hours.` : "Not reminded yet. The email has a personal RSVP button for each of their tickets."}
              <RsvpSeen p={p} e={p.engagement?.rsvp} />
            </>
          )}
          confirmTitle={`Send ${p.name} the RSVP reminder?`} confirmBody={`To ${to}. The same email as RSVP reminders, with an RSVP button for each ticket still open.`}
          path={`${base}/reminder`} sentMsg={(e) => `RSVP reminder sent to ${e}`} onSent={onSent} />
        <OutreachRow icon={Linkedin} title="I'm attending (LinkedIn)" verdict={at} button="Send LinkedIn nudge"
          status={(
            <span title={ATTENDING_HINT}>
              <Badge tone={ATTENDING_TONE[at.status] || "neutral"}>{ATTENDING_LABELS[at.status] || ATTENDING_LABELS.none}{at.sentAt ? ` · ${when(at.sentAt)}` : ""}</Badge>
              {at.nudges > 0 && <span className="ml-2">{nudgeCount(at.nudges)} from People</span>}
              <AttendingSeen at={at} e={p.engagement?.attending} />
              <span className="mt-1 block">
                {at.tracking?.posts
                  ? `Skipped if emailed in the last ${at.cooldownDays} days, or once they've posted on LinkedIn.`
                  : `Opens, clicks and LinkedIn posts aren't tracked. Skipped if emailed in the last ${at.cooldownDays} days.`}
              </span>
            </span>
          )}
          confirmTitle={`Send ${p.name} the LinkedIn nudge?`} confirmBody={`To ${to}. The “Show the world you're attending” email: their personal page to make an “I'm attending” image and post it on LinkedIn.`}
          path={`${base}/nudge`} sentMsg={(e) => `LinkedIn nudge sent to ${e}`} onSent={onSent} />
        {/* The app invite email (Website & app › App invite email, Oct 20 2026): null = no pass or role at TTFC 2026. */}
        {outreach.appInvite && (
          <OutreachRow icon={Smartphone} title="App invite email" verdict={outreach.appInvite} button="Send app invite"
            status={<AppInviteSeen ai={outreach.appInvite} />}
            confirmTitle={`Send ${p.name} the app invite?`} confirmBody={`To ${to}. “Get the TTFC app”: the App Store and Google Play badges, a small link to the web app, and the email to sign in with.`}
            path={`${base}/app-invite`} sentMsg={(e) => `App invite sent to ${e}`} onSent={onSent} />
        )}
      </div>
      {p.engagement && <p className="mt-4 border-t border-ttfc-line pt-3 text-xs text-ttfc-dim">{OPENS_NOTE} {TRACKED_FROM}</p>}
    </Card>
  );
}

const dayName = (n) => (n === 1 ? "Day 1" : n === 2 ? "Day 2" : "");
const clock = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m) return hhmm || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};

function AgendaCard({ agenda, hasAccount }) {
  const sessions = agenda?.sessions || [];
  const events = agenda?.specialEvents || [];
  return (
    <Card>
      <SectionTitle hint="Sessions they saved in the app, and the special events in their RSVP">Agenda</SectionTitle>
      {!agenda?.agendaReadable && sessions.length > 0 && <Banner tone="warn" className="mb-3">The agenda couldn't be read just now, so sessions show by id.</Banner>}
      {events.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Special events (RSVP)</p>
          <ul className="space-y-1 text-sm">
            {events.map((e) => <li key={e.key}><span className="font-medium">{e.label}</span> <span className="text-ttfc-dim">{[e.day, e.time].filter(Boolean).join(", ")}</span></li>)}
          </ul>
        </div>
      )}
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Saved in the app</p>
      {!hasAccount ? <p className="text-sm text-ttfc-muted">Not on the app, so no saved sessions.</p> : !sessions.length ? (
        <p className="text-sm text-ttfc-muted">No sessions saved yet.</p>
      ) : (
        <ul className="divide-y divide-ttfc-line text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
              {s.found ? (
                <>
                  <span className="w-28 shrink-0 tabular-nums text-ttfc-muted">{dayName(s.day)} · {clock(s.time)}</span>
                  <span className="min-w-0 flex-1 font-medium">{s.title}</span>
                  <span className="text-xs text-ttfc-dim">{[s.type, s.stage].filter(Boolean).join(" · ")}</span>
                </>
              ) : (
                <span className="text-ttfc-dim">Session {s.id} (not on the agenda now)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function PersonProfile() {
  const { id } = useParams();
  return <ProfileView key={id} id={id} />;
}

function ProfileView({ id }) {
  const navigate = useNavigate();
  const { isManagement } = useAdmin();
  const { data, error, loading, reload } = useApi(`/console/people/${encodeURIComponent(id)}`);

  // A guest pass later claimed by an account (or an RSVP that joined someone): show the person's own address.
  useEffect(() => {
    if (data?.canonicalId && data.canonicalId !== id) navigate(personPath(data.canonicalId), { replace: true });
  }, [data, id, navigate]);

  if (loading) return <LoadingState label="Loading person…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} title={error?.status === 404 ? "Person not found" : undefined} />;
  const p = data.person;
  const r = p.rsvp || {};
  // App profile photos come from our API (/api/files/avatar/…), speakers' from the CMS.
  const photo = /^https?:\/\//.test(p.photoUrl || "") ? p.photoUrl : String(p.photoUrl || "").startsWith("/api/") ? `${ADMIN_API.replace(/\/api\/?$/, "")}${p.photoUrl}` : "";

  return (
    <>
      <Link to="/admin/people" className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-ttfc-muted hover:text-ttfc-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> People
      </Link>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {photo ? (
          <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ttfc-pink via-ttfc-purple to-ttfc-orange text-lg font-bold text-white" aria-hidden="true">
            {initials(p.name, p.email)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
            {p.appHidden && <HiddenBadge />}
            {p.vip && <Badge tone={VIP_TONE} icon={Crown}>{VIP_LABEL}</Badge>}
            {isMedia(p) && <MediaMark />}
            {otherTypes(p.types).map((t) => <Badge key={t} tone={TYPE_TONE[t]}>{TYPE_LABELS[t] || t}</Badge>)}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ttfc-muted">
            <CompanyMark url={p.logoUrl} name={p.company} size="sm" />
            <span>{[p.jobTitle, p.company].filter(Boolean).join(" · ") || "No company yet"}</span>
            {p.email && <><span aria-hidden="true">·</span><a href={`mailto:${p.email}`} className="text-ttfc-pink hover:underline">{p.email}</a></>}
            {p.linkedinUrl && /^https?:\/\//i.test(p.linkedinUrl) && (
              <><span aria-hidden="true">·</span><a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ttfc-pink hover:underline"><Linkedin className="h-3.5 w-3.5" aria-hidden="true" /> LinkedIn</a></>
            )}
          </p>
          <p className="mt-1.5 flex flex-wrap gap-2 text-xs">
            {p.pass && p.band ? (
              <>
                <PassBand band={p.band} />
                <Badge tone={PASS_STATUS_TONE[p.passStatus]}>{PASS_STATUS_LABELS[p.passStatus]}</Badge>
              </>
            ) : <Badge tone={PASS_STATUS_TONE[p.passStatus]}>{p.pass ? `${p.pass.label}: ${PASS_STATUS_LABELS[p.passStatus]}` : "Pass: None"}</Badge>}
            <Badge tone={RSVP_STATUS_TONE[r.status]}>{RSVP_STATUS_LABELS[r.status] || RSVP_STATUS_LABELS.none}{r.at ? ` · ${when(r.at)}` : ""}{r.status === "staff" && r.by ? ` · ${r.by}` : ""}</Badge>
            <span title={RSVP_EMAIL_HINT}>
              <Badge tone={p.rsvpEmail?.sent ? "good" : "neutral"} icon={Mail}>
                {p.rsvpEmail?.sent ? `RSVP email sent · ${when(p.rsvpEmail.at)}${p.rsvpEmail.via?.length ? ` · ${p.rsvpEmail.via.join(", ")}` : ""}` : "No RSVP email sent"}
              </Badge>
            </span>
            <span title={ATTENDING_HINT}>
              <Badge tone={ATTENDING_TONE[p.attending?.status] || "neutral"} icon={Linkedin}>
                {`I'm attending: ${ATTENDING_LABELS[p.attending?.status] || ATTENDING_LABELS.none}${p.attending?.sentAt ? ` · ${when(p.attending.sentAt)}` : ""}${p.engagement?.attending?.stage ? ` · ${ATTENDING_STAGE_LABELS[p.engagement.attending.stage]}` : ""}`}
              </Badge>
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.userId && <Button icon={Smartphone} onClick={() => navigate(`/admin/app/people/${p.userId}`)}>App account</Button>}
          {p.speaker && <Button icon={Mic2} onClick={() => navigate("/admin/content/speakers")}>Speaker page</Button>}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <RsvpEditor personId={p.id} rsvp={data.rsvp} catalog={data.catalog} pass={p.pass} rules={p.rsvpRules} duplicates={data.rsvpDuplicates} canEdit={!!p.edit?.canEditRsvp} onSaved={reload} />
          <AgendaCard agenda={data.agenda} hasAccount={!!p.userId} />
          {data.otherRsvps?.length > 0 && (
            <Card>
              <SectionTitle hint="Under another of their tickets">More RSVPs</SectionTitle>
              <ul className="space-y-1 text-sm">{data.otherRsvps.map((o) => <li key={o.id}>{o.tierLabel} · {o.days.map((k) => DAY_SHORT[k] || k).join(" & ")} · {when(o.updatedAt)}</li>)}</ul>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          {/* Hidden from the app: the first thing staff see on the right; otherwise the card sits further down. */}
          {data.appHide?.hidden && <HideCard personId={p.id} name={p.name} appHide={data.appHide} onChanged={reload} />}
          <OutreachCard p={p} outreach={data.outreach} onSent={reload} />
          <DetailsCard key={JSON.stringify([p.name, p.firstName, p.lastName, p.email, p.phone, p.linkedinUrl, p.company, p.jobTitle, p.types, p.account, p.exhibitor, p.vip, p.media, p.rsvpEmail?.mark, p.rsvpEmail?.sent])} p={p} onSaved={reload} />
          <PassesCard p={p} onSaved={reload} />
          <LogoCard p={p} onSaved={reload} />
          <ContactCardCard items={data.contactCard} hasAccount={!!p.userId} />
          {!data.appHide?.hidden && <HideCard personId={p.id} name={p.name} appHide={data.appHide} onChanged={reload} />}
          {isManagement ? <DeleteCard p={p} /> : <p className="text-xs text-ttfc-dim">Email changes, pass changes, ticket values, deleting people and the CSV download are for management.</p>}
        </div>
      </div>
    </>
  );
}
