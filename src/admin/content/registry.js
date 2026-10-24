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
   prefill:   (multi-line lists) the box starts with the default text, to edit in place
========================================================= */

export const SCOPES = {
  website: {
    groups: [
      { id: "announce", title: "Announcement bar", hint: "A slim coloured bar across the top of every page of the website." },
      { id: "selling", title: "Selling", hint: "Ticket sales and pass upgrades (management only)." },
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
      { id: "flags", title: "Feature switches", hint: "Turn parts of the app on or off for everyone. Pass upgrades are under Website switches › Selling." },
    ],
  },
  /* "Stay updated" (Oct 23 2026): the TTFC 2027 waitlist page (website /stay-updated, the web app's
     /app/stay-updated) and the "You're on the TTFC 2027 waitlist" email. Edited on their own page, Sales & emails ›
     2027 waitlist › Wording (admin/leads/Waitlist2027.jsx). Any staff. */
  stay: {
    groups: [
      { id: "stay-page", title: "The page: top and search results", hint: "thetechfestival.com/stay-updated and the same screen in the web app. Only say what's true: no 2027 dates, venue or numbers until they're announced. The map and its stops are on the 2027 journey tab." },
      { id: "stay-form", title: "The page: the waitlist form" },
      { id: "stay-email", title: "The email people get", hint: "Sent from enquire@ when someone joins (at most once a day per address, never to anyone who unsubscribed). Their ticks, the app badges and the footer are added for you." },
    ],
  },
  /* The 2027 journey's heading and introduction (Oct 23 2026): shown on Sales & emails › 2027 waitlist › 2027 journey
     (admin/leads/JourneyEditor.jsx) above its stops editor. The stops themselves (stay.journey, a JSON list) have
     their own editor there: their scope "journey-stops" isn't a settings page. Any staff. */
  journey: {
    groups: [
      { id: "journey-text", title: "Heading and introduction", hint: "Above the map on thetechfestival.com/stay-updated and in the web app. No dates, venues or numbers until they're announced." },
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
  // Pass upgrades moved here from App text & switches (Oct 19 2026): the same stored key.
  "flag.upgrades": {
    scope: "website", group: "selling", type: "switch", management: true,
    label: "Pass upgrades",
    description: "Off: no upgrade offers anywhere (website, web app and apps), and the server refuses upgrade checkouts.",
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
  // The store prompt (Oct 24 2026): was the website's "Get the TTFC app" pop-up (Website switches › Selling); the
  // website has none now, the web app has this one (src/app/lib/storePrompt.js). The same stored key and value.
  "flag.pwaPrompt": {
    scope: "app", group: "flags", type: "switch",
    label: "Prompt web app users to get the store app",
    description: "People using the web app (thetechfestival.com/app) on a phone or tablet see \"Get the TTFC app\" once per visit, after a few seconds on Home or another main screen: the App Store on an iPhone or iPad, Google Play on Android. \"Not now\" hides it for a week. Never on the website, never in the iPhone or Android app, and never for people who opened a page from those apps.",
  },

  /* ---------------- Stay updated: the TTFC 2027 waitlist ---------------- */
  "stay.seo_title": {
    scope: "stay", group: "stay-page", type: "text",
    label: "Browser tab and search title", description: "The page's title in the browser tab, in Google and when the link is shared.",
  },
  "stay.seo_description": {
    scope: "stay", group: "stay-page", type: "textarea", rows: 2,
    label: "Search description", description: "The short description under the title in Google and in link previews (about 150 characters).",
  },
  "stay.eyebrow": {
    scope: "stay", group: "stay-page", type: "text",
    label: "Small label above the headline", description: "The pill at the very top of the page.",
  },
  "stay.hero_title": {
    scope: "stay", group: "stay-page", type: "text",
    label: "Headline", description: "Parts separated by “ · ”: the first is the big gradient text, the rest the line under it.",
  },
  "stay.hero_intro": {
    scope: "stay", group: "stay-page", type: "textarea", rows: 3,
    label: "Introduction", description: "The paragraph under the headline.",
  },
  "stay.journey_title": {
    scope: "journey", group: "journey-text", type: "text",
    label: "Heading", description: "Above the map of Canada and the stops.",
  },
  "stay.journey_intro": {
    scope: "journey", group: "journey-text", type: "textarea", rows: 3,
    label: "Introduction", description: "One or two sentences under the heading.",
  },
  "stay.journey": {
    scope: "journey-stops", group: "journey-stops", type: "json",
    label: "2027 journey: the stops", description: "The map's stops: month, city, briefing or festival, focus (technology pillar × sector), date, venue. Edited on Sales & emails › 2027 waitlist › 2027 journey.",
  },
  "stay.form_title": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Form heading", description: "Heading of the waitlist form.",
  },
  "stay.form_intro": {
    scope: "stay", group: "stay-form", type: "textarea", rows: 2,
    label: "Form introduction", description: "The line under the form heading.",
  },
  "stay.field_name": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Name field label", description: "The label above the name box (the first box; optional: the page adds “(optional)”).",
  },
  "stay.field_company": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Company field label", description: "The label above the company or organisation box (optional: the page adds “(optional)”).",
  },
  "stay.field_email": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Email field label", description: "The label above the email box (the only required box).",
  },
  "stay.field_phone": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Phone field label", description: "The label above the phone box (optional: the page adds “(optional)”).",
  },
  "stay.interests_label": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Tick boxes heading", description: "Above the three tick boxes. Nothing ticked means they want to attend.",
  },
  "stay.interest_sponsorship": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Tick box: sponsorship", description: "Also how the email to the person names it.",
  },
  "stay.interest_exhibitor": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Tick box: exhibiting", description: "Also how the email to the person names it.",
  },
  "stay.interest_delegation": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Tick box: delegation", description: "Also how the email to the person names it.",
  },
  "stay.consent": {
    scope: "stay", group: "stay-form", type: "textarea", rows: 2,
    label: "Consent line", description: "Under the form. A “Privacy Policy” link is always added after it.",
  },
  "stay.button": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Button", description: "The form's button, and the button at the top of the page.",
  },
  "stay.thanks_title": {
    scope: "stay", group: "stay-form", type: "text",
    label: "Thank-you heading", description: "Shown in place of the form once someone has joined.",
  },
  "stay.thanks": {
    scope: "stay", group: "stay-form", type: "textarea", rows: 2,
    label: "Thank-you message", description: "Under the thank-you heading, on the website, in the web app and in the apps.",
  },
  "stay.email_subject": {
    scope: "stay", group: "stay-email", type: "text",
    label: "Subject", description: "The subject of the email people get when they join.",
  },
  "stay.email_heading": {
    scope: "stay", group: "stay-email", type: "text",
    label: "Heading", description: "The big line at the top of the email.",
  },
  "stay.email_intro": {
    scope: "stay", group: "stay-email", type: "textarea", rows: 2,
    label: "Thank you", description: "The paragraph under the heading.",
  },
  "stay.email_next": {
    scope: "stay", group: "stay-email", type: "text",
    label: "What happens next", description: "Under “What you asked about” (their ticks, or “Attending TTFC 2027”).",
  },
  "stay.email_button": {
    scope: "stay", group: "stay-email", type: "text",
    label: "Button", description: "Opens thetechfestival.com/stay-updated.",
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
export const scopeOf = (key) => REGISTRY[key]?.scope || (key.startsWith("site.") ? "website" : key.startsWith("stay.") ? "stay" : "app");

/** Readable label for an unknown key, so raw keys are never shown. */
export const humanize = (key) => {
  const last = key.split(".").pop().replace(/_/g, " ");
  return last.charAt(0).toUpperCase() + last.slice(1);
};

export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
export const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
