import { Component, Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Accessibility, ArrowDown, ArrowLeft, ArrowUp, CalendarCheck, ChevronLeft, ChevronRight, Contact, Crown, Eye, Mic2, Search, ShieldX, Store, Ticket, Users, Utensils,
} from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, adminFetch } from "../api";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, SectionTitle, Select, StatTile, TableWrap, focusRing } from "../ui";
import { initials, when } from "../format";
import { CompanyMark } from "./LogoPicker";
import { MediaMark, PassBand } from "./MediaBadges";
import { isMedia, otherTypes } from "./mediaMark";
import { DAY_SHORT, RSVP_STATUS_LABELS, RSVP_STATUS_TONE, TYPE_LABELS, TYPE_TONE, VIP_LABEL, VIP_TONE, personPath } from "./peopleMeta";
import {
  VOLUNTEER_COLUMNS, VOLUNTEER_FILTERS, isListAnswer, isProfileAnswer, lookupAnswer, volunteerError, volunteerProfile, volunteerQuery, volunteerRequests, volunteerRow,
} from "./volunteerView";
import { NOT_FOR_VOLUNTEERS, VOLUNTEER_FORBIDDEN, VOLUNTEER_FORBIDDEN_TEXT } from "../access";

/* =========================================================
   Admin → People for volunteer accounts (Oct 23 2026): the
   students helping at the event look people up, nothing else.
   Read only: no edits, switches, logo picker, delete, CSV or
   sends. The list (GET /console/people: filters, sorting and
   pages only) and one profile (GET /console/people/:id) are the
   only things it asks the server for, plus POST /console/search
   for anything typed in the list's search (the text goes in the
   body, so it never lands in an address, the browser's history
   or a log, even half-typed); what it shows is volunteerView.js's allowed
   fields (name, job title, company, photo / logo, their marks,
   pass and Pending, what the pass includes, RSVP days, meals,
   dietary and accessibility needs, arrival, booth, speaking
   sessions). Never emails, phones, ticket IDs, codes, prices,
   payment or email engagement.
========================================================= */

const cx = (...a) => a.filter(Boolean).join(" ");

/** The note on every volunteer page. */
export function VolunteerBanner({ className = "mb-6" }) {
  return (
    <Banner tone="info" icon={Eye} className={className} title="Volunteer view: look-up only">
      Find a guest and see their pass, meals, RSVP and check-in. Nothing can be changed here: if something needs changing, ask a staff member.
    </Banner>
  );
}

/** Any other admin address, for a volunteer. */
export function NotForVolunteers() {
  return (
    <div className="mx-auto mt-6 max-w-md rounded-[22px] border border-ttfc-line bg-ttfc-panel p-8 text-center" role="alert">
      <ShieldX className="mx-auto mb-4 h-10 w-10 text-ttfc-pink" aria-hidden="true" />
      <h1 className="text-xl font-bold">{NOT_FOR_VOLUNTEERS}</h1>
      <p className="mt-2 text-sm text-ttfc-muted">{VOLUNTEER_FORBIDDEN_TEXT} Ask a staff member if you need something else.</p>
      <Link to="/admin/people" className={cx("mt-6 inline-flex items-center gap-2 rounded-xl bg-ttfc-purple px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90", focusRing)}>
        <Contact className="h-4 w-4" aria-hidden="true" /> Back to People
      </Link>
    </div>
  );
}

const isForbidden = (e) => e?.code === VOLUNTEER_FORBIDDEN;

function SortHeader({ col, sort, dir, onSort }) {
  if (!col.sort) return <th><span className="font-semibold normal-case">{col.label}</span></th>;
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

function Marks({ r, none = true }) {
  const types = otherTypes(r.types);
  return (
    <span className="flex flex-wrap gap-1">
      {r.vip && <Badge tone={VIP_TONE} icon={Crown}>{VIP_LABEL}</Badge>}
      {isMedia(r) && <MediaMark />}
      {types.map((t) => <Badge key={t} tone={TYPE_TONE[t]}>{TYPE_LABELS[t] || t}</Badge>)}
      {none && !types.length && !r.vip && !isMedia(r) && <span className="text-ttfc-dim">None</span>}
    </span>
  );
}

/** "Includes: CxO · Lunch · Gala": what their pass includes, nothing about who set it. */
function Includes({ pass }) {
  const on = (pass?.inclusions || []).filter((x) => x.included);
  if (!on.length) return null;
  return (
    <span className="mt-1 block" title={(pass.inclusions || []).map((x) => `${x.label}: ${x.included ? "Yes" : "No"}`).join("\n")}>
      <Badge tone="purple">Includes: {on.map((x) => x.short).join(" · ")}</Badge>
    </span>
  );
}

function PassCell({ r }) {
  if (!r.pass) return <span className="text-ttfc-dim">None</span>;
  return (
    <>
      {r.band ? <PassBand band={r.band} /> : <span className="font-medium">{r.pass.label}</span>}
      {(r.pass.pending || r.passCount > 1) && (
        <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-ttfc-dim">
          {r.pass.pending && <Badge tone="warn">Pending</Badge>}
          {r.passCount > 1 && <span>+{r.passCount - 1} more</span>}
        </span>
      )}
      <Includes pass={r.pass} />
    </>
  );
}

function RsvpCell({ rsvp }) {
  return (
    <span className="block space-y-1">
      <Badge tone={RSVP_STATUS_TONE[rsvp.status]}>{RSVP_STATUS_LABELS[rsvp.status]}</Badge>
      {rsvp.days.length > 0 && <span className="block text-[11px] text-ttfc-dim">{rsvp.days.map((d) => DAY_SHORT[d] || d).join(" & ")}</span>}
    </span>
  );
}

function Arrival({ a }) {
  if (!a?.known) return <span className="text-ttfc-dim" title="Not known yet">—</span>;
  if (!a.checkedIn) return <span className="text-ttfc-muted">Not yet</span>;
  return (
    <span className="block">
      <Badge tone="good">Arrived</Badge>
      {a.at && <span className="block text-[11px] text-ttfc-muted">{when(a.at)}</span>}
    </span>
  );
}

const Exhibitor = ({ r }) => (r.exhibitor
  ? <span className="block"><Badge tone="purple">Yes</Badge>{r.booth && <span className="block text-[11px] text-ttfc-muted">Booth {r.booth}</span>}</span>
  : <span className="text-ttfc-muted">No</span>);

/** A failed load or search, in words for a volunteer (volunteerError), with Try again. */
function VolunteerErrorState({ error, onRetry, title = "Couldn't load this" }) {
  return <ErrorState error={{ message: volunteerError(error) }} onRetry={onRetry} title={title} />;
}

/**
 * Never a blank page for a volunteer: if drawing the list or a profile ever throws (an answer in a shape nobody
 * expected), this card shows instead, with Try again and a way back to People. Opening another page starts afresh.
 * The error itself stays out of the page.
 */
class VolunteerGuard extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, at: props.resetKey, attempt: 0 };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.at ? { failed: false, at: props.resetKey } : null;
  }

  componentDidCatch(error) {
    // What broke, never the data it was drawing.
    console.error(`Volunteer panel: couldn't show this page (${error?.name || "Error"})`);
  }

  render() {
    if (!this.state.failed) return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
    return (
      <div className="mx-auto mt-6 max-w-md">
        <ErrorState title="Couldn't show this page" error={{ message: "Something on this page didn't load properly. Try again, or go back to People and search again. If it keeps happening, ask a staff member." }}
          onRetry={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))} />
        <div className="mt-4 text-center">
          <Link to="/admin/people" className={cx("inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ttfc-muted hover:text-ttfc-text", focusRing)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to People
          </Link>
        </div>
      </div>
    );
  }
}

/**
 * The list's search for a volunteer: POST /console/search with the text in the body (never in an address, the
 * browser's history or the hosting logs), People results only. `send` "" → nothing is asked. While a newer search is on
 * its way the last answer stays up (`stale`), so the results don't flicker as they type.
 */
function useVolunteerLookup(send) {
  const [nonce, setNonce] = useState(0);
  const [res, setRes] = useState({ key: "", answer: null, error: null });
  const key = send ? `${send}#${nonce}` : "";
  useEffect(() => {
    if (!send) return undefined;
    const ctrl = new AbortController();
    const k = `${send}#${nonce}`;
    adminFetch("/console/search", { method: "POST", body: { q: send }, signal: ctrl.signal }).then(
      (data) => setRes({ key: k, answer: lookupAnswer(data), error: null }),
      (error) => { if (error?.name !== "AbortError") setRes({ key: k, answer: null, error }); },
    );
    return () => ctrl.abort();
  }, [send, nonce]);
  const stale = !!key && res.key !== key;
  return {
    answer: res.answer, error: stale ? null : res.error, stale,
    // Nothing worth keeping up meanwhile (no answer yet, or the last one was a failure): show "Searching…".
    loading: stale && !(res.answer?.ok && !res.answer.failed),
    retry: () => setNonce((n) => n + 1),
  };
}

/** The search's results: who matched (the closest few), or why there is nothing to show. */
function LookupResults({ lookup, filtersSet }) {
  const { answer: a, error, loading, stale, retry } = lookup;
  if (loading) return <LoadingState label="Searching…" />;
  if (isForbidden(error)) return <NotForVolunteers />;
  if (error) return <VolunteerErrorState error={error} onRetry={retry} title="Couldn't search people" />;
  if (!a) return <LoadingState label="Searching…" />;
  if (!a.ok || a.failed) return <VolunteerErrorState error={null} onRetry={retry} title="Couldn't search people" />;
  if (!a.items.length) {
    return <EmptyState icon={Users} title="No one found" body="Check the spelling, or try their company. An exact email address or ticket ID finds them too." />;
  }
  return (
    <section aria-label="Search results" aria-busy={stale} className={cx("transition-opacity", stale && "opacity-60")}>
      <p className="mb-2 text-xs text-ttfc-dim">
        {a.exact ? "Found by an exact email address or ticket ID (not shown here)." : a.more
          ? `${a.total.toLocaleString()} people match. These are the closest ${a.items.length}: add more of their name or company to narrow it down.`
          : `${a.items.length === 1 ? "1 person matches" : `${a.items.length} people match`}.`}
        {filtersSet ? " Filters don't apply to a search: clear the search to use them." : ""}
      </p>
      <ul className="space-y-3">
        {a.items.map((r) => (
          <li key={r.id}>
            <Link to={r.link} className={cx("flex items-center gap-3 rounded-[18px] border border-ttfc-line bg-ttfc-panel p-4 transition hover:border-ttfc-purple/50", focusRing)}>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ttfc-pink via-ttfc-purple to-ttfc-orange text-sm font-bold text-white" aria-hidden="true">
                {initials(r.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ttfc-text">{r.name}</span>
                {r.subtitle && <span className="block truncate text-xs text-ttfc-muted">{r.subtitle}</span>}
              </span>
              {r.badges.length > 0 && (
                <span className="hidden flex-wrap justify-end gap-1 sm:flex">{r.badges.map((b) => <Badge key={b} tone="neutral">{b}</Badge>)}</span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-ttfc-dim" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* /admin/people for a volunteer (a failure to draw it shows a card, never a blank page). */
export function VolunteerDirectory() {
  const { pathname } = useLocation();
  return <VolunteerGuard resetKey={pathname}><Directory /></VolunteerGuard>;
}

function Directory() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const dq = useDebounced(q, 300);
  // Any search goes by POST /console/search, in the body; the list's GET only ever carries filters, sort and page.
  const view = Object.fromEntries(params);
  const req = volunteerRequests(dq, view);
  const { search } = req;
  const searching = !!search.text;
  const lookup = useVolunteerLookup(req.post?.q || "");
  const query = volunteerQuery(view);
  const page = Number(query.get("page")) || 0;
  const sort = query.get("sort") || "name";
  const dir = query.get("dir") === "desc" ? "desc" : "asc";
  const { data, error, loading, reload, refreshing } = useApi(req.get);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === "" || v == null || v === 0) p.delete(k); else p.set(k, String(v)); }
    setParams(p, { replace: true });
  };
  // A search in a link (an old "See all in People", a pasted address) moves into the box and out of the address.
  const linked = params.get("q");
  useEffect(() => {
    if (linked == null) return;
    const p = new URLSearchParams(params);
    p.delete("q");
    setParams(p, { replace: true });
  }, [linked, params, setParams]);
  const [lastLinked, setLastLinked] = useState(linked);
  if (linked !== lastLinked) { setLastLinked(linked); if (linked != null) setQ(linked); }
  // The search stays on the page and in POST bodies: never in the address, the browser's history or a log.
  const onSearch = (v) => { setQ(v); update({ q: "", page: 0 }); };
  const onSort = (key) => update({ sort: key === "name" ? "" : key, dir: sort === key && dir === "asc" ? "desc" : "", page: 0 });
  const clearAll = () => { setQ(""); update(Object.fromEntries(["q", "page", "sort", "dir", ...VOLUNTEER_FILTERS.map((f) => f.key)].map((k) => [k, ""]))); };

  // An answer that isn't a list (a server error page, a Wi-Fi sign-in page) is an error, not "No one yet".
  const listOk = isListAnswer(data);
  const listError = error || (data !== undefined && !listOk ? { status: -1 } : null);
  const rows = listOk ? data.rows.map(volunteerRow) : [];
  const total = listOk && Number.isFinite(data.total) ? data.total : rows.length;
  const size = listOk && Number.isFinite(data.size) && data.size > 0 ? data.size : 50;
  const pages = Math.max(1, Math.ceil(total / size));
  const filtersSet = VOLUNTEER_FILTERS.some((f) => query.get(f.key));
  const filtered = !!(q.trim() || filtersSet);
  const c = listOk && data.counts && typeof data.counts === "object" ? data.counts : null;
  const open = (id) => navigate(personPath(id));
  const count = (n) => (typeof n === "number" ? n.toLocaleString() : undefined);
  const found = lookup.answer?.ok && !lookup.answer.failed ? lookup.answer : null;
  const status = searching
    ? search.tooShort ? "Keep typing…" : lookup.loading ? "Searching…" : lookup.error || !found ? "Search didn't work"
      : found.exact ? "Exact look-up" : `${found.total.toLocaleString()} found${lookup.stale ? " · searching…" : ""}`
    : loading ? "Loading…" : listError && !listOk ? "Couldn't load" : `${total.toLocaleString()} ${total === 1 ? "person" : "people"}${refreshing ? " · updating…" : ""}`;

  if (!searching && isForbidden(error)) return <NotForVolunteers />;

  return (
    <>
      <PageHeader eyebrow="Volunteer view" title="People"
        description="Find a guest by name or company. An exact email address or ticket ID finds them too (it isn't shown). Open someone for their pass, meals, RSVP and check-in." />
      <VolunteerBanner />

      {c && typeof c.total === "number" && (
        // Phones go straight to the search (the counts are on tablets and up).
        <div className="mb-6 hidden grid-cols-2 gap-3 sm:grid sm:gap-4 lg:grid-cols-4">
          <StatTile label="People" value={count(c.total)} icon={Users} tone="purple" to="?" />
          <StatTile label="Speakers" value={count(c.byType?.speaker)} icon={Mic2} tone="pink" to="?type=speaker" />
          <StatTile label="Exhibitors" value={count(c.exhibitors)} icon={Store} tone="neutral" to="?exhibitor=yes" />
          <StatTile label="VIPs" value={count(c.vips)} icon={Crown} tone="orange" to="?vip=yes" />
        </div>
      )}

      <div className="mb-4 space-y-3 rounded-[18px] border border-ttfc-line bg-ttfc-panel p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
            <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name or company" className="pl-9" aria-label="Search people" />
          </div>
          <p className="text-sm text-ttfc-muted" aria-live="polite">{status}</p>
          {filtered && <Button size="sm" variant="ghost" onClick={clearAll}>Clear filters</Button>}
        </div>
        {/* A search looks through everyone (the filters are for browsing the list), so they rest while it's on; on
            phones they step aside so the results sit right under the box. */}
        <div className={cx("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6", searching && "max-sm:hidden opacity-60")} title={searching ? "Clear the search to use the filters" : undefined}>
          {VOLUNTEER_FILTERS.map((fd) => (
            <label key={fd.key} className="flex min-w-0 flex-col justify-end">
              <span className="mb-1 block text-[11px] font-semibold uppercase leading-tight tracking-wide text-ttfc-dim">{fd.label}</span>
              <Select value={query.get(fd.key) || ""} onChange={(e) => update({ [fd.key]: e.target.value, page: 0 })} className="w-full" aria-label={fd.label} disabled={searching}>
                <option value="">{fd.any || "Any"}</option>
                {fd.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </Select>
            </label>
          ))}
        </div>
      </div>

      {searching ? (search.tooShort
        ? <EmptyState icon={Search} title="Keep typing" body="Type at least 2 letters of their name or company, or their full email address or ticket ID." />
        : <LookupResults lookup={lookup} filtersSet={filtersSet} />
      ) : loading ? <LoadingState label="Loading people…" /> : listError && !listOk ? <VolunteerErrorState error={listError} onRetry={reload} title="Couldn't load people" /> : !rows.length ? (
        <EmptyState icon={Users} title={filtersSet ? "No one matches" : "No one yet"} body={filtersSet ? "Try a different filter." : undefined} />
      ) : (
        <>
          {/* Phones: one card per person. */}
          <ul className="space-y-3 sm:hidden" aria-label="People">
            {rows.map((r) => (
              <li key={r.id}>
                <Link to={personPath(r.id)} className={cx("block rounded-[18px] border border-ttfc-line bg-ttfc-panel p-4 transition hover:border-ttfc-purple/50", focusRing)}>
                  <span className="flex items-start gap-3">
                    <CompanyMark url={r.logoUrl} name={r.company || r.name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ttfc-text">{r.name}</span>
                      <span className="block truncate text-xs text-ttfc-muted">{[r.jobTitle, r.company].filter(Boolean).join(" · ") || "No company"}</span>
                    </span>
                  </span>
                  <span className="mt-3 block"><Marks r={r} none={false} /></span>
                  <span className="mt-2 grid grid-cols-2 gap-3 text-xs">
                    <span className="col-span-2 min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ttfc-dim">Pass</span><PassCell r={r} /></span>
                    <span className="min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ttfc-dim">RSVP</span><RsvpCell rsvp={r.rsvp} /></span>
                    <span className="min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ttfc-dim">Arrived</span><Arrival a={r.arrival} /></span>
                    <span className="min-w-0"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ttfc-dim">Exhibitor</span><Exhibitor r={r} /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <TableWrap className="hidden sm:block">
            <thead>
              <tr>
                {VOLUNTEER_COLUMNS.map((col) => <SortHeader key={col.key} col={col} sort={sort} dir={dir} onSort={onSort} />)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="is-clickable align-top" tabIndex={0} onClick={() => open(r.id)}
                  onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(r.id); } }}
                  aria-label={`Open ${r.name}`}>
                  <td className="max-w-[220px]">
                    <Link to={personPath(r.id)} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold hover:text-ttfc-pink hover:underline">{r.name}</Link>
                  </td>
                  <td><span className="block max-w-[180px]"><Marks r={r} /></span></td>
                  <td className="max-w-[240px]">
                    <span className="flex items-center gap-2">
                      <CompanyMark url={r.logoUrl} name={r.company} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate">{r.company || <span className="text-ttfc-dim">None</span>}</span>
                        {r.jobTitle && <span className="block truncate text-xs text-ttfc-dim">{r.jobTitle}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="min-w-[170px] max-w-[230px]"><PassCell r={r} /></td>
                  <td className="whitespace-nowrap"><RsvpCell rsvp={r.rsvp} /></td>
                  <td className="whitespace-nowrap"><Arrival a={r.arrival} /></td>
                  <td><Exhibitor r={r} /></td>
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
        Pass: their main pass in the colour door staff see (VIP gold, Media dark blue, Speaker red, Staff purple, Volunteer orange, any other pass green).
        Pending: a pass made for them that hasn't been sent yet. Includes: the meals and events on their pass (CxO Breakfasts, Networking Luncheons, Gala Dinner, Catalyst Awards Night).
      </p>
    </>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-ttfc-line/60 py-2.5 last:border-0 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 text-sm text-ttfc-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-ttfc-text">{children}</dd>
    </div>
  );
}
const Nothing = ({ children = "None" }) => <span className="text-ttfc-dim">{children}</span>;

function PassCard({ v }) {
  return (
    <Card>
      <SectionTitle hint="Their pass and the meals and events it includes.">Pass</SectionTitle>
      {!v.passes.length ? <p className="text-sm text-ttfc-muted">No pass on file.</p> : (
        <ul className="space-y-3">
          {v.passes.map((t, i) => (
            <li key={i} className="rounded-xl border border-ttfc-line bg-ttfc-panel2 px-3 py-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <Ticket className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
                <span className="font-semibold">{t.label}</span>
                {t.pending && <Badge tone="warn">Pending</Badge>}
                {t.exhibitorPass && <Badge tone="purple" icon={Store}>Exhibitor's pass</Badge>}
                {t.booth && <Badge tone="purple">Booth {t.booth}</Badge>}
                {t.checkedIn ? <Badge tone="good">Checked in{t.checkedInAt ? ` · ${when(t.checkedInAt)}` : ""}</Badge> : null}
              </p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {t.inclusions.map((x) => (
                  <li key={x.key} className="flex items-center justify-between gap-2 rounded-lg bg-ttfc-contrast/[0.03] px-2.5 py-1.5">
                    <span className="text-xs text-ttfc-text">{x.label}</span>
                    <Badge tone={x.included ? "good" : "neutral"}>{x.included ? "Yes" : "No"}</Badge>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RsvpCard({ v }) {
  const r = v.rsvp;
  const events = r.events;
  return (
    <Card>
      <SectionTitle hint="What they told us in their RSVP: the days they're coming, their meals and anything catering needs to know.">RSVP</SectionTitle>
      <dl>
        <Row label="Status">
          <Badge tone={RSVP_STATUS_TONE[r.status]}>{RSVP_STATUS_LABELS[r.status]}</Badge>
          {r.at && <span className="ml-2 text-xs text-ttfc-muted">{when(r.at)}</span>}
        </Row>
        <Row label="Days">{r.days.length ? r.days.map((d) => DAY_SHORT[d] || d).join(" & ") : <Nothing>Not chosen</Nothing>}</Row>
        <Row label="Meals and events">
          {events.length ? (
            <ul className="space-y-0.5">{events.map((e) => <li key={e.key}><span className="font-medium">{e.label}</span> <span className="text-ttfc-dim">{[e.day, e.time].filter(Boolean).join(", ")}</span></li>)}</ul>
          ) : <Nothing />}
        </Row>
        <Row label="Dietary needs">
          {r.dietary.length ? (
            <span className="flex flex-wrap gap-1.5">{r.dietary.map((d) => <Badge key={d} tone="orange" icon={Utensils}>{d}</Badge>)}</span>
          ) : <Nothing />}
        </Row>
        <Row label="Accessibility needs">
          {r.accessibility ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge tone="warn" icon={Accessibility}>Yes</Badge>
              <span className="text-xs text-ttfc-muted">They told us about accessibility needs. Ask them how we can help, or find a staff member.</span>
            </span>
          ) : <Nothing>None told to us</Nothing>}
        </Row>
      </dl>
    </Card>
  );
}

function SpeakingCard({ v }) {
  if (!v.speaker && !v.sessions.length) return null;
  return (
    <Card>
      <SectionTitle hint="Sessions they speak at.">Speaking</SectionTitle>
      {!v.sessions.length ? <p className="text-sm text-ttfc-muted">No sessions listed for them yet.</p> : (
        <ul className="divide-y divide-ttfc-line text-sm">
          {v.sessions.map((s) => (
            <li key={s.key} className="py-2.5">
              <p className="font-medium text-ttfc-text">{s.title}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                <span className="whitespace-nowrap tabular-nums text-ttfc-muted">{[s.day, s.time].filter(Boolean).join(" · ")}</span>
                {(s.format || s.role) && <span className="text-ttfc-dim">{[s.format, s.role].filter(Boolean).join(" · ")}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ArrivalCard({ v }) {
  const a = v.arrival;
  return (
    <Card>
      <SectionTitle>Arrival</SectionTitle>
      <dl>
        <Row label="Checked in">
          {!a.known ? <Nothing>Not known yet</Nothing> : a.checkedIn ? (
            <span className="inline-flex flex-wrap items-center gap-2"><Badge tone="good" icon={CalendarCheck}>Arrived</Badge>{a.at && <span className="text-xs text-ttfc-muted">{when(a.at)}</span>}</span>
          ) : <span className="text-ttfc-muted">Not yet</span>}
        </Row>
        <Row label="Exhibitor">{v.exhibitor ? <>Yes{v.booth ? ` · Booth ${v.booth}` : ""}</> : "No"}</Row>
      </dl>
    </Card>
  );
}

/* /admin/people/:id for a volunteer (a failure to draw it shows a card, never a blank page). */
export function VolunteerProfile() {
  const { id } = useParams();
  const { pathname } = useLocation();
  return <VolunteerGuard resetKey={pathname}><ProfileView key={id} id={id} /></VolunteerGuard>;
}

const BackToPeople = ({ className = "mb-5" }) => (
  <Link to="/admin/people" className={cx("inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-ttfc-muted hover:text-ttfc-text", className)}>
    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> People
  </Link>
);

function ProfileView({ id }) {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(`/console/people/${encodeURIComponent(id)}`);
  const ok = isProfileAnswer(data);

  // A guest pass later claimed by an account: show the person's own address (as for staff).
  useEffect(() => {
    if (ok && typeof data.canonicalId === "string" && data.canonicalId && data.canonicalId !== id) navigate(personPath(data.canonicalId), { replace: true });
  }, [ok, data, id, navigate]);

  if (isForbidden(error)) return <NotForVolunteers />;
  if (loading) return <LoadingState label="Loading person…" />;
  if (!ok) {
    // An error, or an answer that isn't a person (a server error page, a Wi-Fi sign-in page): never an empty profile.
    const failure = error || { status: -1 };
    return (
      <>
        <BackToPeople />
        <VolunteerErrorState error={failure} onRetry={failure.status === 404 ? undefined : reload} title={failure.status === 404 ? "Person not found" : "Couldn't load this person"} />
      </>
    );
  }
  const v = volunteerProfile(data);
  const photo = /^https:\/\//.test(v.photoUrl) ? v.photoUrl : v.photoUrl.startsWith("/api/") ? `${ADMIN_API.replace(/\/api\/?$/, "")}${v.photoUrl}` : "";

  return (
    <>
      <BackToPeople />
      <VolunteerBanner className="mb-5" />
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {photo ? (
          <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ttfc-pink via-ttfc-purple to-ttfc-orange text-lg font-bold text-white" aria-hidden="true">
            {initials(v.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{v.name}</h1>
            <Marks r={v} none={false} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ttfc-muted">
            <CompanyMark url={v.logoUrl} name={v.company} size="sm" />
            <span>{[v.jobTitle, v.company].filter(Boolean).join(" · ") || "No company yet"}</span>
          </p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            {v.pass ? (v.band ? <PassBand band={v.band} /> : <Badge tone="good">{v.pass.label}</Badge>) : <Badge>Pass: None</Badge>}
            {v.pass?.pending && <Badge tone="warn">Pending</Badge>}
            <Badge tone={RSVP_STATUS_TONE[v.rsvp.status]}>{RSVP_STATUS_LABELS[v.rsvp.status]}</Badge>
            {v.arrival.checkedIn && <Badge tone="good">Arrived{v.arrival.at ? ` · ${when(v.arrival.at)}` : ""}</Badge>}
          </p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <RsvpCard v={v} />
          <SpeakingCard v={v} />
        </div>
        <div className="space-y-5">
          <PassCard v={v} />
          <ArrivalCard v={v} />
        </div>
      </div>
    </>
  );
}
