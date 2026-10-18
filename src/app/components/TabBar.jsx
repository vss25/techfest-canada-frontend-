import { Link, useLocation } from "react-router-dom";
import { House, Users, MessagesSquare, CalendarDays, CircleUserRound } from "lucide-react";

/* Home · Network · Chats · Schedule · Profile (iOS MainTabView). */

const TABS = [
  { to: "/", label: "Home", icon: House, match: (p) => p === "/" || p.startsWith("/notifications") || p.startsWith("/post") || p.startsWith("/organisations") },
  { to: "/network", label: "Network", icon: Users, match: (p) => p.startsWith("/network") || p.startsWith("/people") || p.startsWith("/speakers") },
  { to: "/chats", label: "Chats", icon: MessagesSquare, match: (p) => p.startsWith("/chat") || p.startsWith("/group") || p.startsWith("/discussion") },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, match: (p) => p.startsWith("/schedule") || p.startsWith("/session") },
  { to: "/profile", label: "Profile", icon: CircleUserRound, match: (p) => p.startsWith("/profile") || p.startsWith("/install") || p.startsWith("/legal") },
];

export default function TabBar({ chatsDot = false }) {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          const dot = t.to === "/chats" && chatsDot && !active;
          return (
            <Link key={t.to} to={t.to} className="tab pressable" aria-current={active ? "page" : undefined} aria-label={dot ? `${t.label}, new messages` : t.label}>
              <Icon aria-hidden="true" strokeWidth={active ? 2.4 : 2} />
              <span>{t.label}</span>
              {dot && <span className="tab-dot" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
