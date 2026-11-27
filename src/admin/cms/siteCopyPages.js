import { CITY_EVENT, PAGE_PATH, cityPath } from "../../redesign/approved/liveShared";

/* The website's pages, for Website text & media's page menu (SiteCopy.jsx). Any other page can be
   reached with Browse inside the preview; this is the list people start from. */

const CITY_NAME = { van: "Vancouver Briefing", mtl: "Montreal Briefing", cgy: "Calgary Briefing", tob: "Toronto Briefing", ott: "Ottawa Briefing", tor: "Toronto Main Event" };
const PAGE_NAME = {
  exhibitors: "Exhibitors", venue: "Venue", faqs: "FAQs", exhibit: "Exhibit with us", partner: "Become a partner", speak: "Speak",
  media: "Media", volunteer: "Volunteer", about: "About", news: "News", contact: "Contact", app: "The app",
};

export const SITE_PAGES = [
  { group: "Main pages", items: [
    ["/", "Home"], ["/tickets", "Tickets"], ["/speakers", "Speakers"], ["/partners", "Partners"],
    ["/awards", "Awards"], ["/highlights/2026", "Toronto 2026 highlights"],
  ] },
  { group: "Event pages", items: Object.keys(CITY_EVENT).flatMap((id) => [
    [cityPath(id), `${CITY_NAME[id]} ${CITY_EVENT[id].year}`],
    [`${cityPath(id)}/tickets`, `${CITY_NAME[id]} ${CITY_EVENT[id].year}: ticket panel`],
  ]) },
  { group: "More pages", items: Object.keys(PAGE_PATH).map((k) => [PAGE_PATH[k], PAGE_NAME[k] || k]) },
  { group: "Other pages", items: [
    ["/agenda", "Agenda (2026)"], ["/programme", "Programme (2026)"], ["/sponsors", "Sponsors (2026)"], ["/partners2026", "Partners 2026"],
    ["/tickets/checkout", "Checkout"], ["/awards/nominations", "Award nominations"], ["/stay-updated", "Stay updated (waitlist)"],
    ["/brochures", "Brochures"], ["/resources", "Resources"], ["/organizers", "Organizers"], ["/exhibit/india-pavilion", "India Pavilion"],
    ["/privacy", "Privacy"], ["/page-not-found", "“Page not found”"],
  ] },
];

const NAMES = new Map(SITE_PAGES.flatMap((g) => g.items));
/** "Venue" for "/venue"; the address itself for a page that isn't in the menu. */
export const pageLabel = (path) => NAMES.get(path) || path || "this page";
