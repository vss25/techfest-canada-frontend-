/* =========================================================
   Global search: the matching rules, shared by the static
   pages & settings index and the highlighting of results.
   The same rules as the server (backend services/adminSearch.js):
   every word of the query must start a word of the text, accents
   and case ignored; emails and ticket IDs match exactly.
========================================================= */

export const MIN_CHARS = 2;
export const MAX_CHARS = 100;

/** Accents off, lower case: "José Núñez" → "jose nunez". */
export const fold = (s) => String(s ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();

/** The words of a text, folded: letters and digits only. */
export const words = (s) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The query as typed → { text, words, email, ticket, tooShort } (see the server's parseQuery). */
export function readQuery(raw) {
  // eslint-disable-next-line no-control-regex
  const text = String(raw ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  const w = [...new Set(words(text))].slice(0, 8);
  const email = EMAIL.test(text) ? text.toLowerCase() : "";
  const bare = text.replace(/^TECHFEST:\s*/i, "");
  const norm = !email && !/\s/.test(bare) && bare.length >= 4 ? bare.toLowerCase() : "";
  const ticket = norm && (/\d/.test(norm) || /^booth-/.test(norm)) ? norm : "";
  return { text, words: w, email, ticket, tooShort: text.length < MIN_CHARS || (!email && !ticket && !w.length) };
}

/** 0 = no match; otherwise higher is better. `fields`: [[text, weight], …]. */
export function score(queryWords, fields) {
  if (!queryWords?.length) return 0;
  const prepared = fields.filter(([t]) => t).map(([t, w]) => [words(t), w]);
  let total = 0;
  for (const q of queryWords) {
    let best = 0;
    for (const [toks, weight] of prepared) {
      for (const t of toks) {
        if (t === q) best = Math.max(best, weight * 1.25);
        else if (t.startsWith(q)) best = Math.max(best, weight);
      }
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

/**
 * Split `text` into [{ text, hit }] for showing the match: the start of each word that a query word begins,
 * or (for an email / ticket ID search) every place the exact term appears, case-insensitively.
 */
export function highlight(text, { words: qWords = [], exact = "" } = {}) {
  const s = String(text ?? "");
  if (!s) return [];
  const marks = new Array(s.length).fill(false);
  if (exact) {
    const hay = s.toLowerCase();
    for (let i = hay.indexOf(exact); i !== -1 && exact; i = hay.indexOf(exact, i + exact.length)) {
      for (let j = i; j < i + exact.length; j++) marks[j] = true;
    }
  } else if (qWords.length) {
    // Emails only ever match exactly: don't mark words inside one as if they had matched.
    const inEmail = new Array(s.length).fill(false);
    for (const e of s.matchAll(/[^\s@·,;]+@[^\s@·,;]+\.[^\s@·,;]+/g)) for (let j = e.index; j < e.index + e[0].length; j++) inEmail[j] = true;
    for (const m of s.matchAll(/[\p{L}\p{N}]+/gu)) {
      if (inEmail[m.index]) continue;
      const token = m[0];
      const folded = fold(token);
      const q = qWords.filter((w) => folded.startsWith(w)).sort((a, b) => b.length - a.length)[0];
      if (!q) continue;
      // How many characters of the original word make up the folded prefix (accents can drop out).
      let n = 0;
      let got = 0;
      for (const ch of token) {
        if (got >= q.length) break;
        got += fold(ch).length;
        n += ch.length;
      }
      for (let j = m.index; j < m.index + n; j++) marks[j] = true;
    }
  }
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const last = out[out.length - 1];
    if (last && last.hit === marks[i]) last.text += s[i];
    else out.push({ text: s[i], hit: marks[i] });
  }
  return out;
}

/** The exact term to highlight for an email / ticket ID search (else ""). */
export const exactTerm = (q) => (q.email ? q.email : q.ticket ? q.ticket : "");
