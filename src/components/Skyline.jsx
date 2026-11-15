import React from "react";
import { urlFor } from "../utils/sanity";

/* =========================================================
   The city skyline treatment for event heroes (Phase 4).
   If the event carries its own citySkyline graphic in Sanity
   it wins; otherwise a bundled, near-zero-weight inline SVG
   silhouette per city — abstract blocks with one landmark
   hint each: Toronto's CN Tower, Vancouver's mountains and
   harbour, the Calgary Tower, Ottawa's Parliament, Montreal's
   Mount Royal cross. Fill inherits currentColor so the hero
   can tint it as a silhouette.
========================================================= */

const PATHS = {
  toronto: (
    <>
      <path d="M0 100 L0 78 L26 78 L26 62 L44 62 L44 78 L58 78 L58 40 L64 40 L64 78 L92 78 L92 58 L108 58 L108 78 L126 78 L126 66 L142 66 L142 78 L170 78 L170 52 L186 52 L186 78 L214 78 L214 64 L232 64 L232 78 L260 78 L260 100 Z" />
      {/* CN Tower */}
      <path d="M146 78 L149 34 L150 18 L151 34 L154 78 Z" />
      <ellipse cx="150" cy="38" rx="7" ry="3.4" />
      <rect x="149.4" y="4" width="1.2" height="14" />
    </>
  ),
  vancouver: (
    <>
      {/* North Shore mountains, behind the city */}
      <path d="M0 58 L26 34 L44 46 L66 22 L84 38 L104 16 L126 36 L148 24 L172 42 L196 28 L220 46 L240 36 L260 50 L260 100 L0 100 Z" opacity="0.45" />
      {/* Downtown tower cluster */}
      <path d="M0 100 L0 86 L22 86 L22 72 L38 72 L38 86 L54 86 L54 62 L70 62 L70 86 L88 86 L88 66 L104 66 L104 86 L120 86 L120 58 L138 58 L138 86 L160 86 L160 70 L178 70 L178 86 L196 86 L196 64 L214 64 L214 86 L232 86 L232 74 L246 74 L246 86 L260 86 L260 100 Z" />
      {/* Harbour Centre — the lookout tower: slim shaft, wide lookout pod, mast */}
      <path d="M145 86 L147.2 46 L152.8 46 L155 86 Z" />
      <ellipse cx="150" cy="43" rx="11" ry="4.4" />
      <rect x="149.3" y="24" width="1.4" height="13" />
      {/* Canada Place sails along the harbourfront */}
      <path d="M56 90 L64 70 L72 90 Z" />
      <path d="M70 90 L79 66 L88 90 Z" />
      <path d="M84 90 L92 71 L100 90 Z" />
      {/* The harbour water, in front of the towers */}
      <path d="M0 95 Q32 91.5 64 95 T128 95 T192 95 T260 95 L260 100 L0 100 Z" opacity="0.6" />
    </>
  ),
  calgary: (
    <>
      <path d="M0 100 L0 80 L24 80 L24 64 L42 64 L42 80 L60 80 L60 56 L78 56 L78 80 L98 80 L98 66 L116 66 L116 80 L140 80 L140 58 L158 58 L158 80 L184 80 L184 68 L202 68 L202 80 L228 80 L228 62 L246 62 L246 80 L260 80 L260 100 Z" />
      {/* The Bow — its curved crown over the tower row */}
      <path d="M96 80 L96 58 Q107 47 118 58 L118 80 Z" />
      {/* Calgary Tower */}
      <path d="M168 80 L171 44 L172 36 L174 36 L175 44 L178 80 Z" />
      <ellipse cx="173" cy="34" rx="8" ry="3.6" />
      <rect x="172.4" y="22" width="1.2" height="9" />
    </>
  ),
  ottawa: (
    <>
      <path d="M0 100 L0 82 L34 82 L34 68 L56 68 L56 82 L84 82 L84 70 L104 70 L104 82 L156 82 L156 70 L176 70 L176 82 L204 82 L204 66 L226 66 L226 82 L260 82 L260 100 Z" />
      {/* Parliament — Peace Tower */}
      <path d="M118 82 L118 52 L124 52 L124 40 L130 30 L136 40 L136 52 L142 52 L142 82 Z" />
      <rect x="126" y="56" width="8" height="10" fill="var(--skyline-cut, transparent)" opacity="0.35" />
    </>
  ),
  montreal: (
    <>
      {/* Mount Royal */}
      <path d="M0 74 Q70 40 140 52 Q210 62 260 50 L260 100 L0 100 Z" opacity="0.45" />
      {/* The cross on the mountain */}
      <path d="M128 30 h3 v6 h6 v3 h-6 v10 h-3 V39 h-6 v-3 h6 Z" />
      <path d="M0 100 L0 84 L28 84 L28 68 L46 68 L46 84 L64 84 L64 60 L82 60 L82 84 L106 84 L106 70 L124 70 L124 84 L150 84 L150 64 L168 64 L168 84 L194 84 L194 72 L212 72 L212 84 L238 84 L238 66 L260 66 L260 100 Z" />
    </>
  ),
};

export function SkylineSvg({ citySlug, style, className }) {
  const paths = PATHS[citySlug] || PATHS.toronto;
  return (
    <svg viewBox="0 0 260 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"
      className={className} style={{ display: "block", width: "100%", height: "100%", fill: "currentColor", ...style }}>
      {paths}
    </svg>
  );
}

/** The hero overlay: Sanity's per-event skyline graphic if set, else the bundled SVG. */
export default function Skyline({ ev, citySlug, style }) {
  if (ev?.citySkyline?.asset) {
    const src = urlFor(ev.citySkyline).width(1600).auto("format").url();
    return <img src={src} alt="" aria-hidden="true" loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "bottom", ...style }} />;
  }
  return <SkylineSvg citySlug={citySlug} style={style} />;
}
