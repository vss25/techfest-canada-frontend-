import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDown, ArrowUp, CalendarCheck, ChevronLeft, ChevronRight, Contact, Download, ImagePlus, Info, Search, Store, Ticket, Users,
} from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, StatTile, TableWrap } from "../ui";
import { when } from "../format";
import LogoPicker, { CompanyMark } from "./LogoPicker";
import {
  DAY_SHORT, PASS_STATUSES, PASS_STATUS_HINTS, PASS_STATUS_LABELS, PASS_STATUS_TONE, PASS_TIERS, PERSON_TYPES, RSVP_STATUS_LABELS,
  RSVP_STATUS_TONE, TYPE_LABELS, TYPE_TONE, personPath,
} from "./peopleMeta";

/* =========================================================
   Admin → People (/admin/people): everyone, one row each,
   across app accounts, tickets and passes (paid, complimentary,
   speaker, issued, exhibitor), RSVPs and the speaker list. The
   server joins them and pages the list (GET /console/people,
   backend services/people.js); filters and sorting are sent as
   query parameters and kept in the address bar. Open a row for
   the profile (/admin/people/:id). The CSV is management only,
   like the RSVP export.
========================================================= */

const PAGE = 50;
const COLUMNS = [
  { key: "name", label: "Name", sort: "name" },
  { key: "types", label: "Types", sort: "type" },
  { key: "company", label: "Company", sort: "company" },
  { key: "pass", label: "Pass", sort: "pass" },
  { key: "status", label: "Pass status", sort: "status" },
  { key: "rsvp", label: "RSVP", sort: "rsvp" },
  { key: "exhibitor", label: "Exhibitor", sort: "exhibitor" },
];
const FILTERS = ["q", "type", "pass", "status", "rsvp", "exhibitor"];

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

function RsvpCell({ r }) {
  if (!r || r.status === "none") return <span className="text-ttfc-dim">Not yet</span>;
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

  return (
    <>
      <PageHeader
        eyebrow="Tickets & attendees"
        title="People"
        description="Everyone in one list: pass holders, speakers, exhibitors, VIPs, staff, vendors and volunteers, from app accounts, tickets, passes, RSVPs and the speaker list. Open someone to see and change their details, RSVP, agenda and company logo."
        actions={isManagement && <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Everyone matching the search and filters">Download CSV</Button>}
      />

      {c && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="People" value={c.total.toLocaleString()} icon={Users} tone="purple" to="?" />
          <StatTile label="With a pass" value={(c.total - (c.byStatus.none || 0)).toLocaleString()} icon={Ticket} tone="pink"
            hint={`${(c.byStatus.pending || 0).toLocaleString()} pending · ${(c.byStatus.issued || 0).toLocaleString()} not claimed`} />
          <StatTile label="RSVP'd" value={((c.byRsvp.attendee || 0) + (c.byRsvp.staff || 0)).toLocaleString()} icon={CalendarCheck} tone="good" to="?rsvp=any"
            hint={`${(c.byRsvp.staff || 0).toLocaleString()} set by staff`} />
          <StatTile label="Speakers" value={(c.byType.speaker || 0).toLocaleString()} icon={Contact} tone="orange" to="?type=speaker" />
          <StatTile label="Exhibitors" value={(c.exhibitors || 0).toLocaleString()} icon={Store} tone="neutral" to="?exhibitor=yes"
            hint="Exhibitor pass holders and anyone staff marked" />
        </div>
      )}

      {data?.stripe === "slow" && (
        <Banner tone="info" icon={Info} className="mb-4">Stripe is slow to answer, so refunds may not show yet. They'll appear on the next refresh.</Banner>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email, company or ticket ID" className="pl-9" aria-label="Search people" />
        </div>
        <Select value={f.type} onChange={(e) => update({ type: e.target.value, page: 0 })} className="sm:w-40" aria-label="Filter by type">
          <option value="">Any type</option>
          {PERSON_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          <option value="none">No type</option>
        </Select>
        <Select value={f.pass} onChange={(e) => update({ pass: e.target.value, page: 0 })} className="sm:w-40" aria-label="Filter by pass">
          <option value="">Any pass</option>
          {PASS_TIERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          <option value="none">No pass</option>
        </Select>
        <Select value={f.status} onChange={(e) => update({ status: e.target.value, page: 0 })} className="sm:w-44" aria-label="Filter by pass status">
          <option value="">Any pass status</option>
          {PASS_STATUSES.map((s) => <option key={s} value={s}>{PASS_STATUS_LABELS[s]}</option>)}
        </Select>
        <Select value={f.rsvp} onChange={(e) => update({ rsvp: e.target.value, page: 0 })} className="sm:w-44" aria-label="Filter by RSVP">
          <option value="">Any RSVP</option>
          <option value="any">RSVP'd (anyone)</option>
          <option value="attendee">RSVP'd by attendee</option>
          <option value="staff">Set by staff</option>
          <option value="none">Not yet</option>
        </Select>
        <Select value={f.exhibitor} onChange={(e) => update({ exhibitor: e.target.value, page: 0 })} className="sm:w-40" aria-label="Filter by exhibitor">
          <option value="">Exhibitor or not</option>
          <option value="yes">Exhibitor: Yes</option>
          <option value="no">Exhibitor: No</option>
        </Select>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} ${total === 1 ? "person" : "people"}`}{refreshing && !loading ? " · updating…" : ""}
        </p>
        {filtered && <Button size="sm" variant="ghost" onClick={() => { setQ(""); update({ q: "", type: "", pass: "", status: "", rsvp: "", exhibitor: "", page: 0 }); }}>Clear filters</Button>}
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
                      {r.types.length ? r.types.map((t) => <Badge key={t} tone={TYPE_TONE[t]}>{TYPE_LABELS[t]}</Badge>) : <span className="text-ttfc-dim">None</span>}
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
                    {r.pass ? <>{r.pass.label}{r.passCount > 1 && <span className="block text-[11px] text-ttfc-dim">+{r.passCount - 1} more</span>}</> : <span className="text-ttfc-dim">None</span>}
                  </td>
                  <td className="whitespace-nowrap"><span title={PASS_STATUS_HINTS[r.passStatus]}><Badge tone={PASS_STATUS_TONE[r.passStatus]}>{PASS_STATUS_LABELS[r.passStatus]}</Badge></span></td>
                  <td className="whitespace-nowrap"><RsvpCell r={r.rsvp} /></td>
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
      {!isManagement && <p className="mt-4 text-xs text-ttfc-dim">Downloading the list as a CSV is for management (it holds emails).</p>}
      {logoFor && (
        <LogoPicker open onClose={() => setLogoFor(null)} company={logoFor.company} domain={logoFor.suggestedDomain} personId={logoFor.id} personName={logoFor.name}
          canOwn={false} onSaved={reload} />
      )}
    </>
  );
}
