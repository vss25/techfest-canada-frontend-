import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, BadgeCheck, CalendarCheck, ChevronLeft, ChevronRight, Coffee, Download, GitMerge, Handshake, Info, PartyPopper,
  Presentation, Search, Split, Store, Trash2, Trophy, Utensils, Wine,
} from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { ADMIN_API, api, getToken } from "../api";
import { useAdmin } from "../adminContext";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Bars, Button, Card, ConfirmDialog, Drawer, EmptyState, ErrorState, Input, LoadingState, PageHeader, SectionTitle, Select, StatTile, TableWrap,
} from "../ui";
import { when } from "../format";
import { personPath } from "../people/peopleMeta";

/* Admin → Leads → RSVPs
   TTFC 2026 RSVPs from the unlinked website page /rsvp (POST /api/rsvp).
   One row per person; re-submitting from the same browser (its edit token)
   or with the same verified ticket updates it. The pass is worked out by
   the server: a ticket ID + last name is "verified", anything else
   (speakers included, matched by name) is "unverified".
   A second RSVP under a name that already has one, with no proof it's the
   same person, is listed as a "Possible duplicate" (`duplicateOf`) and left
   out of the headcounts until staff Merge it or Keep it separate
   (POST /console/rsvps/:id/resolve); "Needs review" (?review=1) lists them.
   Days, experiences and dietary options are the same list the website uses
   (services/rsvp.js in the backend). Read from the staff list's `catalog`
   when the backend sends it (it keeps working while the kill switch has the
   public site, GET /api/rsvp/options included, switched off); otherwise from
   GET /api/rsvp/options, and failing that from the summary's own keys. */

const PAGE = 50;
const TIER_TONE = { connect: "neutral", influence: "pink", power: "orange", apex: "purple", speaker: "good" };
// Per-day options share a base key (sessions_d1 → sessions). Short names for the headcount tiles (full names are in the list).
const baseKey = (k) => String(k).replace(/_d\d+$/, "");
const SHORT = {
  sessions: "Keynotes & sessions", expo: "Expo floor", breaks: "Networking breaks", lunch: "Luncheon", cxo: "CxO breakfast",
  gala: "Gala dinner", awards: "Awards night", meetings: "Pre-matched meetings", lounge: "Scotch lounge (19+)",
};
const ICON = { sessions: Presentation, expo: Store, breaks: Coffee, lunch: Utensils, cxo: Utensils, gala: Utensils, awards: Trophy, meetings: Handshake, lounge: Wine };
/** Under a day's heading the day is already said: "Catalyst Awards Night (Day 1 evening)" → "… (evening)". */
const inDay = (label) => String(label).replace(/\s*\(Day \d+\)$/i, "").replace(/\(Day \d+\s+/i, "(");
const shortDate = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "");
/** day1 → day1, lunch_d2 → day2, meetings → null: the day a raw key belongs to (for the summary-only fallback). */
const dayOfKey = (k) => (/^day\d+$/.test(k) ? k : /_d(\d+)$/.test(k) ? `day${k.match(/_d(\d+)$/)[1]}` : null);

/** The catalog's shape, from the summary's own keys: raw names, but every count still shows. */
const catalogFromSummary = (s) => {
  if (!s) return null;
  const keys = Object.keys(s.counts || {});
  return {
    options: keys.map((key) => ({ key, kind: /^day\d+$/.test(key) ? "day" : "experience", label: key, day: dayOfKey(key) })),
    tiers: Object.keys(s.tiers || {}).map((key) => ({ key, label: key })),
    dietary: Object.keys(s.dietary || {}).map((key) => ({ key, label: key })),
    days: keys.filter((k) => /^day\d+$/.test(k)).map((key) => ({ key, label: key.replace(/^day/, "Day ") })),
  };
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
  /** Name inside its day's group (the day is in the heading). */
  const shortName = (k) => {
    const o = options.find((x) => x.key === k);
    if (o?.kind === "day") return "Attending";
    return SHORT[baseKey(k)] || (o ? inDay(o.label) : k);
  };
  // One group per day (the day itself, then what happens that day), then what isn't tied to a day.
  const groups = [
    ...days.map((d) => ({ key: d.key, title: d.label, date: shortDate(d.date), options: options.filter((o) => (o.kind === "day" ? o.key === d.key : o.day === d.key)) })),
    { key: "any", title: "Anytime", date: "", options: options.filter((o) => !days.some((d) => (o.kind === "day" ? o.key === d.key : o.day === d.key))) },
  ].filter((g) => g.options.length);
  /** A row's experiences, one line per day: [{ key, title, names }]. */
  const byDay = (keys) => groups
    .map((g) => ({ key: g.key, title: g.title, names: g.options.filter((o) => o.kind !== "day" && keys.includes(o.key)).map((o) => shortName(o.key)) }))
    .filter((g) => g.names.length)
    .concat(keys.some((k) => !options.some((o) => o.key === k)) ? [{ key: "other", title: "Other", names: keys.filter((k) => !options.some((o) => o.key === k)) }] : []);
  return {
    loaded: !!data, options, tiers, dietary, groups,
    tierName: (k) => tiers.find((t) => t.key === k)?.label || k || "—",
    dietName: (k) => dietary.find((d) => d.key === k)?.label || k,
    dayName, optionName, shortName, byDay,
  };
}

/** A row's experiences, a line per day. */
function ExperienceLines({ keys, cat, empty = "None" }) {
  const lines = cat.byDay(keys || []);
  if (!lines.length) return <span className="text-ttfc-dim">{empty}</span>;
  return (
    <span className="block space-y-1">
      {lines.map((l) => (
        <span key={l.key} className="block leading-snug">
          <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">{l.title}</span>
          {l.names.join(" · ")}
        </span>
      ))}
    </span>
  );
}

function PassBadge({ tier, verified, cat }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={TIER_TONE[tier] || "neutral"}>{cat.tierName(tier)}</Badge>
      {verified
        ? <BadgeCheck className="h-4 w-4 text-emerald-300" aria-label="Verified" title="Verified with their ticket" />
        : <span className="text-[11px] text-amber-200/80" title={tier === "speaker" ? "Matched to the speaker list by name: confirm before relying on it" : "Chosen by the person; no ticket ID matched"}>unverified</span>}
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

/** The earlier RSVP a possible duplicate may repeat, side by side, so staff can tell. */
function DuplicateCompare({ r, cat, onOpen }) {
  const { data, error, loading } = useApi(r.duplicateOf ? `/console/rsvps/${r.duplicateOf}` : null);
  const o = data?.rsvp?.id === r.duplicateOf ? data.rsvp : null;
  const line = (label, mine, theirs) => (
    <tr key={label} className="align-top">
      <th scope="row" className="py-1.5 pr-3 text-left font-medium text-ttfc-muted">{label}</th>
      <td className="py-1.5 pr-3">{mine}</td>
      <td className="py-1.5">{theirs}</td>
    </tr>
  );
  const pass = (x) => <PassBadge tier={x.tier} verified={x.tierVerified} cat={cat} />;
  return (
    <section className="mb-7">
      <SectionTitle hint="Same name, sent without proof it's the same person">Compare with the earlier RSVP</SectionTitle>
      {loading ? <LoadingState label="Loading the earlier RSVP…" /> : !o ? (
        <p className="text-sm text-ttfc-muted">{error ? `Couldn't load it: ${error.message}` : "The earlier RSVP isn't there any more."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ttfc-line">
          <table className="w-full min-w-[460px] text-sm">
            <thead>
              <tr className="border-b border-ttfc-line text-left text-xs text-ttfc-dim">
                <th className="px-3 py-2 font-semibold" />
                <th className="py-2 pr-3 font-semibold">This one</th>
                <th className="py-2 font-semibold">
                  Earlier · <button type="button" className="text-ttfc-pink underline-offset-2 hover:underline" onClick={() => onOpen(o.id)}>open</button>
                </th>
              </tr>
            </thead>
            <tbody className="[&_th]:pl-3">
              {line("Sent", when(r.updatedAt), when(o.updatedAt))}
              {line("Pass", pass(r), pass(o))}
              {line("Ticket ID", r.ticketId ? <span className="font-mono text-xs">{r.ticketId.toUpperCase()}</span> : <Dash />, o.ticketId ? <span className="font-mono text-xs">{o.ticketId.toUpperCase()}</span> : <Dash />)}
              {line("Email", r.email || <Dash />, o.email || <Dash />)}
              {line("Days", r.days.map(cat.dayName).join(" & ") || <Dash />, o.days.map(cat.dayName).join(" & ") || <Dash />)}
              {line("Experiences", <ExperienceLines keys={r.options} cat={cat} />, <ExperienceLines keys={o.options} cat={cat} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const RESOLVE = {
  merge: {
    title: "Merge into one RSVP?",
    body: "Use this when it's the same person sending their RSVP again. One RSVP stays: the newer answers (days, experiences, dietary needs, accessibility, email) with the verified pass and ticket, if either one has them. The other is kept for the record but no longer listed or counted.",
    confirm: "Merge",
    done: "Merged into one RSVP",
  },
  separate: {
    title: "Keep as a separate person?",
    body: "Use this for two different people with the same name. This RSVP is counted on its own from now on and won't be flagged again when they change it.",
    confirm: "Keep separate",
    done: "Kept as a separate person",
  },
};

function RsvpDrawer({ id, onClose, onOpen, onResolved, cat }) {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const [confirm, setConfirm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = async () => {
    try {
      await api.del(`/console/rsvps/${id}`);
      toast.success("RSVP deleted");
      setConfirmDelete(false);
      onResolved();
      onClose();
    } catch (err) { toast.error(err); }
  };
  const { data, error, loading, reload } = useApi(id ? `/console/rsvps/${id}` : null);
  // The row this drawer is for (not the previous one, still showing while it loads).
  const r = data?.rsvp?.id === id ? data.rsvp : null;
  const resolve = async (action) => {
    const res = await api.post(`/console/rsvps/${id}/resolve`, { action });
    const dropped = (res?.dropped || []).map(cat.optionName);
    toast.success(`${RESOLVE[action].done}${dropped.length ? `. Not in their pass, so dropped: ${dropped.join(", ")}` : ""}`);
    onResolved();
    // A merge may keep the other row: show the one that stays.
    if (res?.rsvp?.id && res.rsvp.id !== id) onOpen(res.rsvp.id); else reload();
  };
  const dup = !!(r && r.duplicateOf && !r.spam);
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      width="max-w-2xl"
      title={r?.name || (loading || !error ? "Loading…" : "RSVP")}
      description={r ? `${r.submissions > 1 ? `Updated ${r.submissions - 1}× · last ` : ""}${when(r.updatedAt)}` : ""}
      footer={(dup || (isManagement && r)) && (
        <>
          {isManagement && r && <Button variant="dangerOutline" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</Button>}
          <span className="flex-1" />
          {dup && (
            <>
              <Button variant="primary" icon={GitMerge} onClick={() => setConfirm("merge")}>Merge</Button>
              <Button icon={Split} onClick={() => setConfirm("separate")}>Keep separate</Button>
            </>
          )}
        </>
      )}
    >
      {!r && error ? <ErrorState error={error} onRetry={reload} /> : !r ? <LoadingState label="Loading RSVP…" /> : (
        <>
          {r.spam && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-6" title="Flagged as a bot">
              {r.spamReason ? `Reason: ${r.spamReason}. ` : ""}Not counted in the headcounts.
            </Banner>
          )}
          {dup && (
            <>
              <Banner tone="warn" icon={AlertTriangle} className="mb-6" title="Possible duplicate">
                Someone already RSVP'd with this name, and this one came without proof it's them (the same ticket ID, or the browser they used before).
                It isn't in the headcounts until you merge it or keep it separate.
              </Banner>
              <DuplicateCompare r={r} cat={cat} onOpen={onOpen} />
            </>
          )}
          {!dup && r.separatedAt && (
            <Banner tone="info" icon={Info} className="mb-6" title="Kept as a separate person">
              {r.separatedBy ? `${r.separatedBy}, ` : ""}{when(r.separatedAt)}. Counted on its own, and not flagged again.
            </Banner>
          )}
          <DetailSection title="Person">
            <Row label="Name">
              {r.name}
              <Link to={personPath(`r-${r.id}`)} className="ml-2 text-xs font-semibold text-ttfc-pink underline-offset-2 hover:underline">Open profile</Link>
            </Row>
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
            <Row label="Experiences"><ExperienceLines keys={r.options} cat={cat} empty="None ticked" /></Row>
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
            <Row label="Entered by">
              {r.source === "staff"
                ? <>Confirmed by Staff{r.staffUpdatedBy ? `: ${r.staffUpdatedBy}` : ""}{r.staffUpdatedAt ? `, ${when(r.staffUpdatedAt)}` : ""}{r.staffOverride ? " (overrode the attendee's RSVP, before Oct 19)" : ""}</>
                : "Confirmed by Individual"}
              {r.passLimitOverride && <Badge tone="warn" className="ml-2">Outside their pass</Badge>}
            </Row>
            {r.source !== "staff" && r.staffAdded?.length > 0 && (
              <Row label="Added by staff">
                {(r.staffAddedLabels || r.staffAdded).join(", ")}{r.staffUpdatedBy ? <span className="text-ttfc-muted"> · {r.staffUpdatedBy}{r.staffUpdatedAt ? `, ${when(r.staffUpdatedAt)}` : ""}</span> : null}
              </Row>
            )}
            {r.fillMs != null && <Row label="Form open for">{r.fillMs < 60000 ? `${Math.round(r.fillMs / 1000)} s` : `${Math.round(r.fillMs / 60000)} min`}</Row>}
            {r.userAgent && <Row label="Browser"><span className="text-xs text-ttfc-muted">{r.userAgent}</span></Row>}
          </DetailSection>
        </>
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm("")}
        onConfirm={() => resolve(confirm)}
        title={RESOLVE[confirm]?.title}
        body={RESOLVE[confirm]?.body}
        confirmLabel={RESOLVE[confirm]?.confirm}
        tone="primary"
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete this RSVP?"
        body={`${r?.name || "This RSVP"} will be removed from the list and the headcounts. This can't be undone.`}
        confirmLabel="Delete RSVP"
        tone="danger"
      />
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
  const review = params.get("review") === "1" ? "1" : "";
  const openId = params.get("id") || "";
  const dq = useDebounced(q.trim(), 300);

  const view = new URLSearchParams();
  if (dq) view.set("q", dq);
  if (tier) view.set("tier", tier);
  if (option) view.set("option", option);
  if (verified) view.set("verified", verified);
  if (review) view.set("review", review);
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
  const filtered = !!(dq || tier || option || verified || review);
  // The list shows every RSVP; the headcounts leave out possible duplicates until staff decide.
  const duplicates = s?.duplicates || 0;
  const listed = s ? s.total + duplicates : 0;

  return (
    <>
      <PageHeader
        eyebrow="Leads"
        title="RSVPs"
        description="RSVPs for 26–27 October from the unlinked page thetechfestival.com/rsvp, one row per person (sending it again from the same browser, or with the same ticket ID, updates their row). Headcounts cover everyone, whatever the filters. Click a tile to list who's coming to that, or a row for everything they told us."
        actions={isManagement && <Button icon={Download} loading={exporting} onClick={exportCsv} disabled={!total} title="Every RSVP matching the search and filters">Download CSV</Button>}
      />

      {!isManagement && (
        <Banner tone="info" icon={Info} className="mb-6" title="Need a spreadsheet?">
          Downloading RSVPs as a CSV is for management (it holds emails and accessibility notes). Ask a manager if you need one.
        </Banner>
      )}

      {duplicates > 0 && !review && (
        <Banner tone="warn" icon={AlertTriangle} className="mb-6"
          title={`${duplicates.toLocaleString()} possible duplicate${duplicates === 1 ? "" : "s"} to review`}
          action={<Button size="sm" onClick={() => update({ review: "1", page: 0 })}>Review {duplicates === 1 ? "it" : "them"}</Button>}>
          A second RSVP under a name that already has one, sent without proof it's the same person. Merge it or keep it separate;
          until then it's listed but not in the headcounts.
        </Banner>
      )}

      {s && (
        <>
          <SectionTitle hint={`${s.total.toLocaleString()} RSVP${s.total === 1 ? "" : "s"} counted · ${s.unverified.toLocaleString()} unverified pass${s.unverified === 1 ? "" : "es"}`}>Headcounts</SectionTitle>
          {duplicates > 0 && (
            <p className="-mt-2 mb-4 text-sm text-ttfc-muted">
              The list below has {listed.toLocaleString()} RSVPs: the {s.total.toLocaleString()} counted here plus {duplicates.toLocaleString()} possible duplicate{duplicates === 1 ? "" : "s"}, counted once staff merge {duplicates === 1 ? "it" : "them"} or keep {duplicates === 1 ? "it" : "them"} separate.
            </p>
          )}
          <div className="mb-8 space-y-5">
            {cat.groups.map((g) => (
              <div key={g.key}>
                <p className="mb-2 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide text-ttfc-dim">
                  {g.title}{g.date && <span className="font-medium normal-case tracking-normal text-ttfc-muted">{g.date}</span>}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
                  {g.options.map((o) => (
                    <StatTile key={o.key} label={cat.shortName(o.key)} value={(counts[o.key] || 0).toLocaleString()}
                      icon={o.kind === "day" ? CalendarCheck : ICON[baseKey(o.key)] || PartyPopper}
                      tone={o.kind === "day" ? "purple" : o.key === option ? "orange" : "pink"}
                      to={`?option=${o.key}`} />
                  ))}
                </div>
              </div>
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
              <SectionTitle hint="Verified = ticket ID and last name matched">Passes</SectionTitle>
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
          {cat.groups.map((g) => (
            <optgroup key={g.key} label={g.title}>
              {g.options.map((o) => <option key={o.key} value={o.key}>{o.kind === "day" ? `${g.title}: attending` : `${cat.shortName(o.key)} · ${g.title}`}</option>)}
            </optgroup>
          ))}
        </Select>
        <Select value={verified} onChange={(e) => update({ verified: e.target.value, page: 0 })} className="sm:w-40" aria-label="Filter by verified pass">
          <option value="">Verified or not</option>
          <option value="1">Verified pass</option>
          <option value="0">Unverified pass</option>
        </Select>
        <Button variant={review ? "primary" : "secondary"} icon={AlertTriangle} aria-pressed={!!review}
          onClick={() => update({ review: review ? "" : "1", page: 0 })} title="Possible duplicates: listed, not counted until you decide">
          Needs review{duplicates ? ` (${duplicates.toLocaleString()})` : ""}
        </Button>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} RSVP${total === 1 ? "" : "s"}${review ? " to review" : ""}`}
          {!loading && !filtered && duplicates > 0 ? ` (${s.total.toLocaleString()} counted + ${duplicates.toLocaleString()} to review)` : ""}
          {refreshing && !loading ? " · updating…" : ""}
        </p>
        {filtered && <Button size="sm" variant="ghost" onClick={() => { setQ(""); update({ q: "", tier: "", option: "", verified: "", review: "", page: 0 }); }}>Clear filters</Button>}
      </div>

      {loading ? <LoadingState label="Loading RSVPs…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState
          icon={CalendarCheck}
          title={review && !dq && !tier && !option && !verified ? "Nothing to review" : filtered ? "No RSVPs match" : "No RSVPs yet"}
          body={review && !dq && !tier && !option && !verified ? "No possible duplicates are waiting." : filtered ? "Try a different search or filter." : "RSVPs appear here as soon as someone sends one from thetechfestival.com/rsvp."}
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
                    {r.duplicateOf && <Badge tone="warn" icon={AlertTriangle} className="mt-1.5">Possible duplicate</Badge>}
                    {r.source === "staff" && <Badge tone="purple" className="mt-1.5">Confirmed by Staff</Badge>}
                    {r.source !== "staff" && r.staffAdded?.length > 0 && <Badge tone="purple" className="mt-1.5">Staff added {r.staffAdded.length}</Badge>}
                    <Link to={personPath(`r-${r.id}`)} onClick={(e) => e.stopPropagation()} className="mt-1 block text-[11px] font-semibold text-ttfc-pink hover:underline">Profile</Link>
                  </td>
                  <td className="whitespace-nowrap"><PassBadge tier={r.tier} verified={r.tierVerified} cat={cat} /></td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex gap-1">{r.days.map((d) => <Badge key={d} tone="purple">{cat.dayName(d)}</Badge>)}</span>
                  </td>
                  <td className="min-w-[220px] max-w-[360px] text-xs"><ExperienceLines keys={r.options} cat={cat} /></td>
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

      <RsvpDrawer id={openId} onClose={() => update({ id: "" })} onOpen={(id) => update({ id })} onResolved={reload} cat={cat} />
    </>
  );
}
