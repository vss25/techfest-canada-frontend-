import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Handshake, Info, ListPlus, Search, Store, Users, UsersRound } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, StatTile, TableWrap, Tabs, focusRing } from "../ui";
import { when } from "../format";
import ContentSettings from "../content/ContentSettings";
import EmailPreview from "../app/EmailPreview";
import JourneyEditor from "./JourneyEditor";

/* =========================================================
   Admin › Sales & emails › 2027 waitlist (Oct 23 2026)
   Everyone who joined the TTFC 2027 waitlist on
   thetechfestival.com/stay-updated, the web app or the apps
   (GET /api/console/waitlist): counts per interest, filters by
   interest (nothing ticked = attending), where from and a search,
   newest first, 50 a page; the CSV for management (phone numbers).
   Read only. The team is emailed at enquire@ for each sign-up and
   the person gets "You're on the TTFC 2027 waitlist" (from
   enquire@, at most once a day per address).
   Tabs: Sign-ups · 2027 journey (the map's stops: JourneyEditor,
   Oct 23 2026) · Wording (the stay.* texts, ContentSettings scope
   "stay") · Email preview (the person's email with the saved
   wording; nothing is sent). The journey editor stays mounted once
   opened, so switching tabs keeps unsaved changes.
========================================================= */

const PAGE = 50;
const INTERESTS = [
  { key: "sponsorship", label: "Sponsorship", icon: Handshake, tone: "purple" },
  { key: "exhibitor", label: "Exhibitor", icon: Store, tone: "orange" },
  { key: "delegation", label: "Delegation", icon: UsersRound, tone: "pink" },
];
// "programme": the form at the bottom of the website's /programme page (Oct 24 2026).
const SOURCES = [["website", "Website"], ["webapp", "Web app"], ["ios", "iOS app"], ["android", "Android app"], ["programme", "Website programme page"]];
const SOURCE_LABEL = Object.fromEntries(SOURCES);
const BADGE_TONE = { sponsorship: "purple", exhibitor: "orange", delegation: "pink" };

const TEAM = { sent: ["good", "Sent"], failed: ["bad", "Failed"], sending: ["purple", "Sending…"] };
const PERSON = {
  sent: ["good", "Sent"], failed: ["bad", "Failed"], sending: ["purple", "Sending…"],
  unsubscribed: ["neutral", "Unsubscribed", "On the unsubscribe list, so they weren't emailed"],
};

function Status({ map, value, empty = "—" }) {
  const s = map[value];
  if (!s) return <span className="text-xs text-ttfc-dim">{empty}</span>;
  return <span title={s[2]}><Badge tone={s[0]}>{s[1]}</Badge></span>;
}

function SignUps() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [exporting, setExporting] = useState(false);
  const page = Math.max(0, Number(params.get("page")) || 0);
  const interest = params.get("interest") || "";
  const source = params.get("source") || "";
  const dq = useDebounced(q.trim(), 300);

  const filters = new URLSearchParams();
  if (dq) filters.set("q", dq);
  if (interest) filters.set("interest", interest);
  if (source) filters.set("source", source);
  const qs = new URLSearchParams(filters);
  qs.set("page", String(page));
  const { data, error, loading, reload, refreshing } = useApi(`/console/waitlist?${qs}`);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === "" || v == null || v === 0) p.delete(k); else p.set(k, String(v)); }
    setParams(p, { replace: true });
  };
  const counts = data?.counts || {};
  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${ADMIN_API}/console/waitlist/export${filters.toString() ? `?${filters}` : ""}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttfc-2027-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err); } finally { setExporting(false); }
  };

  const chip = (key, label, n) => (
    <button key={key || "all"} type="button" aria-pressed={interest === key} onClick={() => update({ interest: key, page: 0 })}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${interest === key ? "bg-ttfc-contrast/10 text-ttfc-text" : "text-ttfc-muted hover:bg-ttfc-contrast/5 hover:text-ttfc-text"} ${focusRing}`}>
      {label}<span className="rounded-full bg-ttfc-contrast/5 px-1.5 text-[11px] tabular-nums">{(n ?? 0).toLocaleString()}</span>
    </button>
  );

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="On the waitlist" value={data ? (counts.total ?? 0).toLocaleString() : "…"} icon={ListPlus} tone="pink" />
        {INTERESTS.map((i) => <StatTile key={i.key} label={i.label} value={data ? (counts[i.key] ?? 0).toLocaleString() : "…"} icon={i.icon} tone={i.tone} />)}
        <StatTile label="Attending only" value={data ? (counts.attending ?? 0).toLocaleString() : "…"} icon={Users} tone="neutral" hint="Nothing ticked" />
      </div>

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-5" title="Need a spreadsheet?">
          Downloading the list as a CSV is for management (it has phone numbers). Ask a manager if you need one.
        </Banner>
      )}

      <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Show">
        {chip("", "Everyone", counts.total)}
        {INTERESTS.map((i) => chip(i.key, i.label, counts[i.key]))}
        {chip("attending", "Attending only", counts.attending)}
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => { setQ(e.target.value); update({ q: e.target.value.trim(), page: 0 }); }}
            placeholder="Search email or phone" className="pl-9" aria-label="Search the waitlist" />
        </div>
        <Select value={source} onChange={(e) => update({ source: e.target.value, page: 0 })} aria-label="Where they signed up" className="sm:w-48">
          <option value="">Everywhere</option>
          {SOURCES.map(([k, label]) => <option key={k} value={k}>{label} ({(counts[k] ?? 0).toLocaleString()})</option>)}
        </Select>
        <p className="text-sm text-ttfc-muted sm:ml-auto" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} ${total === 1 ? "person" : "people"}`}{refreshing && !loading ? " · updating…" : ""}
        </p>
        {isManagement && <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Everyone matching these filters, with phone numbers">Download CSV</Button>}
      </div>

      {loading ? <LoadingState label="Loading the waitlist…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={ListPlus}
          title={dq || interest || source ? "Nobody matches" : "Nobody on the waitlist yet"}
          body={dq || interest || source ? "Try another filter or search." : "People appear here as soon as they join on thetechfestival.com/stay-updated, the web app or the apps."} />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr><th>Joined</th><th>Email</th><th>Phone</th><th>Interested in</th><th>From</th><th>Sign-ups</th><th>Emails</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap text-ttfc-muted">
                    {when(r.createdAt)}
                    {r.count > 1 && <span className="block text-[11px] text-ttfc-dim">Last {when(r.lastSubmittedAt)}</span>}
                  </td>
                  <td className="max-w-[240px] truncate font-mono text-xs">
                    <a href={`mailto:${r.email}`} className="text-ttfc-muted hover:text-ttfc-pink hover:underline" title={r.email}>{r.email}</a>
                  </td>
                  <td className="whitespace-nowrap font-mono text-xs">
                    {r.tel ? <a href={r.tel} className="text-ttfc-muted hover:text-ttfc-pink hover:underline">{r.phone}</a> : <span className="text-ttfc-muted">{r.phone || "—"}</span>}
                  </td>
                  <td>
                    {r.interests.length
                      ? <span className="flex flex-wrap gap-1">{r.interests.map((k, i) => <Badge key={k} tone={BADGE_TONE[k]}>{r.interestLabels[i]}</Badge>)}</span>
                      : <span className="text-xs text-ttfc-muted">Attending</span>}
                  </td>
                  <td className="whitespace-nowrap text-xs text-ttfc-muted">
                    {SOURCE_LABEL[r.source] || r.source}
                    {r.sources.filter((s) => s !== r.source).length > 0 && (
                      <span className="block text-[11px] text-ttfc-dim">also {r.sources.filter((s) => s !== r.source).map((s) => SOURCE_LABEL[s] || s).join(", ")}</span>
                    )}
                  </td>
                  <td className="tabular-nums text-ttfc-muted">{r.count}</td>
                  <td className="whitespace-nowrap text-[11px] text-ttfc-dim">
                    <span className="flex items-center gap-1.5">Team <Status map={TEAM} value={r.alertStatus} /></span>
                    <span className="mt-1 flex items-center gap-1.5">Them <Status map={PERSON} value={r.confirmStatus} empty="Not sent" /></span>
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
    </>
  );
}

function Preview() {
  const [ticks, setTicks] = useState(["sponsorship", "exhibitor"]);
  const { data, error, loading } = useApi(`/console/waitlist/email-preview?interests=${encodeURIComponent(ticks.join(","))}`);
  const toggle = (k) => setTicks((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]));
  return (
    <div className="space-y-3">
      <p className="text-sm text-ttfc-muted">
        What someone gets when they join: from enquire@thetechfestival.com, with the saved wording. Nothing is sent from here.
      </p>
      <fieldset className="flex flex-wrap items-center gap-2 text-sm">
        <legend className="mb-1 w-full text-xs font-semibold text-ttfc-muted">Show it for someone who ticked</legend>
        {INTERESTS.map((i) => (
          <label key={i.key} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ttfc-line px-3 py-1.5">
            <input type="checkbox" checked={ticks.includes(i.key)} onChange={() => toggle(i.key)} className="accent-ttfc-purple" />{i.label}
          </label>
        ))}
        {!ticks.length && <span className="text-xs text-ttfc-dim">Nothing ticked: the email says “Attending TTFC 2027”.</span>}
      </fieldset>
      <EmailPreview preview={data} loading={loading} error={error} title="Waitlist email preview" />
    </div>
  );
}

export default function Waitlist2027() {
  const [params, setParams] = useSearchParams();
  const tab = ["signups", "journey", "wording", "email"].includes(params.get("tab")) ? params.get("tab") : "signups";
  const setTab = (t) => { const p = new URLSearchParams(); if (t !== "signups") p.set("tab", t); setParams(p, { replace: true }); };
  // Opened once, the journey editor stays mounted (hidden on other tabs), so unsaved changes survive a tab switch.
  const [journeyOpened, setJourneyOpened] = useState(tab === "journey");
  if (tab === "journey" && !journeyOpened) setJourneyOpened(true);
  return (
    <>
      <PageHeader
        eyebrow="Sales & emails"
        title="2027 waitlist"
        description="People who joined the TTFC 2027 waitlist on the website, the web app or the apps, and what they're interested in; the page's 2027 journey (the map of Canada and its stops) and its wording. The team gets an email at enquire@thetechfestival.com for each sign-up; the person gets “You're on the TTFC 2027 waitlist”."
        actions={(
          <a href="https://www.thetechfestival.com/stay-updated" target="_blank" rel="noopener noreferrer"
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-ttfc-line bg-ttfc-panel2 px-4 text-sm font-semibold text-ttfc-text transition hover:border-ttfc-purple/60 ${focusRing}`}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />Open the page
          </a>
        )}
      />
      <Tabs label="2027 waitlist" value={tab} onChange={setTab} tabs={[
        { key: "signups", label: "Sign-ups" },
        { key: "journey", label: "2027 journey" },
        { key: "wording", label: "Wording" },
        { key: "email", label: "Email preview" },
      ]} />
      {tab === "signups" && <SignUps />}
      {journeyOpened && <div hidden={tab !== "journey"}><JourneyEditor /></div>}
      {tab === "wording" && (
        <div className="space-y-4">
          <p className="text-sm text-ttfc-muted">Every word on thetechfestival.com/stay-updated, the same screen in the web app and the email people get (the map and its stops are on the 2027 journey tab). Empty a field to go back to the default.</p>
          <ContentSettings scope="stay" />
        </div>
      )}
      {tab === "email" && <Preview />}
    </>
  );
}
