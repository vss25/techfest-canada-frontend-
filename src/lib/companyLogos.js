import { useEffect, useState } from "react";
import { client, urlFor, logoScaleOf } from "../utils/sanity";

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

const QUERY = `*[_type in ["partner", "sponsor", "sponsorMarquee"] && defined(logo.asset)]{ _type, name, logo, logoScale }`;

/** Our own name has no CMS logo: use the site's. */
const OWN = { name: "The Tech Festival Canada", src: "/Tech_Festival_Canada_Logo_Light_Transparent.webp", scale: 1.2 };

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
    const entry = {
      name: d.name.trim(),
      src: urlFor(d.logo).height(96).fit("max").auto("format").url(),
      scale: logoScaleOf(d),
    };
    const k = companyKey(d.name);
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
 * [{ text, logo: { name, src, scale } | null }]. Empty when nothing has a logo.
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
