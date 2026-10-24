import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarClock, ChevronDown, ChevronRight, Mail, Megaphone, ShieldCheck, Ticket, UserPlus, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { auth } from "../lib/auth";
import { cms } from "../lib/cms";
import { markNotificationsRead, refreshConnections, refreshNotifications, social } from "../lib/social";
import { isUnread, linkLabel, notificationItems, routeForLink } from "../lib/notifications";
import { listTime } from "../lib/time";
import { useNow } from "../lib/ui";
import { TopBar } from "../components/ui";
import { ConnectionRow } from "../components/People";

/* =========================================================
   Notifications (iOS NotificationsListView): invitations to act
   on at the top, then everything else. Tapping a row marks it
   read; only messages from the TTFC team open their link.
   Guests see the same list built from what's on this device.
========================================================= */

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
  const outgoing = s.connections.outgoing.filter((x) => !s.blocked.includes(x.user?.id));
  const items = notificationItems({ social: s, cms: c, auth: a, now });
  const listedIds = items.map((n) => n.id);
  useEffect(() => {
    const ids = incoming.map((x) => `inv-${x.id}`).filter((id) => !social.get().readNotifs.includes(id));
    if (ids.length) markNotificationsRead(ids, notificationItems({ social: social.get(), cms: cms.get(), auth: auth.get(), now: Date.now() }).map((n) => n.id));
  }, [incoming]);

  const listed = items.filter((n) => n.kind !== "invitation");
  const unread = items.filter((n) => isUnread(n, s.readNotifs)).length;

  const open = (n) => {
    markNotificationsRead([n.id], listedIds);
    // "<name> connected with you" (someone scanned your pass): their profile.
    if (n.to) { navigate(n.to); return; }
    if (n.kind !== "personal") return;
    const r = routeForLink(n.link);
    if (!r) return;
    if (r.href) window.open(r.href, "_blank", "noopener");
    else navigate(r.to);
  };

  return (
    <div className="page">
      <TopBar title="Notifications" />
      <div className="notif-head">
        <span className="eyebrow">{unread === 0 ? "All caught up" : `${unread} unread`}</span>
        <button type="button" className="notif-markall" disabled={unread === 0} onClick={() => markNotificationsRead(listedIds, listedIds)}>Mark all as read</button>
      </div>
      <main id="main" className="pad stack-sm" style={{ gap: 10, paddingTop: 12 }}>
        {incoming.length > 0 && <h2 className="list-label" style={{ paddingTop: 0 }}>{incoming.length === 1 ? "1 invitation" : `${incoming.length} invitations`}</h2>}
        {incoming.map((x) => <ConnectionRow key={x.id} conn={x} mode="invite" />)}
        {outgoing.length > 0 && (
          <button type="button" className="sent-toggle" aria-expanded={showSent} aria-label={`Sent requests, ${outgoing.length}`} onClick={() => setShowSent((v) => !v)}>
            <span style={{ flex: 1 }}>Sent requests · {outgoing.length}</span>
            <ChevronDown aria-hidden="true" style={{ transform: showSent ? "rotate(180deg)" : "none" }} />
          </button>
        )}
        {showSent && outgoing.map((x) => <ConnectionRow key={x.id} conn={x} mode="sent" />)}
        {(incoming.length > 0 || outgoing.length > 0) && <h2 className="list-label" style={{ paddingTop: 6 }}>Notifications</h2>}

        {listed.length === 0 ? (
          <p className="muted center" style={{ padding: "40px 30px", margin: 0, fontSize: 13 }}>Nothing yet. Register sessions and connect with people and it fills up.</p>
        ) : listed.map((n) => {
          const Icon = ICON[n.kind] || Mail;
          const u = isUnread(n, s.readNotifs);
          const personal = n.kind === "personal";
          return (
            <button key={n.id} type="button" className="notif pressable" onClick={() => open(n)} aria-label={u ? `Unread: ${n.title}` : undefined}>
              <span className={u ? "notif-ico notif-ico--on" : "notif-ico"}><Icon aria-hidden="true" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="row" style={{ gap: 6, alignItems: "flex-start" }}>
                  <b className="clamp-2" style={{ flex: 1, fontWeight: u ? 700 : 600 }}>{n.title}</b>
                  <time className="notif-time">{listTime(n.date)}</time>
                </span>
                <span className={personal ? "notif-detail clamp-8" : "notif-detail clamp-3"}>{n.detail}</span>
                {personal && (
                  <span className="notif-meta">
                    From the TTFC team{n.link && n.link !== "ttfc://tab/home" && <> · {linkLabel(n.link)}<ChevronRight aria-hidden="true" /></>}
                  </span>
                )}
                {n.to && <span className="notif-meta">View profile<ChevronRight aria-hidden="true" /></span>}
              </span>
            </button>
          );
        })}
        {/* Web only: a browser tab can't wake itself for a reminder. */}
        <p className="tiny muted center" style={{ marginTop: 6 }}>Session reminders: the web app can't alert you when it's closed. Keep it open, or <Link to="/install?from=reminders" style={{ color: "var(--pur-alt)", fontWeight: 700 }}>get the TTFC app</Link> from the App Store or Google Play for reminders.</p>
      </main>
    </div>
  );
}
