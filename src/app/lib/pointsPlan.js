/* =========================================================
   The Points screen's "Your activity" tab (batch 6, Oct 22 2026; the organiser: "list the activities that are
   pending and important first … make the Your activity tab concise"). Same order and rules as iOS (PointsView)
   and Android (ui/points/PointsActivity.kt):
   - Recommended: up to 4 rules not done yet (nothing counted) with a way to do them, most important first (the
     contract's order: I'm attending +50, LinkedIn +20, a connection +15, topics +10, sessions +5 …); the event-day
     ones (scan a badge, vote in a poll, ask a question) first on Oct 26–27 and left out on other days.
   - Done: every rule that has earned points, most first.
   - The rest (every other rule, with its progress) folds away under "All ways to earn points".
   Pure (no window, no store): node --test src/app/lib/pointsPlan.test.mjs.
========================================================= */

/** What matters most (most points / most useful first). */
export const IMPORTANCE = [
  "linkedin.attending", "profile.linkedin", "network.connection", "profile.topics", "session.saved", "network.request",
  "feed.post", "feed.comment", "network.inPerson", "live.vote", "live.question", "session.attended",
];

/** Only possible at the event: first on the event days, not recommended on other days. */
export const EVENT_FIRST = ["network.inPerson", "live.vote", "live.question"];
const EVENT_ONLY = [...EVENT_FIRST, "session.attended"];

/** The most a rule can count overall (null when it has no overall cap, e.g. "up to 3 a day"). */
export function ruleCap(rule) {
  if (rule?.per === "total" && rule.max > 0) return rule.max;
  if (rule?.maxTotal > 0) return rule.maxTotal;
  return null;
}

/** Where a rule is earned, as a button on its row (null: nothing to open, e.g. likes from others).
    `to` is a route; `state` asks that screen to open the scanner or the composer; `action` "attending" opens the
    website's I'm-attending page for this person (lib/engage.js). */
export function ruleGoal(key) {
  switch (key) {
    case "profile.linkedin": case "profile.topics": return { title: "Edit profile", to: "/profile/edit" };
    case "session.saved": case "session.attended": case "live.vote": case "live.question": return { title: "Schedule", to: "/schedule" };
    case "network.request": case "network.connection": return { title: "Find people", to: "/network" };
    case "network.inPerson": return { title: "Scan a badge", to: "/network", state: { scan: true } };
    case "feed.post": return { title: "Write a post", to: "/", state: { compose: true } };
    case "feed.comment": return { title: "Open feed", to: "/" };
    case "linkedin.attending": return { title: "Post on LinkedIn", action: "attending" };
    case "linkedin.share": return { title: "Schedule", to: "/schedule" };
    default: return null;
  }
}

/** Nothing more to earn from it: a one-time rule done, or a capped rule at its cap. */
export function ruleFinished(rule, counted) {
  const cap = ruleCap(rule);
  return cap != null && counted >= cap;
}

/** Up to `limit` rules to do next: not done yet, something to tap. `counted(key)` = how many times it was counted. */
export function recommendedRules(rules, counted, eventDay, limit = 4) {
  const order = eventDay ? [...EVENT_FIRST, ...IMPORTANCE.filter((k) => !EVENT_FIRST.includes(k))] : IMPORTANCE;
  const rank = (key) => { const i = order.indexOf(key); return i < 0 ? order.length : i; };
  return (rules || [])
    .filter((r) => ruleGoal(r.key) && !(counted(r.key) > 0) && (eventDay || !EVENT_ONLY.includes(r.key)))
    .sort((a, b) => rank(a.key) - rank(b.key) || (b.points || 0) - (a.points || 0))
    .slice(0, limit);
}

/** "Done": every breakdown line that has earned points, most first. */
export const doneLines = (breakdown) => (breakdown || []).filter((l) => l.points > 0).sort((a, b) => b.points - a.points);

/** "2 of 10" / "Done" / "3 so far" / "" for a row in the folded list. */
export function ruleStatus(rule, counted) {
  const cap = ruleCap(rule);
  if (cap != null && counted >= cap) return "Done";
  if (cap != null && cap > 1) return `${counted} of ${cap}`;
  if (counted > 0) return `${counted} so far`;
  return "";
}

/** 0…1 through the current level (1 at the top level). */
export function levelProgress(me) {
  if (!me?.nextLevel) return 1;
  const from = me.level?.min ?? 0;
  const span = Math.max((me.nextLevel.min ?? 0) - from, 1);
  return Math.min(Math.max(((me.total || 0) - from) / span, 0), 1);
}
