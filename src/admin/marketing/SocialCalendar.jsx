import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload } from "lucide-react";
import { useApi } from "../hooks";
import { Button, Card, ErrorState, LoadingState, PageHeader } from "../ui";
import { CHANNELS, STATUS, channelOfPromise } from "./socialShared";
import { ItemModal, PlanTable, UploadModal } from "./CalendarItems";
import { ITEM_STATUS } from "./calendarShared";

/* =========================================================
   Admin › Marketing › Social media calendar (Nov 18 2026), the approved design's month plan:
   numbers for the month (planned, out on time, late or missed, coming up), a legend, and a
   month grid with every post on its day, its edge in its status colour (posted on time, late,
   missed, scheduled, in review, planned). Social posts promised in signed contracts appear on
   their due date (or under "Promised, no date yet") until a post is planned for them; clicking
   one starts that post. Click a day's + to plan a post for it. API: /api/console/social/calendar.
========================================================= */

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const LEGEND = ["posted", "late", "missed", "scheduled", "review", "draft", "promised"];
const torontoDay = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

export default function SocialCalendar() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const first = month;
  const last = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month]);
  const { data, error, loading, reload } = useApi(`/console/social/calendar?from=${ymd(first)}&to=${ymd(last)}`);
  // Nov 20 2026: calendar items (added by hand or from a spreadsheet; marked done by hand).
  const plan = useApi(`/console/content-calendar?from=${ymd(first)}&to=${ymd(last)}`);
  const [modal, setModal] = useState(null); // { kind: "item", item?, date? } | { kind: "upload" }
  const planItems = plan.data?.items || [];
  const planKpis = plan.data?.kpis || { planned: 0, done: 0, late: 0, missed: 0, ahead: 0 };
  const closeAndReload = () => { setModal(null); plan.reload(); };

  const cells = useMemo(() => {
    const lead = (first.getDay() + 6) % 7;
    const out = Array.from({ length: lead }, () => null);
    for (let n = 1; n <= last.getDate(); n++) out.push(new Date(first.getFullYear(), first.getMonth(), n));
    return out;
  }, [first, last]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const k = data.kpis;
  const today = ymd(new Date());
  const promisedDated = data.promised.filter((p) => p.dueDate);
  const promisedUndated = data.promised.filter((p) => !p.dueDate);
  const startPromise = (p, date) => {
    const q = new URLSearchParams({ new: "1", contract: p.contractId, key: p.key, label: p.label });
    const ch = channelOfPromise(p.label);
    if (ch) q.set("channel", ch);
    if (date || p.dueDate) q.set("date", date || p.dueDate);
    navigate(`/admin/social?${q}`);
  };
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const monthName = (d) => d.toLocaleDateString("en-CA", { month: "long" });

  // The four numbers count social posts and calendar items together.
  const due = k.due + planKpis.done + planKpis.late + planKpis.missed;
  const onTime = k.onTime + planKpis.done;
  const kpis = [
    ["Planned this month", String(k.planned + planKpis.planned), "posts, calendar items and contract promises", "#151035"],
    ["Out on time", `${onTime} of ${due}`, due ? `so far · ${Math.round((onTime / due) * 100)}%` : "nothing due yet", "#166534"],
    ["Late or missed", String(k.lateOrMissed + planKpis.late + planKpis.missed), `${k.late + planKpis.late} late, ${k.missed + planKpis.missed} missed`, "#B91C1C"],
    ["Coming up", String(k.upcoming + planKpis.ahead), `${k.scheduled} scheduled · ${k.review} in review · ${k.planned2 + planKpis.ahead} planned`, "#5B21B6"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Social media calendar" description="Everything planned for the month: TTFC's posts, emails, what partners will post about us and the posts promised in contracts, and whether each went out on time."
        actions={<>
          <Button icon={Upload} onClick={() => setModal({ kind: "upload" })}>Upload a spreadsheet</Button>
          <Button onClick={() => navigate("/admin/social?new=1")}>Write a post</Button>
          <Button variant="primary" icon={Plus} onClick={() => setModal({ kind: "item" })}>Add to calendar</Button>
        </>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([l, v, s, c]) => (
          <div key={l} className="flex flex-col gap-0.5 rounded-xl border border-[#E3E0EE] bg-white px-4 py-3.5">
            <span className="text-xs text-[#6B6688]">{l}</span><b className="text-[22px]" style={{ color: c }}>{v}</b><span className="text-xs text-[#6B6688]">{s}</span>
          </div>
        ))}
      </div>
      <Card className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold">{month.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}</h2>
          <span className="text-[13px] font-semibold text-[#D6308C]">
            <button type="button" onClick={() => shift(-1)}>‹ {monthName(new Date(month.getFullYear(), month.getMonth() - 1, 1))}</button> · <button type="button" onClick={() => shift(1)}>{monthName(new Date(month.getFullYear(), month.getMonth() + 1, 1))} ›</button>
          </span>
          <div className="ml-auto flex flex-wrap gap-2.5 text-[11px] text-[#4A4566]">
            {LEGEND.map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: STATUS[s][0], border: s === "promised" ? "1px dashed #151035" : 0 }} />{STATUS[s][2]}</span>)}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-[11px] font-semibold text-[#8A86A0]">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} />;
            const key = ymd(d);
            const posts = data.posts.filter((p) => torontoDay(p.scheduledAt) === key);
            const promises = promisedDated.filter((p) => p.dueDate === key);
            const isToday = key === today;
            return (
              <div key={key} className="group flex min-h-[84px] flex-col gap-1 rounded-lg border p-1.5" style={{ borderColor: isToday ? "#D6308C" : "#F0EEF6", background: isToday ? "#FFFBFD" : "#fff" }}>
                <div className="flex items-center">
                  <span className="text-[11px] font-bold" style={{ color: isToday ? "#D6308C" : "#4A4566" }}>{d.getDate()}</span>
                  <button type="button" aria-label={`Add something on ${d.toDateString()}`} title="Add to this day" onClick={() => setModal({ kind: "item", date: key })} className="ml-auto flex h-5 w-5 items-center justify-center rounded text-[#D6308C] hover:bg-[#FDF2F8]"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                {posts.map((p) => (
                  <button key={p.id} type="button" title={`${p.title || p.text.slice(0, 60)} · ${STATUS[p.status][2]}`} onClick={() => navigate(`/admin/social?id=${p.id}`)}
                    className="truncate rounded px-1.5 py-[3px] text-left text-[10px] leading-[13px] text-[#151035]" style={{ borderLeft: `3px solid ${STATUS[p.status][0]}`, background: STATUS[p.status][1] }}>
                    {CHANNELS.filter((c) => p.channels?.[c.key]).map((c) => c.short).join(" ")} {p.title || p.text.split("\n")[0] || "Untitled"}
                  </button>
                ))}
                {planItems.filter((it) => it.date === key).map((it) => (
                  <button key={it.id} type="button" title={`${it.title} · ${it.by || "TTFC"} · ${ITEM_STATUS[it.status][2]}`} onClick={() => setModal({ kind: "item", item: it })}
                    className="truncate rounded px-1.5 py-[3px] text-left text-[10px] leading-[13px] text-[#151035]" style={{ borderLeft: `3px solid ${ITEM_STATUS[it.status][0]}`, background: ITEM_STATUS[it.status][1] }}>
                    {it.channel === "Other" ? "" : `${it.channel} · `}{it.title}
                  </button>
                ))}
                {promises.map((p) => (
                  <button key={`${p.contractId}:${p.key}`} type="button" title={`Promised in ${p.number}: ${p.label}. Click to plan it.`} onClick={() => startPromise(p)}
                    className="truncate rounded border border-dashed border-[#151035] bg-white px-1.5 py-[3px] text-left text-[10px] leading-[13px] text-[#151035]">◇ {p.label}</button>
                ))}
              </div>
            );
          })}
        </div>
        <span className="text-xs text-[#6B6688]">Click a day's + to add something, or an item to open it and mark it done. Each item's edge colour is its status.</span>
      </Card>
      <PlanTable items={planItems} kpis={planKpis} onOpen={(it) => setModal({ kind: "item", item: it })} />
      {modal?.kind === "item" && <ItemModal item={modal.item} date={modal.date} channels={plan.data?.channels} onClose={() => setModal(null)} onSaved={closeAndReload} />}
      {modal?.kind === "upload" && <UploadModal onClose={() => setModal(null)} onDone={closeAndReload} />}
      {(promisedUndated.length > 0 || data.unscheduled.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {promisedUndated.length > 0 && (
            <Card>
              <h2 className="mb-1 text-base font-bold">Promised in contracts, no date yet</h2>
              <p className="mb-3 text-xs text-[#6B6688]">Social posts partners bought. Plan each one so it lands on the calendar.</p>
              <ul className="flex flex-col gap-1.5">
                {promisedUndated.map((p) => (
                  <li key={`${p.contractId}:${p.key}`} className="flex items-center gap-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">◇ {p.label} <span className="text-xs text-[#6B6688]">{p.number}</span></span>
                    <Button size="sm" onClick={() => startPromise(p)}>Plan it</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {data.unscheduled.length > 0 && (
            <Card>
              <h2 className="mb-1 text-base font-bold">Drafts without a time</h2>
              <p className="mb-3 text-xs text-[#6B6688]">Give them a date to put them on the calendar.</p>
              <ul className="flex flex-col gap-1.5">
                {data.unscheduled.map((p) => (
                  <li key={p.id}><button type="button" className="w-full truncate rounded px-2 py-1 text-left text-[13px] hover:bg-[#F6F5FA]" style={{ borderLeft: `3px solid ${STATUS[p.status][0]}` }} onClick={() => navigate(`/admin/social?id=${p.id}`)}>{p.title || p.text.split("\n")[0] || "Untitled"}</button></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
