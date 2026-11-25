/* =========================================================
   An event page's "Why come" section (Nov 25 2026, the owner: "where to edit its photo and text… put a photo, GIF
   or video in the media box, resize it, edit the video"). Edited per event in Admin › Event pages › Why come;
   drawn by the approved design (ApprovedSite.jsx slots, filled by LiveSite.jsx) and the admin's preview, both from
   `resolveWhy`, so they always agree.
   Unset fields = the design: "Why come", "Where <city>'s buyers, builders and policymakers meet.", the audience
   photo in a 340 px box. The design's body text is about BC's energy corridor, so it's kept for Vancouver only;
   every other event gets a neutral paragraph until staff write its own.
   Backend fields: services/cmsSchema.js event.why* (techfest-canada-backend).
========================================================= */

export const WHY_DEFAULT_PHOTO = "/ft-audience.webp";
export const WHY_DEFAULT_ALT = "A full room at The Tech Festival Canada 2026";
export const VANCOUVER_BODY = "The buy side is in the room: 70 senior people from utilities, LNG and midstream, mining, ports and data centres, alongside the technology, capital and government leaders building BC’s energy corridor. Sessions cover the North Coast Transmission Line, the LNG export chain, critical minerals and the data-centre power question, with curated 1:1 meetings to close the day.";

export const WHY_HEIGHTS = Object.freeze([
  { key: "s", label: "Small", px: 260 },
  { key: "m", label: "Medium (the design's)", px: 340 },
  { key: "l", label: "Large", px: 440 },
]);
export const WHY_FITS = Object.freeze([
  { key: "cover", label: "Fill the box (crops the edges)" },
  { key: "contain", label: "Show it whole (may leave bands)" },
]);

export const whyHeightPx = (k) => (WHY_HEIGHTS.find((h) => h.key === k) || WHY_HEIGHTS[1]).px;
/** The box's CSS height: the chosen size on computers, never taller than ~60% of a narrow screen's width. */
export const whyBoxHeight = (k) => `clamp(200px, 62vw, ${whyHeightPx(k)}px)`;

export const defaultHeading = (cityName) => `Where ${cityName || "the city"}’s buyers, builders and policymakers meet.`;
export const neutralBody = (cityName) =>
  `One day of talks, panels and curated 1:1 meetings for ${cityName || "the city"}’s technology buyers, builders and policymakers, with the capital and government leaders shaping what gets built next.`;

const isVancouver = (ev, cityId) => cityId === "van" || /vancouver/i.test(String(ev?.city || ""));
const clean = (s) => String(s ?? "").trim();
const pct = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
};

/** Only our own uploads: Sanity's image CDN. */
export const sanityImageUrl = (u) => (/^https:\/\/cdn\.sanity\.io\/images\/[\w-]+\/[\w-]+\/[\w.-]+$/i.test(clean(u)) ? clean(u) : "");
/** Only our own uploads: an MP4 on Sanity's file CDN (blob: allowed for the admin's preview of a file not yet saved). */
export const sanityVideoUrl = (u, { preview = false } = {}) => {
  const s = clean(u);
  if (preview && /^blob:/.test(s)) return s;
  return /^https:\/\/cdn\.sanity\.io\/files\/[\w-]+\/[\w-]+\/[\w.-]+\.mp4$/i.test(s) ? s : "";
};
export const isGif = (u) => /\.gif(\?|$)/i.test(clean(u)) || /-gif$/i.test(clean(u));

/** A photo for the box at a sensible size; a GIF exactly as uploaded (resizing it would stop the animation). */
export function whyImageSrc(u, width = 1200) {
  const url = sanityImageUrl(u);
  if (!url) return "";
  if (isGif(url)) return url;
  return `${url}?w=${width}&fit=max&auto=format&q=78`;
}

/** Paragraphs from the body text (blank lines split them). */
export const paragraphs = (text) => String(text || "").split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);

/**
 * Everything the section shows for one event:
 * { eyebrow, heading, body: [paragraphs], custom: {eyebrow, heading, body},
 *   media: { kind: "default" | "image" | "video", src, poster, gif, alt }, height, heightPx, boxHeight, fit, position, loop }
 * `ev` has the event's fields (whyImageUrl / whyPosterUrl as the list query names them).
 */
export function resolveWhy(ev, { cityId = "", cityName = "", preview = false } = {}) {
  const e = ev || {};
  const name = cityName || clean(e.city);
  const eyebrow = clean(e.whyEyebrow) || "Why come";
  const heading = clean(e.whyHeading) || defaultHeading(name);
  const body = paragraphs(clean(e.whyBody) || (isVancouver(e, cityId) ? VANCOUVER_BODY : neutralBody(name)));

  const video = sanityVideoUrl(e.whyVideoUrl, { preview });
  const image = preview && /^(blob|data):/.test(clean(e.whyImageUrl)) ? clean(e.whyImageUrl) : whyImageSrc(e.whyImageUrl);
  const poster = preview && /^(blob|data):/.test(clean(e.whyPosterUrl)) ? clean(e.whyPosterUrl) : whyImageSrc(e.whyPosterUrl, 1200);
  const want = e.whyMedia === "default" || e.whyMedia === "image" || e.whyMedia === "video" ? e.whyMedia : (video ? "video" : image ? "image" : "default");
  let media;
  if (want === "video" && video) media = { kind: "video", src: video, poster: poster || image || WHY_DEFAULT_PHOTO, gif: false, alt: "" };
  else if (want === "image" && image) media = { kind: "image", src: image, poster: "", gif: isGif(image) || isGif(e.whyImageUrl), alt: `${name ? `${name}: ` : ""}why come` };
  else media = { kind: "default", src: WHY_DEFAULT_PHOTO, poster: "", gif: false, alt: WHY_DEFAULT_ALT };

  const height = WHY_HEIGHTS.some((h) => h.key === e.whyHeight) ? e.whyHeight : "m";
  const fit = e.whyFit === "contain" ? "contain" : "cover";
  const x = pct(e.whyFocusX);
  const y = pct(e.whyFocusY);
  return {
    eyebrow, heading, body,
    custom: { eyebrow: !!clean(e.whyEyebrow), heading: !!clean(e.whyHeading), body: !!clean(e.whyBody) },
    media, height, heightPx: whyHeightPx(height), boxHeight: whyBoxHeight(height), fit,
    position: `${x === null ? 50 : x}% ${y === null ? 50 : y}%`,
    loop: e.whyLoop !== false,
  };
}
