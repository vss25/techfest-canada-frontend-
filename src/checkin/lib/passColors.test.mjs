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
    connect: ["Connect Pass", "#12B886"], influence: ["Influence Pass", "#2563EB"], power: ["Power Pass", "#F59F0B"],
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
