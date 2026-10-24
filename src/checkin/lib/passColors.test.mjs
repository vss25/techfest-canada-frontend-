/* node --test src/checkin/lib/passColors.test.mjs: every pass type the backend can send has its own colour and name,
   anything else is "Other: …" in grey (never blank), Media = Yes is dark blue labelled "Media · <pass>", VIP gold above
   it, speakers red, the yes / no chips, and readable text on every colour. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GROUPS, GROUP_COLORS, badgeOf, chipsOf, contrast, groupOf, passNameOf, resetWarnings } from "./passColors.js";

const quiet = { log: { warn: () => {} } };
const g = (tier, marks = {}, extra = {}) => ({ tier, passName: "", marks: { vip: false, media: false, speaker: false, exhibitor: false, ...marks }, ...extra });

test("every pass type the backend produces (services/checkinDesk.js DESK_TIERS) maps to its own colour and label", () => {
  const want = {
    connect: ["Connect Pass", "#12B886"], influence: ["Influence Pass", "#F472B6"], power: ["Power Pass", "#F59F0B"],
    apex: ["Apex Pass", "#8B3FD9"], speaker: ["Speaker Pass", "#D01F2F"],
  };
  for (const [tier, [label, bg]] of Object.entries(want)) {
    const b = badgeOf(g(tier));
    assert.deepEqual([b.group, b.label, b.sub, b.bg], [tier, label, "", bg], tier);
  }
  // The server's "other": its own name, grey.
  const other = badgeOf(g("other", {}, { passName: "Other: Discover" }));
  assert.deepEqual([other.group, other.label, other.bg], ["other", "Other: Discover", "#6B7280"]);
  // A tier this app doesn't know (a newer server): grey, named, logged once, never blank.
  resetWarnings();
  const logged = [];
  const odd = badgeOf(g("galaxy"), { log: { warn: (m) => logged.push(m) } });
  badgeOf(g("galaxy"), { log: { warn: (m) => logged.push(m) } });
  assert.deepEqual([odd.group, odd.label], ["other", "Other: Galaxy"]);
  assert.equal(logged.length, 1);
  assert.equal(badgeOf(g("")).label, "Other: Pass");
  // Clearly different colours, one per group.
  assert.equal(new Set(GROUPS.map((k) => GROUP_COLORS[k].bg)).size, GROUPS.length);
});

test("Media = Yes is a dark-blue pass labelled Media · <pass>; VIP gold above it; Media above Speaker", () => {
  const m = badgeOf(g("connect", { media: true }, { passName: "Connect Pass" }));
  assert.deepEqual([m.group, m.bg, m.text, m.label, m.sub, m.full], ["media", "#0B3D91", "#FFFFFF", "Media", "Connect Pass", "Media · Connect Pass"]);
  const vipMedia = badgeOf(g("power", { vip: true, media: true }, { passName: "Power Pass" }));
  assert.deepEqual([vipMedia.group, vipMedia.full, vipMedia.bg], ["vip", "VIP · Power Pass", "#F5C400"]);
  assert.equal(groupOf(g("speaker", { media: true })), "media");
  assert.equal(groupOf(g("power", { speaker: true })), "speaker");
  assert.equal(badgeOf(g("power", { speaker: true }, { passName: "Power Pass" })).full, "Speaker · Power Pass");
  assert.equal(badgeOf(g("speaker", { speaker: true }, { passName: "Speaker Pass" })).full, "Speaker Pass");
  // Exhibitor is a mark, not a colour: still a Connect Pass in green.
  assert.equal(badgeOf(g("connect", { exhibitor: true })).group, "connect");
});

test("yes / no chips: Exhibitor, Media, VIP, Speaker and Pending, never repeating the colour band", () => {
  assert.deepEqual(chipsOf(g("connect", { exhibitor: true }, { pending: true })).map((c) => c.label), ["Exhibitor", "Pending"]);
  assert.deepEqual(chipsOf(g("power", { vip: true, media: true })).map((c) => c.label), ["Media"], "VIP is the band; Media still shown");
  assert.deepEqual(chipsOf(g("connect", { media: true })).map((c) => c.label), [], "Media is the band");
  assert.deepEqual(chipsOf(g("speaker", { speaker: true })).map((c) => c.label), []);
});

test("pass names from the tier when the server sent none", () => {
  assert.equal(passNameOf({ tier: "apex" }), "Apex Pass");
  assert.equal(passNameOf({ tier: "power", passName: "Power Pass" }), "Power Pass");
  assert.equal(passNameOf({}), "Other: Pass");
});

test("the words on every colour are readable at arm's length (contrast ≥ 4.5:1)", () => {
  for (const k of GROUPS) {
    const c = GROUP_COLORS[k];
    assert.ok(contrast(c.bg, c.text) >= 4.5, `${k}: ${contrast(c.bg, c.text).toFixed(2)}`);
  }
});

/* CIEDE2000 colour difference (how different two colours look; ~2 is just noticeable, the old blue Influence was 16
   from Media's dark blue). */
function deltaE00(c1, c2) {
  const lab = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const X = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047); const Y = f(r * 0.2126 + g * 0.7152 + b * 0.0722); const Z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
    return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
  };
  const [L1, a1, b1] = lab(c1); const [L2, a2, b2] = lab(c2);
  const rad = Math.PI / 180;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1; const a2p = (1 + G) * a2;
  const C1 = Math.hypot(a1p, b1); const C2 = Math.hypot(a2p, b2);
  const hue = (a, b) => { const h = Math.atan2(b, a) / rad; return h < 0 ? h + 360 : h; };
  const h1 = hue(a1p, b1); const h2 = hue(a2p, b2);
  let dh = h2 - h1; if (C1 * C2 === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1 * C2) * Math.sin((dh * rad) / 2);
  const Lb = (L1 + L2) / 2; const Cbp = (C1 + C2) / 2;
  let hb = h1 + h2; if (C1 * C2 !== 0) hb = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const RT = -Math.sin(2 * 30 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad) * 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2); const SC = 1 + 0.045 * Cbp; const SH = 1 + 0.015 * Cbp * T;
  return Math.sqrt(((L2 - L1) / SL) ** 2 + ((C2 - C1) / SC) ** 2 + (dH / SH) ** 2 + RT * ((C2 - C1) / SC) * (dH / SH));
}

test("Influence is pink, clearly apart from every other colour (not a blue next to Media's dark blue)", () => {
  const inf = GROUP_COLORS.influence.bg;
  // Not a blue: its hue is outside 190°–260°.
  const n = parseInt(inf.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b);
  let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
  h = (h * 60 + 360) % 360;
  assert.ok(h < 190 || h > 260, `hue ${h.toFixed(0)}`);
  for (const k of GROUPS.filter((x) => x !== "influence")) {
    const d = deltaE00(inf, GROUP_COLORS[k].bg);
    assert.ok(d >= 25, `${k}: ${d.toFixed(1)}`);
  }
  assert.ok(deltaE00("#2563EB", GROUP_COLORS.media.bg) < 20, "the old blue was the problem (sanity check of the measure)");
});
