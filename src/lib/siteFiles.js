/* =========================================================
   The website's two large files: the home page video and the
   brochure PDF. Management uploads them in Admin › Site settings
   › Large site files; they then come from Sanity's CDN (app
   content keys site.hero_video_url / site.brochure_url, read by
   useSiteSettings), not from every Vercel deploy. While a key is
   empty the website uses its own copy (`fallback`).

   The still frame (hero-poster.jpg, frame 0 of the video) and the
   brochure cover (page 1) stay in public/: they're small.
========================================================= */
import { safeUrl } from "../hooks/useSiteSettings";
import { isMobileDevice } from "./pwaPlatform";

export const SITE_FILES = {
  heroVideo: { key: "site.hero_video_url", fallback: "/hero-bg.mp4" },
  brochure: { key: "site.brochure_url", fallback: "/Brochure.pdf" },
};

export const HERO_POSTER = "/hero-poster.jpg";
export const BROCHURE_COVER = "/brochure-cover.jpg";
export const BROCHURE_FILENAME = "TechFestivalCanada_2026_Brochure.pdf";

/** Where a file is served from now: the uploaded copy, else the built-in one. */
export const siteFileUrl = (site, id) => safeUrl(site?.[SITE_FILES[id].key]) || SITE_FILES[id].fallback;

/** True for files on Sanity's CDN (vs the website's own copy). */
export const isCdnFile = (url) => /^https:\/\/cdn\.sanity\.io\//i.test(String(url || ""));

/** A link that downloads with our file name. Browsers ignore `download` on other sites' files,
    so the CDN copy gets Sanity's ?dl= instead. */
export function downloadUrl(url, filename) {
  if (!isCdnFile(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}dl=${encodeURIComponent(filename)}`;
}

/** The home hero shows the still frame instead of the video on phones and tablets,
    with data saver on, and for reduced motion. Decided before the first paint, so the
    video isn't requested at all there. */
export function heroStillOnly() {
  if (typeof window === "undefined") return true;
  try {
    if (navigator.connection?.saveData) return true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  } catch { /* old browser: go by the device */ }
  return isMobileDevice();
}
