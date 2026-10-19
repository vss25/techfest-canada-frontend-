import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDown, ArrowUp, BellRing, CalendarCheck, CalendarX, ChevronLeft, ChevronRight, Contact, Crown, Download, ImagePlus, Info, Linkedin, Search, Store, Users,
} from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, StatTile, TableWrap } from "../ui";
import { when } from "../format";
import LogoPicker, { CompanyMark } from "./LogoPicker";
import ReminderDialog from "./ReminderDialog";
import NudgeDialog from "./NudgeDialog";
import {
  ATTENDING_HINT, ATTENDING_LABELS, ATTENDING_TONE, DAY_SHORT, PASS_STATUS_HINTS, PASS_STATUS_LABELS, PASS_TIERS, RSVP_EMAIL_HINT, RSVP_STATUSES, RSVP_STATUS_LABELS, RSVP_STATUS_TONE,
  TYPE_FILTER_OPTIONS, TYPE_LABELS, TYPE_TONE, VALUE_BANDS, VALUE_BAND_HINTS, VALUE_BAND_LABELS, VALUE_BAND_TONE, VIP_LABEL, VIP_TONE, extrasSummary,
  nudgeCount, passExtras, personPath,
} from "./peopleMeta";

/* =========================================================
   Admin → People (/admin/people): everyone, one row each,
   across app accounts, tickets and passes (paid, complimentary,
   speaker, issued, exhibitor), RSVPs and the speaker list. The
   server joins them and pages the list (GET /console/people,
   backend services/people.js); filters and sorting are sent as
   query parameters and kept in the address bar. Open a row for
   the profile (/admin/people/:id). The CSV is management only,
   like the RSVP export. "Send RSVP reminder" emails the view's
   Unconfirmed people (ReminderDialog) and "Send LinkedIn nudge"
   the "I'm attending" email (NudgeDialog): both management only;
   staff send either to one person from the profile. The I'm
   attending column: that email's status (opens, clicks and posts
   aren't tracked).
========================================================= */

const PAGE = 50;
const COLUMNS = [
  { key: "name", label: "Name", sort: "name" },
  { key: "types", label: "Type", sort: "type" },
  { key: "company", label: "Company", sort: "company" },
  { key: "pass", label: "Pass", sort: "pass" },
  { key: "value", label: "Ticket value", sort: "value" },
  { key: "rsvp", label: "RSVP", sort: "rsvp" },
  { key: "rsvpEmail", label: "RSVP email", sort: "rsvpEmail" },
  { key: "attending", label: "I'm attending", sort: "attending" },
  { key: "exhibitor", label: "Exhibitor", sort: "exhibitor" },
];
const YES_NO = [{ key: "yes", label: "Yes" }, { key: "no", label: "No" }];
/* The organiser's filters, in their words and order (Oct 19 2026). */
const FILTER_DEFS = [
  { key: "type", label: "Attendee Type", options: TYPE_FILTER_OPTIONS },
  { key: "pass", label: "Pass Type", options: PASS_TIERS },
  { key: "value", label: "Ticket Value After Payment", options: VALUE_BANDS },
  { key: "rsvp", label: "RSVP Status", options: RSVP_STATUSES.map((k) => ({ key: k, label: RSVP_STATUS_LABELS[k] })) },
  { key: "exhibitor", label: "Is Exhibitor?", options: YES_NO },
  { key: "rsvpEmail", label: "RSVP Email Sent?", options: YES_NO },
  { key: "vip", label: "VIP?", options: YES_NO },
  { key: "attending", label: "I'm Attending Email Sent?", options: YES_NO },
];
const FILTERS = ["q", ...FILTER_DEFS.map((f) => f.key)];

function SortHeader({ col, sort, dir, onSort }) {
  const active = sort === col.sort;
  const Icon = active && dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <th aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => onSort(col.sort)}
        className="inline-flex items-center gap-1 font-semibold hover:text-ttfc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple">
        {col.label}
        <Icon className={`h-3 w-3 ${active ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      </button>
    </th>
  );
}

/* The pass's meals and events, compact: what it includes ("+" = added by staff) and, struck through, what
   staff took off. Hover for each one's Yes / No and whether staff set it. Nothing for a pass with none. */
function ExtrasBadge({ pass }) {
  const s = extrasSummary(passExtras(pass));
  if (!s.on.length && !s.off.length) return null;
  return (
    <span title={s.title} className="mt-1 block">
      <Badge tone={s.edited ? "orange" : "purple"}>
        Extras:{" "}
        {s.on.map((x, i) => <span key={x.key}>{i ? " · " : ""}{x.text}</span>)}
        {s.off.map((x, i) => <span key={x.key}>{s.on.length || i ? " · " : ""}<span className="line-through opacity-70">{x.text}</span></span>)}
      </Badge>
    </span>
  );
}

function RsvpCell({ r }) {
  if (!r || r.status === "none") return <span className="text-ttfc-dim">{RSVP_STATUS_LABELS.none}</span>;
  return (
    <span className="block space-y-1">
      <Badge tone={RSVP_STATUS_TONE[r.status]}>{RSVP_STATUS_LABELS[r.status]}</Badge>
      <span className="block text-[11px] text-ttfc-muted">
        {r.status === "staff" && r.by ? `${r.by}, ` : ""}{r.at ? when(r.at) : ""}
      </span>
      {r.days?.length > 0 && <span className="block text-[11px] text-ttfc-dim">{r.days.map((d) => DAY_SHORT[d] || d).join(" & ")}</span>}
    </span>
  );
}

export default function PeopleDirectory() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isManagement } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [exporting, setExporting] = useState(false);
  const [logoFor, setLogoFor] = useState(null); // a row
  const [reminding, setReminding] = useState(false);
  const [nudging, setNudging] = useState(false);
  const dq = useDebounced(q.trim(), 300);
  const page = Math.max(0, Number(params.get("page")) || 0);
  const sort = params.get("sort") || "name";
  const dir = params.get("dir") === "desc" ? "desc" : "asc";
  const f = Object.fromEntries(FILTERS.filter((k) => k !== "q").map((k) => [k, params.get(k) || ""]));

  const view = new URLSearchParams();
  if (dq) view.set("q", dq);
  for (const [k, v] of Object.entries(f)) if (v) view.set(k, v);
  if (sort !== "name") view.set("sort", sort);
  if (dir === "desc") view.set("dir", "desc");
  const qs = new URLSearchParams(view);
  qs.set("page", String(page));
  const { data, error, loading, reload, refreshing } = useApi(`/console/people?${qs}`);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === "" || v == null || v === 0) p.delete(k); else p.set(k, String(v)); }
    setParams(p, { replace: true });
  };
  const onSearch = (v) => { setQ(v); update({ q: v.trim(), page: 0 }); };
  const onSort = (key) => update({ sort: key === "name" ? "" : key, dir: sort === key && dir === "asc" ? "desc" : "", page: 0 });
  const filtered = !!(dq || Object.values(f).some(Boolean));
  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const c = data?.counts;
  const open = (id) => navigate(personPath(id));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${ADMIN_API}/console/people/export${view.toString() ? `?${view}` : ""}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttfc-people-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err); } finally { setExporting(false); }
  };

  const clearAll = () => { setQ(""); update(Object.fromEntries([...FILTERS, "page"].map((k) => [k, ""]))); };
  const confirmed = (c?.byRsvp?.attendee || 0) + (c?.byRsvp?.staff || 0);

  return (
    <>
      <PageHeader
        eyebrow="People & passes"
        title="People"
        description="Everyone in one list: delegates, speakers, exhibitors, volunteers, organizers and vendors, from app accounts, tickets, passes, RSVPs and the speaker list. Open someone to see and change their details, VIP, RSVP, agenda and company logo."
        actions={(
          <>
            {isManagement && (
              <>
                <Button icon={BellRing} onClick={() => setReminding(true)} disabled={!total}
                  title="Email the RSVP reminder to the Unconfirmed people in this view">Send RSVP reminder</Button>
                <Button icon={Linkedin} onClick={() => setNudging(true)} disabled={!total}
                  title="Email the “I'm attending” LinkedIn nudge to the people in this view">Send LinkedIn nudge</Button>
                <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Everyone matching the search and filters">Download CSV</Button>
              </>
            )}
          </>
        )}
      />

      {c && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatTile label="People" value={c.total.toLocaleString()} icon={Users} tone="purple" to="?"
            hint={`${(c.total - (c.byStatus.none || 0)).toLocaleString()} with a pass`} />
          <StatTile label="Confirmed" value={confirmed.toLocaleString()} icon={CalendarCheck} tone="good"
            hint={`${(c.byRsvp.attendee || 0).toLocaleString()} by individual · ${(c.byRsvp.staff || 0).toLocaleString()} by staff`} />
          <StatTile label="Unconfirmed" value={(c.byRsvp.none || 0).toLocaleString()} icon={CalendarX} tone="orange" to="?rsvp=none"
            hint={`${(c.rsvpEmailSent || 0).toLocaleString()} sent an RSVP email`} />
          <StatTile label="Speakers" value={(c.byType.speaker || 0).toLocaleString()} icon={Contact} tone="pink" to="?type=speaker" />
          <StatTile label="Exhibitors" value={(c.exhibitors || 0).toLocaleString()} icon={Store} tone="neutral" to="?exhibitor=yes"
            hint="Exhibitor pass holders and anyone staff marked" />
          <StatTile label="VIPs" value={(c.vips || 0).toLocaleString()} icon={Crown} tone="orange" to="?vip=yes" />
        </div>
      )}

      {data?.stripe && data.stripe !== "ok" && (
        <Banner tone="info" icon={Info} className="mb-4">
          {data.stripe === "slow" ? "Stripe is slow to answer, so refunds and ticket values may not show yet. They'll appear on the next refresh."
            : data.stripe === "off" ? "Stripe isn't connected here, so bought passes have no ticket value (complimentary and issued passes count as 0)."
              : "Stripe couldn't be read just now, so refunds and ticket values may be missing."}
        </Banner>
      )}

      <div className="mb-4 space-y-3 rounded-[18px] border border-ttfc-line bg-ttfc-panel p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
            <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email, company or ticket ID" className="pl-9" aria-label="Search people" />
          </div>
          <p className="text-sm text-ttfc-muted" aria-live="polite">
            {loading ? "Loading…" : `${total.toLocaleString()} ${total === 1 ? "person" : "people"}`}{refreshing && !loading ? " · updating…" : ""}
          </p>
          {filtered && <Button size="sm" variant="ghost" onClick={clearAll}>Clear filters</Button>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
          {FILTER_DEFS.map((fd) => (
            <label key={fd.key} className="flex min-w-0 flex-col justify-end">
              <span className="mb-1 block text-[11px] font-semibold uppercase leading-tight tracking-wide text-ttfc-dim">{fd.label}</span>
              <Select value={f[fd.key]} onChange={(e) => update({ [fd.key]: e.target.value, page: 0 })} className="w-full" aria-label={fd.label}>
                <option value="">Any</option>
                {fd.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </Select>
            </label>
          ))}
        </div>
      </div>

      {loading ? <LoadingState label="Loading people…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={Users} title={filtered ? "No one matches" : "No one yet"} body={filtered ? "Try a different search or filter." : undefined} />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                {COLUMNS.map((col) => <SortHeader key={col.key} col={col} sort={sort} dir={dir} onSort={onSort} />)}
                <th><span className="sr-only">Profile</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="is-clickable align-top" tabIndex={0} onClick={() => open(r.id)}
                  onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(r.id); } }}
                  aria-label={`Open ${r.name}`}>
                  <td className="max-w-[240px]">
                    <span className="block truncate font-semibold">{r.name}</span>
                    {r.email && <span className="block truncate font-mono text-xs text-ttfc-muted" title={r.email}>{r.email}</span>}
                    {r.rsvpDuplicates > 0 && <Badge tone="warn" className="mt-1">Possible duplicate RSVP</Badge>}
                  </td>
                  <td>
                    <span className="flex max-w-[180px] flex-wrap gap-1">
                      {r.vip && <Badge tone={VIP_TONE} icon={Crown}>{VIP_LABEL}</Badge>}
                      {r.types.map((t) => <Badge key={t} tone={TYPE_TONE[t]}>{TYPE_LABELS[t] || t}</Badge>)}
                      {!r.types.length && !r.vip && <span className="text-ttfc-dim">None</span>}
                    </span>
                  </td>
                  <td className="max-w-[240px]">
                    <span className="flex items-center gap-2">
                      <CompanyMark url={r.logoUrl} name={r.company} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate">{r.company || <span className="text-ttfc-dim">None</span>}</span>
                        {r.jobTitle && <span className="block truncate text-xs text-ttfc-dim">{r.jobTitle}</span>}
                      </span>
                      {r.company && !r.logoUrl && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setLogoFor(r); }} title={`Find a logo for ${r.company}`}
                          className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ttfc-dim hover:bg-white/5 hover:text-ttfc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple">
                          <ImagePlus className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Find a logo for {r.company}</span>
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {r.pass ? (
                      <>
                        {r.pass.label}
                        <span className="block text-[11px] text-ttfc-dim" title={PASS_STATUS_HINTS[r.passStatus]}>
                          {PASS_STATUS_LABELS[r.passStatus]}{r.passCount > 1 ? ` · +${r.passCount - 1} more` : ""}
                        </span>
                        <ExtrasBadge pass={r.pass} />
                      </>
                    ) : <span className="text-ttfc-dim">None</span>}
                  </td>
                  <td className="whitespace-nowrap">
                    {r.valueBand === "none" ? <span className="text-ttfc-dim">None</span> : (
                      <span title={VALUE_BAND_HINTS[r.valueBand]}>
                        <Badge tone={VALUE_BAND_TONE[r.valueBand]}>{VALUE_BAND_LABELS[r.valueBand]}</Badge>
                        {r.pass?.valueSource === "manual" && <span className="block text-[11px] text-amber-200/90">manual</span>}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap"><RsvpCell r={r.rsvp} /></td>
                  <td className="whitespace-nowrap" title={r.rsvpEmail?.via?.join(", ")}>
                    {r.rsvpEmail?.sent ? (
                      <span className="block"><Badge tone="good">Yes</Badge><span className="block text-[11px] text-ttfc-muted">{r.rsvpEmail.mark === true ? "marked by staff" : when(r.rsvpEmail.at)}</span></span>
                    ) : <span className="text-ttfc-muted">No{r.rsvpEmail?.mark === false && <span className="block text-[11px]">marked by staff</span>}</span>}
                  </td>
                  <td className="whitespace-nowrap" title={ATTENDING_HINT}>
                    {r.attending && r.attending.status !== "none" ? (
                      <span className="block">
                        <Badge tone={ATTENDING_TONE[r.attending.status]}>{ATTENDING_LABELS[r.attending.status]}</Badge>
                        {r.attending.sentAt && <span className="block text-[11px] text-ttfc-muted">{when(r.attending.sentAt)}</span>}
                        {r.attending.nudges > 0 && <span className="block text-[11px] text-ttfc-dim">{nudgeCount(r.attending.nudges)}</span>}
                      </span>
                    ) : <span className="text-ttfc-muted">{ATTENDING_LABELS.none}</span>}
                  </td>
                  <td>{r.exhibitor ? <Badge tone="purple">Yes</Badge> : <span className="text-ttfc-muted">No</span>}</td>
                  <td className="whitespace-nowrap text-right">
                    <Link to={personPath(r.id)} onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-ttfc-pink hover:underline">Profile</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button icon={ChevronLeft} disabled={page === 0} onClick={() => update({ page: page - 1 })}>Previous</Button>
              <span className="text-sm text-ttfc-muted">Page {page + 1} of {pages}</span>
              <Button disabled={page + 1 >= pages} onClick={() => update({ page: page + 1 })}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </>
      )}
      <p className="mt-4 text-xs text-ttfc-dim">
        Extras: the meals and events on their main pass (CxO Breakfasts, luncheons, Gala, Awards); + was added by staff, struck through was taken off.
        Ticket value is what they paid for the pass after promo codes, before HST. RSVP email: {RSVP_EMAIL_HINT}{" "}
        I'm attending: {ATTENDING_HINT}
        {!isManagement && " Downloading the list and sending to everyone in a view are for management; open someone to send them an RSVP reminder or a LinkedIn nudge."}
      </p>
      <ReminderDialog key={reminding ? view.toString() : "closed"} open={reminding} onClose={() => setReminding(false)} view={view} canSend={isManagement} onSent={reload} />
      {isManagement && <NudgeDialog key={nudging ? view.toString() : "closed"} open={nudging} onClose={() => setNudging(false)} view={view} onSent={reload} />}
      {logoFor && (
        <LogoPicker open onClose={() => setLogoFor(null)} company={logoFor.company} domain={logoFor.suggestedDomain} personId={logoFor.id} personName={logoFor.name}
          canOwn={false} onSaved={reload} />
      )}
    </>
  );
}
