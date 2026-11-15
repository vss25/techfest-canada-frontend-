/* =========================================================
   Tiny HTML-entity decoder for plain-text fields that come
   from Sanity as raw strings (speaker bio / shortBio). Some
   records were pasted in with entities intact — "Helaba&#39;s"
   instead of "Helaba's" — and React renders the string
   literally, so the entity shows on the page. Decode the
   common named entities plus any decimal numeric entity in
   a single pass (so "&amp;#39;" becomes "&#39;", not "'").
   Plain-text renders only — Portable Text spans are already
   real text and must not pass through here.
========================================================= */

const NAMED = {
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
  "&nbsp;": " ",
  "&hellip;": "\u2026",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
};

export function decodeEntities(text) {
  return String(text || "").replace(/&(?:#\d+|amp|quot|apos|rsquo|lsquo|ldquo|rdquo|nbsp|hellip|mdash|ndash);/g, (m) =>
    m[1] === "#" ? String.fromCharCode(Number(m.slice(2, -1))) : NAMED[m] ?? m
  );
}

export default decodeEntities;
