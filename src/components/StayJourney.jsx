import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Cpu, Factory, MapPin, Sparkles, Target } from "lucide-react";
import outline from "../data/canadaOutline.json";
import { layoutJourney, nearestOnBox, projectOutline } from "../lib/canadaMap";
import { TBA, cityNamed, focusText, isFestival, kindLabel, stopSentence } from "../lib/stayJourney";

/* =========================================================
   The TTFC 2027 journey (Oct 23 2026): a map of Canada with the
   stops as dots at their real coordinates, joined in order by the
   route, each city's label carrying its numbered stop(s) and
   month(s), the festival in gold; and the list of stops (the real
   content: month, city, one-day briefing or the festival, focus,
   date, venue, note).
   Used by the website's /stay-updated (src/pages/StayUpdated.jsx),
   the web app's /app/stay-updated and the admin editor's preview
   (src/admin/leads/JourneyEditor.jsx). Colours come from the host
   through --jv-* custom properties (light / dark). The route draws
   itself once when it scrolls into view (not with reduced motion).
   Map: src/lib/canadaMap.js; words: src/lib/stayJourney.js;
   outline: src/data/canadaOutline.json (Natural Earth, public
   domain, via world-atlas 2.0.2).
========================================================= */

const PROJECTED = projectOutline(outline.rings);

let canvas = null;
function measurer(family) {
  return (text, size, weight = 400) => {
    try {
      canvas ||= document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.font = `${weight} ${size}px ${family || "sans-serif"}`;
      return ctx.measureText(text).width;
    } catch {
      return text.length * size * 0.58;
    }
  };
}

const canDraw = () => typeof window !== "undefined" && typeof IntersectionObserver !== "undefined"
  && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function JourneyMap({ stops, active = -1, title = "Map of Canada: the TTFC 2027 journey" }) {
  const uid = `jv${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ref = useRef(null);
  // The map is laid out for the width it's drawn at (and measured in its own font): the observer's first call comes
  // right after layout, before the first paint. Without ResizeObserver it stays 640 wide, scaled to fit.
  const [box, setBox] = useState({ width: 640, family: "" });
  // static (drawn) | ready (hidden until the map is in view) | go (drawing). Reduced motion: always static.
  const [draw, setDraw] = useState(() => (canDraw() ? "ready" : "static"));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.getBoundingClientRect().width);
      const family = getComputedStyle(el).fontFamily || "";
      if (w > 0) setBox((b) => (Math.abs(b.width - w) >= 1 || b.family !== family ? { width: w, family } : b));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The route draws once, when the map comes into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || draw !== "ready") return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setDraw("go"); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [draw]);

  const { width, family } = box;
  const measure = useMemo(() => measurer(family), [family]);
  const L = useMemo(() => layoutJourney(stops, width, { projected: PROJECTED, measure }), [stops, width, measure]);
  const activeCity = active >= 0 && stops[active] ? cityNamed(stops[active].city)?.name : "";
  const titleId = `${uid}-t`, descId = `${uid}-d`, maskId = `${uid}-m`, goldId = `${uid}-g`;

  return (
    <div ref={ref} className={`jv-map is-${draw}`}>
      <svg viewBox={`0 0 ${L.width} ${L.height}`} width="100%" role="img" aria-labelledby={`${titleId} ${descId}`} className="jv-svg">
        <title id={titleId}>{title}</title>
        <desc id={descId}>{stops.map(stopSentence).join(" ")}</desc>
        <defs>
          <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f7b733" />
            <stop offset="1" stopColor="#e8458b" />
          </linearGradient>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={L.width} height={L.height}>
            {L.legs.map((l) => (
              <path key={l.key} d={l.d} className="jv-draw" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round"
                style={{ strokeDasharray: `${l.curve} ${l.curve}`, strokeDashoffset: draw === "static" ? 0 : l.curve, animationDelay: `${l.delay}s`, animationDuration: `${l.dur}s` }} />
            ))}
          </mask>
        </defs>

        <path d={L.d} className="jv-land" fillRule="evenodd" />

        <g mask={`url(#${maskId})`}>
          {L.legs.map((l) => <path key={l.key} d={l.d} className="jv-route" fill="none" />)}
          {L.legs.filter((l) => l.length > (L.small ? 50 : 70)).map((l) => (
            <path key={`a${l.key}`} d="M-4,-4.5L2.5,0L-4,4.5" className="jv-arrow" fill="none"
              transform={`translate(${l.mid[0].toFixed(1)} ${l.mid[1].toFixed(1)}) rotate(${l.angle.toFixed(1)})`} />
          ))}
        </g>

        {L.groups.map((g) => {
          const b = L.boxes.get(g.key);
          if (!b) return null;
          const end = nearestOnBox(g.p, b);
          return Math.hypot(end[0] - g.p[0], end[1] - g.p[1]) > g.r + 3
            ? <line key={`l${g.key}`} x1={g.p[0]} y1={g.p[1]} x2={end[0]} y2={end[1]} className="jv-leader" />
            : null;
        })}

        {L.groups.map((g) => (
          <g key={`d${g.key}`} className={g.festival ? "jv-dot is-fest" : "jv-dot"}>
            {g.festival && <circle cx={g.p[0]} cy={g.p[1]} r={g.r * 2.3} className="jv-halo" />}
            <circle cx={g.p[0]} cy={g.p[1]} r={g.r} style={g.festival ? { fill: `url(#${goldId})` } : undefined} />
          </g>
        ))}

        {L.groups.map((g) => {
          const b = L.boxes.get(g.key);
          if (!b) return null;
          const { S } = L;
          const textX = S.padX + g.stops.length * S.badge + (g.stops.length - 1) * 3 + 7;
          return (
            <g key={`b${g.key}`} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}
              className={`jv-lab${g.festival ? " is-fest" : ""}${activeCity === g.city ? " is-active" : ""}`}>
              <rect width={b.w} height={b.h} rx={12} className="jv-lab-bg" />
              {g.stops.map((s, k) => {
                const cx = S.padX + S.badge / 2 + k * (S.badge + 3);
                return (
                  <g key={s.n} className={`jv-badge${s.festival ? " is-fest" : ""}${s.i === active ? " is-on" : ""}`}>
                    <circle cx={cx} cy={b.h / 2} r={S.badge / 2} style={s.festival ? { fill: `url(#${goldId})` } : undefined} />
                    <text x={cx} y={b.h / 2} dy="0.35em" textAnchor="middle" fontSize={S.badge * 0.55}>{s.n}</text>
                  </g>
                );
              })}
              <text x={textX} y={S.cityY} className="jv-lab-city" fontSize={S.city}>{g.city}</text>
              <text x={textX} y={S.monthY} className="jv-lab-month" fontSize={S.month}>{g.months}</text>
            </g>
          );
        })}
      </svg>
      <p className="jv-legend" aria-hidden="true">
        <span><i className="jv-key" />One-day briefing</span>
        <span><i className="jv-key is-fest" />The Tech Festival Canada · Two days</span>
      </p>
    </div>
  );
}

/** The stops in order (the real content; the map is a picture of it). Hovering one rings its number on the map. */
export function JourneyList({ stops, onActive, headingLevel = 3 }) {
  const H = `h${headingLevel}`;
  return (
    <ol className="jv-list">
      {stops.map((s, i) => {
        const focus = focusText(s);
        const fest = isFestival(s);
        return (
          <li key={i} className={`jv-stop${fest ? " is-fest" : ""}`}
            onMouseEnter={onActive ? () => onActive(i) : undefined} onMouseLeave={onActive ? () => onActive(-1) : undefined}>
            <span className="jv-num" aria-hidden="true">{i + 1}</span>
            <div className="jv-body">
              <p className="jv-month">{s.month || TBA}</p>
              <H className="jv-city">{s.city}</H>
              <p className="jv-kind">{fest && <Sparkles aria-hidden="true" />}{kindLabel(s)}</p>
              {focus && (
                s.pillar || s.sector ? (
                  <p className="jv-focus">
                    <span className="jv-sr">Focus: </span>
                    <span className={`jv-chip${s.pillar ? "" : " is-tba"}`}><Cpu aria-hidden="true" />{s.pillar || "Pillar to be announced"}</span>
                    <span className="jv-x" aria-hidden="true">×</span><span className="jv-sr"> and </span>
                    <span className={`jv-chip${s.sector ? "" : " is-tba"}`}><Factory aria-hidden="true" />{s.sector || "Sector to be announced"}</span>
                  </p>
                ) : <p className="jv-fact jv-focus-tba is-tba"><Target aria-hidden="true" />{focus}</p>
              )}
              <p className={`jv-fact${s.date ? "" : " is-tba"}`}><CalendarDays aria-hidden="true" /><span className="jv-sr">Date: </span>{s.date || "Date to be announced"}</p>
              <p className={`jv-fact${s.venue ? "" : " is-tba"}`}><MapPin aria-hidden="true" /><span className="jv-sr">Venue: </span>{s.venue || "Venue to be announced"}</p>
              {s.note && <p className="jv-note">{s.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Map + list. `compact`: the web app (map above, smaller type). `stops`: the stored shape (src/lib/stayJourney.js). */
export default function JourneyView({ stops: given, compact = false, headingLevel = 3, mapTitle }) {
  const [active, setActive] = useState(-1);
  // The same stops (by content) keep the same array, so the map isn't laid out again on every render of the page.
  const key = JSON.stringify(given || []);
  const stops = useMemo(() => JSON.parse(key), [key]);
  return (
    <div className={`jv${compact ? " jv--compact" : ""}`}>
      <style>{JOURNEY_CSS}</style>
      <div className="jv-grid">
        <JourneyMap stops={stops} active={active} title={mapTitle} />
        <JourneyList stops={stops} onActive={setActive} headingLevel={headingLevel} />
      </div>
    </div>
  );
}

export const JOURNEY_CSS = `
.jv { container-type: inline-size; color: var(--jv-text, inherit);
  --jv-gold: #f5a623; --jv-pink: #e8458b; --jv-purple: #7a3fd1; }
.jv-grid { display: grid; gap: 22px; align-items: start; }
@container (min-width: 880px) {
  .jv-grid { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 28px; }
  .jv:not(.jv--compact) .jv-map { position: sticky; top: 96px; }
}
.jv-map { min-width: 0; }
.jv-svg { display: block; width: 100%; height: auto; overflow: visible; font-family: inherit; }
.jv-land { fill: var(--jv-land, rgba(122,63,209,0.1)); stroke: var(--jv-land-edge, rgba(122,63,209,0.3)); stroke-width: 0.8; stroke-linejoin: round; }
.jv-route { stroke: var(--jv-route, #7a3fd1); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 0.1 6.5; }
.jv-arrow { stroke: var(--jv-route, #7a3fd1); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
/* The route draws in: each leg's mask path is dashed to its own length (set inline) and its offset runs to 0. */
.jv-map.is-go .jv-draw { animation: jv-draw 1s cubic-bezier(.45,.05,.35,1) forwards; }
@keyframes jv-draw { to { stroke-dashoffset: 0; } }
.jv-leader { stroke: var(--jv-mid, rgba(13,5,32,0.6)); stroke-width: 1; stroke-dasharray: 2 2; opacity: 0.7; }
.jv-dot circle { fill: var(--jv-route, #7a3fd1); stroke: var(--jv-label-bg, #fff); stroke-width: 1.5; }
.jv-dot .jv-halo { fill: var(--jv-gold); stroke: none; opacity: 0.25; transform-box: fill-box; transform-origin: center; animation: jv-pulse 2.6s ease-in-out infinite; }
@keyframes jv-pulse { 0%, 100% { transform: scale(0.8); opacity: 0.35; } 50% { transform: scale(1.25); opacity: 0.12; } }
.jv-lab-bg { fill: var(--jv-label-bg, #fff); stroke: var(--jv-line, rgba(122,63,209,0.2)); stroke-width: 1; }
.jv-lab.is-fest .jv-lab-bg { stroke: var(--jv-gold); stroke-width: 1.5; }
.jv-lab.is-active .jv-lab-bg { stroke: var(--jv-accent, #6a2fc4); stroke-width: 2; }
.jv-badge circle { fill: var(--jv-purple); }
.jv-badge text { fill: #fff; font-weight: 800; }
.jv-badge.is-fest text { fill: #2b1600; }
.jv-badge.is-on circle { stroke: var(--jv-accent, #6a2fc4); stroke-width: 2.5; paint-order: stroke; }
.jv-lab-city { fill: var(--jv-text, #0d0520); font-weight: 700; }
.jv-lab-month { fill: var(--jv-mid, rgba(13,5,32,0.7)); font-weight: 600; }
.jv-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 10px 0 0; font-size: 13px; color: var(--jv-mid); }
.jv-legend span { display: inline-flex; align-items: center; gap: 7px; }
.jv-key { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: var(--jv-purple); }
.jv-key.is-fest { background: linear-gradient(135deg, #f7b733, #e8458b); }
.jv-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
@container (min-width: 600px) and (max-width: 879px) { .jv-list { grid-template-columns: 1fr 1fr; } .jv-stop.is-fest { grid-column: 1 / -1; } }
.jv-stop { position: relative; display: flex; gap: 14px; padding: 16px 16px 15px; border-radius: 18px; background: var(--jv-card, #fff); border: 1px solid var(--jv-line); min-width: 0; transition: border-color .15s, box-shadow .15s; }
.jv-stop:hover { border-color: var(--jv-accent); }
.jv-stop.is-fest { border: 1.5px solid transparent; background: linear-gradient(var(--jv-card, #fff), var(--jv-card, #fff)) padding-box, linear-gradient(135deg, #7a3fd1, #e8458b 55%, #f5a623) border-box; box-shadow: 0 14px 34px rgba(122,63,209,0.16); }
.jv-num { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--jv-purple); color: #fff; font-weight: 800; font-size: 14px; }
.jv-stop.is-fest .jv-num { background: linear-gradient(135deg, #f7b733, #e8458b); color: #2b1600; }
.jv-body { min-width: 0; flex: 1; }
.jv-month { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 1.3px; text-transform: uppercase; color: var(--jv-accent); }
.jv-city { margin: 2px 0 0; font-size: 20px; font-weight: 800; line-height: 1.2; color: var(--jv-text); }
.jv-kind { display: flex; align-items: center; gap: 6px; margin: 3px 0 0; font-size: 14.5px; font-weight: 700; color: var(--jv-text); }
.jv-kind svg { width: 16px; height: 16px; color: var(--jv-gold); flex: none; }
.jv-focus { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 10px 0 2px; }
.jv-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: var(--jv-chip); color: var(--jv-text); font-size: 13px; font-weight: 700; line-height: 1.3; }
.jv-chip svg { width: 14px; height: 14px; color: var(--jv-accent); flex: none; }
.jv-chip.is-tba { color: var(--jv-mid); font-weight: 600; }
.jv-x { color: var(--jv-mid); font-weight: 700; }
.jv-fact { display: flex; align-items: flex-start; gap: 7px; margin: 6px 0 0; font-size: 14px; line-height: 1.45; color: var(--jv-text); }
.jv-fact svg { width: 15px; height: 15px; margin-top: 2px; color: var(--jv-accent); flex: none; }
.jv-fact.is-tba { color: var(--jv-mid); }
.jv-focus-tba { margin-top: 10px; }
.jv-note { margin: 8px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--jv-mid); }
.jv-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.jv--compact .jv-grid { gap: 16px; }
.jv--compact .jv-stop { padding: 14px; gap: 12px; border-radius: 16px; }
.jv--compact .jv-city { font-size: 18px; }
.jv--compact .jv-legend { font-size: 12px; }
@media (prefers-reduced-motion: reduce) {
  .jv-map .jv-draw, .jv-map.is-ready .jv-draw, .jv-map.is-go .jv-draw { animation: none; stroke-dashoffset: 0 !important; }
  .jv-dot .jv-halo { animation: none; }
  .jv-stop { transition: none; }
}
`;
