/* =========================================================
   How the top of an event page frames its photo / video (Nov 25 2026, the owner: "The video is slightly cropped
   from bottom. how can I allow to adjust cropping or increasing the hero image/hero video area?").
   Set per event in Admin › Event pages › Top of the page:
     heroFocus  0–100: which part stays in view when the picture is cropped (0 = the top, 100 = the bottom).
                Unset = the design's own framing for that city.
     heroHeight "standard" | "tall" | "full": how tall the top of the page is. Unset = full screen (Nov 25 2026, the
                owner: "make the hero video/image full screen"): the first screen below the header (computers, 68 px)
                and, on phones, between the header (64 px) and the ticket bar (81 px). Never shorter than standard.
   The picture always fills the area (object-fit: cover), so a taller area crops less from a wide video.
========================================================= */

export const HERO_HEIGHTS = Object.freeze([
  { key: "standard", label: "Standard" },
  { key: "tall", label: "Taller" },
  { key: "full", label: "Full screen (default)" },
]);

// Desktop: the full page / the coming-soon page (min-height). Phone: the same two (height).
const SIZES = {
  standard: { full: "540px", soon: "460px", phoneFull: "420px", phoneSoon: "380px" },
  tall: { full: "680px", soon: "600px", phoneFull: "560px", phoneSoon: "500px" },
  full: {
    full: "max(540px, calc(100vh - 68px))", soon: "max(460px, calc(100vh - 68px))",
    phoneFull: "max(420px, calc(100dvh - 145px))", phoneSoon: "max(380px, calc(100dvh - 145px))",
  },
};

export const heightKey = (v) => (SIZES[v] ? v : "full");
/** The home page's hero, always full screen: computers (min-height) and phones (height). */
export const HOME_HEIGHTS = Object.freeze({ desktop: "max(640px, calc(100vh - 68px))", phone: "max(520px, calc(100dvh - 145px))" });
export const heroHeights = (level) => SIZES[heightKey(level)];

/** A 0–100 focus as a valid number, or null (unset / not a number). */
export function focusOf(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

/** CSS object-position for a focus, else the fallback (the design's framing). */
export function heroPosition(focus, fallback = "center") {
  const f = focusOf(focus);
  return f === null ? fallback : `50% ${f}%`;
}

/** Width ÷ height of the area, for the admin's previews (a 1280 px wide computer, a 375 px phone). */
export function previewAspect(level, kind) {
  // Full screen: a 1280 × 800 laptop (732 px below the header) and a 375 × 812 phone (667 px between the bars).
  const px = (s, fallbackPx) => (/^\d+px$/.test(s) ? parseInt(s, 10) : fallbackPx);
  const sz = heroHeights(level);
  return kind === "phone" ? 375 / px(sz.phoneFull, 667) : 1280 / px(sz.full, 732);
}
