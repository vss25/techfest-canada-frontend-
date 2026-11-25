/* The home page's layout (Nov 25 2026, Admin › Content › Home page). The owner: "whatever is shown on the home
   page is just based on whatever is the next event. That is generally true, but what if I want to edit some
   elements or sections of the home page?"

   Two things are set in the admin, on the "homePage" document (backend services/cmsSchema.js):
   - heroEvent: the event the top of the page promotes. Empty = the next event (by start date), else Vancouver.
   - sections: the four sections under it, in order, each shown or hidden. Empty = the design's order, all shown.
   The wording and pictures are changed in Website text & media like the rest of the site. Pure, unit-tested
   (homeLayout.test.mjs). */

/** The sections under the top of the page, in the design's order. Same keys as the backend's HOME_SECTIONS.
    Nov 25 2026, the new look (the owner: "all of them"): Next up, Who's on stage and Partners were added. */
export const HOME_SECTIONS = ["season", "next", "speakers", "agenda", "highlights", "partners", "form"];

export const HOME_SECTION_LABELS = {
  season: "The 2027 season",
  next: "Next up",
  speakers: "Who's on stage",
  agenda: "Agenda highlights",
  highlights: "Toronto 2026 highlights",
  partners: "Partners",
  form: "Brochure and report form",
};

/** Every section once, saved order first; a section the saved list doesn't have (one added since) goes in after
    the section it follows in the design's order, shown. → [{ key, on }] */
function merged(sections) {
  const rows = [];
  const seen = new Set();
  for (const row of Array.isArray(sections) ? sections : []) {
    const key = row && row.key;
    if (!HOME_SECTIONS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, on: row.on !== false });
  }
  HOME_SECTIONS.forEach((key, i) => {
    if (seen.has(key)) return;
    seen.add(key);
    const before = HOME_SECTIONS.slice(0, i).reverse().find((k) => rows.some((r) => r.key === k));
    const at = before ? rows.findIndex((r) => r.key === before) + 1 : 0;
    rows.splice(at, 0, { key, on: true });
  });
  return rows;
}

/** [{ key, on }] → the keys to show, in order. Unknown keys are dropped; a missing section is shown in its place. */
export function homeOrder(sections) {
  if (!Array.isArray(sections) || !sections.length) return HOME_SECTIONS.slice();
  return merged(sections).filter((r) => r.on).map((r) => r.key);
}

/** [{ key, on }] for the editor: every section once, saved order first, any missing ones in their place (shown). */
export function editorRows(sections) {
  return merged(sections);
}

const day = (e) => String((e && (e.endDate || e.startDate)) || "").slice(0, 10);

/** The city the top of the page promotes: the pinned event's, else the next event's (it hasn't ended), else "van".
    byCity = { van: event, mtl: event, … } (events may be missing); today = "YYYY-MM-DD". */
export function homeCityFor(heroEventId, byCity, today) {
  const ids = Object.keys(byCity || {});
  if (heroEventId) {
    const pinned = ids.find((id) => byCity[id] && byCity[id]._id === heroEventId);
    if (pinned) return pinned;
  }
  const next = ids
    .filter((id) => byCity[id] && byCity[id].startDate && day(byCity[id]) >= today)
    .sort((a, b) => String(byCity[a].startDate).localeCompare(String(byCity[b].startDate)))[0];
  return next || "van";
}

/** The line above the event's name: "February 3, 2027 · Montreal · <theme>" (no placeholder theme). */
export function homeEyebrow(c) {
  if (!c) return "";
  const theme = c.theme && !/announced soon/i.test(c.theme) ? c.theme : "";
  return [c.date, c.name, theme].filter(Boolean).join(" · ");
}
