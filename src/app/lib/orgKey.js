/* =========================================================
   An organisation's key: the same normalised name the server
   gives each entry of GET /api/app/organisations (backend
   services/companies.js companyKey), so the partner sheet can
   find the people and speakers from that organisation.
   "Dell Technologies, Inc." and "dell technologies" are one
   organisation; "Dell" is another. Pure (orgKey.test.mjs).
========================================================= */

// Letters NFD doesn't split into base + accent.
const SPECIAL = { ß: "ss", æ: "ae", œ: "oe", ø: "o", ł: "l", đ: "d", ð: "d", þ: "th", ı: "i" };

// Legal forms dropped from the end of a name ("Acme Holdings Ltd." → "acme holdings").
const LEGAL = new Set([
  "inc", "incorporated", "ltd", "limited", "llc", "llp", "lp", "corp", "corporation", "co", "company",
  "plc", "gmbh", "ag", "sa", "sas", "srl", "bv", "nv", "pty", "pvt", "private", "ulc", "ltee", "limitee",
]);

/** "Dell Technologies, Inc." → "dell technologies"; "AT&T" → "at and t"; "" when there's no name. */
export function companyKey(name) {
  const words = String(name || "")
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, (c) => SPECIAL[c] || c)
    .normalize("NFKD").replace(/\p{M}+/gu, "")
    .replace(/&/g, " and ")
    .replace(/\./g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && LEGAL.has(words[words.length - 1])) words.pop();
  if (words.length > 1 && words[0] === "the") words.shift();
  return words.join(" ").slice(0, 120);
}

const SMALL = new Set(["of", "the", "and", "for", "at", "in", "on", "de", "du", "des", "la", "le", "les", "et"]);

/** Two or three letters for a tile with no logo ("Ontario Teachers' Pension Plan" → "OT", "Department of Digital
    Affairs" → "DD"). */
export function orgInitials(name) {
  const words = String(name || "").replace(/[^\p{L}\p{N}\s&]/gu, " ").split(/\s+/).filter((w) => w && w !== "&" && !SMALL.has(w.toLowerCase()));
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
