import { CalendarDays, Landmark, Layers, Pickaxe, Ship, Sprout, Users, Zap } from "lucide-react";

/* The "Why come" picture, as designed (Nov 26 2026, the owner's "Why come" design file): the event in a glowing
   ring at the centre, and the industries it brings together as seven glass tiles around it on a dashed circle,
   alternating violet and pink. Drawn here (icons and CSS), not as an image, so it stays sharp at any size, uses
   the site's colours and can drift gently. Shown when the event has no photo, GIF or video of its own chosen in
   Admin › Event page › Why come. Decoration: the words beside it carry the meaning. */

/* A pipeline valve (lucide has none): pipe, flanges, stem and wheel. */
function Valve(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 13h3v6h-3zM18.5 13h3v6h-3zM5.5 14.5h13v3h-13zM12 14.5V9M9 9h6M9.5 6.5h5a1 1 0 0 1 1 1V9h-7V7.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

// Clockwise from the top; "p" marks the pink tiles.
const TILES = [
  { Icon: Zap, label: "Energy" },
  { Icon: Valve, label: "Pipelines", p: true },
  { Icon: Ship, label: "Ports and shipping" },
  { Icon: Sprout, label: "Clean tech", p: true },
  { Icon: Landmark, label: "Government" },
  { Icon: Pickaxe, label: "Mining", p: true },
  { Icon: Layers, label: "Infrastructure" },
];

export default function WhyWheel({ height }) {
  return (
    <div className="nx-wheel" style={height ? { minHeight: height } : undefined} role="img"
      aria-label={`The event at the centre, bringing together ${TILES.map((t) => t.label.toLowerCase()).join(", ")}.`}>
      <div className="nx-wheel-in" aria-hidden="true">
        <span className="nx-wheel-ring" />
        <span className="nx-wheel-core">
          <span className="nx-wheel-core-in">
            <CalendarDays strokeWidth={1.5} />
            <Users strokeWidth={1.5} />
          </span>
        </span>
        {TILES.map((t, i) => (
          <span key={t.label} className={`nx-wheel-tile${t.p ? " p" : ""}`} style={{ "--a": `${(360 / TILES.length) * i}deg`, "--i": i }}>
            <t.Icon strokeWidth={1.5} />
          </span>
        ))}
      </div>
    </div>
  );
}
