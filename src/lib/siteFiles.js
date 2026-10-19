/* =========================================================
   The website's two large files: the home page video and the
   brochure PDF. They live on Sanity's CDN, not in public/ (every
   Vercel deploy stored them). `fallback` is the copy management
   uploaded in Admin › Site settings › Large site files; a newer
   upload there (app content keys site.hero_video_url /
   site.brochure_url, read by useSiteSettings) takes over without
   a deploy. Old links to /hero-bg.mp4 and /Brochure.pdf (brochure
   emails) are redirected to the CDN in vercel.json.

   The still frame (hero-poster.jpg, frame 0 of the video) and the
   brochure cover (page 1) stay in public/: they're small.
========================================================= */
import { safeUrl } from "../hooks/useSiteSettings";
import { isMobileDevice } from "./pwaPlatform";

export const SITE_FILES = {
  heroVideo: { key: "site.hero_video_url", fallback: "https://cdn.sanity.io/files/021qtoci/production/9e77820d673c4b43564d7223bdc0810ecee69792.mp4" },
  brochure: { key: "site.brochure_url", fallback: "https://cdn.sanity.io/files/021qtoci/production/a35dec187892472e9850a72170ec1168a6e783c7.pdf" },
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
