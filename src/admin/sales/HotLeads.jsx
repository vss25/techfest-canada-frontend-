import { useState } from "react";
import { Eye, EyeOff, Flame, Linkedin, Mail, RefreshCw } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, Select, focusRing } from "../ui";

/* Marketing › Hot leads (Nov 20 2026): people who replied with real interest to our Explee outreach.
   They arrive by themselves every 10 minutes; nobody copies anything. Each card shows what they
   wrote, who is handling it and where it stands. API: /console/explee. */

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const TONE = { new: "bad", contacted: "warn", meeting: "purple", won: "good", lost: "neutral" };

function LeadCard({ lead, data, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (body, msg) => {
    setBusy(true);
    try { const out = await api.patch(`/console/explee/leads/${lead.id}`, body); onChange(out.lead); toast.success(msg); }
    catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const label = data.statuses.find((s) => s.key === lead.status)?.label.split(":")[0] || lead.status;
  return (
    <Card className={`flex flex-col gap-3 ${lead.hidden ? "opacity-80" : ""}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#151035]">{lead.name}</h2>
          <p className="text-[13px] text-[#6B6688]">{[lead.jobTitle, lead.company, lead.country].filter(Boolean).join(" · ") || "No details yet"}</p>
        </div>
        {lead.hidden && <Badge tone="neutral" icon={EyeOff}>Hidden from staff</Badge>}
        <Badge tone={TONE[lead.status] || "neutral"}>{label}</Badge>
      </div>
      <blockquote className="whitespace-pre-wrap rounded-[10px] bg-[#F6F5FA] px-3.5 py-3 text-[14px] leading-[21px] text-[#151035]">
        {lead.reply || "Their reply wasn't included."}
      </blockquote>
      <p className="-mt-1.5 text-xs text-[#6B6688]">They wrote this {when(lead.repliedAt || lead.becameHotAt)}{lead.replies ? ` · replied again ${lead.replies} ${lead.replies === 1 ? "time" : "times"}` : ""}</p>
      <div className="flex flex-wrap items-center gap-2">
        {lead.email && <a href={`mailto:${lead.email}`} className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E3E0EE] px-3 py-1.5 text-[13px] font-semibold text-[#151035] hover:bg-[#F6F5FA] ${focusRing}`}><Mail className="h-4 w-4" aria-hidden="true" />{lead.email}</a>}
        {lead.linkedin && <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E3E0EE] px-3 py-1.5 text-[13px] font-semibold text-[#151035] hover:bg-[#F6F5FA] ${focusRing}`}><Linkedin className="h-4 w-4" aria-hidden="true" />LinkedIn</a>}
        {lead.phone && <span className="text-[13px] text-[#4A4566]">{lead.phone}</span>}
      </div>
      <div className="grid gap-3 border-t border-[#F0EEF6] pt-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4A4566]">Who is handling it?
          <Select value={lead.ownerId} disabled={busy} onChange={(e) => save({ ownerId: e.target.value }, e.target.value ? "Owner set. Their task moved to them too." : "Owner cleared.")}>
            <option value="">Nobody yet</option>
            {data.people.map((p) => <option key={p.id} value={p.id}>{p.id === data.me ? `Me (${p.name})` : p.name}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4A4566]">Where does it stand?
          <Select value={lead.status} disabled={busy} onChange={(e) => save({ status: e.target.value }, "Saved.")}>
            {data.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </label>
      </div>
      {data.canSync && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#F0EEF6] pt-3">
          <Button size="sm" variant="ghost" icon={lead.hidden ? Eye : EyeOff} disabled={busy}
            onClick={() => save({ hidden: !lead.hidden }, lead.hidden ? "Staff can see this lead again." : "Hidden. Only managers can see this lead now.")}>
            {lead.hidden ? "Show to staff" : "Hide from staff"}
          </Button>
          <span className="text-xs text-[#6B6688]">{lead.hidden ? "Only managers can see this lead." : "All staff can see this lead."}</span>
        </div>
      )}
    </Card>
  );
}

export default function HotLeads() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi("/console/explee", { interval: 120000 });
  const [syncing, setSyncing] = useState(false);
  const sync = async () => {
    setSyncing(true);
    try { const out = await api.post("/console/explee/sync"); toast.success(out.added || out.updated ? `${out.added} new, ${out.updated} updated.` : "Nothing new since the last check."); reload(); }
    catch (err) { toast.error(err); } finally { setSyncing(false); }
  };
  const onChange = (lead) => setData((d) => (d ? { ...d, leads: d.leads.map((l) => (l.id === lead.id ? lead : l)) } : d));
  const fresh = (data?.leads || []).filter((l) => l.status === "new" && !l.ownerId).length;

  return (
    <>
      <PageHeader
        title="Hot leads"
        description="People who replied with real interest to our outreach emails. They show up here by themselves, with what they wrote. Pick who handles each one and reply to them."
        actions={data?.configured && data.canSync ? <Button icon={RefreshCw} loading={syncing} onClick={sync}>Check now</Button> : undefined}
      />
      {loading && !data ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          {!data.configured ? (
            <Banner tone="warn" className="mb-4" title="Not connected to Explee yet">
              A manager needs to add the Explee API key to the server (the setting is called EXPLEE_API_KEY on Render). After that, hot leads arrive here every 10 minutes.
            </Banner>
          ) : data.sync.lastError ? (
            <Banner tone="danger" className="mb-4" title="The last check didn't work">{data.sync.lastError} It tries again by itself in 10 minutes.</Banner>
          ) : (
            <p className="mb-4 text-[13px] text-[#6B6688]">
              Checked automatically every 10 minutes{data.sync.lastRunAt ? ` · last checked ${when(data.sync.lastRunAt)}` : ""}.
              {fresh > 0 && <strong className="text-[#B91C1C]"> {fresh} {fresh === 1 ? "lead is" : "leads are"} waiting for someone to take {fresh === 1 ? "it" : "them"}.</strong>}
            </p>
          )}
          {!data.leads.length ? (
            <EmptyState icon={Flame} title="No hot leads yet" body="When someone replies with interest to an outreach email, they appear here with their reply, and a task is added to My work so nobody misses it." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.leads.map((l) => <LeadCard key={l.id} lead={l} data={data} onChange={onChange} />)}
            </div>
          )}
        </>
      )}
    </>
  );
}
