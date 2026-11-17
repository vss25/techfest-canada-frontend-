import { MapPinned,
  Activity, Award, BarChart3, BellRing, Building2, CalendarCheck, CalendarDays, Contact, Download, FileDown, Gem, GalleryHorizontal, GraduationCap,
  Handshake, House, IdCard, Inbox, KeyRound, Landmark, LayoutDashboard, MailCheck, MailOpen, Megaphone, Mic2, Package, ScanLine,
  MailPlus, MailX, ScrollText, Settings2, Share2, ShieldAlert, ShieldCheck, Smartphone, Store, Ticket, TicketPlus, ToggleRight, UserCog, Users,
} from "lucide-react";
import { ClipboardList, Gavel, Gift, GitPullRequestArrow, LifeBuoy, ListChecks, ListPlus, Medal, MessageSquareText, Network, Trophy } from "lucide-react";

/* =========================================================
   The panel's structure (Nov 2026, the approved admin design,
   boards 16–18): nine workspaces in a navy rail (in the organiser's
   order, Nov 17 2026: Home, Content, Marketing, Sales, Operations,
   People, Awards, Event day, Settings), each with its own
   menu of pages in groups. Every page keeps its address (`to`,
   relative to /admin), so links and bookmarks still work.
     management: true  management only (Revenue, Staff accounts, Jury results)
     volunteer: true   also for volunteer accounts (People only, read
                       only; access.js)
     hidden: true      not in the menu, the address still works
   Pages the design adds that don't exist yet (Approvals, Site pages,
   Files, contracts, operations…) come with their own steps.
   No kill switch (the organiser, Oct 23 2026: "Its risky").
========================================================= */

/* Rail icons: the design's own 24×24 strokes. */
const RAIL = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  web: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  mkt: "M3 11l18-8-8 18-2-8-8-2z",
  sales: "M3 8h18v12H3zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18",
  ops: "M9 3h6v4H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5",
  people: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  day: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10",
  awards: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
};

export const WORKSPACES = [
  { id: "home", label: "Home", rail: RAIL.home, job: "What needs doing today.", groups: [
    { title: "", items: [
      { to: "", label: "Overview", icon: LayoutDashboard, end: true },
      // Nov 2026: website content goes save → staging → live from here.
      { to: "content/changes", label: "Website changes", icon: GitPullRequestArrow },
    ] },
  ] },
  { id: "content", label: "Content", rail: RAIL.web, job: "Everything people read and see on the website and in the app. All content is written here.", groups: [
    { title: "Event website", items: [
      { to: "content/events", label: "Event pages", icon: MapPinned },
      { to: "content/agenda", label: "Agenda", icon: CalendarDays },
      { to: "content/speakers", label: "Speakers", icon: Mic2 },
      { to: "content/partners", label: "Partners", icon: Handshake },
      { to: "content/sponsors", label: "Featured Partners", icon: Gem },
      { to: "inventory", label: "Tickets & prices", icon: Package },
    ] },
    { title: "Site-wide", items: [
      { to: "content/settings", label: "Website switches", icon: Settings2 },
      { to: "content/alumni-logos", label: "Team alumni logos", icon: GraduationCap },
      { to: "content/sponsor-marquee", label: "Community & speakers' companies", icon: GalleryHorizontal },
      { to: "content/home-sponsors", label: "Home sponsors", icon: House, hidden: true },
      { to: "content/organisations", label: "Attending organisations", icon: Building2 },
    ] },
    { title: "App", items: [
      { to: "app/text", label: "App text & switches", icon: ToggleRight },
      // The attendee survey (Oct 26 2026): its questions, settings, answers, and the app notification and email.
      { to: "app/survey", label: "Attendee survey", icon: MessageSquareText },
      // The leaderboard's top networkers (appreciation, not a prize, Oct 27 2026; the address is the old one).
      { to: "app/swag", label: "Top networkers", icon: Gift },
      { to: "app", label: "App overview", icon: Smartphone, end: true },
      { to: "app/activity", label: "Live activity", icon: Activity },
      { to: "app/pwa", label: "Web app installs", icon: Download },
    ] },
  ] },
  { id: "marketing", label: "Marketing", rail: RAIL.mkt, job: "Reaching people: leads coming in and the emails we send.", groups: [
    { title: "Leads", items: [
      { to: "form-submissions", label: "Form submissions", icon: Inbox },
      { to: "brochure-downloads", label: "Downloads", icon: FileDown },
    ] },
    { title: "Emails", items: [
      { to: "purchase-email", label: "Purchase email", icon: MailOpen },
      { to: "app/invite", label: "App invite email", icon: MailPlus },
      { to: "app/digest", label: "“What you missed” emails", icon: MailOpen },
      { to: "marketing/attending", label: "I'm attending campaign", icon: Share2 },
      { to: "app/unsubscribes", label: "Unsubscribed", icon: MailX },
    ] },
  ] },
  { id: "sales", label: "Sales", rail: RAIL.sales, job: "Selling sponsorship and exhibiting: enquiries, exhibitors and revenue. Packages and prices are written in Content.", groups: [
    { title: "Enquiries", items: [
      // "Stay updated" (Oct 23 2026): who joined the TTFC 2027 waitlist, and the page's wording.
      { to: "waitlist-2027", label: "Waitlist", icon: ListPlus },
      { to: "india-pavilion", label: "India Pavilion", icon: Landmark },
    ] },
    { title: "Exhibitors", items: [
      { to: "exhibitor-passes", label: "Exhibitor passes", icon: Store },
    ] },
    { title: "Revenue", items: [
      { to: "analytics", label: "Revenue", icon: BarChart3, management: true },
    ] },
  ] },
  { id: "ops", label: "Operations", rail: RAIL.ops, job: "Running the event: settings, venue, vendors, food, print and logistics.", groups: [
    { title: "", items: [
      // The event spine (Phase 2): per-event attendee visibility, lifecycle grace days, pricing announced.
      { to: "events", label: "Event settings", icon: CalendarDays },
    ] },
  ] },
  { id: "people", label: "People", rail: RAIL.people, job: "Find anyone, give passes, fix records.", groups: [
    { title: "", items: [
      // The one page volunteers have (look-up only: VolunteerPeople.jsx, access.js).
      { to: "people", label: "People", icon: Contact, volunteer: true },
    ] },
    { title: "Passes", items: [
      { to: "issued-passes", label: "Give a pass", icon: TicketPlus },
      { to: "speaker-passes", label: "Speaker passes", icon: IdCard },
    ] },
    { title: "Records", items: [
      { to: "attendees", label: "Ticket records", icon: Ticket },
      { to: "app/people", label: "App accounts", icon: Users },
    ] },
  ] },
  // Catalyst Awards (Oct 20 2026): the nominations, and the jury who score them at thetechfestival.com/awards/jury-admin.
  { id: "awards", label: "Awards", rail: RAIL.awards, job: "Catalyst Awards, nomination to winners.", groups: [
    { title: "", items: [
      { to: "awards", label: "Nominations", icon: Award, end: true },
      { to: "awards/jury", label: "Jury", icon: Gavel },
      { to: "awards/allocation", label: "Allocation", icon: Network },
      { to: "awards/rubric", label: "Scoring rubric", icon: ListChecks },
      { to: "awards/results", label: "Jury results", icon: Trophy, management: true },
      // Oct 31 2026: what the website's "Results are out" and each winner's certificate show.
      { to: "awards/winners", label: "Winners", icon: Medal },
    ] },
  ] },
  { id: "day", label: "Event day", rail: RAIL.day, job: "Headcounts before, check-in and help during.", groups: [
    { title: "Before", items: [
      // Event summary (Oct 23 2026): passes, RSVPs, meals and check-in for both days on one read-only page.
      { to: "event-summary", label: "Event summary", icon: ClipboardList },
      { to: "rsvps", label: "RSVPs & headcounts", icon: CalendarCheck },
      { to: "marketing/rsvp-reminders", label: "RSVP reminders", icon: BellRing },
    ] },
    { title: "On the day", items: [
      { to: "check-in", label: "Check-in", icon: ScanLine },
      { to: "app/sos", label: "SOS & help", icon: LifeBuoy },
      { to: "app/moderation", label: "App moderation", icon: ShieldAlert },
      { to: "app/broadcast", label: "Send an app update", icon: Megaphone },
    ] },
  ] },
  { id: "settings", label: "Settings", rail: RAIL.settings, bottom: true, job: "Access, form inboxes and the change log.", groups: [
    { title: "", items: [
      { to: "staff", label: "Staff accounts", icon: UserCog, management: true },
      { to: "app/rights", label: "App rights", icon: ShieldCheck },
      { to: "email-tracking", label: "Where website forms go", icon: MailCheck },
      { to: "app/audit", label: "Audit log", icon: ScrollText },
      { to: "account", label: "My account", icon: KeyRound },
    ] },
  ] },
];

/* The same pages as flat groups ("Content › Event website"), for the search, page titles and the
   pages' small headings. */
export const NAV = WORKSPACES.flatMap((w) => w.groups.map((g) => ({
  title: g.title ? `${w.label} › ${g.title}` : w.label, workspace: w.id, items: g.items,
})));

/** The workspace a path under /admin belongs to (Home when none matches). */
export function workspaceFor(pathname) {
  const hub = /^\/admin\/ws\/([a-z]+)/.exec(String(pathname || ""));   // a workspace's own page (WorkspaceHub.jsx)
  if (hub) return WORKSPACES.find((w) => w.id === hub[1]) || WORKSPACES[0];
  const hit = navItemFor(pathname);
  return WORKSPACES.find((w) => w.id === hit?.group.workspace) || WORKSPACES[0];
}

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
