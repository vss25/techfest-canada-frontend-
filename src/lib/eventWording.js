/* How the website names its events (Nov 25 2026, the owner): the one-day events are "City Briefings" and the
   Toronto festival is the "National Festival" (they were "Briefing" and "Main Event"; "Flagship Event" for an hour). Event records, ticket
   emails and web addresses keep their own names; this turns a stored name into the website's wording wherever
   one is shown. Pure, unit-tested (eventWording.test.mjs). */

/** "Vancouver Briefing 2027" → "Vancouver City Briefing 2027"; "Toronto 2026 · Main Event" → "… · National Festival". */
export function eventWording(text) {
  return String(text ?? "")
    .replace(/\bMain Event\b/g, "National Festival")
    .replace(/\b(City )?Briefing(s?)\b/g, "City Briefing$2");
}
