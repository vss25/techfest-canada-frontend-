/* =========================================================
   Catalyst Awards categories: the canonical lists
   ---------------------------------------------------------
   The 5 technology pillars × 5 applied sectors (the matrix
   awards) and the 3 special awards, exactly as nominations
   store them. Used by the nomination form
   (components/NominationForm.jsx) and Admin › Catalyst Awards ›
   Nominations ("Edit category & focus"). The backend keeps the
   same lists (services/nominations.js PILLARS, SECTORS,
   SPECIAL_AWARDS) and refuses any other name: change both.
   Pure helpers for the admin form below; tested with
   node --test src/lib/catalystCategories.test.mjs
========================================================= */

export const PILLARS = Object.freeze([
  "AI & Machine Learning",
  "Quantum Computing",
  "Cybersecurity & Digital Trust",
  "Robotics & Automation",
  "CleanTech & Sustainability",
]);

export const SECTORS = Object.freeze([
  "Financial Services & Banking",
  "Healthcare & Life Sciences",
  "Energy & Critical Infrastructure",
  "Manufacturing, Supply Chain & Mobility",
  "Public Sector, Defence & Security",
]);

export const SPECIAL_AWARDS = Object.freeze([
  Object.freeze({
    key: "lifetime",
    label: "Lifetime Achievement Award",
    desc: "Sustained leadership shaping Canada's technology landscape",
  }),
  Object.freeze({
    key: "rising",
    label: "Rising Innovator Award",
    desc: "An emerging founder, researcher or team (early-stage / under 35 / <5 yrs)",
  }),
  Object.freeze({
    key: "crossborder",
    label: "Cross-Border Impact Award",
    desc: "Outstanding Canada–international collaboration or market expansion",
  }),
]);

/** The lists the admin form offers: the server's (GET /console/nominations/:id `options`) when it sent them, else these. */
export function categoryOptions(server) {
  const ok = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => typeof x === "string");
  const awards = Array.isArray(server?.specialAwards) && server.specialAwards.every((a) => a && typeof a.key === "string")
    ? server.specialAwards.map((a) => ({ key: a.key, label: String(a.label || a.key) }))
    : SPECIAL_AWARDS.map(({ key, label }) => ({ key, label }));
  return { pillars: ok(server?.pillars) ? [...server.pillars] : [...PILLARS], sectors: ok(server?.sectors) ? [...server.sectors] : [...SECTORS], specialAwards: awards };
}

const str = (v) => String(v ?? "");

/** "Rising Innovator" / "AI & Machine Learning × Healthcare & Life Sciences" (as the server's `category`). */
export function categoryShort(c = {}, options = categoryOptions()) {
  if (c.categoryType === "matrix") return `${c.pillar || "?"} × ${c.sector || "?"}`;
  const label = options.specialAwards.find((a) => a.key === c.specialAward)?.label || "Special Recognition";
  return label.replace(/ Award$/, "");
}

/** "AI & Machine Learning · FinTech" / "FinTech" / "" (the nominee's focus pillar and sector). */
export const focusText = (n = {}) => [n.nomineePillar, n.nomineeSector].map((v) => str(v).trim()).filter(Boolean).join(" · ");

/* ---------- the "Edit category & focus" form ---------- */

/** The form for nomination `n`. A pillar or sector that isn't in the lists starts empty (staff choose one). */
export function overrideForm(n = {}, options = categoryOptions()) {
  const inList = (list, v) => (list.includes(v) ? v : "");
  return {
    categoryType: n.categoryType === "special" ? "special" : "matrix",
    pillar: inList(options.pillars, str(n.pillar)),
    sector: inList(options.sectors, str(n.sector)),
    specialAward: options.specialAwards.some((a) => a.key === n.specialAward) ? n.specialAward : "",
    nomineePillar: inList(options.pillars, str(n.nomineePillar)),
    nomineeSector: str(n.nomineeSector),
    note: "",
  };
}

/** The focus sector choices: none, the list, and the free text the form took when it isn't one of them. */
export function focusSectorChoices(current, options = categoryOptions()) {
  const v = str(current);
  const out = [{ value: "", label: "None" }, ...options.sectors.map((s) => ({ value: s, label: s }))];
  if (v.trim() && !options.sectors.includes(v)) out.push({ value: v, label: `${v} (as typed on the form)` });
  return out;
}

/** The category part of the form, as the server stores it (matrix clears the award, special clears pillar and sector). */
export function categoryOfForm(f = {}) {
  return f.categoryType === "special"
    ? { categoryType: "special", pillar: "", sector: "", specialAward: str(f.specialAward) }
    : { categoryType: "matrix", pillar: str(f.pillar), sector: str(f.sector), specialAward: "" };
}

/** Has the category changed from the nomination's? */
export function categoryDirty(f = {}, n = {}) {
  const a = categoryOfForm(f);
  const type = n.categoryType === "special" ? "special" : "matrix";
  if (a.categoryType !== type) return true;
  return type === "special" ? a.specialAward !== str(n.specialAward) : a.pillar !== str(n.pillar) || a.sector !== str(n.sector);
}

export const focusDirty = (f = {}, n = {}) => str(f.nomineePillar) !== str(n.nomineePillar) || str(f.nomineeSector) !== str(n.nomineeSector);

/** What stops the form from saving ("" = nothing). */
export function formProblem(f = {}, options = categoryOptions()) {
  if (f.categoryType === "special") return options.specialAwards.some((a) => a.key === f.specialAward) ? "" : "Choose a special award.";
  if (!options.pillars.includes(f.pillar)) return "Choose a pillar.";
  if (!options.sectors.includes(f.sector)) return "Choose a sector.";
  return "";
}

/** PATCH /console/nominations/:id/category body. */
export function categoryPayload(f = {}) {
  const note = str(f.note).trim();
  const body = f.categoryType === "special"
    ? { categoryType: "special", specialAward: f.specialAward }
    : { categoryType: "matrix", pillar: f.pillar, sector: f.sector };
  return note ? { ...body, note } : body;
}

/** PATCH /console/nominations/:id/focus body. */
export function focusPayload(f = {}) {
  const note = str(f.note).trim();
  const body = { nomineePillar: str(f.nomineePillar), nomineeSector: str(f.nomineeSector) };
  return note ? { ...body, note } : body;
}

/**
 * "Changed by Mia Example, Oct 22 · submitted as AI & Machine Learning × Healthcare & Life Sciences".
 * `whenText`: the change's date, already formatted; `submittedAs`: what came in ("" = nothing given).
 */
export function changedLine(by, whenText, submittedAs) {
  const who = [str(by).trim() ? `Changed by ${str(by).trim()}` : "Changed by staff", str(whenText).trim()].filter(Boolean).join(", ");
  return `${who} · submitted as ${str(submittedAs).trim() || "none"}`;
}

/** Which parts "Restore what they submitted" puts back: "category" | "focus" | "both" | "" (nothing changed). */
export function restoreWhat(n = {}) {
  if (n.categoryChanged && n.focusChanged) return "both";
  if (n.categoryChanged) return "category";
  if (n.focusChanged) return "focus";
  return "";
}

/** The category filter: [{ value, label: "AI … × … (3)" }] over the rows, by name; `keep` stays listed at (0). */
export function categoryFilterOptions(rows = [], keep = "") {
  const counts = new Map();
  for (const r of rows) counts.set(r.category, (counts.get(r.category) || 0) + 1);
  if (keep && !counts.has(keep)) counts.set(keep, 0);
  return [...counts.keys()].filter(Boolean).sort().map((value) => ({ value, label: `${value} (${counts.get(value)})` }));
}
