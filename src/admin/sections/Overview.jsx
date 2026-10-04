import { Link } from "react-router-dom";
import {
  Ticket, DollarSign, Smartphone, ShieldAlert, Power, PenSquare, ScanLine, Mic2, Megaphone, Users, ArrowRight, Activity,
} from "lucide-react";
import { useApi } from "../hooks";
import { useAdmin } from "../adminContext";
import { Banner, Card, PageHeader, StatTile, focusRing } from "../ui";
import { num } from "../format";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const QUICK = [
  { to: "/admin/check-in", label: "Scan tickets", body: "Check people in at the door", icon: ScanLine },
  { to: "/admin/content/speakers", label: "Edit speakers", body: "Add photos, bios and order", icon: Mic2 },
  { to: "/admin/app/broadcast", label: "Send a broadcast", body: "Post an update to every app user", icon: Megaphone },
  { to: "/admin/app/moderation", label: "Review reports", body: "Hide or approve flagged posts", icon: ShieldAlert },
  { to: "/admin/attendees", label: "Find an attendee", body: "Look up tickets and check-ins", icon: Users },
  { to: "/admin/content/partners", label: "Update partner logos", body: "Website and app update in a minute", icon: PenSquare },
];

export default function Overview() {
  const { me, kill } = useAdmin();
  const stats = useApi("/console/stats");
  const sales = useApi("/admin/analytics");
  const cms = useApi("/cms/status");
  const s = stats.data || {};
  const totals = sales.data?.totals || {};
  const first = (me?.name || "").split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow="The Tech Festival Canada"
        title={`${greeting()}${first ? `, ${first}` : ""}`}
        description="Here's what's happening across tickets, the website and the app today."
      />

      {kill?.enabled && (
        <Banner
          tone="danger"
          icon={Power}
          title="The website and app are OFFLINE"
          className="mb-6"
          action={<Link to="/admin/kill-switch" className={`rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 ${focusRing}`}>Manage</Link>}
        >
          Visitors currently see: “{kill.message}”
        </Banner>
      )}
      {cms.data && cms.data.configured === false && (
        <Banner tone="warn" icon={PenSquare} className="mb-6" title="Website editing is read-only">
          Editing is read-only until SANITY_WRITE_TOKEN is added on Render.
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Tickets sold" value={sales.error ? "—" : num(totals.totalTickets)} icon={Ticket} tone="pink" to="/admin/analytics" />
        <StatTile label="Ticket revenue" value={sales.error ? "—" : totals.totalRevenue != null ? `$${num(totals.totalRevenue)}` : undefined} icon={DollarSign} tone="orange" to="/admin/analytics" />
        <StatTile label="App users active today" value={stats.error ? "—" : num(s.activeToday)} icon={Activity} tone="purple" hint={s.activeWeek != null ? `${num(s.activeWeek)} this week` : undefined} to="/admin/app" />
        <StatTile label="Open reports" value={stats.error ? "—" : num(s.openReports)} icon={ShieldAlert} tone={s.openReports ? "bad" : "good"} hint={s.openReports ? "Needs a look" : "All clear"} to="/admin/app/moderation" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className={`group flex items-center gap-4 rounded-2xl border border-ttfc-line bg-ttfc-panel2/60 p-4 transition hover:border-ttfc-purple/50 hover:bg-ttfc-panel2 ${focusRing}`}
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ttfc-pink/25 to-ttfc-purple/25 text-white">
                  <q.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ttfc-text">{q.label}</span>
                  <span className="block truncate text-xs text-ttfc-muted">{q.body}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-ttfc-dim transition group-hover:translate-x-0.5 group-hover:text-ttfc-text" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold">At a glance</h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Website & app", kill ? (kill.enabled ? "Offline" : "Live") : "…", kill?.enabled ? "text-red-300" : "text-emerald-300"],
              ["Website editing", cms.data ? (cms.data.configured ? "On" : "Read-only") : cms.error ? "Unavailable" : "…", cms.data?.configured ? "text-emerald-300" : "text-amber-300"],
              ["App accounts", num(s.users)],
              ["Ticket holders on the app", num(s.ticketHolders)],
              ["Guest tickets not on the app", num(s.guests)],
              ["Posts in the feed", num(s.posts)],
            ].map(([k, v, tone]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-ttfc-line/60 pb-3 last:border-0 last:pb-0">
                <dt className="text-ttfc-muted">{k}</dt>
                <dd className={`font-semibold tabular-nums ${tone || "text-ttfc-text"}`}>{v ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <Link to="/admin/app" className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ttfc-pink hover:text-pink-300 ${focusRing} rounded-lg`}>
            <Smartphone className="h-4 w-4" aria-hidden="true" /> App overview
          </Link>
        </Card>
      </div>
    </>
  );
}
