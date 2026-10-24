/* =========================================================
   TTFC Check-in: the colour each guest shows in (every card, row,
   banner and counter chip), always with words too (colour-blind safe).

   The organiser (Oct 23 2026): colour by PASS TYPE, each clearly
   different; then "Media has privilege of power pass with breakfast.
   Media yes is dark blue pass." So the colour group, first that applies:
     vip      VIP flag            gold       #F5C400  "VIP · Power Pass"
     media    Media = Yes         dark blue  #0B3D91  "Media · Connect Pass"
     speaker  Speaker Pass, or the speaker type on another pass
                                  red        #D01F2F  "Speaker Pass" / "Speaker · Power Pass"
     connect  Connect Pass        green      #12B886
     influence Influence Pass     pink       #F472B6  (Oct 23: not blue, so it can't be
                                  mistaken for Media's dark blue; dark text)
     power    Power Pass (and "All Access") orange #F59F0B
     apex     Apex Pass           violet     #8B3FD9
     other    any other pass type the data still has (shown "Other: …",
              never blank)        grey       #6B7280
   (VIP > Media > Speaker, as the door scanner's card: services/checkinCard.js.)
   No pass on file (Oct 23: "all the people whether media or exhibitor can
   be marked as arrived in lobby itself"): a speaker with no Speaker Pass
   row, Media or Exhibitor with no pass. The backend sends them as guests
   with `noPass: true` (no tier, no pass name): their colour still comes
   from the marks (Speaker red, Media dark blue, VIP gold; anyone else
   grey) and the band says "No pass on file" ("Speaker · No pass on file").
   Each person is in exactly one group, so the counters' groups add up
   to the total. Exhibitor, Media and VIP are also yes / no marks, shown
   as small chips and counted on their own (they overlap the groups).
   The pass types and marks come from the server (/api/checkin/desk
   snapshot); entitlements are never worked out here.
   Pure; node --test src/checkin/lib/passColors.test.mjs
========================================================= */

export const GROUPS = Object.freeze(["vip", "media", "speaker", "connect", "influence", "power", "apex", "other"]);

export const GROUP_COLORS = Object.freeze({
  vip: Object.freeze({ bg: "#F5C400", text: "#3D2E00", label: "VIP" }),
  media: Object.freeze({ bg: "#0B3D91", text: "#FFFFFF", label: "Media" }),
  speaker: Object.freeze({ bg: "#D01F2F", text: "#FFFFFF", label: "Speaker" }),
  connect: Object.freeze({ bg: "#12B886", text: "#04261A", label: "Connect" }),
  influence: Object.freeze({ bg: "#F472B6", text: "#3B0A24", label: "Influence" }),
  power: Object.freeze({ bg: "#F59F0B", text: "#2B1700", label: "Power" }),
  apex: Object.freeze({ bg: "#8B3FD9", text: "#FFFFFF", label: "Apex" }),
  other: Object.freeze({ bg: "#6B7280", text: "#FFFFFF", label: "Other" }),
});

const TIER_PASS = { connect: "Connect Pass", influence: "Influence Pass", power: "Power Pass", apex: "Apex Pass", speaker: "Speaker Pass" };
const TIERS = new Set(Object.keys(TIER_PASS));
const str = (v) => (typeof v === "string" ? v.trim() : "");
export const NO_PASS_LABEL = "No pass on file";

/** A guest with no pass on file (`noPass: true` from the server; also a row with neither a pass type nor a pass name). */
export function noPassOf(g) {
  if (!g) return false;
  if (g.noPass === true || g.hasPass === false) return true;
  const t = str(g.tier).toLowerCase();
  return (!t || t === "none") && !str(g.passName);
}

/** The guest's pass name: the server's, else from the tier; an unknown tier is "Other: <tier>"; none: "No pass on file". */
export function passNameOf(g) {
  if (noPassOf(g)) return NO_PASS_LABEL;
  const n = str(g?.passName);
  if (n) return n;
  const t = str(g?.tier).toLowerCase();
  if (TIER_PASS[t]) return TIER_PASS[t];
  return t ? `Other: ${t.charAt(0).toUpperCase()}${t.slice(1)}` : "Other: Pass";
}

let warned = new Set();
/** The guest's colour group (see above). */
export function groupOf(g, { log = console } = {}) {
  const m = g?.marks || {};
  if (m.vip) return "vip";
  if (m.media) return "media";
  const tier = str(g?.tier).toLowerCase();
  if (m.speaker || tier === "speaker") return "speaker";
  if (noPassOf(g)) return "other";
  if (TIERS.has(tier)) return tier;
  if (tier && tier !== "other" && !warned.has(tier)) { warned.add(tier); log.warn?.(`TTFC Check-in: unknown pass type "${tier}", shown as Other`); }
  return "other";
}
export const resetWarnings = () => { warned = new Set(); };

/**
 * What a guest's colour band says: { group, bg, text, label, sub, full }.
 *   Power Pass holder          → label "Power Pass", sub ""
 *   Media on a Connect Pass    → label "Media", sub "Connect Pass", full "Media · Connect Pass"
 *   VIP on a Power Pass        → label "VIP", sub "Power Pass"
 *   speaker type, Power Pass   → label "Speaker", sub "Power Pass"
 *   Speaker Pass               → label "Speaker Pass", sub ""
 */
export function badgeOf(g, opts) {
  const group = groupOf(g, opts);
  const c = GROUP_COLORS[group];
  const pass = passNameOf(g);
  if (noPassOf(g)) {
    // ISSUE PASS (contract C7): Speaker red or Media dark blue from the marks, else neutral (no pass colour at all).
    const m = g?.marks || {};
    const k = m.media ? "media" : m.speaker || str(g?.tier).toLowerCase() === "speaker" ? "speaker" : "";
    if (!k) return { group: "issue_pass", bg: "transparent", text: "inherit", label: NO_PASS_LABEL, sub: "", full: NO_PASS_LABEL, noPass: true, neutral: true };
    const kc = GROUP_COLORS[k];
    return { group: k, bg: kc.bg, text: kc.text, label: kc.label, sub: NO_PASS_LABEL, full: `${kc.label} · ${NO_PASS_LABEL}`, noPass: true, neutral: false };
  }
  const tierGroup = group === str(g?.tier).toLowerCase() || (group === "other" && !TIERS.has(str(g?.tier).toLowerCase()));
  const label = tierGroup ? pass : c.label;
  const sub = tierGroup ? "" : pass;
  return { group, bg: c.bg, text: c.text, label, sub, full: sub ? `${label} · ${sub}` : label, noPass: false, neutral: false };
}

/** The chips besides the colour: ISSUE PASS (no pass on file), Exhibitor, Media, VIP, Speaker, Pending. */
export function chipsOf(g) {
  const m = g?.marks || {};
  const group = badgeOf(g).group;
  const out = [];
  if (noPassOf(g)) out.push({ key: "issue_pass", label: "ISSUE PASS" });
  if (m.vip && group !== "vip") out.push({ key: "vip", label: "VIP" });
  if (m.media && group !== "media") out.push({ key: "media", label: "Media" });
  if (m.exhibitor) out.push({ key: "exhibitor", label: "Exhibitor" });
  if (m.speaker && group !== "speaker" && str(g?.tier) !== "speaker") out.push({ key: "speaker", label: "Speaker" });
  if (g?.pending) out.push({ key: "pending", label: "Pending" });
  return out;
}

/** WCAG contrast ratio of two #RRGGBB colours. */
export function contrast(a, b) {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
