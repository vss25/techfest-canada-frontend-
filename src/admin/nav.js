import {
  LayoutDashboard, Users, Package, ScanLine, BarChart3, MailCheck,
  Mic2, Handshake, Gem, GalleryHorizontal, House, Settings2, Smartphone, Activity, ShieldAlert, ToggleRight,
  Megaphone, ScrollText, UserCog, Power, KeyRound,
} from "lucide-react";

/** Sidebar structure. `to` is relative to /admin. */
export const NAV = [
  {
    title: null,
    items: [{ to: "", label: "Overview", icon: LayoutDashboard, end: true }],
  },
  {
    title: "Tickets & attendees",
    items: [
      { to: "attendees", label: "Tickets", icon: Users },
      { to: "analytics", label: "Sales analytics", icon: BarChart3, management: true },
      { to: "inventory", label: "Inventory", icon: Package },
      { to: "check-in", label: "Check-in", icon: ScanLine },
    ],
  },
  {
    title: "Website content",
    items: [
      { to: "content/speakers", label: "Speakers", icon: Mic2 },
      { to: "content/partners", label: "Partners", icon: Handshake },
      { to: "content/sponsors", label: "Sponsors", icon: Gem },
      { to: "content/sponsor-marquee", label: "Sponsor marquee", icon: GalleryHorizontal },
      { to: "content/home-sponsors", label: "Home sponsors", icon: House },
      { to: "content/settings", label: "Site settings", icon: Settings2 },
    ],
  },
  {
    title: "App",
    items: [
      { to: "app", label: "App overview", icon: Smartphone, end: true },
      { to: "app/people", label: "People", icon: Users },
      { to: "app/activity", label: "Live activity", icon: Activity },
      { to: "app/moderation", label: "Moderation", icon: ShieldAlert },
      { to: "app/text", label: "App text & switches", icon: ToggleRight },
      { to: "app/broadcast", label: "Broadcast", icon: Megaphone },
      { to: "app/audit", label: "Audit log", icon: ScrollText },
    ],
  },
  {
    title: "Staff & safety",
    items: [
      { to: "staff", label: "Staff accounts", icon: UserCog, management: true },
      { to: "email-tracking", label: "Email tracking", icon: MailCheck },
      { to: "account", label: "My account", icon: KeyRound },
      { to: "kill-switch", label: "Kill switch", icon: Power, danger: true },
    ],
  },
];

/** Page title for the top bar, from the current path. */
export function titleFor(pathname) {
  const rest = pathname.replace(/^\/admin\/?/, "").replace(/\/$/, "");
  let best = null;
  for (const g of NAV) for (const it of g.items) {
    if (rest === it.to || (it.to && rest.startsWith(it.to + "/"))) {
      if (!best || it.to.length > best.to.length) best = it;
    }
  }
  return best?.label || "Overview";
}
