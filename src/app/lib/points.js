import { createStore } from "./store";
import { get, patch } from "./api";

/* =========================================================
   Festival points (iOS PointsService): your total, level and
   rank for the Home pill, and the leaderboard for /points.
   Worked out by the backend; the app only reads them.
========================================================= */

export const points = createStore({ me: null, board: null, error: "" });
let last = 0;

/** Cheap to call often: at most every 20 s unless forced. */
export async function refreshPoints(force = false) {
  if (!force && Date.now() - last < 20000) return;
  last = Date.now();
  try {
    const me = await get("social/points/me");
    if (me && typeof me.total === "number") points.set((s) => ({ ...s, me, error: "" }));
  } catch (e) {
    points.set((s) => ({ ...s, error: e.message || "Couldn't load your points." }));
  }
}

export async function loadLeaderboard() {
  try {
    const board = await get("social/points/leaderboard?limit=10");
    points.set((s) => ({ ...s, board }));
  } catch { /* keeps the last board */ }
}

export async function setLeaderboardHidden(hidden) {
  await patch("social/points/prefs", { hideFromLeaderboard: hidden });
  await refreshPoints(true);
  await loadLeaderboard();
}

export function clearPoints() {
  last = 0;
  points.set({ me: null, board: null, error: "" });
}

window.addEventListener("ttfc:signed-out", clearPoints);

/* =========================================================
   The Points screen's tables (iOS PointsActivity in
   PointsView.swift, Android ui/points/PointsActivity.kt): the
   "Your activity" tiles, each rule's overall cap and where it's
   earned. Pure.
========================================================= */

/** One tile per thing the points service counts (zeros too), most common first. */
export const ACTIVITY_STATS = [
  { key: "session.saved", label: "Sessions saved" },
  { key: "network.connection", label: "Connections" },
  { key: "feed.post", label: "Posts" },
  { key: "feed.comment", label: "Comments" },
  { key: "live.vote", label: "Poll votes" },
  { key: "live.question", label: "Questions asked" },
  { key: "session.attended", label: "Sessions joined" },
  { key: "network.inPerson", label: "Met in person" },
  { key: "network.request", label: "Requests sent" },
  { key: "feed.likes", label: "Likes received" },
  { key: "live.upvoted", label: "Upvotes received" },
];

/** The breakdown line for a rule (what was counted and the points it earned). */
export const pointsLine = (me, key) => (me?.breakdown || []).find((l) => l.key === key) || null;

/** How many times this was done: `activity` (before caps) when sent, else the counted number. */
export function pointsDone(me, key) {
  const n = me?.activity?.[key];
  if (Number.isFinite(n)) return n;
  return pointsLine(me, key)?.count || 0;
}

/** Sessions saved / connections: the larger of this browser's number and the server's. */
export const activityCount = (me, key, local) => (Number.isFinite(local) ? Math.max(local, pointsDone(me, key)) : pointsDone(me, key));

/** The most a rule can count overall (null when it has no overall cap, e.g. "up to 3 a day"). */
export function ruleCap(rule) {
  if (rule?.per === "total" && rule.max > 0) return rule.max;
  if (rule?.maxTotal > 0) return rule.maxTotal;
  return null;
}

/** Where a rule is earned, as a button on its row (null: nothing to open, e.g. likes from others).
    `to` is a route; `state` asks that screen to open the scanner or the composer. */
export function ruleGoal(key) {
  switch (key) {
    case "profile.linkedin": case "profile.topics": return { title: "Edit profile", to: "/profile/edit" };
    case "session.saved": case "session.attended": case "live.vote": case "live.question": return { title: "Schedule", to: "/schedule" };
    case "network.request": case "network.connection": return { title: "Find people", to: "/network" };
    case "network.inPerson": return { title: "Scan a badge", to: "/network", state: { scan: true } };
    case "feed.post": return { title: "Write a post", to: "/", state: { compose: true } };
    case "feed.comment": return { title: "Open feed", to: "/" };
    default: return null;
  }
}
