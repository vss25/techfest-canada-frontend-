import { Coffee, Trophy, UtensilsCrossed, Wine } from "lucide-react";
import { inclusionDays, personExtras } from "../lib/passExtras";

/* =========================================================
   What your pass includes, per day (Oct 24 2026; lib/passExtras.js):
   "MON 26 · CxO Breakfast · Lunch · Catalyst Awards" /
   "TUE 27 · CxO Breakfast · Lunch · Gala Dinner", only what's
   included, nothing at all when nothing is. Small calm chips
   tinted in your pass colour (the organiser: "Keep the UI still
   clean"); they fade in once, never again, and not at all under
   Reduce Motion. Each day is one stop for screen readers.
   `tickets`: /auth/me tickets; `tag`: lib/profileTag.js view (the
   tint; none = the accent purple); `onCard`: white chips on the
   coloured pass card.
========================================================= */

const ICON = { cxo: Coffee, lunch: UtensilsCrossed, awards: Trophy, gala: Wine };

export default function PassInclusions({ tickets, tag = null, onCard = false }) {
  const days = inclusionDays(personExtras(tickets));
  if (!days.length) return null;
  let i = 0;
  return (
    <div className={"incl" + (onCard ? " incl--card" : "")} style={tag ? { "--incl": tag.colors.bg } : undefined}>
      {/* Centred as a block; the days share a left edge, and chips that don't fit wrap under the first chip. */}
      <div className="incl-days">
        {days.map((d) => (
          <div key={d.key} className="incl-day" role="group" aria-label={d.aria}>
            <span className="incl-day-label" aria-hidden="true">{d.label}</span>
            <span className="incl-chips">
              {d.items.map((it) => {
                const Icon = ICON[it.key];
                const n = i++;
                return (
                  <span key={it.key} className="incl-chip" aria-hidden="true" style={{ animationDelay: `${n * 40}ms` }}>
                    <Icon />{it.label}
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
