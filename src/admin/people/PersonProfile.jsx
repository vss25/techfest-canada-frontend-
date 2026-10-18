import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink, ImagePlus, Info, Linkedin, Mic2, Smartphone, Store, Ticket, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { ADMIN_API, api } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, ConfirmDialog, ErrorState, Field, Input, LoadingState, SectionTitle, Switch } from "../ui";
import { when, day, initials } from "../format";
import RsvpEditor from "./RsvpEditor";
import LogoPicker, { CompanyMark } from "./LogoPicker";
import {
  DAY_SHORT, PASS_STATUS_HINTS, PASS_STATUS_LABELS, PASS_STATUS_TONE, RSVP_STATUS_LABELS, RSVP_STATUS_TONE, TYPE_LABELS, TYPE_TONE, personPath,
} from "./peopleMeta";

/* =========================================================
   Admin → People → a person (/admin/people/:id)
   Everything about one person, joined from their account,
   passes, RSVP and the speaker list (GET /console/people/:id).
   Staff edit name, email (management), LinkedIn, company, job
   title and exhibitor yes/no (PATCH), the RSVP (RsvpEditor) and
   the company logo (LogoPicker). The pass and their app contact
   card (contactCard) are read-only here:
   it links to Tickets. Emails and LinkedIn are staff-only (the
   whole panel is).
========================================================= */

const DETAIL_KEYS = ["name", "email", "linkedinUrl", "company", "jobTitle"];
const STORED = { cloudinary: "Cloudinary", sanity: "Sanity", database: "our database", existing: "the website's own logos" };
const SOURCE = {
  current: "the current default", cms: "the website's partners and sponsors", site: "their website", google: "Google's favicon service",
  duckduckgo: "DuckDuckGo", wikimedia: "Wikimedia Commons", url: "a link staff pasted", upload: "a file staff uploaded",
};

function DetailsCard({ p, onSaved }) {
  const toast = useToast();
  const e = p.edit || {};
  const start = { name: p.name === "No name" ? "" : p.name, email: p.email, linkedinUrl: p.linkedinUrl, company: p.company, jobTitle: p.jobTitle };
  const [form, setForm] = useState(start);
  const [exhibitor, setExhibitor] = useState(!!p.exhibitor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const changed = DETAIL_KEYS.filter((k) => (form[k] || "") !== (start[k] || "") && (k !== "email" || e.canEditEmail));
  const exChanged = exhibitor !== !!p.exhibitor;
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const disabled = !e.canEdit;

  const save = async () => {
    setSaving(true); setError(null);
    const body = Object.fromEntries(changed.map((k) => [k, form[k]]));
    if (exChanged) body.exhibitor = exhibitor;
    try {
      await api.patch(`/console/people/${encodeURIComponent(p.id)}`, body);
      toast.success("Saved");
      onSaved();
    } catch (err) { setError(err); } finally { setSaving(false); }
  };

  return (
    <Card>
      <SectionTitle hint={e.where === "account" ? "Saved on their app account" : e.where === "pass" ? "Saved on their pass (they have no app account yet)" : undefined}>Details</SectionTitle>
      {e.reason && <Banner tone="info" icon={Info} className="mb-4">{e.reason}</Banner>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={set("name")} maxLength={120} disabled={disabled} />}</Field>
        <Field label="Email" hint={e.canEdit && !e.canEditEmail ? "Only management can change email addresses." : undefined}>
          {(id) => <Input id={id} type="email" value={form.email} onChange={set("email")} maxLength={200} disabled={disabled || !e.canEditEmail} />}
        </Field>
        <Field label="LinkedIn">{(id) => <Input id={id} value={form.linkedinUrl} onChange={set("linkedinUrl")} maxLength={300} placeholder="https://www.linkedin.com/in/…" inputMode="url" disabled={disabled} />}</Field>
        <Field label="Company">{(id) => <Input id={id} value={form.company} onChange={set("company")} maxLength={160} disabled={disabled} />}</Field>
        <Field label="Job title">{(id) => <Input id={id} value={form.jobTitle} onChange={set("jobTitle")} maxLength={160} disabled={disabled} />}</Field>
      </div>
      <div className="mt-5 rounded-2xl border border-ttfc-line p-4">
        <Switch checked={exhibitor} onChange={setExhibitor} disabled={disabled || !e.canEditExhibitor} label="Exhibitor"
          description="Yes for exhibitor pass holders and anyone staff mark, No for everyone else. The apps use the same answer." />
        {p.exhibitor && !exhibitor && p.exhibitorPass && (
          <p className="mt-2 text-xs text-amber-200/90">This also removes their exhibitor badge and booth in the app.</p>
        )}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error.message}</p>}
      {!disabled && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" loading={saving} disabled={!changed.length && !exChanged} onClick={save}>Save details</Button>
          {(changed.length > 0 || exChanged) && <Button onClick={() => { setForm(start); setExhibitor(!!p.exhibitor); setError(null); }} disabled={saving}>Undo changes</Button>}
        </div>
      )}
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

function PassesCard({ p }) {
  return (
    <Card>
      <SectionTitle hint="From the ticket records. Change passes in Tickets.">Pass</SectionTitle>
      {!p.passes?.length ? (
        <p className="text-sm text-ttfc-muted">No pass on file.</p>
      ) : (
        <ul className="space-y-3">
          {p.passes.map((t) => (
            <li key={t.ticketId} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ttfc-line bg-ttfc-panel2 px-3 py-2.5 text-sm ${t.hidden ? "opacity-60" : ""}`}>
              <Ticket className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
              <span className="font-semibold">{t.label}</span>
              <span title={PASS_STATUS_HINTS[t.status]}><Badge tone={PASS_STATUS_TONE[t.status]}>{PASS_STATUS_LABELS[t.status]}</Badge></span>
              {t.hidden && <Badge>Hidden by staff</Badge>}
              {t.checkedIn && <Badge tone="good">Checked in</Badge>}
              {t.booth && <Badge tone="purple">Booth {t.booth}</Badge>}
              <span className="font-mono text-xs text-ttfc-muted">{t.ticketId.toUpperCase()}</span>
              <span className="text-xs text-ttfc-dim">{t.promoCode ? `${t.promoCode} · ` : ""}{t.purchaseDate ? day(t.purchaseDate) : ""}</span>
              <Link to={`/admin/attendees?q=${encodeURIComponent(t.ticketId)}`} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ttfc-pink hover:underline">
                Open in Tickets <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {p.boothOrders?.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ttfc-muted"><Store className="h-4 w-4" aria-hidden="true" /> Booth order on their account: {p.boothOrders.join(", ")}</p>
      )}
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
            {p.types.map((t) => <Badge key={t} tone={TYPE_TONE[t]}>{TYPE_LABELS[t]}</Badge>)}
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
            <Badge tone={PASS_STATUS_TONE[p.passStatus]}>{p.pass ? `${p.pass.label}: ${PASS_STATUS_LABELS[p.passStatus]}` : "No pass"}</Badge>
            <Badge tone={RSVP_STATUS_TONE[r.status]}>{RSVP_STATUS_LABELS[r.status] || "Not yet"}{r.at ? ` · ${when(r.at)}` : ""}{r.status === "staff" && r.by ? ` · ${r.by}` : ""}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.userId && <Button icon={Smartphone} onClick={() => navigate(`/admin/app/people/${p.userId}`)}>App account</Button>}
          {p.speaker && <Button icon={Mic2} onClick={() => navigate("/admin/content/speakers")}>Speaker page</Button>}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <RsvpEditor personId={p.id} rsvp={data.rsvp} catalog={data.catalog} pass={p.pass} duplicates={data.rsvpDuplicates} canEdit={!!p.edit?.canEditRsvp} onSaved={reload} />
          <AgendaCard agenda={data.agenda} hasAccount={!!p.userId} />
          {data.otherRsvps?.length > 0 && (
            <Card>
              <SectionTitle hint="Under another of their tickets">More RSVPs</SectionTitle>
              <ul className="space-y-1 text-sm">{data.otherRsvps.map((o) => <li key={o.id}>{o.tierLabel} · {o.days.map((k) => DAY_SHORT[k] || k).join(" & ")} · {when(o.updatedAt)}</li>)}</ul>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <DetailsCard key={JSON.stringify([p.name, p.email, p.linkedinUrl, p.company, p.jobTitle, p.exhibitor])} p={p} onSaved={reload} />
          <LogoCard p={p} onSaved={reload} />
          <PassesCard p={p} />
          <ContactCardCard items={data.contactCard} hasAccount={!!p.userId} />
          {!isManagement && <p className="text-xs text-ttfc-dim">Email changes and the CSV download are for management.</p>}
        </div>
      </div>
    </>
  );
}
