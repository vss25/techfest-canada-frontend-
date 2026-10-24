/* =========================================================
   TTFC Check-in: instant guest search, on the device
   ---------------------------------------------------------
   The guest list (up to ~1,500 rows) is loaded once and searched
   locally as you type. The organiser: "the name search should work for
   first name, last name, organization", typed by a lobby volunteer who
   only HEARD the name:
     - first name, last name or organisation alone, or any mix in any
       order ("stefanie", "marotta", "globe marotta", "kpmg ruta");
       accent- and case-insensitive ("Zoe" finds "Zoë"); multi-word
       surnames typed apart or together ("van hoeken", "vanhoeken");
       the company falls back to the organisation field;
     - organisation initials, skipping of / and / the / & ("rbc" →
       Royal Bank of Canada, "tbdc" → Toronto Business Development
       Centre); a one-word name ("NGen", "KPMG") matches as a word;
     - spelling tolerance, only as a fallback and always ranked below
       every real match: one typo (insert, delete, substitute, swap)
       in a word of 4–6 letters, two from 7; sound-alikes (c/k, ph/f,
       double letters, y/i, Mac/Mc: "katherine" finds Catherine,
       "mohammad" Muhammad / Mohammed). It only runs when the real
       matches are few, and never for 1–2 letters (those only match
       the start of a word);
     - for staff, the ticket ID (volunteers never hold ticket IDs: the
       app asks the server for a typed one, /lookup).
   Best first: the whole name, then names that start with what was
   typed, then last names, then company / job title (and initials),
   then partial ticket IDs, then the spelling-tolerant matches. Each
   result says what matched (matchLabel, highlight: the name's matched
   letters, or "Company match", "Similar spelling") so the volunteer
   can confirm.
   Pure; node --test src/checkin/lib/search.test.mjs
========================================================= */

/** "Zoë  O'Brien-Smith" → "zoe o brien smith". */
export function fold(s) {
  return String(s ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
const words = (s) => fold(s).split(" ").filter(Boolean);
const STOP = new Set(["of", "and", "the", "for", "de", "du", "la", "le", "et"]);

/** Sound-alike form of a word: Mac → Mc, ph → f, c / q → k, y → i, double letters once. */
export function soundFold(w) {
  return String(w || "").replace(/^mac/, "mc").replace(/ph/g, "f").replace(/ck/g, "k").replace(/[cq]/g, "k").replace(/y/g, "i").replace(/(.)\1+/g, "$1");
}

/** The company as the guest row has it (the organisation field when that's where it is). */
export const companyOf = (g) => g?.company || g?.organisation || g?.organization || g?.org || "";

/** Organisation initials, skipping of / and / the / &: "Royal Bank of Canada" → "rbc". */
export function initials(company) {
  const ws = fold(String(company || "").replace(/&/g, " ")).split(" ").filter((w) => w && !STOP.has(w));
  return ws.length >= 2 ? ws.map((w) => w[0]).join("") : "";
}

/** What a guest is found by (made once per list). */
export function indexGuest(g) {
  const nameWords = words(g.name);
  const first = words(g.firstName || nameWords[0] || "");
  const last = words(g.lastName || nameWords.slice(1).join(" "));
  const company = companyOf(g);
  // A surname of several words also as one ("van hoeken" → "vanhoeken"; "Benzvy-Miller" → "benzvymiller").
  const joined = last.length > 1 ? [last.join("")] : [];
  const nameAll = [...nameWords, ...joined];
  const other = [...words(company), ...words(g.title), ...words(g.booth)];
  return {
    g,
    name: fold(g.name),
    nameWords,
    nameAll,
    first,
    last,
    other,
    acro: initials(company),
    ids: (g.ticketIds || []).map((t) => fold(t).replace(/\s+/g, "")),
    sound: { name: nameAll.map(soundFold), other: other.map(soundFold) },
  };
}

export const buildIndex = (guests = []) => guests.map(indexGuest);

/** A ticket ID as typed ("TECHFEST:3F9A…", spaces) → "3f9a…", or "" if it doesn't look like one. */
export function ticketIdQuery(q) {
  const s = String(q || "").trim().replace(/^techfest:/i, "").replace(/\s+/g, "").toLowerCase();
  return /^[a-z0-9-]{6,64}$/.test(s) && /\d/.test(s) ? s : "";
}

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent swaps), giving up above `max`. */
export function editDistance(a, b, max = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let prev2 = null;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[m];
}

/** Typos allowed for a typed word: none under 4 letters, one for 4–6, two from 7. */
export const typosAllowed = (t) => (t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0);

/** How close a typed word is to one of `list` (with `sounds`, their sound-alike forms): 0 none, 1–2 typos, 3 sounds alike. */
function fuzzyWord(t, list, sounds) {
  const allowed = typosAllowed(t);
  if (!allowed) return 0;
  const st = soundFold(t);
  let best = 0;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    if (sounds[i] === st || (st.length >= 4 && sounds[i].startsWith(st))) return 3;
    const d = Math.min(editDistance(t, w, allowed), editDistance(st, sounds[i], allowed));
    if (d <= allowed) best = Math.max(best, d < allowed || allowed === 1 ? 2 : 1);
  }
  return best;
}

/**
 * How well one indexed guest matches → { score, kind } (score 0 = not at all). kind: "ticket" | "name" | "company" |
 * "initials" | "mixed" | "fuzzy-name" | "fuzzy-company". Real matches score 200–1000; spelling-tolerant ones 20–160,
 * so a fuzzy match never outranks a real one.
 */
export function match(x, q, { fuzzy = true } = {}) {
  const qs = fold(q);
  if (!qs) return { score: 0, kind: "" };
  const tokens = qs.split(" ");
  const idq = qs.replace(/\s+/g, "");
  let best = 0;
  let bestKind = "";
  // Ticket IDs (staff): exact, or a prefix of 4+ characters.
  for (const id of x.ids) {
    if (id === idq) { best = 1000; bestKind = "ticket"; } else if (idq.length >= 4 && id.startsWith(idq) && best < 300) { best = 300; bestKind = "ticket"; }
  }
  if (x.name === qs) return best > 900 ? { score: best, kind: bestKind } : { score: 900, kind: "name" };
  const inName = (t) => x.nameAll.some((w) => w.startsWith(t));
  const inOther = (t) => x.other.some((w) => w.startsWith(t));
  const isAcro = (t) => t.length >= 2 && !!x.acro && (t === x.acro || (t.length >= 3 && x.acro.startsWith(t)));
  if (tokens.every((t) => inName(t) || inOther(t) || isAcro(t))) {
    let s;
    let kind;
    if (tokens.every(inName)) {
      kind = "name";
      s = 500;
      if (x.name.startsWith(qs)) s = 800;                                                          // "priya sh"
      else if (tokens.length === 1 && x.nameWords[0]?.startsWith(tokens[0]) && !x.last.some((w) => w.startsWith(tokens[0]))) s = 750;
      else if (tokens.length === 1 && x.last.some((w) => w.startsWith(tokens[0]))) s = 700;        // "sharma"
      else if (tokens.length === 1 && x.nameAll.slice(x.nameWords.length).some((w) => w.startsWith(tokens[0]))) s = 700; // "vanhoeken"
      else if (tokens.length > 1 && tokens.every((t) => x.last.some((w) => w.startsWith(t)))) s = 690; // "van hoeken"
      else if (tokens.length > 1 && x.first[0]?.startsWith(tokens[0])) s = 650;                    // "p sharma"
      // Shorter names that match fully read as better.
      s -= Math.min(40, Math.max(0, x.nameWords.length - tokens.length) * 5);
    } else if (tokens.every((t) => inOther(t) || isAcro(t))) {
      kind = tokens.every(inOther) ? "company" : "initials";
      s = kind === "company" ? 300 : 290;                                                             // a company / title search
    } else {
      kind = "mixed";
      s = 200;                                                                                        // part name, part company
    }
    return s >= best ? { score: s, kind } : { score: best, kind: bestKind };
  }
  if (best || !fuzzy) return { score: best, kind: bestKind };
  // Spelling tolerance (a fallback): every word typed matches a word really or nearly; at least one only nearly.
  let total = 0;
  let nameHits = 0;
  for (const t of tokens) {
    if (inName(t)) { total += 4; nameHits++; continue; }
    if (inOther(t) || isAcro(t)) { total += 3; continue; }
    if (t.length < 4) return { score: 0, kind: "" };
    const n = fuzzyWord(t, x.nameAll, x.sound.name);
    if (n) { total += n; nameHits++; continue; }
    const o = fuzzyWord(t, x.other, x.sound.other);
    if (!o) return { score: 0, kind: "" };
    total += Math.max(1, o - 1);
  }
  const kind = nameHits ? "fuzzy-name" : "fuzzy-company";
  return { score: Math.min(160, 40 + Math.round((total / tokens.length) * 30)) - (nameHits ? 0 : 20), kind };
}

/** How well one indexed guest matches (0 = not at all). */
export const score = (x, q, opts) => match(x, q, opts).score;

/** Spelling tolerance only runs when the real matches are fewer than this (and a word typed has 4+ letters). */
export const FUZZY_BELOW = 8;

/**
 * The guests matching `q` with what matched, best first (then by name), at most `limit`: [{ g, score, kind }].
 * `rank(g)` breaks ties among equal scores (e.g. the lobby puts guests not arrived yet first).
 */
export function searchDetailed(index, q, { limit = 50, rank = null } = {}) {
  const qs = fold(q);
  if (!qs) return [];
  const out = [];
  for (const x of index) {
    const m = match(x, qs, { fuzzy: false });
    if (m.score > 0) out.push({ x, ...m });
  }
  if (out.length < FUZZY_BELOW && qs.split(" ").some((t) => t.length >= 4)) {
    const have = new Set(out.map((o) => o.x));
    for (const x of index) {
      if (have.has(x)) continue;
      const m = match(x, qs);
      if (m.score > 0) out.push({ x, ...m });
    }
  }
  const scored = out.map((o) => ({ ...o, r: rank ? rank(o.x.g) : 0 }));
  scored.sort((a, b) => b.score - a.score || a.r - b.r || a.x.name.localeCompare(b.x.name));
  return scored.slice(0, limit).map((o) => ({ g: o.x.g, score: o.score, kind: o.kind }));
}

/** The guests matching `q`, best first (then by name), at most `limit`. */
export function search(index, q, opts = {}) {
  return searchDetailed(index, q, opts).map((o) => o.g);
}

/** The words a result is shown with: "Company match", "Company initials match", "Similar spelling", or "". */
export function matchLabel(kind) {
  return { company: "Company match", initials: "Company initials match", "fuzzy-name": "Similar spelling", "fuzzy-company": "Company, similar spelling", ticket: "Ticket ID match" }[kind] || "";
}

/**
 * A name (or company) in parts, the letters that matched what was typed marked: [{ text, hit }]. Each word of `text`
 * that starts with a typed word has that many letters marked.
 */
export function highlight(text, q) {
  const tokens = fold(q).split(" ").filter(Boolean);
  const src = String(text ?? "");
  if (!tokens.length || !src) return [{ text: src, hit: false }];
  const parts = [];
  for (const m of src.matchAll(/[\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+/gu)) {
    const piece = m[0];
    const f = fold(piece).replace(/\s+/g, "");
    const t = f ? tokens.filter((x) => f.startsWith(x)).sort((a, b) => b.length - a.length)[0] : "";
    if (t) {
      const n = Math.min(piece.length, t.length);
      parts.push({ text: piece.slice(0, n), hit: true });
      if (n < piece.length) parts.push({ text: piece.slice(n), hit: false });
    } else parts.push({ text: piece, hit: false });
  }
  // Neighbours of the same kind together.
  return parts.reduce((acc, p) => { const l = acc.at(-1); if (l && l.hit === p.hit) l.text += p.text; else acc.push({ ...p }); return acc; }, []);
}

/** The badge-box hint: the first letter of the surname ("Box S"), "#" when it isn't a letter. */
export function boxLetter(g) {
  const last = words(g?.lastName).at(-1) || words(g?.name).at(-1) || "";
  const c = last.charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}
