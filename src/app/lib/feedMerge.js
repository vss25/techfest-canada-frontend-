/* =========================================================
   The feed refresh (lib/social.js): a fresh page from the server
   never makes a post disappear that the app has already shown,
   unless it's known to be gone. Pure, so
   `node --test src/app/lib/feedMerge.test.mjs` runs it.
========================================================= */

const time = (p) => Date.parse(p?.createdAt) || 0;

/**
 * `fresh`: the server's page (newest first, at most `limit`); `shown`: what's on screen; `removed`: ids known to
 * be gone (deleted / removed / 404). Posts on screen that the page leaves out, and that are newer than its
 * oldest post (any age when the page isn't full), stay in place and come back in `check`, for the caller to
 * look up one by one. → { feed, check }
 */
export function mergeFeed(fresh, shown, removed = new Set(), limit = 60) {
  const ids = new Set(fresh.map((p) => p.id));
  const oldest = fresh.length >= limit ? Math.min(...fresh.map(time)) : -Infinity;
  const check = shown.filter((p) => !ids.has(p.id) && !removed.has(p.id) && time(p) >= oldest);
  if (!check.length) return { feed: fresh, check };
  return { feed: [...fresh, ...check].sort((a, b) => time(b) - time(a)), check };
}
