/* node --test src/lib/canadaMap.test.mjs: the map of Canada for the TTFC 2027 journey — the outline data (Natural
   Earth via world-atlas 2.0.2), the projection, the route's arcs and the labels (inside the map, never on top of
   each other) at phone, tablet and desktop widths. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { arc, frame, layoutJourney, nearestOnBox, outlinePath, placeLabels, project, projectOutline } from "./canadaMap.js";
import { CITIES, DEFAULT_JOURNEY, blankStop } from "./stayJourney.js";

const FILE = new URL("../data/canadaOutline.json", import.meta.url);
const outline = JSON.parse(fs.readFileSync(FILE, "utf8"));
const projected = projectOutline(outline.rings);

test("the outline: Natural Earth (public domain) via world-atlas 2.0.2, lon/lat rings, light enough for the page", () => {
  assert.ok(fs.statSync(FILE).size < 60 * 1024, "under 60 KB");
  assert.match(outline.source, /Natural Earth/);
  assert.match(outline.source, /public domain/);
  assert.match(outline.source, /world-atlas 2\.0\.2/);
  assert.match(outline.source, /\b124\b/, "Canada's feature id");
  assert.ok(outline.rings.length >= 20, "the mainland and the larger islands");
  for (const ring of outline.rings) {
    assert.ok(ring.length >= 3);
    for (const [lon, lat] of ring) {
      assert.ok(lon >= -141.1 && lon <= -52 && lat >= 41.6 && lat <= 83.2, `${lon},${lat} is in Canada's box`);
      assert.equal(Math.round(lon * 100) / 100, lon);
    }
  }
});

const inside = ([x, y], ring) => {
  let ok = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
};
const toEdge = (p, ring) => {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
};

test("every city is on the land (or within a few km of the simplified coast)", () => {
  for (const c of CITIES) {
    const p = project([c.lon, c.lat]);
    const on = projected.rings.some((r) => inside(p, r));
    const near = Math.min(...projected.rings.map((r) => toEdge(p, r)));
    assert.ok(on || near < 15, `${c.name}: ${on ? "inside" : `${near.toFixed(1)} km off`}`);
  }
});

test("the projection: north up, east right, 96°W in the middle, distances about right", () => {
  const t = project([-79.3832, 43.6532]), v = project([-123.1207, 49.2827]), e = project([-113.4938, 53.5461]), c = project([-114.0719, 51.0447]);
  assert.ok(t[0] > v[0], "Toronto is east of Vancouver");
  assert.ok(e[1] < c[1], "Edmonton is above Calgary");
  assert.ok(Math.abs(project([-96, 60])[0]) < 1e-6);
  assert.ok(Math.abs(Math.hypot(t[0] - v[0], t[1] - v[1]) - 3360) < 120, "Toronto–Vancouver ≈ 3,360 km");
});

test("frame and outline path: fit the width, keep the shape", () => {
  const f = frame(projected.bounds, 600, { top: 0, right: 0, bottom: 0, left: 0 });
  assert.equal(f.width, 600);
  const ratio = (projected.bounds.y1 - projected.bounds.y0) / (projected.bounds.x1 - projected.bounds.x0);
  assert.ok(Math.abs(f.height / 600 - ratio) < 0.01);
  const d = outlinePath(projected, f.toPx);
  assert.match(d, /^M[\d.]+,[\d.]+L/);
  assert.ok(d.split("Z").length - 1 >= 20, "one closed ring per island");
  assert.ok(d.length < 80000);
});

test("arc: bows to the left of travel, so there and back are two curves; nothing for a leg that doesn't move", () => {
  const east = arc([0, 100], [200, 100]);
  const west = arc([200, 100], [0, 100]);
  assert.ok(east.mid[1] < 100, "going east (right) it bows up (north)");
  assert.ok(west.mid[1] > 100, "coming back it bows down");
  assert.ok(east.curve > east.length, "the curve is longer than the chord");
  assert.equal(Math.round(east.angle), 0);
  assert.equal(Math.round(west.angle), 180);
  assert.equal(arc([5, 5], [5, 5]), null);
});

const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

for (const width of [343, 375, 560, 736, 1000]) {
  test(`the organiser's journey at ${width} px: one label per city, inside the map, none on top of another`, () => {
    const L = layoutJourney(DEFAULT_JOURNEY, width, { projected });
    assert.equal(L.width, width);
    assert.deepEqual(L.groups.map((g) => g.city), ["Vancouver", "Montreal", "Calgary", "Toronto", "Ottawa"]);
    const toronto = L.groups.find((g) => g.city === "Toronto");
    assert.deepEqual(toronto.stops.map((s) => [s.n, s.festival]), [[4, false], [6, true]], "Toronto shows both its stops, the festival marked");
    assert.equal(toronto.festival, true);
    assert.equal(toronto.months, "Jun · Nov", "two stops: short months");
    assert.equal(L.groups.find((g) => g.city === "Vancouver").months, width < 520 ? "Feb" : "February");
    const boxes = L.groups.map((g) => L.boxes.get(g.key));
    for (const [i, b] of boxes.entries()) {
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= width && b.y + b.h <= L.height, `${L.groups[i].city}'s label is on the map`);
      for (const o of boxes.slice(i + 1)) assert.equal(overlap(b, o), 0, `${L.groups[i].city}'s label is clear`);
      // Its own dot is the nearest one to its label (so the label reads as that city's).
      const own = Math.hypot(...nearestOnBox(L.groups[i].p, b).map((v, k) => v - L.groups[i].p[k]));
      for (const g of L.groups) if (g !== L.groups[i]) assert.ok(Math.hypot(...nearestOnBox(g.p, b).map((v, k) => v - g.p[k])) + 0.5 >= own - 12, `${L.groups[i].city} vs ${g.city}`);
    }
    assert.equal(L.legs.length, 5, "five legs between six stops");
    assert.ok(L.legs.every((l) => l.delay >= 0 && l.dur > 0 && /^M[\d.]+,[\d.]+Q/.test(l.d)));
  });
}

test("a staff-made journey: any known cities, a city twice in a row draws no leg, unknown cities are left off the map", () => {
  const stops = [blankStop("Halifax", "May 2027"), blankStop("Halifax", "June 2027"), { ...blankStop("Toronto"), city: "Atlantis" }, blankStop("St. John's", "")];
  const L = layoutJourney(stops, 400, { projected });
  assert.deepEqual(L.groups.map((g) => [g.city, g.stops.map((s) => s.n)]), [["Halifax", [1, 2]], ["St. John's", [4]]]);
  assert.equal(L.legs.length, 0, "Halifax → Halifax doesn't move; Atlantis isn't on the map");
  assert.equal(L.groups[1].months, "TBA");
  const all = layoutJourney(CITIES.map((c) => blankStop(c.name, "March 2027")).slice(0, 12), 1000, { projected });
  assert.equal(all.groups.length, 12);
  const boxes = all.groups.map((g) => all.boxes.get(g.key));
  assert.ok(boxes.every((b) => b.x >= 0 && b.x + b.w <= 1000), "twelve cities still fit");
});

test("placeLabels: a crowded pair goes to their preferred sides", () => {
  const m = placeLabels([
    { key: "a", p: [100, 100], w: 60, h: 30, prefs: ["w"], order: 0 },
    { key: "b", p: [110, 100], w: 60, h: 30, prefs: ["e"], order: 1 },
  ], { width: 300, height: 200 });
  assert.ok(m.get("a").x + m.get("a").w <= 100, "a's label is to its left");
  assert.ok(m.get("b").x >= 110, "b's label is to its right");
});
