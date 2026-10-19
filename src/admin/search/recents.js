/* =========================================================
   Global search: recent searches and recently opened results,
   kept in this browser only (localStorage), per staff account,
   and removed when they sign out (api.js signOut). Every read
   and write is wrapped: private windows and blocked storage just
   mean no recents.
========================================================= */

export const RECENTS_KEY = "ttfc.admin.search.v1";
const MAX_QUERIES = 6;
const MAX_RESULTS = 6;

const empty = () => ({ user: "", queries: [], results: [] });

/** { queries: [string], results: [{ type, id, title, subtitle, link, group }] } for this staff member. */
export function loadRecents(userId) {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return empty();
    const v = JSON.parse(raw);
    if (!v || v.user !== String(userId || "")) return empty();
    return {
      user: v.user,
      queries: Array.isArray(v.queries) ? v.queries.filter((q) => typeof q === "string").slice(0, MAX_QUERIES) : [],
      results: Array.isArray(v.results) ? v.results.filter((r) => r && typeof r.link === "string" && r.link.startsWith("/admin")).slice(0, MAX_RESULTS) : [],
    };
  } catch {
    return empty();
  }
}

function save(v) {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(v)); } catch { /* storage full or blocked: no recents */ }
  return v;
}

/** Remember a search (newest first, no repeats) and, when given, the result opened from it. */
export function rememberSearch(userId, query, result) {
  const v = loadRecents(userId);
  const q = String(query || "").trim();
  const queries = q.length >= 2 ? [q, ...v.queries.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_QUERIES) : v.queries;
  const results = result
    ? [{ type: result.type, id: result.id, title: result.title, subtitle: result.subtitle || "", link: result.link, group: result.group || "" },
      ...v.results.filter((r) => r.link !== result.link)].slice(0, MAX_RESULTS)
    : v.results;
  return save({ user: String(userId || ""), queries, results });
}

export function clearRecents() {
  try { localStorage.removeItem(RECENTS_KEY); } catch { /* nothing to clear */ }
}
