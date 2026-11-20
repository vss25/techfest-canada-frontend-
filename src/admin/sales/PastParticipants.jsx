import { useMemo, useState } from "react";
import { History, Mail, Search } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, TableWrap } from "../ui";

/* Sales › Past participants (Nov 20 2026): for the event chosen in the top bar, the people and
   organisations who took part in an EARLIER event and aren't part of this one yet, with what they
   were (sponsor, partner, exhibitor, speaker, media, delegate). Nothing here is a sale for this
   event: it is who to reconnect with. "Reach out" records it and adds a follow-up task to
   My work. API: /console/sales-event. */

const TONE = { Sponsor: "pink", Partner: "purple", Exhibitor: "orange", Speaker: "good", Media: "warn", Delegate: "neutral" };
const eventName = (key) => (key === "ttfc-2026-main" ? "TTFC 2026" : key.replace(/^ttfc-/, "").replace(/-/g, " "));
const when = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "");

export default function PastParticipants() {
  const toast = useToast();
  const { current: ev } = useAdminEvent();
  const eventKey = ev?.eventKey?.current || ev?.eventKey || "";
  const { data, error, loading, reload, setData } = useApi(eventKey ? `/console/sales-event/past?event=${eventKey}` : null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [show, setShow] = useState("todo");
  const [busy, setBusy] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.rows || []).filter((r) => (!role || r.role === role)
      && (show === "all" || (show === "todo" ? !r.outreach : !!r.outreach))
      && (!needle || `${r.name} ${r.company} ${r.jobTitle}`.toLowerCase().includes(needle)));
  }, [data, q, role, show]);
  const patch = (r, outreach) => setData((d) => (d ? { ...d, rows: d.rows.map((x) => (x.kind === r.kind && x.key === r.key ? { ...x, outreach } : x)) } : d));

  const reach = async (r) => {
    setBusy(r.kind + r.key);
    try {
      const out = await api.post("/console/sales-event/reach", { event: eventKey, kind: r.kind, key: r.key, name: r.name, role: r.role, eventName: ev.name });
      patch(r, out.outreach);
      toast.success(`Noted. A follow-up task for ${r.name} is in My work.`);
    } catch (err) { toast.error(err); reload(); } finally { setBusy(""); }
  };
  const setStatus = async (r, status) => {
    try { const out = await api.patch(`/console/sales-event/reach/${r.outreach.id}`, { status }); patch(r, out.outreach); toast.success("Saved."); }
    catch (err) { toast.error(err); }
  };

  if (!eventKey) return <LoadingState />;
  // Counted from the rows on screen, so the tiles move as soon as someone clicks "I've reached out".
  const c = data ? (() => {
    const all = data.rows;
    const out = { total: all.length, notContacted: all.filter((r) => !r.outreach).length, byRole: {}, byStatus: {} };
    for (const r of all) { out.byRole[r.role] = (out.byRole[r.role] || 0) + 1; if (r.outreach) out.byStatus[r.outreach.status] = (out.byStatus[r.outreach.status] || 0) + 1; }
    return out;
  })() : null;
  return (
    <>
      <PageHeader
        title="Past participants"
        description={`People and organisations who took part in an earlier event and aren't part of ${ev.name} yet. Nothing here has been sold for ${ev.name}: this is who to invite back.`}
      />
      {loading && !data ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          {!data.partnersLoaded && <Banner tone="warn" className="mb-4" title="Past partners couldn't be loaded just now">People are listed below. Refresh in a minute to see partner organisations too.</Banner>}
          {c.total > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[["To invite back", c.notContacted, "nobody has reached out yet"], ["Reached out", c.total - c.notContacted, `about ${ev.name}`],
                ["Interested", c.byStatus.interested || 0, "said yes or maybe"], ["Sponsors and partners", (c.byRole.Sponsor || 0) + (c.byRole.Partner || 0), "organisations from earlier events"]].map(([l, v, s]) => (
                <div key={l} className="flex flex-col gap-0.5 rounded-xl border border-[#E3E0EE] bg-white px-4 py-3.5">
                  <span className="text-xs text-[#6B6688]">{l}</span><b className="text-[22px] text-[#151035]">{v.toLocaleString()}</b><span className="text-xs text-[#6B6688]">{s}</span>
                </div>
              ))}
            </div>
          )}
          {!c.total ? (
            <EmptyState icon={History} title="No past participants for this event"
              body={eventKey === "ttfc-2026-main" ? "TTFC 2026 was the first event, so there is nobody from an earlier one." : "Everyone from earlier events is already part of this event, or there were no earlier events."} />
          ) : (
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="relative min-w-[220px] flex-1">
                  <span className="sr-only">Search</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A86A0]" aria-hidden="true" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or company" className="pl-9" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#4A4566]">They were
                  <Select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">Anyone</option>
                    {data.roles.filter((r) => c.byRole[r]).map((r) => <option key={r} value={r}>{r} ({c.byRole[r]})</option>)}
                  </Select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#4A4566]">Show
                  <Select value={show} onChange={(e) => setShow(e.target.value)}>
                    <option value="todo">Not contacted yet</option>
                    <option value="done">Already contacted</option>
                    <option value="all">Everyone</option>
                  </Select>
                </label>
              </div>
              <span className="text-xs text-[#6B6688]">{rows.length.toLocaleString()} shown{rows.length > 200 ? " · first 200 listed, search to narrow it" : ""}</span>
              {!rows.length ? <p className="py-6 text-center text-sm text-[#6B6688]">Nobody matches. Try another filter.</p> : (
                <TableWrap>
                  <thead><tr><th>Name</th><th>They were</th><th>At</th><th>About {ev.name}</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 200).map((r) => (
                      <tr key={r.kind + r.key}>
                        <td>
                          <span className="flex flex-col">
                            <strong>{r.name}</strong>
                            <span className="text-xs text-[#6B6688]">{[r.jobTitle, r.company].filter(Boolean).join(" · ") || (r.kind === "org" ? "Organisation" : "")}</span>
                            {r.email && <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#9D1D63] hover:underline"><Mail className="h-3 w-3" aria-hidden="true" />{r.email}</a>}
                          </span>
                        </td>
                        <td><Badge tone={TONE[r.role] || "neutral"}>{r.role}</Badge>{r.was && r.was !== r.role && <span className="ml-2 text-xs text-[#6B6688]">{r.was}</span>}</td>
                        <td className="text-[13px] capitalize text-[#4A4566]">{r.events.map(eventName).join(", ")}</td>
                        <td>
                          {r.outreach ? (
                            <span className="flex flex-col gap-1">
                              <Select value={r.outreach.status} onChange={(e) => setStatus(r, e.target.value)} aria-label={`Where it stands with ${r.name}`}>
                                {data.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                              </Select>
                              <span className="text-xs text-[#6B6688]">{r.outreach.byName} · {when(r.outreach.at)}</span>
                            </span>
                          ) : (
                            <Button size="sm" loading={busy === r.kind + r.key} onClick={() => reach(r)}>I've reached out</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
              <span className="text-xs text-[#6B6688]">Contact them by email first, then click “I've reached out”. It records your name and adds a follow-up task to My work, due in 3 days.</span>
            </Card>
          )}
        </>
      )}
    </>
  );
}
