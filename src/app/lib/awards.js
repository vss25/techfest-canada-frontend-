import { get, isDemoApi } from "./api";
import { createStore, local } from "./store";

/* =========================================================
   Catalyst Awards (Oct 21 2026; the organiser: "don't say 28,
   show the number of award categories that actually received
   eligible applications").
   • GET /api/app/awards/summary (public): { categoriesCount,
     applicationsCount }: the Profile row, the Awards screen's
     counts. Unknown (never loaded) → no number at all.
   • GET /api/app/awards/applications (pass holders signed in):
     { enabled, total, categoriesCount, items: [{ id, nomineeName,
     nomineeType, nomineeTitle, nomineeOrganisation,
     nomineeLocation, nomineeWebsite, applicantName,
     selfNominated, submittedAt }] }. Never categories, status or
     contact details. Staff can switch the list off ("Show award
     applications in the app"): `enabled: false` hides it.
========================================================= */

const KEY = "ttfc.app.awards";
const cached = local.json(KEY, null);

export const awards = createStore({
  summary: cached && typeof cached === "object" ? cached : null,
  list: null, // the applications answer, once loaded
  listError: "",
  listStatus: 0,
  listCode: "", // "no_pass": signed in without a pass
  at: 0,
});

const n = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : null);

/** Reads the public counts (at most every 60 s unless forced); keeps the last copy if it fails. */
export async function refreshAwardsSummary({ force = false } = {}) {
  if (!force && Date.now() - awards.get().at < 60000) return;
  awards.set({ at: Date.now() });
  try {
    const r = await get("app/awards/summary", { auth: false });
    const summary = {
      categoriesCount: n(r?.categoriesCount), applicationsCount: n(r?.applicationsCount),
      // Off when the server says so (the staff switch); missing = on.
      enabled: r?.enabled !== false && r?.applicationsEnabled !== false,
    };
    if (!isDemoApi()) local.setJSON(KEY, summary); // the demo's numbers stay in the demo
    awards.set({ summary });
  } catch { /* keeps the cached copy (or none: no number shown) */ }
}

/** The applications list (signed in). Remembers why it was refused: 401 (sign in), 403 `no_pass` (signed in
    without a pass: "Applications are for pass holders", nobody is signed out), another 403 (suspended). */
export async function loadApplications() {
  try {
    const r = await get("app/awards/applications");
    const list = { enabled: r?.enabled !== false, total: n(r?.total) ?? 0, categoriesCount: n(r?.categoriesCount), items: Array.isArray(r?.items) ? r.items : [] };
    const s = awards.get().summary || {};
    const summary = { ...s, enabled: list.enabled, ...(list.categoriesCount != null ? { categoriesCount: list.categoriesCount } : {}), ...(list.enabled ? { applicationsCount: list.total } : {}) };
    if (!isDemoApi()) local.setJSON(KEY, summary);
    awards.set({ list, listError: "", listStatus: 0, listCode: "", summary });
  } catch (e) {
    awards.set({ listError: e?.message || "Couldn't load the applications.", listStatus: e?.status || 0, listCode: String(e?.data?.code || "") });
  }
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
/** "12 categories" for the Profile row, or null while the number isn't known (never 28 by default). */
export const categoriesLine = (summary) => (summary?.categoriesCount != null ? plural(summary.categoriesCount, "category", "categories") : null);
/** "12 Awards" (the hero and the count card), or null while unknown. */
export const awardsLine = (summary) => (summary?.categoriesCount != null ? plural(summary.categoriesCount, "Award", "Awards") : null);

/** An application's web address, only when it's http(s). */
export function websiteOf(item) {
  const u = String(item?.nomineeWebsite || "").trim();
  return /^https?:\/\/[^\s]+$/i.test(u) ? u : "";
}

/** "Applied by Jane Doe" or "Self-nominated". */
export const appliedBy = (item) => (item?.selfNominated ? "Self-nominated" : item?.applicantName ? `Applied by ${String(item.applicantName).trim()}` : "");

/** The line under the name: title · organisation (an organisation nominated as itself isn't said twice). */
export function roleLine(item) {
  const same = (x) => String(x || "").trim().toLowerCase() === String(item?.nomineeName || "").trim().toLowerCase();
  return [item?.nomineeTitle, same(item?.nomineeOrganisation) ? "" : item?.nomineeOrganisation].map((x) => String(x || "").trim()).filter(Boolean).join(" · ");
}

/** Search over the fields the list shows. */
export function matchesApplication(item, q) {
  const t = String(q || "").trim().toLowerCase();
  if (!t) return true;
  return [item.nomineeName, item.nomineeTitle, item.nomineeOrganisation, item.nomineeLocation, item.applicantName]
    .some((x) => String(x || "").toLowerCase().includes(t));
}

window.addEventListener("ttfc:signed-out", () => awards.set({ list: null, listError: "", listStatus: 0, listCode: "", summary: local.json(KEY, null), at: 0 }));
