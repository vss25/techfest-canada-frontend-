/* The website's pages, for Website text & media's page menu (SiteCopy.jsx). Any other page can be
   reached with Browse inside the preview; this is the list people start from. (The live site's
   pages; the redesign branch has its own list for the new design.) */

export const SITE_PAGES = [
  { group: "Main pages", items: [
    ["/", "Home"], ["/tickets", "Tickets"], ["/tickets/checkout", "Checkout"], ["/speakers", "Speakers"], ["/agenda", "Agenda"],
    ["/programme", "Programme"], ["/sponsors", "Sponsors"], ["/partners2026", "Partners 2026"], ["/awards", "Awards"],
    ["/awards/nominations", "Award nominations"], ["/venue", "Venue"], ["/about", "About"], ["/contact", "Contact"],
  ] },
  { group: "Take part", items: [
    ["/sponsor", "Become a sponsor"], ["/exhibit", "Exhibit"], ["/exhibit/india-pavilion", "India Pavilion"],
    ["/volunteer", "Volunteer"], ["/media", "Media"], ["/stay-updated", "Stay updated (waitlist)"],
  ] },
  { group: "Other pages", items: [
    ["/brochures", "Brochures"], ["/resources", "Resources"], ["/organizers", "Organizers"], ["/privacy", "Privacy"],
    ["/page-not-found", "\u201cPage not found\u201d"],
  ] },
];

const NAMES = new Map(SITE_PAGES.flatMap((g) => g.items));
/** "Venue" for "/venue"; the address itself for a page that isn't in the menu. */
export const pageLabel = (path) => NAMES.get(path) || path || "this page";
