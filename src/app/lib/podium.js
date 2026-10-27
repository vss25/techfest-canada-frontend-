/* =========================================================
   The top three as a podium (Oct 26 2026): the Points
   leaderboard and the top networkers card. Pure (node --test
   src/app/lib/podium.test.mjs).
     - podiumSplit(): the first three (by rank) for the podium and
       the rest for the list, which stays as it was;
     - podiumSlots(): where each of the three stands: 1st in the
       middle, 2nd on the left, 3rd on the right (2–1–3). The
       markup keeps rank order (screen readers read 1st, 2nd,
       3rd); the column only moves them on screen.
     - the medal follows the rank, so two people tied for 1st both
       get gold.
   One shape for both lists: { id, name, organization, avatarUrl,
   points, rank, level }.
========================================================= */

export const MEDALS = Object.freeze({ 1: "gold", 2: "silver", 3: "bronze" });
const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd" };
export const ordinal = (n) => ORDINAL[n] || `${n}th`;

/** A leaderboard entry ({ rank, user: { id, name, organization, avatarUrl }, points, level }) in the podium's shape. */
export function fromBoard(e) {
  const u = e?.user || {};
  return { id: String(u.id ?? ""), name: String(u.name || ""), organization: String(u.organization || ""), avatarUrl: u.avatarUrl || "", points: Number(e?.points) || 0, rank: Number(e?.rank) || 0, level: e?.level?.name || "" };
}

/** One of the top networkers ({ rank, name, organization, avatarUrl, points, userId }) in the podium's shape. */
export function fromWinner(w) {
  return { id: String(w?.userId ?? ""), name: String(w?.name || ""), organization: String(w?.organization || ""), avatarUrl: w?.avatarUrl || "", points: Number(w?.points) || 0, rank: Number(w?.rank) || 0, level: "" };
}

/** { podium: the first three, rest: everyone after } (the list is already in rank order). */
export function podiumSplit(list) {
  const all = Array.isArray(list) ? list : [];
  return { podium: all.slice(0, 3), rest: all.slice(3) };
}

/** The three as [{ person, place (1–3: the medal), column (1 = left, 2 = middle, 3 = right), height }] in rank order. */
export function podiumSlots(top) {
  const COLUMN = [2, 1, 3];
  return (top || []).slice(0, 3).map((person, i) => {
    const r = Number(person?.rank);
    const place = Number.isInteger(r) && r >= 1 && r <= 3 ? r : i + 1;
    return { person, place, column: COLUMN[i], medal: MEDALS[place] || "bronze", height: i === 0 ? "tall" : i === 1 ? "mid" : "low" };
  });
}

/** The screen reader's line for one place: "1st place: Daniel Okafor, Lakeshore Insurance, 640 points". */
export function podiumLabel(slot, { mine = false } = {}) {
  const p = slot.person;
  return `${ordinal(slot.place)} place: ${p.name}${mine ? " (you)" : ""}${p.organization ? `, ${p.organization}` : ""}, ${p.points} ${p.points === 1 ? "point" : "points"}`;
}
