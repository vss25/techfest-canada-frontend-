import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BellOff, CalendarClock, ChevronDown, Mail, Megaphone, ShieldCheck, Ticket, UserPlus, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn } from "../lib/auth";
import { cms } from "../lib/cms";
import { markNotificationsRead, refreshConnections, refreshNotifications, social } from "../lib/social";
import { isUnread, linkLabel, notificationItems, routeForLink } from "../lib/notifications";
import { timeAgo } from "../lib/time";
import { useNow } from "../lib/ui";
import { Empty, TopBar } from "../components/ui";
import { ConnectionRow } from "../components/People";

/* Notifications (iOS NotificationsListView), with invitations to act on at the top. */

const ICON = { invitation: UserPlus, connection: Users, session: CalendarClock, announcement: Megaphone, moderation: ShieldCheck, ticket: Ticket, personal: Mail };

export default function Notifications() {
  const a = useStore(auth);
  const s = useStore(social);
  const c = useStore(cms);
  const now = useNow(60000);
  const navigate = useNavigate();
  const [showSent, setShowSent] = useState(false);
  useEffect(() => { refreshNotifications(); refreshConnections(); }, []);

  // Invitations seen here count as read.
  const incoming = s.connections.incoming.filter((x) => !s.blocked.includes(x.user?.id));
  const outgoing = s.connections.outgoing;
  useEffect(() => {
    const ids = incoming.map((x) => `inv-${x.id}`).filter((id) => !social.get().readNotifs.includes(id));
    if (ids.length) markNotificationsRead(ids);
  }, [incoming]);

  if (!isSignedIn(a)) return <div className="page"><TopBar title="Notifications" /><Empty icon={BellOff} title="Sign in for notifications">Invitations, session reminders and messages from the TTFC team appear here.</Empty></div>;

  const items = notificationItems({ social: s, cms: c, auth: a, now });
  const listed = items.filter((n) => n.kind !== "invitation");
  const unread = items.filter((n) => isUnread(n, s.readNotifs)).length;

  const open = (n) => {
    markNotificationsRead([n.id]);
    const r = routeForLink(n.link);
    if (!r) return;
    if (r.href) window.open(r.href, "_blank", "noopener");
    else navigate(r.to);
  };

  return (
    <div className="page">
      <TopBar title="Notifications" />
      <main id="main" className="pad mt-16 stack">
        <div className="row">
          <span className="eyebrow" style={{ flex: 1 }}>{unread === 0 ? "All caught up" : `${unread} unread`}</span>
          <button type="button" className="link-btn" disabled={unread === 0} style={{ opacity: unread ? 1 : 0.5 }} onClick={() => markNotificationsRead(items.map((n) => n.id))}>Mark all as read</button>
        </div>

        {incoming.length > 0 && (
          <section className="stack-sm" aria-labelledby="inv-h">
            <h2 id="inv-h" className="section-title">{incoming.length === 1 ? "1 invitation" : `${incoming.length} invitations`}</h2>
            {incoming.map((x) => <ConnectionRow key={x.id} conn={x} mode="invite" />)}
          </section>
        )}
        {outgoing.length > 0 && (
          <section className="stack-sm">
            <button type="button" className="text-btn row small bold muted" style={{ minHeight: 40 }} aria-expanded={showSent} onClick={() => setShowSent((v) => !v)}>
              <span style={{ flex: 1 }}>Sent requests · {outgoing.length}</span>
              <ChevronDown aria-hidden="true" style={{ width: 16, height: 16, transform: showSent ? "rotate(180deg)" : "none" }} />
            </button>
            {showSent && outgoing.map((x) => <ConnectionRow key={x.id} conn={x} mode="sent" />)}
          </section>
        )}
        {(incoming.length > 0 || outgoing.length > 0) && <h2 className="section-title" style={{ marginTop: 6 }}>Notifications</h2>}

        {listed.length === 0 ? (
          <p className="muted center" style={{ padding: "30px 20px" }}>Nothing yet. Register sessions and connect with people and it fills up.</p>
        ) : listed.map((n) => {
          const Icon = ICON[n.kind] || Mail;
          const u = isUnread(n, s.readNotifs);
          const label = n.kind === "personal" ? linkLabel(n.link) : "";
          return (
            <button key={n.id} type="button" className="list-row pressable" style={{ alignItems: "flex-start" }} onClick={() => open(n)}>
              <span className="lead-icon"><Icon aria-hidden="true" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="row" style={{ gap: 6 }}>
                  <b className="ellipsis" style={{ fontSize: 14, flex: 1 }}>{n.title}</b>
                  {u && <span className="live-dot" style={{ color: "var(--pur-alt)", animation: "none" }} aria-label="Unread" />}
                </span>
                <span className="small muted clamp-2" style={{ display: "-webkit-box" }}>{n.detail}</span>
                <span className="tiny muted">{n.kind === "session" ? "" : timeAgo(n.date)}{n.from ? ` · ${n.from}` : ""}{label ? ` · ${label}` : ""}</span>
              </span>
            </button>
          );
        })}
        <p className="tiny muted center">Session reminders: the web app can't alert you when it's closed. Keep it open, or use the TTFC app on your phone for reminders.</p>
        <Link to="/schedule" className="btn btn-block">Open the schedule</Link>
      </main>
    </div>
  );
}
