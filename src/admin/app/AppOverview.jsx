import {
  Users, Ticket, UserX, Activity, CalendarCheck, MousePointerClick, Newspaper, MessageSquare, UsersRound, MessagesSquare, Flag, RefreshCw,
} from "lucide-react";
import { useApi } from "../hooks";
import { Bars, Button, Card, ErrorState, PageHeader, SkeletonGrid, StatTile } from "../ui";
import { num } from "../format";

export default function AppOverview() {
  const { data: s, error, loading, reload, refreshing } = useApi("/console/stats");
  const tiles = s ? [
    ["Accounts", s.users, Users, "purple", "/admin/app/people"],
    ["Ticket holders on the app", s.ticketHolders, Ticket, "pink"],
    ["Guest tickets not on the app", s.guests, UserX, "neutral"],
    ["Active today", s.activeToday, Activity, "good", "/admin/app/activity"],
    ["Active this week", s.activeWeek, CalendarCheck, "purple"],
    ["Actions today", s.eventsToday, MousePointerClick, "orange", "/admin/app/activity"],
    ["Posts", s.posts, Newspaper, "pink", "/admin/app/moderation"],
    ["Direct messages", s.messages, MessageSquare, "neutral"],
    ["Groups", s.groups, UsersRound, "neutral"],
    ["Discussions", s.discussions, MessagesSquare, "neutral"],
    ["Open reports", s.openReports, Flag, s.openReports ? "bad" : "good", "/admin/app/moderation"],
  ] : [];
  return (
    <>
      <PageHeader
        eyebrow="App"
        title="App overview"
        description="Everything happening in the TTFC iOS app."
        actions={<Button icon={RefreshCw} onClick={reload} loading={refreshing && !loading}>Refresh</Button>}
      />
      {loading ? <SkeletonGrid count={8} className="h-28" /> : error && !s ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {tiles.map(([label, value, icon, tone, to]) => (
              <StatTile key={label} label={label} value={num(value)} icon={icon} tone={tone} to={to} />
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-base font-semibold">Most-viewed screens <span className="font-normal text-ttfc-dim">· 7 days</span></h2>
              <Bars rows={s.topScreens || []} />
            </Card>
            <Card>
              <h2 className="mb-4 text-base font-semibold">Most-pressed buttons <span className="font-normal text-ttfc-dim">· 7 days</span></h2>
              <Bars rows={s.topTaps || []} />
            </Card>
          </div>
        </>
      )}
    </>
  );
}
