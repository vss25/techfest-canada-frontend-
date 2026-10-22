import { ADMIN_API, api } from "../api";

/* =========================================================
   Admin › Website & app › Attending organisations: the server
   calls in one place (backend routes/appOrganisations.js, the
   merged list behind GET /api/app/organisations).
     GET    /console/organisations[?fresh=1]  { updatedAt, cmsOk, orgs: [Row], aliases: [Alias], counts: { total, missingLogo } }
     POST   /console/organisations/hide       { key, hidden, name }
     POST   /console/organisations/alias      { from, into }   "merge X into Y" (names or keys)
     DELETE /console/organisations/alias/:from                undo a merge (a built-in one is switched off)
     POST   /console/organisations/lookup     { key }          look for a logo again at the next build
   Logos: the company logo picker (GET /console/companies/
   candidates, POST /console/companies/logo { key, name, domain?,
   url? | data?, source? }, people/LogoPicker.jsx) and
   POST /console/companies/logo/clear { key, name }, both by the
   organisation's key (backend batch 6); a partner's logo is the
   website's, edited on the Partners page.
========================================================= */

const BASE = "/console/organisations";
const ORIGIN = ADMIN_API.replace(/\/api\/?$/, "");
/** Server paths ("/api/files/company-logo/…") as full addresses. */
const absolute = (u) => (typeof u === "string" && u.startsWith("/") ? ORIGIN + u : u || "");

export const orgsApi = {
  listPath: (fresh) => (fresh ? `${BASE}?fresh=1` : BASE),
  setHidden: (o, hidden) => api.post(`${BASE}/hide`, { key: o.key, hidden: !!hidden, name: o.name }),
  merge: (from, into) => api.post(`${BASE}/alias`, { from, into }),
  unmerge: (from) => api.del(`${BASE}/alias/${encodeURIComponent(from)}`),
  lookup: (key) => api.post(`${BASE}/lookup`, { key }),
  clearLogo: (o) => api.post("/console/companies/logo/clear", { key: o.key, name: o.companyName || o.name }),
};

/** The server's answer as rows and merges. */
export function orgsFrom(data) {
  const d = data || {};
  const raw = Array.isArray(d.orgs) ? d.orgs : Array.isArray(d.items) ? d.items : [];
  const items = raw.filter((o) => o && (o.key || o.name)).map((o) => ({
    key: String(o.key || ""), name: String(o.name || o.key || ""), logo: absolute(o.logo), logoSource: o.logoSource || "",
    website: o.website || "", kind: o.kind || "", featured: o.section === "featured", hidden: !!o.hidden, hiddenBy: o.hiddenBy || "",
    attendeeCount: Number(o.attendeeCount) || 0, speakerCount: Number(o.speakerCount) || 0,
    mergedKeys: Array.isArray(o.mergedKeys) ? o.mergedKeys.map(String) : [],
    autoDomain: o.autoDomain || o.autoLogo?.domain || "",
    companyName: o.company?.name || "", logoBy: o.company?.updatedBy || "",
    // A website partner: its logo is the partner record's (edited on the Partners page).
    partnerId: String(o.partnerId || ""), partner: !!o.partnerId || o.logoSource === "website" || o.section === "featured",
  }));
  const names = new Map(items.map((o) => [o.key, o.name]));
  const aliases = (Array.isArray(d.aliases) ? d.aliases : []).filter((a) => a && a.from && a.into).map((a) => ({
    from: String(a.from), into: String(a.into), builtin: !!a.builtin, off: !!a.off, by: a.by || "",
    intoName: names.get(String(a.into)) || String(a.into),
  }));
  // The server's counts (missing = no logo at all); worked out here for an older server.
  const c = d.counts || {};
  const counts = {
    total: Number.isFinite(c.total) ? c.total : items.length,
    missingLogo: Number.isFinite(c.missingLogo) ? c.missingLogo : items.filter((o) => !o.logo).length,
  };
  return { items, aliases, counts, updatedAt: d.updatedAt || "", cmsOk: d.cmsOk !== false };
}
