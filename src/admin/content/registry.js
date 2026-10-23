/* =========================================================
   Every editable text / switch (backend services/adminHelpers.js
   → CONTENT_KEYS), described for non-technical staff. Used by
   Website switches → Website options and App text & switches.
   A setting is on the page its scope says, in its group, in the
   order listed here.

   type:      "switch" | "text" | "email" | "url" | "textarea"
   fallback:  what visitors see when the field is empty (the built-in text)
   emptyHides: an empty value hides the thing instead of using a default
   management: only management may change it (shown disabled with
               "Management only" to staff; the server refuses it too,
               backend services/staffPowers.js)
========================================================= */

export const SCOPES = {
  website: {
    groups: [
      { id: "announce", title: "Announcement bar", hint: "A slim coloured bar across the top of every page of the website." },
      { id: "selling", title: "Selling", hint: "Ticket sales, pass upgrades and the website's install-the-app prompt. Ticket sales and upgrades are management only." },
      { id: "forms", title: "Forms (nominations, volunteers)" },
      { id: "agenda", title: "Agenda" },
      { id: "home", title: "Homepage" },
      { id: "contact", title: "Contact & social links", hint: "Used in the website footer." },
    ],
  },
  app: {
    groups: [
      { id: "signin", title: "Sign-in & welcome" },
      { id: "home", title: "Home screen" },
      { id: "feed", title: "Feed & network" },
      { id: "tickets", title: "Tickets & help" },
      { id: "privacy", title: "Privacy & community" },
      { id: "flags", title: "Feature switches", hint: "Turn parts of the app on or off for everyone. Pass upgrades and the website's install-the-app prompt are under Website switches › Selling." },
    ],
  },
  /* Edited on their own page, Website & app › Swag kit giveaway (admin/app/SwagKit.jsx: times in Toronto, a preview
     and the winners), so they aren't on App text & switches. */
  swag: {
    groups: [
      { id: "swag", title: "Swag kit giveaway", hint: "The top people on the app leaderboard at the cutoff each win a TTFC swag kit. Management only." },
    ],
  },
};

const BUILTIN_SOCIAL = {
  linkedin: "https://www.linkedin.com/company/thetechfestival",
  instagram: "https://www.instagram.com/thetechfestival",
  x: "https://x.com/thetechfestival",
};

export const REGISTRY = {
  /* ---------------- Website ---------------- */
  "site.announcement": {
    scope: "website", group: "announce", type: "text", emptyHides: true,
    label: "Announcement text",
    description: "The message in the bar at the top of every website page. Leave empty to hide the bar.",
    placeholder: "e.g. Early-bird pricing ends Friday",
  },
  "site.announcement_link": {
    scope: "website", group: "announce", type: "url", emptyHides: true,
    label: "Announcement link",
    description: "Optional page the announcement opens when clicked.",
    placeholder: "https://thetechfestival.com/tickets",
  },
  "site.ticket_sales_open": {
    scope: "website", group: "selling", type: "switch", management: true,
    label: "Ticket sales open",
    description: "When off, every “Get your pass” button and the payment step are disabled. Tickets already sold aren't affected.",
  },
  "site.ticket_sales_message": {
    scope: "website", group: "selling", type: "text", management: true,
    label: "Message while sales are paused",
    description: "Shown on the Tickets and Checkout pages when ticket sales are off.",
  },
  // Pass upgrades and the install prompt moved here from App text & switches (Oct 19 2026): the same stored keys.
  "flag.upgrades": {
    scope: "website", group: "selling", type: "switch", management: true,
    label: "Pass upgrades",
    description: "Off: no upgrade offers anywhere (website, web app and apps), and the server refuses upgrade checkouts.",
  },
  "flag.pwaPrompt": {
    scope: "website", group: "selling", type: "switch",
    label: "\"Get the TTFC app\" prompt on the website",
    description: "Shows visitors to thetechfestival.com a \"Get the TTFC app\" pop-up with the App Store and Google Play badges (a QR code to the phone on a computer). The homepage, footer and menu show the badges either way.",
  },
  "site.nominations_open": {
    scope: "website", group: "forms", type: "switch",
    label: "Award nominations open",
    description: "When off, the nomination form on the Awards page is replaced by “Nominations are closed”.",
  },
  // Oct 21 2026 (backend services/awardApplications.js): the Catalyst Awards Applications list in the apps.
  "site.award_applications": {
    scope: "website", group: "forms", type: "switch",
    label: "Show award applications in the app",
    description: "Pass holders see who applied for the Catalyst Awards in the apps and the web app: the nominee's name, title, organisation, location and website, and who applied. Never the categories, contact details or the jury's notes. Off: the Applications entry is hidden; the number of award categories still shows.",
  },
  "site.volunteer_open": {
    scope: "website", group: "forms", type: "switch",
    label: "Volunteer applications open",
    description: "When off, the form on the Volunteer page is replaced by a “closed” message.",
  },
  "site.show_agenda": {
    scope: "website", group: "agenda", type: "switch",
    label: "Show the agenda",
    description: "When off, Agenda disappears from the menu and the agenda pages say “Agenda coming soon”.",
  },
  "site.hero_tagline": {
    scope: "website", group: "home", type: "textarea",
    label: "Homepage introduction",
    description: "The paragraph under the big headline at the top of the homepage.",
    fallback: "Canada's first-of-its-kind, deal-making platform where innovators, buyers, and policymakers turn emerging tech into real partnerships, pilots, and contracts…",
  },
  "site.contact_email": {
    scope: "website", group: "contact", type: "email",
    label: "Contact email",
    description: "The email address linked in the website footer.",
  },
  "site.linkedin_url": {
    scope: "website", group: "contact", type: "url",
    label: "LinkedIn page", description: "Where the LinkedIn icon in the footer goes.", fallback: BUILTIN_SOCIAL.linkedin,
  },
  "site.instagram_url": {
    scope: "website", group: "contact", type: "url",
    label: "Instagram", description: "Where the Instagram icon in the footer goes.", fallback: BUILTIN_SOCIAL.instagram,
  },
  "site.x_url": {
    scope: "website", group: "contact", type: "url",
    label: "X (Twitter)", description: "Where the X icon in the footer goes.", fallback: BUILTIN_SOCIAL.x,
  },
  /* Edited by the Large site files card (cms/LargeSiteFiles.jsx), not as text: scope "files" keeps
     them out of Website options and App text & switches. */
  "site.hero_video_url": { scope: "files", label: "Home page video", description: "" },
  "site.brochure_url": { scope: "files", label: "Brochure PDF", description: "" },

  /* ---------------- App ---------------- */
  "login.tagline": {
    scope: "app", group: "signin", type: "textarea", rows: 2,
    label: "Sign-in screen tagline",
    description: "The line under the TTFC logo on the app's sign-in screen.",
  },
  "welcome.subtitle": {
    scope: "app", group: "signin", type: "text",
    label: "Welcome greeting",
    description: "Shown after someone signs in, followed by their name (e.g. “Glad you're here, Priya.”).",
  },
  "home.announcement": {
    scope: "app", group: "home", type: "text", emptyHides: true,
    label: "Home screen banner",
    description: "A banner at the top of the app's Home screen. Leave empty to hide it.",
    placeholder: "e.g. Doors open at 8:00 AM in the Harbour Ballroom",
  },
  "home.announcement_link": {
    scope: "app", group: "home", type: "url", emptyHides: true,
    label: "Banner link",
    description: "Optional web page that opens when someone taps the Home banner.",
    placeholder: "https://thetechfestival.com/agenda",
  },
  "home.spotlight_title": {
    scope: "app", group: "home", type: "text",
    label: "Spotlight section heading",
    description: "Heading of the personalised “spotlight” section on the Home screen.",
  },
  "home.partners_title": {
    scope: "app", group: "home", type: "text",
    label: "Partners section heading",
    description: "Heading above the partner logos on the Home screen.",
  },
  "schedule.title": {
    scope: "app", group: "home", type: "text",
    label: "Schedule screen title",
    description: "The title at the top of the Schedule screen.",
  },
  "feed.empty": {
    scope: "app", group: "feed", type: "text",
    label: "Empty feed message",
    description: "Shown in the Feed when nobody has posted yet.",
  },
  "network.empty": {
    scope: "app", group: "feed", type: "textarea", rows: 2,
    label: "Empty network message",
    description: "Shown on the Network screen to someone who has no connections yet.",
  },
  "ticket.help": {
    scope: "app", group: "tickets", type: "textarea", rows: 2,
    label: "Ticket help text",
    description: "Helps people add a ticket that was bought with a different email.",
  },
  "support.email": {
    scope: "app", group: "tickets", type: "email",
    label: "Support email",
    description: "The address the app gives people who need help.",
  },
  "privacy.notice": {
    scope: "app", group: "privacy", type: "textarea", rows: 4,
    label: "Privacy notice",
    description: "Explains what the app records. Shown to people when they set up the app.",
  },
  "community.rules": {
    scope: "app", group: "privacy", type: "textarea", rows: 4,
    label: "Community rules",
    description: "The rules people agree to before they post or message.",
  },
  "flag.show_partners": {
    scope: "app", group: "flags", type: "switch",
    label: "Show partners on Home", description: "Shows the partner logos section on the Home screen.",
  },
  "flag.show_news": {
    scope: "app", group: "flags", type: "switch",
    label: "Show news on Home", description: "Shows the tech news section on the Home screen.",
  },
  "flag.allow_posts": {
    scope: "app", group: "flags", type: "switch",
    label: "Allow people to post", description: "Turn off to pause all new posts in the Feed.",
  },
  "flag.allow_groups": {
    scope: "app", group: "flags", type: "switch",
    label: "Allow groups", description: "Turn off to hide community groups in the app.",
  },
  "flag.polls": {
    scope: "app", group: "flags", type: "switch",
    label: "Live polls", description: "Turn off to hide session polls in the app and stop new votes.",
  },
  "flag.qa": {
    scope: "app", group: "flags", type: "switch",
    label: "Audience Q&A", description: "Turn off to hide session Q&A in the app and stop new questions.",
  },

  /* ---------------- Swag kit giveaway (batch 7) ---------------- */
  "swag.enabled": {
    scope: "swag", group: "swag", type: "switch", management: true,
    label: "Giveaway on", description: "Shows the swag kit banner on the app leaderboard, the card in the feed and the rules on /swag. Off by default.",
  },
  "swag.kits": {
    scope: "swag", group: "swag", type: "text", management: true,
    label: "Number of kits", description: "The top this many people on the leaderboard win (1–50).",
  },
  "swag.cutoff": {
    scope: "swag", group: "swag", type: "text", management: true,
    label: "Points count until", description: "When the leaderboard is taken for the winners (Toronto time).",
  },
  "swag.announce": {
    scope: "swag", group: "swag", type: "text", management: true,
    label: "Winners told at", description: "The end of Day 1: when the apps say the winners are out (Toronto time). Winners are told when management clicks Announce winners.",
  },
  "swag.title": {
    scope: "swag", group: "swag", type: "text", management: true,
    label: "Giveaway title", description: "In the apps' banner and feed card, on /swag and in the email.",
  },
  "swag.rules": {
    scope: "swag", group: "swag", type: "textarea", rows: 6, management: true,
    label: "Giveaway rules", description: "On /swag. {kits}, {cutoff} and {announce} are filled in.",
  },
};

/* Not shown anywhere in the panel (Oct 19 2026): the web app's guest offer (APP50), five settings that were
   listed under "Other" with no explanation. Promotions are banned, so they're gone from App text & switches;
   their stored values stay as they are, and the server refuses switching the offer on for anyone. */
export const HIDDEN_KEYS = new Set([
  "flag.guestOffer", "offer.guest_code", "offer.guest_discount", "offer.guest_ends", "offer.guest_passes",
]);

/** Scope for a key that isn't in the registry yet (keeps new backend keys editable). */
export const scopeOf = (key) => REGISTRY[key]?.scope || (key.startsWith("site.") ? "website" : "app");

/** Readable label for an unknown key, so raw keys are never shown. */
export const humanize = (key) => {
  const last = key.split(".").pop().replace(/_/g, " ");
  return last.charAt(0).toUpperCase() + last.slice(1);
};

export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
