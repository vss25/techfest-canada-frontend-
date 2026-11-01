/* =========================================================
   Search engines and link previews (Oct 31 2026): every public
   page's title (60 characters at most), description (160 at most),
   canonical address, H1, a short intro and its key links, in one
   place. Two readers:
     - the build (src/seo/prerender.mjs, run from vite.config.js)
       writes each page's own HTML file and sitemap.xml from this,
       so crawlers and link previews that don't run JavaScript see
       the right page (before, every address served the home page's
       head, with a canonical pointing every page at the home page);
     - in the browser, <RouteSeo> (src/seo/RouteSeo.jsx) applies
       the same on every navigation, and the speaker and winner
       pages fill in theirs once their data has loaded.
   The text is the pages' own (read from each page on Oct 31 2026):
   no 2027 dates or venue, no numbers or claims the site doesn't
   make. Duplicates keep their page but point their canonical at
   the main one and stay out of the sitemap: /about (the home
   page's About section on its own) and /sponsors (the old
   "2026 Partners" placeholder; the list is /partners2026).
   Every route in App.jsx is here, in NOINDEX_ROUTES or REDIRECTS,
   or one of the two the test leaves out (src/seo/routes.test.mjs).
   Pure: no React, no browser APIs (Node imports it too).
========================================================= */

import { normalizeSpeakerSlug, speakerSlug } from "./slug.js";

export const SITE = "https://www.thetechfestival.com";
export const SITE_NAME = "The Tech Festival Canada";
export const INDEX_ROBOTS = "index, follow, max-image-preview:large";
export const NOINDEX_ROBOTS = "noindex, nofollow";
/** A page that isn't there (unknown address, speaker or award): out of the index, its links still followed. */
export const NOT_FOUND_ROBOTS = "noindex";
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;

/** The site's share card (index.html's og:image), the 2026 one until the owner has a 2027 card. */
export const DEFAULT_IMAGE = Object.freeze({
  url: `${SITE}/og-image-2026.png`,
  width: 1200,
  height: 630,
  alt: "The Tech Festival Canada, 26–27 October 2026, Westin Harbour Castle, Toronto",
});

const EVENT_LINE = "The Tech Festival Canada 2026, The Westin Harbour Castle, Toronto";

/* The public pages. name: the breadcrumb's label; canonical: a duplicate's main page (prerendered, not in the
   sitemap); links: [address, text] for the crawler outline. */
export const PAGES = [
  {
    path: "/", name: "Home",
    title: "The Tech Festival Canada (TTFC) | Toronto",
    description: "Canada's deal-making platform where innovators, buyers and policymakers turn emerging tech into partnerships, pilots and contracts. See you in 2027.",
    h1: "The Tech Festival Canada",
    intro: "TTFC 2026 has ended. Thank you for being part of it! See you in 2027. The Tech Festival Canada is a deal-making platform where innovators, buyers, and policymakers turn emerging tech into real partnerships, pilots, and contracts.",
    links: [["/stay-updated", "Stay updated for 2027"], ["/awards", "Catalyst Awards 2026 winners"], ["/speakers", "TTFC 2026 speakers"], ["/programme", "The programme"]],
  },
  {
    path: "/stay-updated", name: "Stay updated for 2027",
    title: "Stay Updated for TTFC 2027 | The Tech Festival Canada",
    // = src/lib/stayUpdated.js STAY_DEFAULTS (its title is 61 characters, so a shorter one here).
    description: "TTFC 2027 across Canada: one-day briefings in Vancouver, Montreal, Calgary, Toronto and Ottawa, then two days in Toronto in November 2027. Join the waitlist.",
    h1: "TTFC 2027 · Toronto · November 2027",
    intro: "TTFC 2027 travels across Canada: five focused one-day briefings in Vancouver, Montreal, Calgary, Toronto and Ottawa, then The Tech Festival Canada, two days in Toronto in November 2027. Dates to be announced for every event. Join the waitlist and our team will keep you posted.",
    links: [["/awards", "Catalyst Awards 2026 winners"], ["/speakers", "TTFC 2026 speakers"], ["/contact", "Contact us"]],
  },
  {
    path: "/awards", name: "Catalyst Awards",
    title: "Catalyst Awards 2026 Winners | The Tech Festival Canada",
    description: "The winners of the Catalyst Awards 2026, announced at the Catalyst Awards Gala Night on 26 October 2026 at The Tech Festival Canada in Toronto.",
    h1: "You Have Earned This Moment.",
    // The build adds "The results are out…" and the list when the winners are on show (src/seo/prerender.mjs).
    intro: "The Catalyst Awards honour the pioneers transforming industries through technology: 25 core categories across the 5x5 pillar-sector matrix, plus 3 special recognition awards.",
    links: [["/stay-updated", "Stay updated for 2027"], ["/speakers", "TTFC 2026 speakers"]],
  },
  {
    path: "/speakers", name: "Speakers",
    title: "TTFC 2026 Speakers | The Tech Festival Canada",
    description: "Meet the speakers of The Tech Festival Canada 2026: industry leaders, innovators and pioneers shaping the future of technology in Canada and beyond.",
    h1: "Meet Our Speakers",
    intro: "Industry leaders, innovators, and pioneers shaping the future of technology in Canada and beyond.",
    links: [["/agenda", "The agenda"], ["/programme", "The programme"]],
  },
  {
    path: "/agenda", name: "Agenda",
    title: "TTFC 2026 Agenda | The Tech Festival Canada",
    description: "The TTFC 2026 agenda: two days of keynotes, fireside chats, panels and networking, organised around five technology pillars and five applied sectors.",
    h1: "The Agenda",
    intro: "Two days of keynotes, fireside chats, panels, and networking, organised around five technology pillars and five applied sectors. 26–27 October 2026 at The Westin Harbour Castle, Toronto.",
    links: [["/programme", "The programme at a glance"], ["/speakers", "The speakers"], ["/venue", "The venue"]],
  },
  {
    path: "/programme", name: "Programme",
    // = Programme.jsx SEO_TITLE / SEO_DESCRIPTION (the page also sets them itself).
    title: "TTFC 2026 Programme at a Glance | The Tech Festival Canada",
    description: "Key times, the agenda, speakers and exhibitors of The Tech Festival Canada, October 26–27, 2026 at The Westin Harbour Castle, Toronto.",
    h1: "The Programme",
    intro: "Two days at The Westin Harbour Castle, Toronto: the key times, the sessions, the speakers and the exhibitors, on one page.",
    links: [["/agenda", "The full agenda"], ["/speakers", "The speakers"], ["/venue", "The venue"]],
  },
  {
    path: "/venue", name: "Venue",
    title: "Venue: The Westin Harbour Castle | TTFC 2026",
    description: "The Westin Harbour Castle at 1 Harbour Square on Toronto's waterfront: the official venue of The Tech Festival Canada 2026, held on 26–27 October 2026.",
    h1: "The Westin Harbour Castle",
    intro: "The official venue of TTFC 2026 (26–27 October 2026): The Westin Harbour Castle, 1 Harbour Square, Toronto, ON M5J 1A6, on the Lake Ontario waterfront.",
    links: [["/programme", "The programme"], ["/contact", "Contact us"]],
  },
  {
    path: "/contact", name: "Contact",
    title: "Contact Us | The Tech Festival Canada",
    description: "Questions about your pass, the TTFC app or the festival? Email enquire@thetechfestival.com, or write to our sponsorship and media teams.",
    h1: "Contact us",
    intro: "Questions about your pass, the app or the festival? Write to the team at enquire@thetechfestival.com and we'll get back to you.",
    links: [["mailto:enquire@thetechfestival.com", "enquire@thetechfestival.com"], ["/venue", "The venue"], ["/privacy", "Privacy Policy"]],
  },
  {
    path: "/sponsor", name: "Sponsor",
    title: "Sponsor TTFC | The Tech Festival Canada",
    description: "Sponsorship at The Tech Festival Canada: branding, networking and thought-leadership opportunities for companies leading in emerging technologies.",
    h1: "Partner With Us To Lead The Future",
    intro: "The Tech Festival Canada's sponsorship packages provide branding, networking, and thought-leadership opportunities for companies showcasing their leadership in emerging technologies.",
    links: [["/exhibit", "Exhibit"], ["/partners2026", "2026 Partners"], ["/brochures", "Download the brochure"], ["/contact", "Contact us"]],
  },
  {
    path: "/partners2026", name: "2026 Partners",
    title: "TTFC 2026 Partners | The Tech Festival Canada",
    description: "The government bodies, industry associations, academic institutions, enterprise partners and international trade organisations involved in TTFC 2026.",
    h1: "Institutions Involved",
    intro: "The Tech Festival Canada is supported by a growing network of government bodies, industry associations, academic institutions, enterprise partners, and international trade organisations.",
    links: [["/sponsor", "Sponsor"], ["/exhibit", "Exhibit"], ["/contact", "Contact us"]],
  },
  {
    path: "/sponsors", name: "2026 Partners", canonical: "/partners2026",
    title: "2026 Partners | The Tech Festival Canada",
    description: "The partners of The Tech Festival Canada 2026: the full list of the institutions involved is on the 2026 Partners page.",
    h1: "2026 Partners",
    intro: "The full list of the institutions involved in TTFC 2026 is on the 2026 Partners page.",
    links: [["/partners2026", "2026 Partners"], ["/sponsor", "Sponsor"]],
  },
  {
    path: "/exhibit", name: "Exhibit",
    title: "Exhibit at TTFC | The Tech Festival Canada",
    description: "Exhibiting at The Tech Festival Canada: visibility in front of a high-value audience, direct conversations, qualified leads and launching solutions.",
    h1: "Exhibit With Us",
    intro: "Put your brand at the centre of Canada's most important technology conversations. Exhibiting is about creating direct conversations, building market credibility, launching solutions and generating qualified leads.",
    links: [["/exhibit/india-pavilion", "India Startup Pavilion"], ["/sponsor", "Sponsor"], ["/brochures", "Download the brochure"]],
  },
  {
    path: "/exhibit/india-pavilion", name: "India Startup Pavilion",
    title: "India Startup Pavilion | The Tech Festival Canada",
    description: "The India Startup Pavilion application: subsidised booths for Indian-incorporated startups at The Tech Festival Canada 2026 in Toronto.",
    h1: "India Startup Pavilion Application",
    intro: "Subsidised booths for Indian-incorporated startups at The Tech Festival Canada 2026. The application deadline was September 30, 2026.",
    links: [["/exhibit", "Exhibit"]],
  },
  {
    path: "/organizers", name: "Organizers",
    title: "Meet the Organizers | The Tech Festival Canada",
    description: "The Tech Festival Canada is produced by AtlasLink Markets Inc., a Canadian-incorporated business intelligence and strategy advisory firm.",
    h1: "Meet the Organizers",
    intro: "The Tech Festival Canada is produced by AtlasLink Markets Inc., a Canadian-incorporated business intelligence and strategy advisory firm translating signal into decisions, and decisions into measurable commercial outcomes.",
    links: [["https://www.atlaslinkmarkets.com/", "AtlasLink Markets"], ["/contact", "Contact us"]],
  },
  {
    path: "/media", name: "Media",
    title: "Media Accreditation | The Tech Festival Canada",
    description: "Request press access to The Tech Festival Canada: tell the team who you write for and what you cover. TTFC 2026 was held on 26–27 October in Toronto.",
    h1: "Media Accreditation",
    intro: "Request press access to The Tech Festival Canada. Tell us who you write for and what you cover, and our team will be in touch.",
    links: [["/contact", "Contact us"]],
  },
  {
    path: "/volunteer", name: "Volunteer",
    title: "Volunteer at TTFC | The Tech Festival Canada",
    description: "Volunteer at The Tech Festival Canada: a limited number of volunteer spots to contribute your time and experience the event from the inside.",
    h1: "Be Part of Something Big",
    intro: "We have a limited number of volunteer spots: contribute your time and experience The Tech Festival Canada from the inside.",
    links: [["/stay-updated", "Stay updated for 2027"], ["/contact", "Contact us"]],
  },
  {
    path: "/brochures", name: "Brochure",
    title: "Download the Brochure | The Tech Festival Canada",
    description: "Download The Tech Festival Canada brochure: the sponsorship prospectus, delegate categories and partnership opportunities.",
    h1: "Download the Brochure",
    intro: "Get the full sponsorship prospectus, delegate categories, and partnership opportunities.",
    links: [["/sponsor", "Sponsor"], ["/exhibit", "Exhibit"]],
  },
  {
    path: "/resources", name: "First-timer's guide",
    title: "First-Timer's Guide | The Tech Festival Canada",
    description: "New to The Tech Festival Canada? What to expect and how to get the most value from the experience: clearer decisions, faster partnerships, real momentum.",
    h1: "Welcome to The Tech Festival Canada",
    intro: "If this is your first time, here is what to expect and how to get the most value from the experience. This is built for outcomes: clearer decisions, faster partnerships, and real momentum after the event.",
    links: [["/programme", "The programme"], ["/venue", "The venue"]],
  },
  {
    path: "/tickets", name: "Tickets",
    title: "Passes and Tickets | The Tech Festival Canada",
    description: "Passes for The Tech Festival Canada. TTFC 2026 has ended: join the TTFC 2027 list to hear the moment early bird prices go live.",
    h1: "See You Soon",
    intro: "TTFC 2026 has ended. Join the TTFC 2027 list and we'll tell you the moment early bird prices go live.",
    links: [["/stay-updated", "Get early bird alerts"]],
  },
  {
    path: "/privacy", name: "Privacy",
    title: "Privacy Policy and Terms | The Tech Festival Canada",
    description: "How AtlasLink Markets Inc. handles personal information on thetechfestival.com and in the TTFC app: privacy policy, terms of use and cookie policy.",
    h1: "Privacy Policy",
    intro: "The privacy policy, terms of use, the TTFC app's privacy and terms, and the cookie policy of thetechfestival.com, organized by AtlasLink Markets Inc.",
    links: [["/contact", "Contact us"]],
  },
  {
    path: "/about", name: "About", canonical: "/",
    title: "About The Tech Festival Canada | TTFC",
    description: "The Tech Festival Canada's 5 tech pillars, showcased through 5 applied sectors: how technology gets deployed, scaled and procured in Canada.",
    h1: "About The Tech Festival Canada",
    intro: "The Tech Festival Canada's 5 tech pillars aren't discussed in isolation. They're showcased through 5 applied sectors where the demand is urgent and budgets are real.",
    links: [["/", "Home"], ["/agenda", "The agenda"]],
  },
];

/** The links every crawler outline ends with (the menus only mount their links after a click). */
export const SITE_LINKS = [
  ["/", "Home"], ["/stay-updated", "Stay updated for 2027"], ["/awards", "Catalyst Awards"], ["/speakers", "Speakers"],
  ["/agenda", "Agenda"], ["/programme", "Programme"], ["/partners2026", "2026 Partners"], ["/sponsor", "Sponsor"],
  ["/exhibit", "Exhibit"], ["/venue", "Venue"], ["/organizers", "Organizers"], ["/media", "Media"],
  ["/volunteer", "Volunteer"], ["/brochures", "Brochure"], ["/contact", "Contact"], ["/privacy", "Privacy"],
];

/* Never indexed (vercel.json sends X-Robots-Tag for them too; several pages also set their own robots tag).
   ":x" is one part of the address, "*" the rest, if any (as in React Router). Unlisted pages with their own
   address aren't named here. */
export const NOINDEX_ROUTES = [
  "/admin/*", "/admin-login", "/auth-success", "/reset-password/:token", "/tickets/checkout",
  "/exhibit/india-pavilion/pay", "/complete-profile", "/app-login", "/rsvp", "/attending", "/share/linkedin",
  "/swag", "/rate", "/survey", "/linkedin", "/awards/jury-admin/*",
];

/** Old addresses → where they end up (vercel.json: permanent redirects; App.jsx keeps them working in the browser). */
export const REDIRECTS = Object.freeze({
  "/first-timers": "/",
  "/briefings": "/",
  "/dashboard": "/",
  "/kyc": "/",
  "/on-demand": "/resources",
  "/awards/nominations": "/awards",
});

/** The pages with one file per item, written by the build from live data. */
export const DYNAMIC_ROUTES = ["/speakers/:slug", "/awards/winners/:id"];

const BY_PATH = new Map(PAGES.map((p) => [p.path, p]));

/* ---------- addresses ---------- */

/** "/Awards/?embed=1#x" → "/awards": lowercase, no query or fragment, no trailing slash ("/" stays). */
export function cleanPath(path) {
  const p = String(path || "/").split(/[?#]/)[0].toLowerCase().replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return p.startsWith("/") ? p || "/" : `/${p}`;
}

/** The canonical URL of an address: always https://www., then cleanPath ("/" for the home page). */
export const canonicalUrl = (path) => `${SITE}${cleanPath(path)}`;

/** A route pattern ("/admin/*", "/reset-password/:token") against a clean path. */
export function matchRoute(pattern, path) {
  const want = pattern.split("/");
  const got = cleanPath(path).split("/");
  for (let i = 0; i < want.length; i++) {
    if (want[i] === "*") return true;
    if (i >= got.length) return false;
    if (want[i].startsWith(":")) { if (!got[i]) return false; continue; }
    if (want[i] !== got[i]) return false;
  }
  return want.length === got.length;
}

export const isNoindexPath = (path) => NOINDEX_ROUTES.some((r) => matchRoute(r, path));
/** As src/lib/awardWinners.js isWinnerId (that file reads import.meta.env, which Node has not). */
export const isWinnerId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

/* ---------- small text helpers ---------- */

/** Spaces tidied: "Ernst & Young , Canada " → "Ernst & Young, Canada". */
export const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").trim();

/** At most `max` characters, cut at a word with "…". */
export function clip(text, max) {
  const t = tidy(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** A name's closing full stop off ("… R&D center." → "… R&D center"), not an abbreviation's ("Inc."). */
const endDot = (s) => (/\b(?:inc|ltd|corp|co|llc|plc|jr|sr)\.$/i.test(s) ? s : s.replace(/\.$/, ""));

/** The first of these that fits in `max`, else the last one clipped. */
const firstFit = (max, ...options) => options.find((o) => o.length <= max) ?? clip(options.at(-1), max);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-10-26" → "26 October 2026" (as src/lib/awardWinners.js longDate). */
export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : "";
}

/* ---------- breadcrumbs and structured data ---------- */

/** [{ path, name }] from Home to the page (nested pages through their parents). */
export function breadcrumbsFor(path, lastName) {
  const clean = cleanPath(path);
  const crumbs = [{ path: "/", name: "Home" }];
  if (clean === "/") return crumbs;
  const parts = clean.split("/").slice(1);
  for (let i = 1; i <= parts.length; i++) {
    const p = `/${parts.slice(0, i).join("/")}`;
    const page = BY_PATH.get(p);
    if (i === parts.length) crumbs.push({ path: p, name: lastName || page?.name || p });
    else if (page) crumbs.push({ path: p, name: page.name });
  }
  return crumbs;
}

export const breadcrumbJsonLd = (crumbs) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: canonicalUrl(c.path) })),
});

/** One page's JSON-LD, or null: { @context, @graph }. */
export const jsonLd = (...items) => (items.filter(Boolean).length ? { "@context": "https://schema.org", "@graph": items.filter(Boolean) } : null);

/** Breadcrumb JSON-LD only on nested pages (Home › Exhibit › India Startup Pavilion), not on one-level ones. */
const nestedCrumbs = (crumbs) => (crumbs.length > 2 ? breadcrumbJsonLd(crumbs) : null);

/* ---------- one record per page ---------- */

/** What a static page puts in the head: { title, description, canonical, robots, image, jsonLd, …the page }. */
export function pageMeta(page) {
  const crumbs = breadcrumbsFor(page.path);
  return {
    ...page,
    url: canonicalUrl(page.path),
    canonical: canonicalUrl(page.canonical || page.path),
    robots: INDEX_ROBOTS,
    image: DEFAULT_IMAGE,
    crumbs,
    jsonLd: jsonLd(nestedCrumbs(crumbs)),
    sitemap: !page.canonical,
  };
}

/** A Sanity image's original file (no size or quality parameters): { url, width, height } or null. */
export function sanityImage(image, project = "021qtoci", dataset = "production") {
  const m = /^image-([a-f0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/i.exec(String(image?.asset?._ref || ""));
  if (!m) return null;
  return { url: `https://cdn.sanity.io/images/${project}/${dataset}/${m[1]}-${m[2]}x${m[3]}.${m[4]}`, width: +m[2], height: +m[3] };
}

const linkedinUrl = (u) => (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company|pub)\/[^\s"<>]+$/i.test(String(u || "").trim()) ? String(u).trim() : null);

/** A speaker (Sanity: name, title, company, bio, linkedin, image) → their page's head and outline. */
export function speakerMeta(doc) {
  const name = tidy(doc?.name);
  const slug = speakerSlug(name);
  const path = `/speakers/${slug}`;
  const role = tidy(doc?.title);
  const company = tidy(doc?.company);
  const bio = tidy(doc?.bio);
  const photo = sanityImage(doc?.image);
  const url = canonicalUrl(path);
  const crumbs = breadcrumbsFor(path, name);
  const about = [role, company].filter(Boolean).join(", ");
  return {
    path, slug, name, about, url, canonical: url, crumbs,
    title: firstFit(TITLE_MAX, `${name}, ${company} | TTFC 2026 Speaker`, `${name} | TTFC 2026 Speaker`, name),
    description: clip(bio || `${name}${about ? `, ${about}` : ""}: a speaker at The Tech Festival Canada 2026 in Toronto.`, DESCRIPTION_MAX),
    h1: name,
    intro: [endDot(about), bio].filter(Boolean).join(". "),
    robots: INDEX_ROBOTS,
    image: photo ? { ...photo, alt: name } : DEFAULT_IMAGE,
    jsonLd: jsonLd(breadcrumbJsonLd(crumbs), {
      "@type": "Person",
      name,
      url,
      ...(role && { jobTitle: role }),
      ...(company && { worksFor: { "@type": "Organization", name: company } }),
      ...(photo && { image: photo.url }),
      ...(bio && { description: clip(bio, 300) }),
      ...(linkedinUrl(doc?.linkedin) && { sameAs: [linkedinUrl(doc.linkedin)] }),
    }),
    links: [["/speakers", "All speakers"], ["/agenda", "The agenda"]],
  };
}

/** A Catalyst Awards winner (GET /api/awards/winners) → their page's head and outline. */
export function winnerMeta(w) {
  const id = String(w?.id || "").toLowerCase();
  const path = `/awards/winners/${id}`;
  const shown = tidy(w?.presentedTo);
  const who = endDot(shown);
  const company = w?.showCompany ? endDot(tidy(w?.company)) : "";
  const award = tidy(w?.award);
  const pillar = tidy(w?.pillar);
  const recipient = company ? `${who} (${company})` : who;
  const date = longDate(w?.presentedOn);
  const url = canonicalUrl(path);
  const crumbs = breadcrumbsFor(path, who);
  const citation = tidy(w?.citation);
  return {
    path, id, url, canonical: url, crumbs,
    // The pillar when it fits: one person can win in two pillars (two pages, two titles).
    title: firstFit(TITLE_MAX, ...(pillar ? [`${who} | ${pillar}, Catalyst Awards 2026`] : []),
      `${who} | Catalyst Awards 2026 Winner`, `${who} | Catalyst Awards 2026`, `${clip(who, TITLE_MAX - 23)} | Catalyst Awards 2026`),
    description: firstFit(DESCRIPTION_MAX,
      `${recipient} received ${award} at The Tech Festival Canada 2026 in Toronto.`,
      `${recipient} received ${award} at TTFC 2026 in Toronto.`,
      `${who} received ${award} at TTFC 2026.`),
    h1: shown,
    intro: `${award}, presented to ${company ? `${shown}, ${company}` : shown}${date ? ` on ${date}` : ""} at ${EVENT_LINE}.${citation ? ` “${citation}”` : ""}`,
    award,
    robots: INDEX_ROBOTS,
    image: DEFAULT_IMAGE,
    jsonLd: jsonLd(breadcrumbJsonLd(crumbs)),
    links: [["/awards", "All the Catalyst Awards 2026 winners"]],
  };
}

/**
 * The head for an address in the browser (<RouteSeo>), before a page adds its own:
 * a page → its record; an old address → where it goes; a speaker or winner → a placeholder with the right canonical;
 * a noindex page → noindex, no canonical (its title is the page's own); anything else → null (no canonical).
 */
export function seoForPath(pathname) {
  const path = cleanPath(pathname);
  if (REDIRECTS[path]) return seoForPath(REDIRECTS[path]);
  const page = BY_PATH.get(path);
  if (page) {
    const m = pageMeta(page);
    return { title: m.title, description: m.description, canonical: m.canonical, robots: m.robots, image: m.image, jsonLd: m.jsonLd };
  }
  if (isNoindexPath(path)) return { canonical: null, robots: NOINDEX_ROBOTS, jsonLd: null };
  const speaker = /^\/speakers\/([^/]+)$/.exec(path);
  if (speaker && normalizeSpeakerSlug(speaker[1])) {
    const list = pageMeta(BY_PATH.get("/speakers"));
    return {
      title: `TTFC 2026 Speaker | ${SITE_NAME}`, description: list.description,
      canonical: canonicalUrl(`/speakers/${normalizeSpeakerSlug(speaker[1])}`), robots: INDEX_ROBOTS, image: DEFAULT_IMAGE, jsonLd: null,
    };
  }
  const winner = /^\/awards\/winners\/([^/]+)$/.exec(path);
  if (winner && isWinnerId(winner[1])) {
    const list = pageMeta(BY_PATH.get("/awards"));
    return {
      title: `Catalyst Awards 2026 Winner | ${SITE_NAME}`, description: list.description,
      canonical: canonicalUrl(path), robots: INDEX_ROBOTS, image: DEFAULT_IMAGE, jsonLd: null,
    };
  }
  return null;
}
