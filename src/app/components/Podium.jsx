import { fileURL } from "../lib/config";
import { podiumLabel, podiumSlots } from "../lib/podium";
import { Avatar } from "./ui";

/* =========================================================
   The top three as a podium (Oct 26 2026): Points › Leaderboard
   and the top networkers card (Points and the feed). 2nd on
   the left, 1st in the middle (a bigger photo), 3rd on the right;
   gold, silver and bronze rings and medals, the points under each
   name, then the steps. The list keeps rank order for screen
   readers (lib/podium.js); nothing moves.
========================================================= */

const SIZE = { 1: 84, 2: 66, 3: 66 };

/** `people`: the first three in lib/podium.js's shape; `myId`: marks "you". */
export default function Podium({ people, myId = "", label = "Top 3", compact = false }) {
  const slots = podiumSlots(people);
  if (!slots.length) return null;
  return (
    <ol className={compact ? "podium podium--compact" : "podium"} aria-label={label}>
      {slots.map((s) => {
        const p = s.person;
        const mine = !!myId && p.id === myId;
        const size = Math.round(SIZE[s.place] * (compact ? 0.82 : 1));
        return (
          <li key={p.id || `${s.place}-${p.name}`} className={`podium-spot podium-spot--${s.medal} podium-spot--${s.height}${mine ? " is-me" : ""}`}
            style={{ gridColumn: s.column }} aria-label={podiumLabel(s, { mine })}>
            <span className="podium-photo" aria-hidden="true">
              <span className="podium-ring"><Avatar name={p.name} src={fileURL(p.avatarUrl)} size={size} round /></span>
              <span className="podium-medal">{s.place}</span>
            </span>
            <b className="podium-name clamp-2" aria-hidden="true">{p.name}{mine && <span className="podium-you"> (you)</span>}</b>
            {p.organization && <span className="podium-org ellipsis" aria-hidden="true">{p.organization}</span>}
            <b className="podium-points figure" aria-hidden="true">{p.points}<span> pts</span></b>
            <span className="podium-step" aria-hidden="true">{s.place}</span>
          </li>
        );
      })}
    </ol>
  );
}
