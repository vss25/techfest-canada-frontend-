/* =========================================================
   TTFC Check-in: instant guest search, on the device
   ---------------------------------------------------------
   The guest list (a few hundred rows) is loaded once and searched
   locally as you type: accent- and case-insensitive ("Zoe" finds
   "Zoë"), first or last name prefix ("pri", "sha"), several words in
   any order ("sharma pri"), company ("northw"), booth, and for staff
   the ticket ID (volunteers never hold ticket IDs: the app asks the
   server for a typed one, /lookup). Best matches first: the whole
   name, then names that start with what was typed, then last names,
   then company / job title, then partial ticket IDs.
   Pure; node --test src/checkin/lib/search.test.mjs
========================================================= */

/** "Zoë  O'Brien-Smith" → "zoe o brien smith". */
export function fold(s) {
  return String(s ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
const words = (s) => fold(s).split(" ").filter(Boolean);

/** What a guest is found by (made once per list). */
export function indexGuest(g) {
  const nameWords = words(g.name);
  const first = words(g.firstName || nameWords[0] || "");
  const last = words(g.lastName || nameWords.slice(1).join(" "));
  return {
    g,
    name: fold(g.name),
    nameWords,
    first,
    last,
    other: [...words(g.company), ...words(g.title), ...words(g.booth)],
    ids: (g.ticketIds || []).map((t) => fold(t).replace(/\s+/g, "")),
  };
}

export const buildIndex = (guests = []) => guests.map(indexGuest);

/** A ticket ID as typed ("TECHFEST:3F9A…", spaces) → "3f9a…", or "" if it doesn't look like one. */
export function ticketIdQuery(q) {
  const s = String(q || "").trim().replace(/^techfest:/i, "").replace(/\s+/g, "").toLowerCase();
  return /^[a-z0-9-]{6,64}$/.test(s) && /\d/.test(s) ? s : "";
}

/** How well one indexed guest matches (0 = not at all). */
export function score(x, q) {
  const qs = fold(q);
  if (!qs) return 0;
  const tokens = qs.split(" ");
  const idq = qs.replace(/\s+/g, "");
  let best = 0;
  // Ticket IDs (staff): exact, or a prefix of 4+ characters.
  for (const id of x.ids) {
    if (id === idq) best = Math.max(best, 1000);
    else if (idq.length >= 4 && id.startsWith(idq)) best = Math.max(best, 300);
  }
  if (x.name === qs) return Math.max(best, 900);
  // Every word typed must start a word of the guest (name, company, job title, booth).
  const all = [...x.nameWords, ...x.other];
  const hit = tokens.every((t) => all.some((w) => w.startsWith(t)));
  if (!hit) return best;
  const inName = tokens.every((t) => x.nameWords.some((w) => w.startsWith(t)));
  let s = 100;
  if (inName) {
    s = 500;
    if (x.name.startsWith(qs)) s = 800;                                          // "priya sh"
    else if (tokens.length === 1 && x.last.some((w) => w.startsWith(tokens[0]))) s = 700; // "sharma"
    else if (tokens.length > 1 && x.first[0]?.startsWith(tokens[0])) s = 650;     // "p sharma"
    else if (tokens.length === 1 && x.nameWords[0].startsWith(tokens[0])) s = 750;
    // Shorter names that match fully read as better.
    s -= Math.min(40, Math.max(0, x.nameWords.length - tokens.length) * 5);
  } else if (tokens.every((t) => x.other.some((w) => w.startsWith(t)))) {
    s = 300;                                                                     // a company / title search
  } else {
    s = 200;                                                                     // part name, part company
  }
  return Math.max(best, s);
}

/**
 * The guests matching `q`, best first (then by name), at most `limit`. `rank(g)` breaks ties among equal scores
 * (e.g. the lobby puts guests not arrived yet first).
 */
export function search(index, q, { limit = 50, rank = null } = {}) {
  if (!fold(q)) return [];
  const out = [];
  for (const x of index) {
    const s = score(x, q);
    if (s > 0) out.push({ x, s, r: rank ? rank(x.g) : 0 });
  }
  out.sort((a, b) => b.s - a.s || a.r - b.r || a.x.name.localeCompare(b.x.name));
  return out.slice(0, limit).map((o) => o.x.g);
}

/** The badge-box hint: the first letter of the surname ("Box S"), "#" when it isn't a letter. */
export function boxLetter(g) {
  const last = words(g?.lastName).at(-1) || words(g?.name).at(-1) || "";
  const c = last.charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}
