import { Link, useLocation } from "react-router-dom";

/* Home · Network · Chats · Schedule · Profile (iOS MainTabView).
   Filled glyphs drawn after the SF Symbols the app uses: house.fill,
   person.2.fill, bubble.left.and.bubble.right.fill, calendar and
   person.crop.circle.fill. */

const svg = { viewBox: "0 0 28 28", fill: "currentColor", "aria-hidden": true, focusable: "false" };

function HomeIcon() {
  return (
    <svg {...svg}>
      <path d="M13.1 3.6a1.4 1.4 0 0 1 1.8 0l4.6 3.9V5.3c0-.5.4-.8.8-.8h1.6c.5 0 .8.4.8.8v4.9l2.3 2a1.2 1.2 0 0 1-1.5 1.8l-1-.8v9.1a2.2 2.2 0 0 1-2.2 2.2h-3.5v-6.3c0-.6-.5-1.1-1.1-1.1h-3.4c-.6 0-1.1.5-1.1 1.1v6.3H7.7a2.2 2.2 0 0 1-2.2-2.2v-9.1l-1 .8A1.2 1.2 0 0 1 3 12.2z" />
    </svg>
  );
}
function NetworkIcon() {
  return (
    <svg {...svg}>
      <circle cx="10" cy="9.2" r="4.3" />
      <path d="M2.4 22.3c0-4.1 3.4-7 7.6-7s7.6 2.9 7.6 7c0 .9-.7 1.5-1.6 1.5H4c-.9 0-1.6-.6-1.6-1.5z" />
      <circle cx="19.6" cy="9.8" r="3.7" />
      <path d="M19.2 23.8h5c.8 0 1.4-.6 1.4-1.4 0-3.4-2.6-6-6-6-1.1 0-2.1.3-3 .8 1.7 1.4 2.7 3.3 2.8 5.3 0 .5 0 .9-.2 1.3z" />
    </svg>
  );
}
function ChatsIcon() {
  return (
    <svg {...svg}>
      <mask id="ttfc-tab-chat-mask">
        <rect width="28" height="28" fill="#fff" />
        <path d="M11.6 8.6h11.2a4 4 0 0 1 4 4v5.3a4 4 0 0 1-4 4h-.6v3.7l-5-3.7h-5.6a4 4 0 0 1-4-4v-5.3a4 4 0 0 1 4-4z" fill="#000" />
      </mask>
      <path mask="url(#ttfc-tab-chat-mask)" d="M4.6 3h10.6a3.4 3.4 0 0 1 3.4 3.4v5.4a3.4 3.4 0 0 1-3.4 3.4H9.4l-4.6 3.5v-3.5h-.2a3.4 3.4 0 0 1-3.4-3.4V6.4A3.4 3.4 0 0 1 4.6 3z" />
      <path d="M11.6 10.3h11.2a2.4 2.4 0 0 1 2.4 2.4v5.1a2.4 2.4 0 0 1-2.4 2.4h-2.2v3l-4-3h-5a2.4 2.4 0 0 1-2.4-2.4v-5.1a2.4 2.4 0 0 1 2.4-2.4z" />
    </svg>
  );
}
function ScheduleIcon() {
  return (
    <svg {...svg}>
      <path fillRule="evenodd" d="M7 4h14a3.5 3.5 0 0 1 3.5 3.5v13A3.5 3.5 0 0 1 21 24H7a3.5 3.5 0 0 1-3.5-3.5v-13A3.5 3.5 0 0 1 7 4zm-1.4 6.2v10.2c0 .8.6 1.5 1.4 1.5h14c.8 0 1.4-.7 1.4-1.5V10.2z" />
      <rect x="11.1" y="12" width="2" height="2" rx=".5" /><rect x="14.9" y="12" width="2" height="2" rx=".5" /><rect x="18.7" y="12" width="2" height="2" rx=".5" />
      <rect x="7.3" y="15.4" width="2" height="2" rx=".5" /><rect x="11.1" y="15.4" width="2" height="2" rx=".5" /><rect x="14.9" y="15.4" width="2" height="2" rx=".5" /><rect x="18.7" y="15.4" width="2" height="2" rx=".5" />
      <rect x="7.3" y="18.8" width="2" height="2" rx=".5" /><rect x="11.1" y="18.8" width="2" height="2" rx=".5" /><rect x="14.9" y="18.8" width="2" height="2" rx=".5" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg {...svg}>
      <path fillRule="evenodd" d="M14 2.5a11.5 11.5 0 1 1 0 23 11.5 11.5 0 0 1 0-23zm0 4.3a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6zM5.03 21.2A11.5 11.5 0 0 0 22.97 21.2C21.1 18.6 17.8 17 14 17s-7.1 1.6-8.97 4.2z" />
    </svg>
  );
}

const TABS = [
  { to: "/", label: "Home", icon: HomeIcon, match: (p) => p === "/" || p.startsWith("/notifications") || p.startsWith("/post") || p.startsWith("/organisations") || p.startsWith("/points") },
  { to: "/network", label: "Network", icon: NetworkIcon, match: (p) => p.startsWith("/network") || p.startsWith("/people") || p.startsWith("/speakers") },
  { to: "/chats", label: "Chats", icon: ChatsIcon, match: (p) => p.startsWith("/chat") || p.startsWith("/group") || p.startsWith("/discussion") },
  { to: "/schedule", label: "Schedule", icon: ScheduleIcon, match: (p) => p.startsWith("/schedule") || p.startsWith("/session") },
  { to: "/profile", label: "Profile", icon: ProfileIcon, match: (p) => p.startsWith("/profile") || p.startsWith("/install") || p.startsWith("/legal") },
];

/** chatsDot: something new in Chats. profileDot: the contact card needs details (pink, lib/myCard.js profileTabDot). */
export default function TabBar({ chatsDot = false, profileDot = false }) {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          const dot = t.to === "/chats" && chatsDot && !active;
          const pink = t.to === "/profile" && profileDot;
          const label = dot ? `${t.label}, new messages` : pink ? `${t.label}, add ways to reach you` : t.label;
          return (
            <Link key={t.to} to={t.to} className="tab pressable" aria-current={active ? "page" : undefined} aria-label={label}>
              <Icon />
              <span>{t.label}</span>
              {dot && <span className="tab-dot" aria-hidden="true" />}
              {pink && <span className="tab-dot tab-dot--pink" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
