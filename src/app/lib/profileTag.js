/* =========================================================
   The colour of your own Profile screen (Oct 20 2026)
   ---------------------------------------------------------
   The server decides who is what: GET /auth/me `profileTag`
   ({ key, label } or null; backend services/profileTag.js):
   VIP > Media > Speaker > Staff > Volunteer > any other pass
   holder (their pass, or "Exhibitor") > nothing. Only the
   Profile screen uses it: a glow at the screen's edge in the
   colour (upper half), and a pill under the name / job title /
   company (colour and an icon, no words), so door staff can tell
   the pass from a distance (the icon is there for anyone who
   can't tell the colours apart).
   Same colours as the iOS and Android apps.
========================================================= */

/** Background and text colour of each tag (text on the pill; the glow uses `bg`). */
export const PROFILE_TAG_COLORS = Object.freeze({
  vip: { bg: "#F5C400", text: "#3D2E00", rgb: "245, 196, 0" },
  media: { bg: "#0B3D91", text: "#FFFFFF", rgb: "11, 61, 145" },
  speaker: { bg: "#D01F2F", text: "#FFFFFF", rgb: "208, 31, 47" },
  staff: { bg: "#7B2FD0", text: "#FFFFFF", rgb: "123, 47, 208" },
  volunteer: { bg: "#FF6B00", text: "#3A1500", rgb: "255, 107, 0" },
  pass: { bg: "#18A957", text: "#052E16", rgb: "24, 169, 87" },
});

const FIXED = { vip: "VIP", media: "Media", speaker: "Speaker", staff: "Staff", volunteer: "Volunteer" };

/** { key, label, text, colors } for the screen, or null (no pass and no tag, or an older server). `text`: the pill's
    name for screen readers ("Pass colour: <text>"; the pill shows no words): "VIP" … "Volunteer", a pass with " Pass"
    ("Power Pass"), "Exhibitor" as it is. */
export function profileTagView(tag) {
  const key = String(tag?.key || "");
  const colors = PROFILE_TAG_COLORS[key];
  if (!colors) return null;
  const label = String(tag?.label || "").trim() || FIXED[key] || "";
  if (!label) return null;
  const text = key === "pass" && !/^exhibitor$/i.test(label) && !/\bpass$/i.test(label) ? `${label} Pass` : label;
  return { key, label, text, colors };
}
