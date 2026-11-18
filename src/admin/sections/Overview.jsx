import { Link } from "react-router-dom";
import {
  Ticket, DollarSign, Smartphone, ShieldAlert, PenSquare, ScanLine, Megaphone, ArrowRight, Activity, TicketPlus, Contact, Utensils, ClipboardList,
} from "lucide-react";
import { useApi } from "../hooks";
import { useAdmin } from "../adminContext";
import { Banner, Card, PageHeader, StatTile, focusRing } from "../ui";
import { num } from "../format";
import { useAdminEvent } from "../eventContext";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/* The event-week jobs (the admin review, Oct 19 2026). */
const quickActions = (isManagement) => [
  { to: "/admin/issued-passes", label: "Give a pass", body: "Create a pass and email it", icon: TicketPlus },
  { to: "/admin/people", label: "Find someone", body: "Their pass, meals, RSVP and emails", icon: Contact },
  { to: "/admin/content/agenda", label: "Add a session", body: "", icon: ClipboardList },
  { to: "/admin/content/speakers", label: "Add a speaker", body: "", icon: Contact },
  { to: "/admin/event-summary", label: "Event summary", body: "Passes, RSVPs, meals, check-in", icon: ClipboardList },
  { to: "/admin/rsvps", label: "Meal headcounts", body: "Who's coming to each meal and event", icon: Utensils },
  { to: "/admin/check-in", label: "Check-in", body: "Scan tickets at the door", icon: ScanLine },
  { to: "/admin/app/moderation", label: "Moderation", body: "Hide or approve flagged posts", icon: ShieldAlert },
  { to: "/admin/app/broadcast", label: "Send an app update", body: isManagement ? "A note to one person, or an update to everyone" : "A notification to one person", icon: Megaphone },
];

export default function Overview() {
  const { me, isManagement } = useAdmin();
  const stats = useApi("/console/stats");
  // Money is management-only; staff see the ticket count from the ticket list instead.
  const sales = useApi(isManagement ? "/console/sales?range=week" : null);
  const ticketList = useApi(isManagement ? null : "/console/tickets?show=visible");
  const cms = useApi("/cms/status");
  const s = stats.data || {};
  const totals = sales.data?.totals || {};
  const first = (me?.name || "").split(" ")[0];
  const { attention } = useAdminEvent();
  // Needs attention: real counts, each with where to go and what to do.
  const todo = [
    attention.changes > 0 && { t: `${num(attention.changes)} website change${attention.changes === 1 ? "" : "s"} waiting to publish`, where: "Home  ›  Website changes", cta: "Review", to: "/admin/content/changes", c: "#5B21B6" },
    attention.sos > 0 && { t: `${num(attention.sos)} open SOS request${attention.sos === 1 ? "" : "s"}`, where: "Event day  ›  SOS & help", cta: "Reply", to: "/admin/app/sos", c: "#B91C1C" },
    s.openReports > 0 && { t: `${num(s.openReports)} report${s.openReports === 1 ? "" : "s"} to look at`, where: "Event day  ›  App moderation", cta: "Review", to: "/admin/app/moderation", c: "#F5A623" },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="The Tech Festival Canada"
        title={`${greeting()}${first ? `, ${first}` : ""}`}
        description="Here's what's happening across tickets, the website and the app today."
      />

      {cms.data && cms.data.configured === false && (
        <Banner tone="warn" icon={PenSquare} className="mb-6" title="Website editing is read-only">
          Editing is read-only until SANITY_WRITE_TOKEN is added on Render.
        </Banner>
      )}

      {/* The approved design's Home (board 17): four number cards, then Needs attention beside Quick actions. */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {isManagement
          ? <StatTile label="Tickets sold" value={sales.error ? "—" : num(totals.totalTickets)} tone="good" hint="all events · this week's report" to="/admin/analytics" />
          : <StatTile label="Tickets" value={ticketList.error ? "—" : num(ticketList.data?.total)} tone="neutral" hint="ticket records" to="/admin/attendees" />}
        {isManagement
          ? <StatTile label="Ticket revenue · all events" value={sales.error || (sales.data && totals.totalRevenue == null) ? "—" : totals.totalRevenue != null ? `$${num(Math.round(totals.totalRevenue))}` : undefined} tone="neutral" hint={sales.data && totals.totalRevenue == null ? "Stripe unavailable" : "from Stripe · click for the breakdown"} to="/admin/analytics" />
          : <StatTile label="App users active today" value={stats.error ? "—" : num(s.activeToday)} tone="neutral" hint={s.activeWeek != null ? `${num(s.activeWeek)} this week` : undefined} to="/admin/app" />}
        <StatTile label="Website changes to publish" value={num(attention.changes)} tone={attention.changes ? "purple" : "neutral"} hint={attention.changes ? "saved or on staging" : "nothing waiting"} to="/admin/content/changes" />
        <StatTile label="Open reports" value={stats.error ? "—" : num(s.openReports)} tone={s.openReports ? "orange" : "good"} hint={s.openReports ? "needs a look" : "all clear"} to="/admin/app/moderation" />
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-2.5">
          <h2 className="text-base font-bold text-[#151035]">Needs attention</h2>
          {todo.length ? todo.map((t) => (
            <Link key={t.to} to={t.to} className={`flex items-center gap-3 rounded-[10px] border border-[#E3E0EE] bg-white p-3 text-left hover:bg-[#F6F5FA] ${focusRing}`}>
              <span className="h-9 w-2 shrink-0 rounded" style={{ background: t.c }} aria-hidden="true" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="text-sm text-[#151035]">{t.t}</b>
                <span className="whitespace-pre text-xs text-[#6B6688]">{t.where}</span>
              </span>
              <span className="ml-auto shrink-0 text-[13px] font-semibold text-[#D6308C]">{t.cta} →</span>
            </Link>
          )) : <p className="rounded-[10px] bg-[#F6F5FA] p-3 text-sm text-[#4A4566]">Nothing needs your attention right now.</p>}
        </Card>

        <Card className="flex flex-col gap-2.5">
          <h2 className="text-base font-bold text-[#151035]">Quick actions</h2>
          {quickActions(isManagement).map((q) => (
            <Link key={q.to + q.label} to={q.to} className={`flex h-11 items-center rounded-[10px] border border-[#E3E0EE] bg-white px-3 text-sm font-semibold text-[#151035] hover:bg-[#F6F5FA] ${focusRing}`}>
              {q.label}
            </Link>
          ))}
          {cms.data && (
            <span className="text-xs text-[#8A86A0]">Website editing is {cms.data.configured ? "on" : "read-only"} · {num(s.users)} app accounts</span>
          )}
        </Card>
      </div>
    </>
  );
}
