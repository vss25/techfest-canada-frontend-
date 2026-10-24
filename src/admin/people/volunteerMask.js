/* =========================================================
   Text a volunteer sees about a person (Oct 23 2026, second
   round): names, companies, job titles, pass names and the
   "Other" dietary note are typed by buyers and staff, and
   sometimes hold an email address or a phone number (a buyer
   who typed their email as their name; a staff account made
   without a name, which is named after its email's local part).
   The server masks these in the volunteer answers
   (services/volunteerPanel.js); the panel masks them again, so
   a volunteer never sees one even if a field came back as stored.
   Pure: tested in volunteerView.test.mjs.
========================================================= */

const HIDDEN = "(hidden)";
/* An email address anywhere in the text. */
const EMAIL_IN = /[^\s@<>()[\]{},;:"']+@[^\s@<>()[\]{},;:"']+\.[^\s@<>()[\]{},;:"'.]{2,}/gu;
/* Seven or more digits in a row, with spaces, dots, dashes or brackets between them (phone numbers, long numbers). */
const LONG_DIGITS = /\+?\d(?:[ .()-]{0,2}\d){6,}/g;
/* One word joined by dots, underscores or pluses ("noname.staffer", "mara_d", "jane+ttfc"): an email's local part, not a name. */
const HANDLE = /^[\p{L}\p{N}]+(?:[._+][\p{L}\p{N}]+)+$/u;
const ONLY_EMAIL = /^[^\s@]+@[^\s@]+$/;

const clip = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Free text, with any email address or long run of digits replaced by "(hidden)". */
export function maskText(v, max = 200) {
  const s = clip(v, 1000);
  if (!s) return "";
  return s.replace(EMAIL_IN, HIDDEN).replace(LONG_DIGITS, HIDDEN)
    .replace(/\(\s*\(hidden\)\s*\)/g, HIDDEN) // "Founder (x@y.com)" → "Founder (hidden)", not "((hidden))"
    .replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * A person's name for a volunteer, or "" (the caller shows "No name"): an email address, an email's local part or a
 * phone number is not a name. Anything else is kept, with emails and long digit runs inside it masked.
 */
export function maskName(v, max = 160) {
  const s = clip(v, 1000);
  if (!s || ONLY_EMAIL.test(s) || HANDLE.test(s)) return "";
  const out = maskText(s, max);
  // Nothing left but what was hidden (and punctuation): no name.
  return /[\p{L}]/u.test(out.split(HIDDEN).join("")) ? out : "";
}
