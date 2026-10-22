import { useEffect, useState } from "react";
import { CheckCheck, Eye, LifeBuoy, Mail, MapPin, Phone, RotateCcw, Send } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, SectionTitle, Textarea } from "../ui";
import { when } from "../format";

/* =========================================================
   Admin → Event day → SOS & help (Oct 22 2026)
   The organiser: "a help/SOS section in the app … messages which
   staff can see and will be able to get to the attendee …
   emergency only". Attendees send from the app's Help & SOS
   screen; every staff account gets a push and SOS_ALERT_TO an
   email. Here (and in the web app at /app/staff/sos): the
   requests, open first, who / what / where, call or email them,
   the thread, a reply (it pushes to the attendee and marks the
   request seen), Acknowledge, Resolve, Reopen. Every 15 s.
   Backend (routes/sos.js), all under BASE:
     GET  /console/sos?status=active|open|acknowledged|resolved|all → { status, requests, counts }
     GET  /console/sos/:id → { request }
     POST /console/sos/:id/reply { body } → { request }
     POST /console/sos/:id/status { status: acknowledged | resolved | open } → { request }
========================================================= */

const BASE = "/console/sos";
const FILTERS = [["active", "Open"], ["resolved", "Resolved"], ["all", "All"]];
const TONE = { open: "bad", acknowledged: "purple", resolved: "good" };
const LABEL = { open: "New", acknowledged: "Seen by staff", resolved: "Resolved" };
const rank = { open: 0, acknowledged: 1, resolved: 2 };
const idOf = (r) => String(r?.id || r?._id || "");
const telOf = (r) => r?.links?.tel || (r?.phone ? `tel:${String(r.phone).replace(/[^+\d]/g, "")}` : "");
const mailOf = (r) => r?.links?.mailto || (r?.email ? `mailto:${r.email}` : "");

export default function SosHelp() {
  const toast = useToast();
  const [filter, setFilter] = useState("active");
  const [picked, setPicked] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const list = useApi(`${BASE}?status=${filter}`, { interval: 15000 });
  const detail = useApi(picked ? `${BASE}/${encodeURIComponent(picked)}` : null, { interval: 15000 });

  const requests = [...(list.data?.requests || [])].sort((a, b) => (rank[a.status] - rank[b.status])
    || (Date.parse(b.lastMessageAt || b.createdAt) - Date.parse(a.lastMessageAt || a.createdAt)));
  const counts = list.data?.counts || {};
  const r = detail.data?.request || null;

  // The first request is shown when nothing is picked yet (on a wide screen there's room for both).
  useEffect(() => { if (!picked && requests[0]) setPicked(idOf(requests[0])); }, [picked, requests]);

  const act = async (what, fn) => {
    setBusy(what);
    try {
      const res = await fn();
      if (res?.request) detail.setData(res);
      list.reload();
      if (what === "reply") setDraft("");
      toast.success(what === "reply" ? "Reply sent. They get a notification." : what === "resolved" ? "Marked resolved" : what === "acknowledged" ? "Marked as seen" : "Reopened");
    } catch (e) { toast.error(e); } finally { setBusy(""); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Event day"
        title="SOS & help"
        description="Help requests from the app's Help & SOS screen: emergencies only. New ones push to every staff account and email the SOS address. Replies here reach the attendee in the app."
      />
      <Banner tone="warn" icon={LifeBuoy} className="mb-6" title="Life-threatening? Call 911 first">
        Then reply here so the attendee knows help is coming. Their phone number is on each request when they gave one.
      </Banner>

      {list.error?.status === 403 ? <ErrorState error={list.error} title="Staff only" /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card>
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Show">
              {FILTERS.map(([k, label]) => {
                const n = k === "active" ? (counts.open || 0) + (counts.acknowledged || 0) : k === "resolved" ? counts.resolved || 0 : null;
                return (
                  <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); setPicked(""); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-ttfc-contrast/10 text-ttfc-text" : "text-ttfc-muted hover:bg-ttfc-contrast/5 hover:text-ttfc-text"}`}>
                    {label}{n != null ? ` (${n})` : ""}
                  </button>
                );
              })}
              {counts.open > 0 && <Badge tone="bad">{counts.open} new</Badge>}
            </div>
            {list.loading && !list.data ? <LoadingState label="Loading requests…" /> : list.error && !list.data ? <ErrorState error={list.error} onRetry={list.reload} /> : requests.length === 0 ? (
              <EmptyState icon={LifeBuoy} title={filter === "resolved" ? "Nothing resolved yet" : "No open requests"} body="New requests show here, push to staff phones and email the SOS address." />
            ) : (
              <ul className="flex flex-col gap-2">
                {requests.map((x) => (
                  <li key={idOf(x)}>
                    <button type="button" onClick={() => setPicked(idOf(x))} aria-current={picked === idOf(x) ? "true" : undefined}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${picked === idOf(x) ? "border-ttfc-pink/60 bg-ttfc-contrast/10" : x.status === "open" ? "border-red-400/50 hover:bg-ttfc-contrast/5" : "border-ttfc-line hover:bg-ttfc-contrast/5"}`}>
                      <span className="flex items-center gap-2">
                        <b className="truncate text-sm">{x.categoryLabel || x.category}</b>
                        <Badge tone={TONE[x.status]}>{LABEL[x.status] || x.statusLabel}</Badge>
                        <span className="ml-auto text-xs text-ttfc-dim">{when(x.createdAt)}</span>
                      </span>
                      <span className="block truncate text-xs text-ttfc-muted">{x.name || "Someone"}{x.location ? ` · ${x.location}` : ""}</span>
                      <span className="block truncate text-xs text-ttfc-dim">{x.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="min-w-0">
            {!picked ? <EmptyState icon={LifeBuoy} title="Pick a request" body="Its details, the thread and the reply box show here." /> : detail.loading && !r ? <LoadingState label="Loading…" /> : detail.error && !r ? <ErrorState error={detail.error} onRetry={detail.reload} /> : r && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{r.name || "Someone"}</h2>
                  <Badge tone={TONE[r.status]}>{LABEL[r.status] || r.statusLabel}</Badge>
                  <span className="ml-auto text-xs text-ttfc-dim">{r.categoryLabel || r.category} · {when(r.createdAt)}</span>
                </div>
                {r.location && <p className="flex items-center gap-1.5 text-sm"><MapPin className="h-4 w-4 text-ttfc-pink" aria-hidden="true" />{r.location}</p>}
                <div className="flex flex-wrap gap-2">
                  {telOf(r) && <a href={telOf(r)} className="inline-flex items-center gap-1.5 rounded-xl bg-ttfc-purple px-3 py-2 text-sm font-semibold text-white"><Phone className="h-4 w-4" aria-hidden="true" />Call {r.phone}</a>}
                  {mailOf(r) && <a href={mailOf(r)} className="inline-flex items-center gap-1.5 rounded-xl border border-ttfc-line px-3 py-2 text-sm font-semibold"><Mail className="h-4 w-4" aria-hidden="true" />Email {r.email}</a>}
                </div>
                {(r.acknowledgedBy?.name || r.resolvedBy?.name) && (
                  <p className="text-xs text-ttfc-dim">
                    {r.acknowledgedBy?.name ? `Seen by ${r.acknowledgedBy.name}${r.acknowledgedAt ? ` (${when(r.acknowledgedAt)})` : ""}. ` : ""}
                    {r.resolvedBy?.name ? `Resolved by ${r.resolvedBy.name}${r.resolvedAt ? ` (${when(r.resolvedAt)})` : ""}.` : ""}
                  </p>
                )}

                <SectionTitle>Messages</SectionTitle>
                <ol className="flex flex-col gap-2">
                  <li className="max-w-[90%] rounded-xl bg-ttfc-contrast/5 px-3 py-2">
                    <p className="text-xs font-semibold text-ttfc-muted">{r.name || "Attendee"} · {when(r.createdAt)}</p>
                    <p className="whitespace-pre-wrap text-sm">{r.message}</p>
                  </li>
                  {(r.messages || []).map((m, i) => (
                    <li key={i} className={`max-w-[90%] rounded-xl px-3 py-2 ${m.from === "staff" ? "self-end bg-ttfc-purple/25" : "bg-ttfc-contrast/5"}`}>
                      <p className="text-xs font-semibold text-ttfc-muted">{m.from === "staff" ? m.staffName || "Staff" : r.name || "Attendee"} · {when(m.at)}</p>
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                    </li>
                  ))}
                </ol>

                <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const body = draft.trim(); if (body) act("reply", () => api.post(`${BASE}/${encodeURIComponent(idOf(r))}/reply`, { body })); }}>
                  <label className="text-sm font-semibold" htmlFor="sos-reply">Reply to {r.name ? r.name.split(" ")[0] : "them"}</label>
                  <Textarea id="sos-reply" rows={3} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="They get it as a notification in the app." />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="primary" icon={Send} loading={busy === "reply"} disabled={!draft.trim()}>Send reply</Button>
                    {r.status === "open" && <Button icon={Eye} loading={busy === "acknowledged"} onClick={() => act("acknowledged", () => api.post(`${BASE}/${encodeURIComponent(idOf(r))}/status`, { status: "acknowledged" }))}>Acknowledge</Button>}
                    {r.status !== "resolved"
                      ? <Button icon={CheckCheck} loading={busy === "resolved"} onClick={() => act("resolved", () => api.post(`${BASE}/${encodeURIComponent(idOf(r))}/status`, { status: "resolved" }))}>Resolve</Button>
                      : <Button icon={RotateCcw} loading={busy === "open"} onClick={() => act("open", () => api.post(`${BASE}/${encodeURIComponent(idOf(r))}/status`, { status: "open" }))}>Reopen</Button>}
                  </div>
                </form>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
