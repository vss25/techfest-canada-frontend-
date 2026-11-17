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

/** Reads ?preview=1 / ?preview=0 from the address once, at start-up. */
export function initPreviewFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const p = new URLSearchParams(window.location.search).get("preview");
    if (p === "1") sessionStorage.setItem(KEY, "1");
    if (p === "0") sessionStorage.removeItem(KEY);
  } catch { /* storage blocked: no preview */ }
}

/** True when this tab is previewing and a staff token is present. */
export function isPreview() {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(KEY) === "1" && !!readToken(); } catch { return false; }
}

export function previewToken() {
  return readToken();
}

/** Turn preview off and reload the page as visitors see it. */
export function exitPreview() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
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
