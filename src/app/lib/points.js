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
