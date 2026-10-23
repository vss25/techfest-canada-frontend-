/* =========================================================
   Media = Yes in the admin panel (Oct 23 2026)
   ---------------------------------------------------------
   The organiser: "Media has privilege of power pass with
   breakfast. Media yes is dark blue pass." and "update the
   admin panel to include media yes/no too".
   Media is a yes / no mark on a person (their account's media
   type, or their passes when they have no account), switched
   with PATCH /console/people/:id { media }. The server decides
   what it gives (backend services/passExtras.js: everything a
   Power Pass gets plus the CxO Breakfasts, on any pass) and
   which colour a person's pass is (services/checkinCard.js:
   VIP gold > Media dark blue > Speaker > Staff > Volunteer >
   the pass in green, sent as `band`); this file only names
   them and reads what the server sent. No imports, so it runs
   under node: node --test src/admin/people/mediaMark.test.mjs
========================================================= */

/** The dark-blue mark and band (the same colours as the door card and the apps' Profile page). */
export const MEDIA = Object.freeze({ key: "media", label: "Media", bg: "#0B3D91", text: "#FFFFFF" });
/** What Media = Yes gives, in the organiser's words. */
export const MEDIA_HELP = "Media: Power Pass privileges with CxO Breakfasts";
/** The People filter "Media?": Yes / No (the empty choice is All). */
export const MEDIA_FILTER = Object.freeze({
  key: "media", label: "Media?", any: "All",
  options: Object.freeze([Object.freeze({ key: "yes", label: "Yes" }), Object.freeze({ key: "no", label: "No" })]),
});

/** Is this person (a People row or profile) Media = Yes? The server's `media`; an older server: their types. */
export const isMedia = (p) => (typeof p?.media === "boolean" ? p.media : Array.isArray(p?.types) && p.types.includes("media"));

/** Their types for the type badges: Media has its own dark-blue mark, so it isn't listed twice. */
export const otherTypes = (types) => (Array.isArray(types) ? types.filter((t) => t !== "media") : []);

/** A pass list's Media mark (Give a pass, Exhibitor passes): the person holding it as People has them when the
    server knows (`personMedia`), else the pass's own mark (`media`). */
export const passRowMedia = (r) => (typeof r?.personMedia === "boolean" ? r.personMedia : r?.media === true);

const HEX = /^#[0-9a-f]{6}$/i;
const str = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * The pass colour chip from the server's `band` ({ key, label, bg, text, passName }), or null (no pass, or an
 * older server that sends none: the page then shows the pass's name as before).
 * → { key, label, sub, bg, color, title } where `label` is the band's word ("Media", "VIP", "Speaker",
 *   or the pass's name on the green band) and `sub` the pass's name, shown small, when the label isn't it:
 *   "Media · Connect Pass".
 */
export function bandChip(band) {
  if (!band || !HEX.test(str(band.bg)) || !HEX.test(str(band.text)) || !str(band.label)) return null;
  const label = str(band.label);
  const passName = str(band.passName);
  const sub = passName && passName.toLowerCase() !== label.toLowerCase() ? passName : "";
  return {
    key: str(band.key) || "pass", label, sub, bg: band.bg, color: band.text,
    title: `Pass colour: ${sub ? `${label} · ${sub}` : label}. What door staff see at check-in.`,
  };
}
