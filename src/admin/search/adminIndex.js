/* =========================================================
   Global search: every admin page and setting, by name and
   keyword. Built from the sidebar (nav.js) and the texts &
   switches registry (content/registry.js), so a new page or
   switch is searchable as soon as it's there. Pages for
   management only are left out for everyone else, like the
   sidebar does. Settings open their page with ?highlight=<key>
   (AdminShell scrolls to it and flashes it).
========================================================= */
import { CalendarClock, Tag, KeyRound, LayoutGrid, ToggleRight, TicketPlus, UserPlus, BellRing, Hash, Linkedin, MailOpen, MailPlus, Users } from "lucide-react";
import { NAV } from "../nav";
import { REGISTRY, SCOPES } from "../content/registry";
import { score } from "./match";

/* Words staff might type for each page (by its path under /admin), besides its name and section. */
const KEYWORDS = {
  "": ["dashboard", "home", "stats", "summary"],
  people: ["directory", "attendees", "delegates", "contacts", "persons", "vip", "edit person", "delete person", "rsvp status", "exhibitor",
    "opened email", "email opens", "who opened", "posted on linkedin", "linkedin posts", "rsvp form opened",
    "media", "press", "journalist", "staff", "volunteer", "speaker", "person type", "profile colour", "profile color",
    "coupon code", "promo code used", "discount code used"],
  attendees: ["tickets", "ticket holders", "orders", "passes", "hide duplicates", "complimentary ticket", "comp", "missing details", "profile request", "export",
    "coupon code used", "promo code used", "who used a code"],
  "speaker-passes": ["speaker pass", "speakers passes", "run of show", "speaker email", "nudge", "sync speakers"],
  "purchase-email": ["confirmation email", "receipt", "order email", "ticket email"],
  analytics: ["sales", "revenue", "money", "stripe", "refunds"],
  inventory: ["stock", "prices", "pricing", "price change", "capacity", "sold", "promo codes", "discount codes"],
  "check-in": ["scan", "qr", "door", "badge", "scanner"],
  "content/agenda": ["sessions", "schedule", "programme", "program", "running late", "shift times", "stages", "polls", "q&a"],
  "content/speakers": ["speaker list", "bios", "featured speakers", "photos", "headshots"],
  "content/partners": ["partner logos", "organisations", "organizations", "partners page"],
  "content/sponsors": ["featured partners", "paid partners", "sponsor descriptions"],
  "content/alumni-logos": ["our team includes alumni from", "alumni strip"],
  "content/sponsor-marquee": ["scrolling logos", "logo strip"],
  "content/home-sponsors": ["homepage sponsors"],
  "content/settings": ["website options", "homepage sections", "announcement bar", "site-wide", "about page numbers"],
  awards: ["catalyst awards", "nominees", "winners", "shortlist", "awards"],
  "brochure-downloads": ["brochure leads", "downloads", "pdf", "sponsorship brochure"],
  "india-pavilion": ["pavilion", "startup pavilion", "deposits", "applications"],
  "form-submissions": ["forms", "enquiries", "inquiries", "volunteer applications", "speaker applications", "booth enquiry", "sponsor enquiry", "leads"],
  rsvps: ["rsvp", "headcounts", "catering", "dietary", "meals", "luncheons", "gala", "cxo breakfast", "awards night", "duplicates"],
  "marketing/attending": ["i'm attending", "linkedin", "campaign", "share image"],
  "marketing/rsvp-reminders": ["reminder email", "send reminder", "unconfirmed"],
  "issued-passes": ["issue pass", "issue a pass", "give a pass", "free pass", "guest pass", "vip pass", "media pass", "press pass", "volunteer pass", "invite"],
  "exhibitor-passes": ["exhibitors", "booth", "exhibitor manual", "connect pass"],
  app: ["mobile app", "app stats", "usage"],
  "app/people": ["app users", "app accounts", "ban", "messages off", "person types", "types"],
  "app/activity": ["live", "feed", "events", "posts"],
  "app/moderation": ["reports", "held posts", "flagged", "review queue", "remove post"],
  "app/text": ["app copy", "feature switches", "switches", "flags", "texts", "wording"],
  "app/pwa": ["web app", "installs", "install prompt", "home screen"],
  "app/invite": ["app invite", "invite email", "download the app", "web app email", "email everyone", "add to home screen", "app email", "open the ttfc app"],
  "app/rights": ["permissions", "rights matrix", "who can message", "connection requests", "posting", "share contact"],
  "app/broadcast": ["push", "notification", "notify", "announce", "send to everyone", "personal notification"],
  "app/audit": ["history", "log", "who changed", "audit trail"],
  staff: ["team", "admins", "volunteers", "add staff", "management", "access level"],
  "email-tracking": ["opens", "clicks", "bounces", "deliverability"],
  account: ["password", "change password", "my profile", "sign in"],
  "kill-switch": ["offline", "maintenance", "take the site down", "emergency", "turn off website", "turn off app"],
};

/* Things done on a page that people look for by name. */
const ACTIONS = [
  { title: "Give a pass", where: "People & passes › Give a pass", to: "issued-passes", icon: TicketPlus, keywords: ["give someone a pass", "new pass"] },
  { title: "Email everyone to get the web app", where: "Website & app › App invite email", to: "app/invite", icon: MailPlus, keywords: ["app invite", "download the app", "install the app", "web app email"] },
  { title: "Mark someone as Media, VIP, Volunteer or Staff", where: "People & passes › People › their profile", to: "people", icon: Users, keywords: ["media tag", "press", "vip", "volunteer", "staff", "type", "profile colour", "profile color"] },
  { title: "Running late: shift sessions", where: "Website & app › Agenda", to: "content/agenda", icon: CalendarClock, keywords: ["delay", "push back", "move sessions", "late"] },
  { title: "Send RSVP reminder", where: "RSVPs & meals › RSVP reminders", to: "marketing/rsvp-reminders", icon: BellRing, keywords: ["remind", "unconfirmed"] },
  { title: "Who posted on LinkedIn (I'm attending)", where: "People & passes › People", to: "people?attending=posted", icon: Linkedin, keywords: ["linkedin posts", "posted", "shared", "i'm attending"] },
  { title: "Opened the RSVP form, didn't submit", where: "People & passes › People", to: "people?rsvp=form", icon: MailOpen, keywords: ["rsvp form opened", "started rsvp", "email opened", "not opened"] },
  { title: "Add a staff member or volunteer", where: "More › Settings › Staff accounts", to: "staff", icon: UserPlus, management: true, keywords: ["new staff", "invite staff"] },
  { title: "Change my password", where: "Your name (top bar) › My account", to: "account", icon: KeyRound, keywords: ["password"] },
  { title: "Homepage sections (Featured Speakers, Featured Attendees)", where: "Website & app › Website switches", to: "content/settings", highlight: "speakersEnabled", icon: LayoutGrid, keywords: ["speakers section", "attendees carousel", "coming soon"] },
  { title: "About page numbers", where: "Website & app › Website switches", to: "content/settings", highlight: "aboutNumbers", icon: Hash, keywords: ["stats", "1000+ attendees", "figures"] },
  { title: "Promo codes", where: "Sales & emails › Prices & stock", to: "inventory", icon: Tag, keywords: ["discount", "code", "coupon"] },
];

const link = (to, highlight) => `${to ? `/admin/${to}` : "/admin"}${highlight ? `?highlight=${encodeURIComponent(highlight)}` : ""}`;
const groupTitle = (scope, id) => SCOPES[scope]?.groups.find((g) => g.id === id)?.title || "";

/** Every entry: { id, type: "page" | "setting" | "action", title, subtitle, link, icon, management, keywords, description? }. */
export const ADMIN_INDEX = (() => {
  const out = [];
  for (const g of NAV) {
    for (const it of g.items) {
      out.push({
        id: `page:${it.to}`, type: "page", title: it.label, subtitle: g.title || "Staff panel", link: link(it.to), icon: it.icon,
        management: !!it.management, keywords: KEYWORDS[it.to] || [],
      });
    }
  }
  for (const [key, meta] of Object.entries(REGISTRY)) {
    const page = meta.scope === "website" ? "Website switches › Website options" : "App text & switches";
    out.push({
      id: `setting:${key}`, type: "setting", title: meta.label, subtitle: [page, groupTitle(meta.scope, meta.group)].filter(Boolean).join(" › "),
      link: link(meta.scope === "website" ? "content/settings" : "app/text", key), icon: ToggleRight, management: false,
      keywords: [key, meta.type === "switch" ? "switch" : "text"], description: meta.description || "",
    });
  }
  for (const a of ACTIONS) {
    out.push({ id: `action:${a.title}`, type: "action", title: a.title, subtitle: a.where, link: link(a.to, a.highlight), icon: a.icon, management: !!a.management, keywords: a.keywords });
  }
  return out;
})();

/** Pages, settings and actions for this query (best first). Management-only ones only for management. */
export function searchAdminIndex(q, { isManagement = false, limit = 5 } = {}) {
  if (q.tooShort || q.email) return { items: [], total: 0 };
  const hits = [];
  for (const e of ADMIN_INDEX) {
    if (e.management && !isManagement) continue;
    const s = score(q.words, [[e.title, 10], [e.subtitle, 3], [e.keywords.join(" · "), 5], [e.description || "", 1]]);
    if (s) hits.push({ ...e, score: s + (e.type === "page" ? 0.5 : 0) });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return { items: hits.slice(0, limit), total: hits.length };
}
