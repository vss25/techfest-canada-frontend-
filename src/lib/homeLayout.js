/* The home page's layout (Nov 25 2026, Admin › Content › Home page). The owner: "whatever is shown on the home
   page is just based on whatever is the next event. That is generally true, but what if I want to edit some
   elements or sections of the home page?"

   Two things are set in the admin, on the "homePage" document (backend services/cmsSchema.js):
   - heroEvent: the event the top of the page promotes. Empty = the next event (by start date), else Vancouver.
   - sections: the four sections under it, in order, each shown or hidden. Empty = the design's order, all shown.
   The wording and pictures are changed in Website text & media like the rest of the site. Pure, unit-tested
   (homeLayout.test.mjs). */

/** The sections under the top of the page, in the design's order. Same keys as the backend's HOME_SECTIONS. */
export const HOME_SECTIONS = ["season", "agenda", "highlights", "form"];

export const HOME_SECTION_LABELS = {
  season: "The 2027 season",
  agenda: "Agenda highlights",
  highlights: "Toronto 2026 highlights",
  form: "Brochure and report form",
};

/** [{ key, on }] → the keys to show, in order. Unknown keys are dropped; a missing section is shown at the end. */
export function homeOrder(sections) {
  if (!Array.isArray(sections) || !sections.length) return HOME_SECTIONS.slice();
  const seen = new Set();
  const out = [];
  for (const row of sections) {
    const key = row && row.key;
    if (!HOME_SECTIONS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    if (row.on !== false) out.push(key);
  }
  for (const key of HOME_SECTIONS) if (!seen.has(key)) out.push(key);
  return out;
}

/** [{ key, on }] for the editor: every section once, saved order first, then any missing ones (shown). */
export function editorRows(sections) {
  const rows = [];
  const seen = new Set();
  for (const row of Array.isArray(sections) ? sections : []) {
    const key = row && row.key;
    if (!HOME_SECTIONS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, on: row.on !== false });
  }
  for (const key of HOME_SECTIONS) if (!seen.has(key)) rows.push({ key, on: true });
  return rows;
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
