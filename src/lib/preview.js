/* =========================================================
   Website preview for staff (redesign step 1, Nov 2026).
   The admin panel's Preview button opens a page with ?preview=1.
   While preview is on (this tab only) and a staff token is in
   localStorage, every CMS read goes through the backend's
   POST /api/cms/preview, which answers with unpublished drafts
   layered over published content. Visitors never see drafts:
   without a staff token the flag does nothing, and the backend
   refuses anyone who isn't staff.
   ?preview=0 (or the bar's Exit button) turns it off.
========================================================= */

const KEY = "ttfc.preview";

/* The same backend as the admin panel (src/admin/api.js ADMIN_API), read safely outside Vite too. */
export const PREVIEW_API = (import.meta.env && import.meta.env.VITE_ADMIN_API_URL) || "https://techfest-canada-backend.onrender.com/api";

function readToken() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

/* ---------- The staging site (Nov 2026) ----------
   The redesign's Vercel preview is the staging environment: staff signed in there see
   what's been sent to staging (Admin › Changes) without needing ?preview=1, and every
   visitor sees the staging banner (components/PreviewBar.jsx). */

/** The live site's own vercel.app address: never staging. */
const PRODUCTION_HOSTS = ["techfest-canada-frontend.vercel.app"];

/** True on the staging site: a Vercel preview build (Vercel sets VITE_VERCEL_ENV), or any other
    *.vercel.app address of the project. Locally, ?staging=1 turns it on for this tab. */
export function isStagingSite() {
  if (typeof window === "undefined") return false;
  const env = import.meta.env || {};
  if (env.VITE_VERCEL_ENV === "preview" || env.VITE_STAGING === "1") return true;
  const host = window.location.hostname;
  if (/\.vercel\.app$/.test(host) && !PRODUCTION_HOSTS.includes(host)) return true;
  try {
    const q = new URLSearchParams(window.location.search).get("staging");
    if (q === "1" && /^(localhost|127\.)/.test(host)) sessionStorage.setItem("ttfc.staging", "1");
    return sessionStorage.getItem("ttfc.staging") === "1";
  } catch { return false; }
}

/* When the staging link stops working (the Vercel share link's expiry). Set VITE_STAGING_UNTIL
   (ISO time) on Vercel's Preview environment when a new link is made; this is the current one. */
export const STAGING_UNTIL_DEFAULT = "2026-11-18T14:35:00-05:00";
export function stagingUntil() {
  const raw = (import.meta.env && import.meta.env.VITE_STAGING_UNTIL) || STAGING_UNTIL_DEFAULT;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** "Wed, Nov 18, 2:35 PM ET" (Toronto time). */
export function formatStagingUntil(d) {
  if (!d) return "";
  return `${d.toLocaleString("en-US", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET`;
}

/** Reads ?preview=1 / ?preview=0 from the address once, at start-up. */
export function initPreviewFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const p = new URLSearchParams(window.location.search).get("preview");
    if (p === "1") sessionStorage.setItem(KEY, "1");
    if (p === "0") sessionStorage.setItem(KEY, "0");
  } catch { /* storage blocked: no preview */ }
}

/* Asked for: ?preview=1 on any site; on the staging site, unless this tab chose live content. */
function asked() {
  try {
    const v = sessionStorage.getItem(KEY);
    return isStagingSite() ? v !== "0" : v === "1";
  } catch { return isStagingSite(); }
}

/** True when this tab shows staged content: asked for it and a staff token is present. */
export function isPreview() {
  if (typeof window === "undefined") return false;
  return asked() && !!readToken();
}

/** True when this tab asked for staged content, signed in or not. */
export function wantsPreview() {
  if (typeof window === "undefined") return false;
  return asked();
}

/** Show staged content again in this tab (the staging banner's button). */
export function enterPreview() {
  try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  window.location.reload();
}

export function previewToken() {
  return readToken();
}

/** Turn preview off and reload the page as visitors see it. */
export function exitPreview() {
  try { sessionStorage.setItem(KEY, "0"); } catch { /* ignore */ }
  const url = new URL(window.location.href);
  url.searchParams.delete("preview");
  window.location.replace(url.toString());
}

/** The website address the admin panel's Preview button opens. */
export function previewUrl(path) {
  const url = new URL(path || "/", window.location.origin);
  url.searchParams.set("preview", "1");
  return url.toString();
}

/* Reads that failed in preview fall back to published content; the bar says so. */
let previewFailed = "";
export function notePreviewFailure(message) {
  previewFailed = message || "Couldn't load unpublished changes.";
  try { window.dispatchEvent(new Event("ttfc:preview-failed")); } catch { /* ignore */ }
}
export const previewFailure = () => previewFailed;
