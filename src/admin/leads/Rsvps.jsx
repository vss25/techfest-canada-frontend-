import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle, BadgeCheck, CalendarCheck, ChevronLeft, ChevronRight, Download, Info, PartyPopper, Search, Utensils,
} from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Bars, Button, Card, Drawer, EmptyState, ErrorState, Input, LoadingState, PageHeader, SectionTitle, Select, StatTile, TableWrap,
} from "../ui";
import { when } from "../format";

/* Admin → Leads → RSVPs
   TTFC 2026 RSVPs from the unlinked website page /rsvp (POST /api/rsvp).
   One row per person; re-submitting updates it. The pass is worked out by
   the server: a ticket ID + last name or a speaker name is "verified",
   anything else is what the person picked ("unverified").
   Days, experiences and dietary options are the same list the website uses
   (services/rsvp.js in the backend). Read from the staff list's `catalog`
   when the backend sends it (it keeps working while the kill switch has the
   public site, GET /api/rsvp/options included, switched off); otherwise from
   GET /api/rsvp/options, and failing that from the summary's own keys. */

const PAGE = 50;
const TIER_TONE = { connect: "neutral", influence: "pink", power: "orange", apex: "purple", speaker: "good" };
// Short names for the headcount tiles (the full names are in the list).
const SHORT = { gala: "Gala dinner", awards: "Awards night", meetings: "Pre-matched meetings", lounge: "Scotch lounge (19+)" };

/** The catalog's shape, from the summary's own keys: raw names, but every count still shows. */
const catalogFromSummary = (s) => s && {
  options: Object.keys(s.counts || {}).map((key) => ({ key, kind: /^day\d+$/.test(key) ? "day" : "experience", label: key })),
  tiers: Object.keys(s.tiers || {}).map((key) => ({ key, label: key })),
  dietary: Object.keys(s.dietary || {}).map((key) => ({ key, label: key })),
  days: [],
};

/** Days, experiences, passes and dietary options. `list` is the GET /console/rsvps response. */
function useCatalog(list) {
  // A backend that doesn't send `catalog` yet: ask the public endpoint, and if that's refused
  // (the kill switch), fall back to the summary's keys so the headcounts never disappear.
  const sent = list?.catalog;
  const { data: pub, error: pubError } = useApi(list && !sent ? "/rsvp/options" : null);
  const data = sent || pub || (pubError ? catalogFromSummary(list?.summary) : null);
  const options = data?.options || [];
  const days = data?.days || [];
  const tiers = data?.tiers || [];
  const dietary = data?.dietary || [];
  const dayName = (k) => days.find((d) => d.key === k)?.label || k;
  const optionName = (k) => {
    const o = options.find((x) => x.key === k);
    if (!o) return k;
    return o.kind === "experience" && o.day && !/day \d/i.test(o.label) ? `${o.label} · ${dayName(o.day)}` : o.label;
  };
  const tileName = (k) => {
    const o = options.find((x) => x.key === k);
    if (!o) return k;
    if (o.kind === "day") return dayName(o.key);
    const base = SHORT[k] || o.label;
    return o.day && !/day \d/i.test(base) ? `${base} · ${dayName(o.day)}` : base;
  };
  return {
    loaded: !!data, options, tiers, dietary,
    tierName: (k) => tiers.find((t) => t.key === k)?.label || k || "—",
    dietName: (k) => dietary.find((d) => d.key === k)?.label || k,
    dayName, optionName, tileName,
  };
}

function PassBadge({ tier, verified, cat }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={TIER_TONE[tier] || "neutral"}>{cat.tierName(tier)}</Badge>
      {verified
        ? <BadgeCheck className="h-4 w-4 text-emerald-300" aria-label="Verified" title={tier === "speaker" ? "On the speaker list" : "Verified with their ticket"} />
        : <span className="text-[11px] text-amber-200/80" title="Chosen by the person; no ticket ID matched">unverified</span>}
    </span>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="mb-7">
      <SectionTitle>{title}</SectionTitle>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[170px_1fr]">{children}</dl>
    </section>
  );
}

const Row = ({ label, children }) => [
  <dt key="t" className="text-ttfc-muted">{label}</dt>,
  <dd key="d" className="min-w-0 break-words">{children}</dd>,
];
const Dash = () => <span className="text-ttfc-dim">—</span>;

const KIND = {
  ticket: (r) => (r.ticketVerified ? "Ticket ID + last name matched" : "One ticket holder has this name (not proven)"),
  speaker: () => "Name is on the public speaker list",
  none: () => "No ticket or speaker matched",
};

function RsvpDrawer({ id, onClose, cat }) {
  const { data, error, loading, reload } = useApi(id ? `/console/rsvps/${id}` : null);
  const r = data?.rsvp;
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      width="max-w-2xl"
      title={r?.name || (loading ? "Loading…" : "RSVP")}
      description={r ? `${r.submissions > 1 ? `Updated ${r.submissions - 1}× · last ` : ""}${when(r.updatedAt)}` : ""}
    >
      {loading ? <LoadingState label="Loading RSVP…" /> : error && !r ? <ErrorState error={error} onRetry={reload} /> : r && (
        <>
          {r.spam && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-6" title="Flagged as a bot">
              {r.spamReason ? `Reason: ${r.spamReason}. ` : ""}Not counted in the headcounts.
            </Banner>
          )}
          <DetailSection title="Person">
            <Row label="Name">{r.name}</Row>
            <Row label="Email">{r.email ? <a href={`mailto:${r.email}`} className="text-ttfc-pink underline-offset-2 hover:underline">{r.email}</a> : <Dash />}</Row>
            <Row label="Ticket ID">{r.ticketId ? <span className="font-mono text-xs">{r.ticketId.toUpperCase()}{r.ticketVerified ? "" : " (didn't match)"}</span> : <Dash />}</Row>
          </DetailSection>

          <DetailSection title="Pass">
            <Row label="Pass"><PassBadge tier={r.tier} verified={r.tierVerified} cat={cat} /></Row>
            <Row label="How we know">{(KIND[r.kind] || KIND.none)(r)}</Row>
            {r.chosenTier && r.chosenTier !== r.tier && <Row label="They picked">{cat.tierName(r.chosenTier)}</Row>}
            {r.detectedTier && r.detectedTier !== r.tier && <Row label="Ticket on file">{cat.tierName(r.detectedTier)} (name match only)</Row>}
          </DetailSection>

          <DetailSection title="Coming to">
            <Row label="Days">{r.days.length ? r.days.map(cat.dayName).join(" & ") : <Dash />}</Row>
            <Row label="Experiences">
              {r.options.length
                ? <ul className="space-y-1">{r.options.map((k) => <li key={k}>{cat.optionName(k)}</li>)}</ul>
                : <span className="text-ttfc-muted">None</span>}
            </Row>
          </DetailSection>

          <DetailSection title="Needs">
            <Row label="Dietary">{r.dietary.length ? r.dietary.map(cat.dietName).join(", ") : <Dash />}</Row>
            {r.dietaryOther && <Row label="Dietary (other)">{r.dietaryOther}</Row>}
            <Row label="Accessibility">{r.accessibility ? <span className="whitespace-pre-wrap">{r.accessibility}</span> : <Dash />}</Row>
          </DetailSection>

          <DetailSection title="Submission">
            <Row label="First RSVP">{when(r.createdAt)}</Row>
            <Row label="Last change">{when(r.updatedAt)}</Row>
            <Row label="Times sent">{r.submissions}</Row>
            {r.fillMs != null && <Row label="Form open for">{r.fillMs < 60000 ? `${Math.round(r.fillMs / 1000)} s` : `${Math.round(r.fillMs / 60000)} min`}</Row>}
            {r.userAgent && <Row label="Browser"><span className="text-xs text-ttfc-muted">{r.userAgent}</span></Row>}
          </DetailSection>
        </>
      )}
    </Drawer>
  );
}

export default function Rsvps() {
  const { isManagement } = useAdmin();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [exporting, setExporting] = useState(false);
  const page = Math.max(0, Number(params.get("page")) || 0);
  const tier = params.get("tier") || "";
  const option = params.get("option") || "";
  const verified = ["0", "1"].includes(params.get("verified")) ? params.get("verified") : "";
  const openId = params.get("id") || "";
  const dq = useDebounced(q.trim(), 300);

  const view = new URLSearchParams();
  if (dq) view.set("q", dq);
  if (tier) view.set("tier", tier);
  if (option) view.set("option", option);
  if (verified) view.set("verified", verified);
  const qs = new URLSearchParams(view);
  qs.set("page", String(page));
  const { data, error, loading, reload, refreshing } = useApi(`/console/rsvps?${qs}`);
  const cat = useCatalog(data);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === "" || v == null || v === 0) p.delete(k); else p.set(k, String(v)); }
    setParams(p, { replace: true });
  };
  const onSearch = (v) => { setQ(v); update({ q: v.trim(), page: 0 }); };

  const rows = data?.rows || [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const s = data?.summary;
  const counts = s?.counts || {};

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${ADMIN_API}/console/rsvps/export${view.toString() ? `?${view}` : ""}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `ttfc-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { toast.error(err); } finally { setExporting(false); }
  };

  const dietRows = s ? cat.dietary.filter((d) => d.key !== "none").map((d) => ({ key: d.label, count: s.dietary?.[d.key] || 0 })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count) : [];
  const filtered = !!(dq || tier || option || verified);

  return (
    <>
      <PageHeader
        eyebrow="Leads"
        title="RSVPs"
        description="RSVPs for 26–27 October from the unlinked page thetechfestival.com/rsvp, one row per person (sending it again updates their row). Headcounts cover everyone, whatever the filters. Click a tile to list who's coming to that, or a row for everything they told us."
        actions={isManagement && <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Every RSVP matching the search and filters">Download CSV</Button>}
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Need a spreadsheet?">
          Downloading RSVPs as a CSV is for management (it holds emails and accessibility notes). Ask a manager if you need one.
        </Banner>
      )}

      {s && (
        <>
          <SectionTitle hint={`${s.total.toLocaleString()} RSVP${s.total === 1 ? "" : "s"} · ${s.unverified.toLocaleString()} unverified pass${s.unverified === 1 ? "" : "es"}`}>Headcounts</SectionTitle>
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cat.options.map((o) => (
              <StatTile key={o.key} label={cat.tileName(o.key)} value={(counts[o.key] || 0).toLocaleString()}
                icon={o.kind === "day" ? CalendarCheck : /lunch|cxo|gala/.test(o.key) ? Utensils : PartyPopper}
                tone={o.kind === "day" ? "purple" : o.key === option ? "orange" : "pink"}
                to={`?option=${o.key}`} />
            ))}
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <SectionTitle hint="People can tick more than one">Dietary needs</SectionTitle>
              <Bars rows={dietRows} empty="No dietary needs yet" />
              {s.dietaryNotes?.length > 0 && (
                <div className="mt-5 border-t border-ttfc-line pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ttfc-dim">“Other”, in their words</p>
                  <ul className="space-y-1.5 text-sm">
                    {s.dietaryNotes.map((n, i) => <li key={i}><span className="text-ttfc-muted">{n.name}:</span> {n.note}</li>)}
                  </ul>
                </div>
              )}
            </Card>
            <Card className="p-5">
              <SectionTitle hint="Verified = ticket ID matched, or on the speaker list">Passes</SectionTitle>
              <ul className="space-y-2.5 text-sm">
                {cat.tiers.map((t) => {
                  const n = s.tiers?.[t.key] || { total: 0, verified: 0 };
                  return (
                    <li key={t.key} className="flex items-center justify-between gap-3">
                      <button type="button" className="text-left hover:text-ttfc-pink hover:underline" onClick={() => update({ tier: t.key, page: 0 })}>
                        <Badge tone={TIER_TONE[t.key]}>{t.label}</Badge>
                      </button>
                      <span className="tabular-nums text-ttfc-muted">
                        <span className="font-semibold text-ttfc-text">{n.total.toLocaleString()}</span>
                        {n.total > 0 && <span className="ml-2 text-xs">{n.verified.toLocaleString()} verified</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email or ticket ID" className="pl-9" aria-label="Search RSVPs" />
        </div>
        <Select value={tier} onChange={(e) => update({ tier: e.target.value, page: 0 })} className="sm:w-44" aria-label="Filter by pass">
          <option value="">All passes</option>
          {cat.tiers.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </Select>
        <Select value={option} onChange={(e) => update({ option: e.target.value, page: 0 })} className="sm:w-64" aria-label="Filter by day or experience">
          <option value="">Any day or experience</option>
          {cat.options.map((o) => <option key={o.key} value={o.key}>{cat.optionName(o.key)}</option>)}
        </Select>
        <Select value={verified} onChange={(e) => update({ verified: e.target.value, page: 0 })} className="sm:w-40" aria-label="Filter by verified pass">
          <option value="">Verified or not</option>
          <option value="1">Verified pass</option>
          <option value="0">Unverified pass</option>
        </Select>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} RSVP${total === 1 ? "" : "s"}`}{refreshing && !loading ? " · updating…" : ""}
        </p>
        {filtered && <Button size="sm" variant="ghost" onClick={() => { setQ(""); update({ q: "", tier: "", option: "", verified: "", page: 0 }); }}>Clear filters</Button>}
      </div>

      {loading ? <LoadingState label="Loading RSVPs…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState
          icon={CalendarCheck}
          title={filtered ? "No RSVPs match" : "No RSVPs yet"}
          body={filtered ? "Try a different search or filter." : "RSVPs appear here as soon as someone sends one from thetechfestival.com/rsvp."}
        />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr><th>Name</th><th>Pass</th><th>Days</th><th>Experiences</th><th>Dietary</th><th>RSVP’d</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer align-top hover:bg-white/[0.03]" onClick={() => update({ id: r.id })}>
                  <td className="max-w-[220px] text-xs">
                    <button type="button" onClick={(e) => { e.stopPropagation(); update({ id: r.id }); }}
                      className="block max-w-full truncate text-left text-sm font-semibold hover:text-ttfc-pink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple"
                      title="See everything they told us">
                      {r.name || "No name"}
                    </button>
                    {r.email && <span className="block truncate font-mono text-ttfc-muted" title={r.email}>{r.email}</span>}
                  </td>
                  <td className="whitespace-nowrap"><PassBadge tier={r.tier} verified={r.tierVerified} cat={cat} /></td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex gap-1">{r.days.map((d) => <Badge key={d} tone="purple">{cat.dayName(d)}</Badge>)}</span>
                  </td>
                  <td className="max-w-[340px] text-xs">
                    {r.options.length
                      ? <span className="flex flex-wrap gap-1">{r.options.map((k) => <Badge key={k}>{cat.optionName(k)}</Badge>)}</span>
                      : <span className="text-ttfc-dim">None</span>}
                  </td>
                  <td className="max-w-[200px] text-xs text-ttfc-muted">
                    {r.dietary.length ? r.dietary.map(cat.dietName).join(", ") : <span className="text-ttfc-dim">—</span>}
                    {r.dietaryOther && <span className="block truncate text-ttfc-dim" title={r.dietaryOther}>{r.dietaryOther}</span>}
                    {r.hasAccessibility && <span className="mt-1 block text-[11px] text-amber-200/80">Accessibility note</span>}
                  </td>
                  <td className="whitespace-nowrap text-ttfc-muted">
                    {when(r.updatedAt || r.createdAt)}
                    {r.submissions > 1 && <span className="block text-[11px] text-ttfc-dim">updated {r.submissions - 1}×</span>}
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

      <RsvpDrawer id={openId} onClose={() => update({ id: "" })} cat={cat} />
    </>
  );
}
