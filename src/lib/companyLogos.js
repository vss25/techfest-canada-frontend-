import { useEffect, useState } from "react";
import { client, urlFor } from "../utils/sanity";

/* =========================================================
   Speaker company → logo
   ---------------------------------------------------------
   A speaker's `company` text (Sanity "speaker") is matched against
   the logos staff already keep in the CMS: partners, sponsors and
   the sponsor marquee (Admin → Partners / Sponsors). Nothing is
   stored on the speaker, so a logo added in the admin panel shows
   on the speaker cards straight away.

   "T-Mobile | Ex. CIA" → one part per "|": a logo for T-Mobile, and
   "Ex. CIA" stays as text (past roles never get a logo). Matching is
   strict (same name, or one name is the other plus extra words at
   the end), so "Advance Carbon Removal Coalition" doesn't pick up
   Carbon Removal Canada.
========================================================= */

const QUERY = `*[_type in ["partner", "sponsor", "sponsorMarquee"] && defined(logo.asset)]{ _type, name, logo }`;

/** Our own name has no CMS logo: use the site's "C" mark, in its own colours. */
const OWN = { name: "The Tech Festival Canada", src: "/updatednavlogotrans.png", mark: { crop: "left", recolor: false } };

/**
 * Logos that are an emblem plus lines of small text (government signatures,
 * crests, shields) can't be read at the size of one line of text. These show
 * the emblem alone, followed by the name in the site's font (`label`, or the
 * speaker's own company text; "" for none). Keyed by companyKey(CMS name).
 * crop: where the emblem is: "left" of the text, on "top" of it, or the
 * "colour" part of the art; gap: which clear gap ends it (default the first).
 */
const MARKS = {
  "financial consumer agency of": { crop: "left" },
  "innovation science and economic development": { crop: "left", label: "ISED Canada" },
  "public health agency of": { crop: "left" },
  "office of privacy commissioner of": { crop: "left" },
  "ministry of external affairs": { crop: "left" },
  "rbc capital markets": { crop: "left" },
  "aerial evolution association of": { crop: "left" },
  "doctors without borders": { crop: "colour" },
  osfi: { crop: "top", label: "OSFI" },
  "womens health collective": { crop: "left" },
  "northeastern university": { crop: "left" },
  "canadian manufacturers exporters": { crop: "left" },
  nejm: { crop: "left" },
  "womens college hospital": { crop: "left" },
  resonance: { crop: "left" },
  "transient ai": { crop: "left" },
  "mackay ceo forums": { crop: "left" },
  "open quantum design": { crop: "left" },
  "fusion collective": { crop: "left" },
  "quantum bridge technologies": { crop: "colour" },
  inclusifai: { crop: "top" },
  kraken: { crop: "top" },
  "hyivy health": { crop: "top" },
  // The EY mark (beam + letters) without its tagline: up to the second gap; no name after it.
  ey: { crop: "top", gap: 2, label: "" },
};

/** Speaker-side spellings → the CMS name (as keys). */
const ALIASES = {
  "ernst young": "ey",
  "osfibsif government of": "osfi",
  tory: "torys",
  "td wealth": "td bank",
};

const DROP = /\b(inc|ltd|llc|llp|corp|corporation|co|limited|group|canada|the)\b/g;

/** "Women’s College Hospital (WCH)" → "womens college hospital". */
export function companyKey(s) {
  return String(s || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(DROP, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const compact = (k) => k.replace(/ /g, "");
const acronym = (s) => (String(s || "").match(/\(([A-Za-z]{2,8})\)/) || [])[1]?.toLowerCase();
const isPastRole = (part) => /^(ex|former|fmr)\b/i.test(part.trim());
const TYPE_RANK = { partner: 0, sponsor: 1, sponsorMarquee: 2 };

/** Index of CMS logo docs by name key, compact key and "(ACRONYM)". */
export function buildLogoIndex(docs) {
  const byKey = new Map();
  const sorted = [...(docs || [])].sort((a, b) => (TYPE_RANK[a._type] ?? 9) - (TYPE_RANK[b._type] ?? 9));
  const put = (k, entry) => { if (k && !byKey.has(k)) byKey.set(k, entry); };
  for (const d of sorted) {
    if (!d?.logo?.asset || !d.name) continue;
    // PNG keeps transparency (and rasterises SVGs) for src/lib/logoArt.js.
    const k = companyKey(d.name);
    const entry = { name: d.name.trim(), src: urlFor(d.logo).width(640).fit("max").format("png").url(), mark: MARKS[k] || null };
    put(k, entry);
    put("#" + compact(k), entry);
    put(acronym(d.name), entry);
  }
  put(companyKey(OWN.name), OWN);
  return byKey;
}

function lookup(index, text) {
  let k = companyKey(text);
  if (!k) return null;
  k = ALIASES[k] || k;
  const exact = index.get(k) || index.get("#" + compact(k));
  if (exact) return exact;
  // One is the other plus trailing words: "IBM Consulting" → IBM, "Quantum Bridge" → Quantum Bridge Technologies.
  let best = null;
  let bestLen = 0;
  for (const [key, entry] of index) {
    if (key.startsWith("#")) continue;
    const hit = (key.length >= 3 && k.startsWith(key + " ")) || (k.length >= 5 && key.startsWith(k + " "));
    if (hit && key.length > bestLen) { best = entry; bestLen = key.length; }
  }
  return best;
}

/**
 * The parts of a speaker's company line, each with its logo when there is one:
 * [{ text, logo: { name, src, mark } | null }]. Empty when nothing has a logo.
 * `mark` (emblem + name logos): { crop, recolor?, label? }.
 */
export function companyLogos(company, index) {
  const text = String(company || "").trim();
  if (!text || !index?.size) return [];
  const whole = lookup(index, text.replace(/\|/g, " "));
  const parts = whole && !text.includes(" | ") ? [{ text, logo: whole }]
    : text.split("|").map((p) => p.trim()).filter(Boolean)
      .map((p) => ({ text: p, logo: isPastRole(p) ? null : lookup(index, p) }));
  return parts.some((p) => p.logo) ? parts : [];
}

let cached = null;

/** The logo index, fetched once per page load (shared by every card). */
export function useCompanyLogoIndex() {
  const [index, setIndex] = useState(null);
  useEffect(() => {
    let live = true;
    cached ||= client.fetch(QUERY).then(buildLogoIndex).catch(() => { cached = null; return new Map(); });
    cached.then((i) => { if (live) setIndex(i); });
    return () => { live = false; };
  }, []);
  return index;
}
