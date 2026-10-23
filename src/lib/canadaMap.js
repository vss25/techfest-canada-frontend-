/* =========================================================
   The map of Canada for the TTFC 2027 journey (Oct 23 2026):
   projection, the outline's SVG path, the route's arcs and where
   each city's label goes. Pure (it imports only the pure
   stayJourney.js; the outline's rings are passed in):
   node --test src/lib/canadaMap.test.mjs.

   Projection: Lambert conformal conic (standard parallels 49°N
   and 77°N, central meridian 96°W, origin 49°N), the usual choice
   for maps of Canada; kilometres on a sphere, y pointing down.
   The outline is src/data/canadaOutline.json (Natural Earth,
   public domain, via world-atlas 2.0.2), lon/lat rings.

   Everything is laid out in screen pixels for the width the map
   is drawn at (layoutJourney), so labels keep their size on a
   phone and the labels of nearby cities (Toronto, Ottawa,
   Montreal) are moved apart with a leader line to their dot.
========================================================= */

import { cityNamed, isFestival, mapMonth } from "./stayJourney.js";

const R = 6371;
const RAD = Math.PI / 180;
const P1 = 49 * RAD, P2 = 77 * RAD, P0 = 49 * RAD, L0 = -96 * RAD;
const t = (p) => Math.tan(Math.PI / 4 + p / 2);
const N = Math.log(Math.cos(P1) / Math.cos(P2)) / Math.log(t(P2) / t(P1));
const F = (Math.cos(P1) * Math.pow(t(P1), N)) / N;
const RHO0 = (R * F) / Math.pow(t(P0), N);

/** [lon, lat] → [x, y] in km, y down (north is up on screen). */
export function project([lon, lat]) {
  const rho = (R * F) / Math.pow(t(lat * RAD), N);
  const a = N * (lon * RAD - L0);
  return [rho * Math.sin(a), -(RHO0 - rho * Math.cos(a))];
}

/** The projected rings and their bounds. Call once per outline. */
export function projectOutline(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const xy = (rings || []).map((r) => r.map((p) => {
    const q = project(p);
    if (q[0] < x0) x0 = q[0];
    if (q[0] > x1) x1 = q[0];
    if (q[1] < y0) y0 = q[1];
    if (q[1] > y1) y1 = q[1];
    return q;
  }));
  return { rings: xy, bounds: { x0, y0, x1, y1 } };
}

/** Pixel size and the km → px mapping for a map `width` px wide (padding in px around the outline). */
export function frame(bounds, width, { top = 8, right = 8, bottom = 40, left = 8 } = {}) {
  const w = Math.max(1, width - left - right);
  const s = w / (bounds.x1 - bounds.x0);
  const height = Math.round((bounds.y1 - bounds.y0) * s + top + bottom);
  const toPx = ([x, y]) => [left + (x - bounds.x0) * s, top + (y - bounds.y0) * s];
  return { width, height, scale: s, toPx };
}

const r1 = (v) => Math.round(v * 10) / 10;

/** The outline as one SVG path ("M…Z" per ring), rings smaller than `minPx` square pixels left out. */
export function outlinePath(projected, toPx, { minPx = 0.6 } = {}) {
  let d = "";
  for (const ring of projected.rings) {
    const pts = ring.map(toPx);
    let area = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) area += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    if (Math.abs(area / 2) < minPx) continue;
    let last = "";
    d += "M";
    const parts = [];
    for (const p of pts) {
      const s = `${r1(p[0])},${r1(p[1])}`;
      if (s !== last) parts.push(s);
      last = s;
    }
    d += parts.join("L") + "Z";
  }
  return d;
}

/**
 * The route between two points as a gentle arc that bows to the left of the direction of travel, so a leg there
 * and back (Toronto → Ottawa → Toronto) draws as two separate curves. `bend`: the bow as a share of the leg's
 * length (the control point's offset, capped at `maxBow` px; the curve itself bows half that). Returns the path, its midpoint and the direction there (for an arrow), the chord's length and the curve's.
 */
export function arc(a, b, { bend = 0.32, maxBow = 120 } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;
  const bow = Math.min(len * bend, maxBow);
  // Left of travel on screen (y down): rotate the direction by -90°.
  const nx = dy / len, ny = -dx / len;
  const c = [(a[0] + b[0]) / 2 + nx * bow, (a[1] + b[1]) / 2 + ny * bow];
  const at = (u) => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
  // The curve's own length (for the draw-in animation's dashes): 32 straight pieces are plenty.
  let curve = 0;
  for (let k = 1, prev = a; k <= 32; k++) { const q = at(k / 32); curve += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  return {
    d: `M${r1(a[0])},${r1(a[1])}Q${r1(c[0])},${r1(c[1])} ${r1(b[0])},${r1(b[1])}`,
    mid: at(0.5), angle: Math.atan2(dy, dx) * 180 / Math.PI, length: len, curve: Math.ceil(curve) + 1,
  };
}

/* ---------- labels ---------- */

const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] };
const ALL = ["s", "n", "e", "w", "se", "sw", "ne", "nw"];

/**
 * A box of size w×h put `gap` px from point p in direction `dir` (its nearest side or corner facing p). `slide`
 * (-1…1) moves a box above / below the point sideways, or one beside it up and down, so it can hang off to one side
 * (a label above Vancouver that reads to the right, away from the map's edge).
 */
export function boxAt(p, dir, w, h, gap, slide = 0) {
  const [ux, uy] = DIRS[dir];
  const k = ux && uy ? Math.SQRT1_2 : 1;
  let cx = p[0] + ux * (gap * k + w / 2);
  let cy = p[1] + uy * (gap * k + h / 2);
  if (!ux) cx += slide * Math.max(0, w / 2 - 14);
  if (!uy) cy += slide * Math.max(0, h / 2 - 8);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

const overlap = (a, b, m = 0) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + m) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + m);

/** The point on box `b` nearest to p (where a leader line from p ends). */
export function nearestOnBox(p, b) {
  return [Math.min(Math.max(p[0], b.x), b.x + b.w), Math.min(Math.max(p[1], b.y), b.y + b.h)];
}

const inBox = (q, b, m = 0) => q[0] > b.x - m && q[0] < b.x + b.w + m && q[1] > b.y - m && q[1] < b.y + b.h + m;
/** Does the segment a→b pass through box r (sampled; ends excluded)? */
function crosses(a, b, r, m = 0) {
  for (let k = 1; k < 16; k++) {
    const u = k / 16;
    if (inBox([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], r, m)) return true;
  }
  return false;
}
const segsCross = (p1, p2, p3, p4) => {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return d(p1, p2, p3) * d(p1, p2, p4) < 0 && d(p3, p4, p1) * d(p3, p4, p2) < 0;
};

/**
 * Places one label per city. Every spot around a dot is scored (8 directions × a few distances, boxes above / below
 * or beside it also slid to one side): overlapping another label or dot, leaving the map, a leader line through
 * another label or across another leader, or a label nearer to another city's dot than to its own (it would read as
 * that city's) costs a lot; the city's preferred directions (best first) and short leader lines win the rest. Labels
 * go one at a time, each taking its best spot; that is tried in a few orders (most crowded first, west to east, east
 * to west, the journey's order) and the layout with the lowest total wins.
 * @param {Array<{ key, p: [x, y], w, h, prefs?: string[], r?: number, order?: number }>} items
 * @returns {Map<key, { x, y, w, h, dir, gap }>}
 */
export function placeLabels(items, opts = {}) {
  const crowd = (it) => items.filter((o) => o !== it && Math.hypot(o.p[0] - it.p[0], o.p[1] - it.p[1]) < 140).length;
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  const orders = [
    [...items].sort((a, b) => crowd(b) - crowd(a) || byOrder(a, b)),
    [...items].sort((a, b) => a.p[0] - b.p[0]),
    [...items].sort((a, b) => b.p[0] - a.p[0]),
    [...items].sort(byOrder),
  ];
  let best = null;
  for (const order of orders) {
    const r = placeInOrder(items, order, opts);
    if (!best || r.total < best.total) best = r;
  }
  return best.out;
}

function placeInOrder(items, order, { width, height, gaps = [10, 26, 46, 72, 104], margin = 6, edge = 4 } = {}) {
  const dots = items.map((it) => ({ key: it.key, x: it.p[0] - (it.r || 6), y: it.p[1] - (it.r || 6), w: 2 * (it.r || 6), h: 2 * (it.r || 6) }));
  const placed = [];
  const leaders = [];
  const out = new Map();
  let total = 0;
  for (const it of order) {
    const prefs = it.prefs || [];
    let best = null;
    for (const dir of ALL) {
      const rank = prefs.indexOf(dir);
      const lean = rank >= 0 ? rank * 6 : 80 + ALL.indexOf(dir) * 2;
      for (const gap of gaps) for (const slide of [0, 1, -1]) {
        if (slide && DIRS[dir][0] && DIRS[dir][1]) continue;   // corners don't slide
        const b = boxAt(it.p, dir, it.w, it.h, gap, slide);
        const outside = Math.max(0, edge - b.x) + Math.max(0, b.x + b.w - (width - edge)) + Math.max(0, edge - b.y) + Math.max(0, b.y + b.h - (height - edge));
        let hit = outside * 400;
        for (const o of placed) hit += overlap(b, o, margin);
        for (const d of dots) if (d.key !== it.key) hit += overlap(b, d, 2) * 3;
        const end = nearestOnBox(it.p, b);
        const own = Math.hypot(end[0] - it.p[0], end[1] - it.p[1]);
        let muddle = 0;
        for (const o of items) {
          if (o === it) continue;
          const e = nearestOnBox(o.p, b);
          const dist = Math.hypot(e[0] - o.p[0], e[1] - o.p[1]);
          if (dist < own + 6) muddle += 30 + (own + 6 - dist) * 2;
        }
        for (const o of placed) if (crosses(it.p, end, o, 1)) muddle += 60;
        for (const l of leaders) if (inBox(l[0], b) || crosses(l[0], l[1], b, 1) || segsCross(it.p, end, l[0], l[1])) muddle += 60;
        const cost = hit * 10 + muddle + gap * 0.6 + lean + (slide ? 3 : 0);
        if (!best || cost < best.cost) best = { ...b, dir, gap, cost, hit };
      }
    }
    placed.push(best);
    leaders.push([it.p, nearestOnBox(it.p, best)]);
    out.set(it.key, best);
    total += best.cost;
  }
  return { out, total };
}

/* ---------- the whole map ---------- */

const guess = (text, size) => String(text).length * size * 0.6;

/**
 * Everything the map's SVG needs at `width` px, in pixels: the frame, the outline's path, one group per city (its
 * dot, label box, numbered stops and months), the route's legs (arcs in the journey's order, with draw-in timings).
 * `projected`: projectOutline(rings). `measure(text, size, weight)` → text width in px (a guess without one).
 * Labels are 34 px tall under 520 px wide (phones), 42 px from there.
 */
export function layoutJourney(stops, width, { projected, measure = guess } = {}) {
  const small = width < 520;
  const f = frame(projected.bounds, width, { top: 6, right: 6, left: 6, bottom: small ? 30 : 40 });
  const S = small
    ? { badge: 18, city: 12, month: 10.5, padX: 6, h: 34, cityY: 14, monthY: 27, dot: 4 }
    : { badge: 22, city: 14, month: 12, padX: 8, h: 42, cityY: 18, monthY: 33, dot: 5 };
  const groups = [];
  const byCity = new Map();
  const points = stops.map((s, i) => {
    const c = cityNamed(s.city);
    if (!c) return null;
    const p = f.toPx(project([c.lon, c.lat]));
    let g = byCity.get(c.name);
    if (!g) {
      g = { key: c.name, city: c.name, p, prefs: c.label, stops: [], order: i };
      byCity.set(c.name, g);
      groups.push(g);
    }
    g.stops.push({ i, n: i + 1, festival: isFestival(s), month: s.month });
    return p;
  });
  for (const g of groups) {
    g.festival = g.stops.some((s) => s.festival);
    g.months = g.stops.map((s) => mapMonth(s.month, { short: small || g.stops.length > 1 })).join(" · ");
    const textW = Math.max(measure(g.city, S.city, 700), measure(g.months, S.month, 600));
    const badgesW = g.stops.length * S.badge + (g.stops.length - 1) * 3;
    g.w = Math.ceil(S.padX + badgesW + 7 + textW + S.padX + 2);
    g.h = S.h;
    g.r = g.festival ? S.dot + 3 : S.dot + 1;
  }
  const boxes = placeLabels(groups, { width: f.width, height: f.height });
  const legs = [];
  let along = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (!a || !b) continue;
    const leg = arc(a, b, { bend: 0.32, maxBow: f.width * 0.2 });
    if (!leg) continue;
    legs.push({ ...leg, key: i, start: along });
    along += leg.length;
  }
  for (const l of legs) { l.delay = along ? (l.start / along) * 1.6 : 0; l.dur = along ? Math.max(0.25, (l.length / along) * 1.6) : 0; }
  return { ...f, small, S, d: outlinePath(projected, f.toPx), groups, boxes, legs };
}
