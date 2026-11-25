/* =========================================================
   Bullet lists typed in the admin (Nov 24 2026, the owner: "I need bullet points in UX as I add ticket details").
   Pure helpers for BulletListEditor.jsx: one item per bullet, never the bullet character itself.
========================================================= */

/* A bullet, tick, dash, star or "1." / "1)" / "a)" someone typed or pasted at the start of a line. */
const LEAD = /^\s*(?:[•●◦▪▫■□‣⁃∙·✓✔✗✕×*+\-–—>]+|\(?\d{1,2}[.)]|\(?[a-zA-Z][.)](?=\s))\s*/;

/** One item as it will be saved: no bullet marker in front, single spaces, trimmed. */
export function cleanItem(text) {
  return String(text ?? "").replace(LEAD, "").replace(/\s+/g, " ").trim();
}

/** Pasted text → items: one per line (blank lines dropped), markers taken off. One line stays one item. */
export function splitPasted(text) {
  return String(text ?? "").split(/\r?\n/).map(cleanItem).filter(Boolean);
}

/** The list as saved: every item cleaned, empty ones left out. */
export function finishList(items) {
  return (Array.isArray(items) ? items : []).map(cleanItem).filter(Boolean);
}
