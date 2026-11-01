/* =========================================================
   A speaker's address, /speakers/<slug> (Oct 31 2026): ONE rule for
   every link (src/data/agenda.js slugifyName, the Speakers page, the
   profile page) and for the build's prerender and sitemap
   (src/seo/prerender.mjs), so a listed address always opens.
   Trimmed: some Sanity names start or end with a space
   ("Laila Burns ", " Vance Lockton"), which used to make
   "laila-burns-" / "-vance-lockton". The profile page still opens
   those older addresses (normalizeSpeakerSlug), vercel.json sends
   them to the clean one, and the canonical is the clean one.
   Accents are dropped as before ("Alán" → "aln"): changing that
   would break addresses already shared. Pure: no browser APIs.
========================================================= */

/** "Dr. Noelle Ibrahim " → "dr-noelle-ibrahim". */
export function speakerSlug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/** The :slug of an address as speakerSlug writes it: any capitals, and the older "-" at either end. */
export function normalizeSpeakerSlug(slug) {
  return String(slug || "").toLowerCase().replace(/^-+|-+$/g, "");
}
