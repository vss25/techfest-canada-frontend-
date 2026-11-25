/* =========================================================
   The shade over an event's hero photo or video (Nov 25 2026, the owner: "Can I add gradient to them?").
   Staff pick it per event in Admin › Event pages › Top of the page (Sanity event field heroShade); the website
   draws it with CSS over the photo / video, so the video file itself never changes and it costs nothing.
   "default" (or no value) is exactly the look before this setting existed. The text sits on the left, so every
   choice keeps some shade there except "none".
     heroShadeBackground("strong", "full") → CSS background for the full event page's hero
     variant "soon": the coming-soon page (a little darker by default); "phoneFull" / "phoneSoon": the phone
     layout of each, shaded from the bottom up
========================================================= */

export const HERO_SHADES = Object.freeze([
  { key: "default", label: "Standard", hint: "The usual dark fade behind the text." },
  { key: "light", label: "Light", hint: "Less shade: more of the photo or video shows." },
  { key: "strong", label: "Strong", hint: "More shade: easiest to read over a busy video." },
  { key: "brand", label: "TTFC tint", hint: "The standard fade with a magenta and violet glow." },
  { key: "none", label: "None", hint: "No shade. Only for dark footage: the text may be hard to read." },
]);

// [alpha at the start, in the middle, at the end], where the middle stop is, and the direction.
const BASE = {
  full: { a: [0.75, 0.35, 0], mid: 55, deg: 90 },
  soon: { a: [0.85, 0.45, 0.15], mid: 60, deg: 90 },
  phoneFull: { a: [0.85, 0.35, 0.1], mid: 55, deg: 0 },
  phoneSoon: { a: [0.9, 0.4, 0.15], mid: 60, deg: 0 },
};
const SCALE = { default: 1, light: 0.55, strong: 1.25, brand: 1, none: 0 };
const NAVY = "21,16,53";

export const shadeKey = (v) => (HERO_SHADES.some((s) => s.key === v) ? v : "default");

/** The CSS `background` of the shade layer ("none" → "transparent"). */
export function heroShadeBackground(level, variant = "full") {
  const key = shadeKey(level);
  const { a: [a, b, c], mid, deg } = BASE[variant] || BASE.full;
  const k = SCALE[key];
  if (!k) return "transparent";
  const al = (x) => Math.min(0.95, Math.round(x * k * 100) / 100);
  const fade = `linear-gradient(${deg}deg, rgba(${NAVY},${al(a)}) 0%, rgba(${NAVY},${al(b)}) ${mid}%, rgba(${NAVY},${al(c)}) 100%)`;
  if (key !== "brand") return fade;
  return `radial-gradient(60% 70% at 85% 20%, rgba(214,48,140,0.30), transparent 70%), radial-gradient(55% 60% at 10% 90%, rgba(127,90,240,0.32), transparent 70%), ${fade}`;
}
