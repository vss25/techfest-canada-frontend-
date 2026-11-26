/* The website content workflow's plain helpers (save → staging → live); components in workflow.jsx. */

/* The staging website: the redesign's Vercel preview until it's the live site. */
export const STAGING_ORIGIN = (import.meta.env && import.meta.env.VITE_STAGING_URL)
  || "https://techfest-canada-frontend-git-redesign-step2-site-ttfc-projects.vercel.app";

/** True when this panel is the staging site's (the new design's), not the live website's. Kept here, not in
    lib/preview.js, because the live website's code has no such file until the new design launches. */
export function onStagingSite() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return window.location.origin === STAGING_ORIGIN || (/\.vercel\.app$/.test(host) && host !== "techfest-canada-frontend.vercel.app");
}

/** The page on the staging site, showing what's been sent to staging (staff signed in there). */
export function stagingUrl(path = "/") {
  const onStaging = typeof window !== "undefined" && (window.location.origin === STAGING_ORIGIN || /\.vercel\.app$/.test(window.location.hostname) || /^localhost$|^127\./.test(window.location.hostname));
  const url = new URL(path || "/", onStaging ? window.location.origin : STAGING_ORIGIN);
  url.searchParams.set("preview", "1");
  return url.toString();
}

/** Where one item is: { tone, label }. Rows come from GET /api/cms/:type?drafts=1. */
export function changeState(doc) {
  if (!doc) return null;
  if (doc.hasDraft) return { tone: "warn", label: doc.unpublished ? "New, not sent" : "Saved, not sent" };
  if (doc.staged) return { tone: "purple", label: doc.unpublished ? "New, on staging" : "On staging" };
  if (doc.unpublished) return { tone: "warn", label: "Not on the website" };
  return null;
}
