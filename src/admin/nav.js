import {
  Activity, Award, BarChart3, BellRing, CalendarCheck, CalendarDays, Contact, Download, FileDown, Gem, GalleryHorizontal, GraduationCap,
  Handshake, House, IdCard, Inbox, KeyRound, Landmark, LayoutDashboard, MailCheck, MailOpen, Megaphone, Mic2, Package, Power, ScanLine,
  MailPlus, ScrollText, Settings2, Share2, ShieldAlert, ShieldCheck, Smartphone, Store, Ticket, TicketPlus, ToggleRight, UserCog, Users,
} from "lucide-react";
import { Gavel, ListChecks, Network, Trophy } from "lucide-react";

/* =========================================================
   Sidebar structure (the admin review, Oct 19 2026): five sections
   named for event-week jobs plus a folded "More". `to` is relative
   to /admin, and every address is the same as before.
     management: true  management only (Sales, Staff accounts)
     hidden: true      not in the sidebar, the address still works
                       (Home sponsors; My account is under your name
                       in the top bar)
     sub               a small heading inside More
   The section titles are also the pages' small section headings
   (PageHeader eyebrow; "More › Records" and so on in More).
========================================================= */
export const NAV = [
  {
    title: null,
    items: [{ to: "", label: "Overview", icon: LayoutDashboard, end: true }],
  },
  {
    title: "People & passes",
    items: [
      { to: "people", label: "People", icon: Contact },
      { to: "issued-passes", label: "Give a pass", icon: TicketPlus },
      { to: "speaker-passes", label: "Speaker passes", icon: IdCard },
      { to: "exhibitor-passes", label: "Exhibitor passes", icon: Store },
    ],
  },
  {
    title: "RSVPs & meals",
    items: [
      { to: "rsvps", label: "Headcounts & RSVPs", icon: CalendarCheck },
      { to: "marketing/rsvp-reminders", label: "RSVP reminders", icon: BellRing },
    ],
  },
  {
    title: "Event day",
    items: [
      { to: "check-in", label: "Check-in", icon: ScanLine },
      { to: "app/moderation", label: "App moderation", icon: ShieldAlert },
      { to: "app/broadcast", label: "Send an app update", icon: Megaphone },
    ],
  },
  {
    // Catalyst Awards (Oct 20 2026): the nominations, and the jury who score them at thetechfestival.com/awards/jury-admin.
    title: "Catalyst Awards",
    items: [
      { to: "awards", label: "Nominations", icon: Award, end: true },
      { to: "awards/jury", label: "Jury", icon: Gavel },
      { to: "awards/allocation", label: "Allocation", icon: Network },
      { to: "awards/rubric", label: "Scoring rubric", icon: ListChecks },
      { to: "awards/results", label: "Jury results", icon: Trophy, management: true },
    ],
  },
  {
    title: "Website & app",
    items: [
      { to: "content/agenda", label: "Agenda", icon: CalendarDays },
      { to: "content/speakers", label: "Speakers", icon: Mic2 },
      { to: "content/partners", label: "Partners", icon: Handshake },
      { to: "content/sponsors", label: "Featured Partners", icon: Gem },
      { to: "content/settings", label: "Website switches", icon: Settings2 },
      { to: "app/text", label: "App text & switches", icon: ToggleRight },
      { to: "app/invite", label: "App invite email", icon: MailPlus },
    ],
  },
  {
    title: "Sales & emails",
    items: [
      { to: "analytics", label: "Sales", icon: BarChart3, management: true },
      { to: "inventory", label: "Prices & stock", icon: Package },
      { to: "purchase-email", label: "Purchase email", icon: MailOpen },
    ],
  },
  {
    title: "More",
    collapsible: true,
    items: [
      { to: "attendees", label: "Ticket records", icon: Ticket, sub: "Records" },
      { to: "app/people", label: "App accounts", icon: Users, sub: "Records" },
      { to: "form-submissions", label: "Form submissions", icon: Inbox, sub: "Records" },
      { to: "brochure-downloads", label: "Brochure downloads", icon: FileDown, sub: "Records" },
      { to: "india-pavilion", label: "India Pavilion", icon: Landmark, sub: "Records" },
      { to: "marketing/attending", label: "I'm attending campaign", icon: Share2, sub: "Records" },
      { to: "content/alumni-logos", label: "Team alumni", icon: GraduationCap, sub: "Logo strips" },
      { to: "content/sponsor-marquee", label: "Community & speakers' companies", icon: GalleryHorizontal, sub: "Logo strips" },
      { to: "app", label: "App overview", icon: Smartphone, end: true, sub: "App reports" },
      { to: "app/activity", label: "Live activity", icon: Activity, sub: "App reports" },
      { to: "app/pwa", label: "Web app installs", icon: Download, sub: "App reports" },
      { to: "staff", label: "Staff accounts", icon: UserCog, management: true, sub: "Settings" },
      { to: "app/rights", label: "App rights", icon: ShieldCheck, sub: "Settings" },
      { to: "app/audit", label: "Audit log", icon: ScrollText, sub: "Settings" },
      { to: "email-tracking", label: "Where website forms go", icon: MailCheck, sub: "Settings" },
      { to: "kill-switch", label: "Kill switch", icon: Power, danger: true, sub: "Settings" },
    ],
  },
  {
    // Not in the sidebar (their addresses still work); kept here for the top bar's title.
    title: "Not in the sidebar",
    hidden: true,
    items: [
      { to: "content/home-sponsors", label: "Home sponsors", icon: House, hidden: true },
      { to: "account", label: "My account", icon: KeyRound, hidden: true },
    ],
  },
];

/** { item, group } of the sidebar link for a path under /admin ("" = Overview): the longest match, or null. */
export function navItemFor(pathname) {
  const rest = pathname.replace(/^\/admin\/?/, "").replace(/\/$/, "");
  let best = null;
  for (const g of NAV) for (const it of g.items) {
    if (rest === it.to || (it.to && rest.startsWith(it.to + "/"))) {
      if (!best || it.to.length > best.item.to.length) best = { item: it, group: g };
    }
  }
  return best;
}

/** Page title for the top bar, from the current path. */
export function titleFor(pathname) {
  return navItemFor(pathname)?.item.label || "Overview";
}

/** "More › Records": the small section heading of a page in the folded section. */
export const moreEyebrow = (sub) => `More › ${sub}`;
