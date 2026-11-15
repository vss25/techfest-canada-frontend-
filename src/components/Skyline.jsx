import React from "react";
import { urlFor } from "../utils/sanity";

/* =========================================================
   The city skyline treatment for event heroes (Phase 4).
   If the event carries its own citySkyline graphic in Sanity
   it wins; otherwise a bundled, near-zero-weight inline SVG
   silhouette per city. Each skyline is drawn, not blocked:
   varied rooflines (slabs, slants, gables, a dome, a crescent)
   around the landmark that names the city —
     Toronto:   CN Tower (needle, main pod, sky pod), the
                Rogers Centre dome, Scotia Plaza's slanted
                peak, First Canadian Place's tall slab.
     Vancouver: the North Shore mountain ridge behind the
                towers, Canada Place's five sails, Harbour
                Centre's lookout disc, Shangri-La's slab.
     Calgary:   Calgary Tower (shaft + pod), The Bow's curved
                crescent crown, Telus Sky's stepped taper.
     Montreal:  Mount Royal and its cross, Place Ville Marie
                with its beacon, the Olympic Stadium's
                inclined mast over its bowl.
     Ottawa:    Parliament's Peace Tower and clock, the
                Centre Block gables, Château Laurier's
                turrets.
   The drawing is vertically compressed toward its base
   (factor 0.62): the hero's skyline band is wide and short
   (full width, ~22vh), so on desktop only the bottom ~35
   units of the frame show — the compression keeps every
   signature landmark inside that band. Fill inherits
   currentColor so the hero can tint it as a silhouette. The signature shapes sit low in the frame on
   purpose: the hero crops the drawing from the top on wide
   screens, so the landmarks must read near the base.
========================================================= */

const PATHS = {
  toronto: (
    <>
      {/* Tower row: Scotia Plaza's slanted peak (x≈41), First
          Canadian Place's tall slab (x 60–76), the Rogers Centre
          dome (x 104–150), then the downtown slabs. */}
      <path d="M 0 100 L 0 87.6 L 12 87.6 L 12 78.9 L 24 78.9 L 24 83.9 L 32 83.9 L 41 75.2 L 50 81.4 L 50 86.4 L 60 86.4 L 60 72.7 L 76 72.7 L 76 77.7 L 80 77.7 L 80 82.6 L 92 82.6 L 92 87.6 L 104 87.6 L 104 91.3 Q 127 74 150 91.3 L 150 87.6 L 164 87.6 L 164 76.4 L 180 76.4 L 180 83.9 L 192 83.9 L 192 78.9 L 206 78.9 L 206 85.1 L 220 85.1 L 220 80.2 L 234 80.2 L 234 86.4 L 260 86.4 L 260 100 Z" />
      {/* CN Tower — needle shaft, main pod, sky pod, antenna */}
      <path d="M 93 100 L 96.3 74 Q 97.5 71.5 98.7 74 L 102 100 Z" />
      <ellipse cx="97.5" cy="77.7" rx="8.5" ry="2.4" />
      <ellipse cx="97.5" cy="70.9" rx="4.2" ry="1.2" />
      <rect x="96.9" y="59.1" width="1.2" height="10.5" />
    </>
  ),
  vancouver: (
    <>
      {/* North Shore mountains ridge, behind the city — the twin
          Lions peaks around x 76–96 */}
      <path d="M 0 78.9 L 20 67.8 L 32 72.7 L 50 59.1 L 62 65.3 L 76 54.1 L 88 61.6 L 96 52.9 L 108 62.8 L 124 55.4 L 140 65.3 L 156 57.8 L 174 67.8 L 190 59.1 L 208 69 L 224 61.6 L 242 70.2 L 260 65.3 L 260 100 L 0 100 Z" opacity="0.45" />
      {/* Downtown tower cluster — Shangri-La's tall slab at x 150–166 */}
      <path d="M 0 100 L 0 92.6 L 14 92.6 L 14 83.9 L 26 83.9 L 26 91.3 L 62 91.3 L 62 80.2 L 76 80.2 L 76 87.6 L 88 87.6 L 88 75.2 L 102 78.9 L 102 88.8 L 114 88.8 L 114 77.7 L 128 77.7 L 128 86.4 L 140 86.4 L 150 86.4 L 150 71.5 L 166 71.5 L 166 86.4 L 178 86.4 L 178 92.6 L 206 92.6 L 206 85.1 L 220 85.1 L 220 76.4 L 234 76.4 L 234 82.6 L 246 82.6 L 246 88.8 L 260 88.8 L 260 100 Z" />
      {/* Harbour Centre — slim shaft, wide lookout disc, mast */}
      <path d="M 189 100 L 191.5 76.4 L 196.5 76.4 L 199 100 Z" />
      <ellipse cx="194" cy="74" rx="11" ry="2.7" />
      <rect x="193.3" y="62.8" width="1.4" height="8.7" />
      {/* Canada Place — the five sails along the harbourfront */}
      <path d="M 8 92.6 L 15 81.4 L 22 92.6 Z" />
      <path d="M 18 92.6 L 26 77.7 L 34 92.6 Z" />
      <path d="M 30 92.6 L 38 75.8 L 46 92.6 Z" />
      <path d="M 42 92.6 L 49 78.3 L 56 92.6 Z" />
      <path d="M 50 92.6 L 56 82.6 L 62 92.6 Z" />
      {/* The harbour water, in front of the towers */}
      <path d="M 0 97.5 Q 32 95.3 64 97.5 T 128 97.5 T 192 97.5 T 260 97.5 L 260 100 L 0 100 Z" opacity="0.6" />
    </>
  ),
  calgary: (
    <>
      {/* Tower row around the landmarks */}
      <path d="M 0 100 L 0 88.8 L 16 88.8 L 16 80.2 L 30 80.2 L 30 86.4 L 44 86.4 L 44 76.4 L 57 80.2 L 57 88.8 L 68 88.8 L 68 92.6 L 96 92.6 L 96 88.8 L 162 88.8 L 162 81.4 L 174 81.4 L 174 92.6 L 206 92.6 L 206 78.9 L 220 78.9 L 220 85.1 L 232 85.1 L 232 76.4 L 239 72.7 L 246 76.4 L 246 87.6 L 260 87.6 L 260 100 Z" />
      {/* Calgary Tower — thin shaft and observation pod */}
      <path d="M 78 100 L 80.5 74 L 83.5 74 L 86 100 Z" />
      <ellipse cx="82" cy="71.5" rx="9" ry="2.6" />
      <rect x="81.4" y="61.6" width="1.2" height="7.4" />
      {/* The Bow — its curved crescent crown */}
      <path d="M 102 100 L 102 77.7 Q 125 65.3 148 77.7 L 148 100 Z" />
      {/* Telus Sky — the tapering, stepped twist */}
      <path d="M 176 100 L 176 90.1 L 179 90.1 L 179 82.6 L 182 82.6 L 182 76.4 L 185 76.4 L 185 71.5 L 188 71.5 L 188 67.8 L 202 67.8 L 202 76.4 L 199 76.4 L 199 83.9 L 196 83.9 L 196 91.3 L 193 91.3 L 193 100 Z" />
    </>
  ),
  ottawa: (
    <>
      {/* Centre Block and its neighbours: gabled blocks either
          side, the Château Laurier block to the right */}
      <path d="M 0 100 L 0 91.3 L 20 91.3 L 20 82.6 L 38 82.6 L 38 87.6 L 52 87.6 L 52 80.2 L 66 75.2 L 80 80.2 L 80 87.6 L 94 87.6 L 94 82.6 L 108 82.6 L 108 80.2 L 152 80.2 L 152 82.6 L 166 82.6 L 166 87.6 L 180 87.6 L 180 80.2 L 194 75.2 L 208 80.2 L 208 88.8 L 248 88.8 L 248 86.4 L 260 86.4 L 260 100 Z" />
      {/* Centre Block roof gables */}
      <path d="M 112 80.2 L 117 75.8 L 122 80.2 Z" />
      <path d="M 138 80.2 L 143 75.8 L 148 80.2 Z" />
      {/* Parliament — the Peace Tower: shaft, spire, clock */}
      <path d="M 124 100 L 124 69 L 127 69 L 127 62.8 L 130 56.6 L 133 62.8 L 133 69 L 136 69 L 136 100 Z" />
      <rect x="126.8" y="74" width="6.4" height="4.7" fill="var(--skyline-cut, transparent)" opacity="0.35" />
      {/* Château Laurier — pitched roof and turrets */}
      <path d="M 210 100 L 210 82.6 L 227 77.1 L 244 82.6 L 244 100 Z" />
      <path d="M 212 82.6 L 216 75.2 L 220 82.6 Z" />
      <path d="M 223 81.4 L 227.5 73.3 L 232 81.4 Z" />
      <path d="M 236 82.6 L 240 75.8 L 244 82.6 Z" />
    </>
  ),
  montreal: (
    <>
      {/* Mount Royal — the broad slope behind the towers */}
      <path d="M 0 90.1 Q 36 76.4 72 72.7 Q 92 70.2 118 75.2 Q 176 83.9 260 76.4 L 260 100 L 0 100 Z" opacity="0.45" />
      {/* The cross on Mount Royal */}
      <path d="M 93.6 87.7 L 93.6 82.8 L 89 82.8 L 89 81.5 L 93.6 81.5 L 93.6 79.2 L 96.4 79.2 L 96.4 81.5 L 101 81.5 L 101 82.8 L 96.4 82.8 L 96.4 87.7 Z" />
      {/* Downtown tower row */}
      <path d="M 0 100 L 0 91.3 L 18 91.3 L 18 81.4 L 34 81.4 L 34 87.6 L 48 87.6 L 48 77.7 L 57 74 L 66 77.7 L 66 88.8 L 80 88.8 L 80 80.2 L 96 80.2 L 96 86.4 L 110 86.4 L 110 76.4 L 117 72.7 L 124 76.4 L 124 88.8 L 138 88.8 L 138 85.1 L 178 85.1 L 178 78.9 L 194 78.9 L 194 86.4 L 206 86.4 L 206 92.6 L 252 92.6 L 252 87.6 L 260 87.6 L 260 100 Z" />
      {/* Place Ville Marie — the tower, its cap and rotating beacon */}
      <path d="M 146 100 L 146 70.2 L 170 70.2 L 170 100 Z" />
      <rect x="143.5" y="67.1" width="29" height="3.1" />
      <circle cx="158" cy="64.7" r="1.5" />
      {/* Olympic Stadium — the bowl and the inclined mast */}
      <path d="M 198 100 L 198 93.8 Q 225 86.4 252 93.8 L 252 100 Z" />
      <path d="M 216 100 L 236 62.8 Q 238 59.1 242 60.3 L 230 100 Z" />
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
