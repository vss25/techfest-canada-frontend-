import { get, post } from "./api";

/* =========================================================
   Help & SOS (Oct 22 2026, the organiser: "a help/SOS section …
   messages … which staff can see and will be able to get to the
   attendee. Emergency only, not for regular requests"). Every
   server call is here (backend routes/sos.js):
   Attendee (/api/app/sos):
     GET  app/sos/options (no sign-in) → { categories: [{key, label}], locations, statusLabels, note }
     POST app/sos { category, location, message, phone } → 201 { request }   429 { code: "rate_limited", error }
     GET  app/sos → { requests (newest first), phone (to prefill) }
     POST app/sos/:id/messages { body } → { request }   409 { code: "resolved" }
   Staff (/api/console/sos, the app's own sign-in; 403 for everyone else):
     GET  console/sos?status=active|open|acknowledged|resolved|all → { status, requests, counts: {open, acknowledged, resolved} }
     GET  console/sos/:id → { request }
     POST console/sos/:id/reply { body } → { request }   (an open request becomes acknowledged; the attendee gets a push)
     POST console/sos/:id/status { status: "acknowledged" | "resolved" | "open" } → { request }
   request = { id, category, categoryLabel, location, message, phone, status, statusLabel,
     messages: [{ from: "attendee" | "staff", staffName, body, at }], createdAt, updatedAt }
     + for staff: userId, name, email, acknowledgedBy {id, name}, acknowledgedAt, resolvedBy, resolvedAt,
       lastMessageAt, links { app, tel, mailto }
   Demo mode answers all of them (lib/demo.js), staff side included.
========================================================= */

/** The built-in lists (the server's /options replaces them when it answers). */
export const SOS_DEFAULTS = {
  categories: [
    { key: "medical", label: "Medical" },
    { key: "safety", label: "Safety or security" },
    { key: "lost", label: "Lost or separated" },
    { key: "accessibility", label: "Accessibility help" },
    { key: "other", label: "Other urgent" },
  ],
  locations: ["Harbour Ballroom", "Harbour Ballroom foyer", "Pier 4 & 5", "Registration desk", "Expo floor", "Hotel lobby"],
  statusLabels: { open: "Sent", acknowledged: "Seen by staff", resolved: "Resolved" },
  note: "This is for emergencies only, not for regular questions. For anything else, email enquire@thetechfestival.com or visit the registration desk.",
};
export const SOS_MAX = 1000;
export const SOS_STEPS = ["open", "acknowledged", "resolved"];

const asList = (r, key) => (Array.isArray(r) ? r : Array.isArray(r?.[key]) ? r[key] : []);
const one = (r) => norm(r?.request || r);

/** One request in one shape (ids and labels filled in). */
export function norm(r) {
  if (!r || typeof r !== "object") return null;
  const status = SOS_STEPS.includes(r.status) ? r.status : "open";
  return {
    ...r,
    id: String(r.id || r._id || ""),
    status,
    statusLabel: r.statusLabel || SOS_DEFAULTS.statusLabels[status],
    categoryLabel: r.categoryLabel || SOS_DEFAULTS.categories.find((c) => c.key === r.category)?.label || r.category || "Other urgent",
    messages: Array.isArray(r.messages) ? r.messages : [],
  };
}

export async function sosOptions() {
  try {
    const r = await get("app/sos/options", { auth: false });
    return {
      categories: Array.isArray(r?.categories) && r.categories.length ? r.categories : SOS_DEFAULTS.categories,
      locations: Array.isArray(r?.locations) && r.locations.length ? r.locations : SOS_DEFAULTS.locations,
      statusLabels: { ...SOS_DEFAULTS.statusLabels, ...(r?.statusLabels || {}) },
      note: r?.note || SOS_DEFAULTS.note,
    };
  } catch { return SOS_DEFAULTS; }
}

// ---------- Attendee ----------

/** → { requests, phone } */
export async function mySos() {
  const r = await get("app/sos", { cache: "no-store" });
  return { requests: asList(r, "requests").map(norm).filter(Boolean), phone: typeof r?.phone === "string" ? r.phone : "" };
}
export const sendSos = async (fields) => one(await post("app/sos", fields));
export const addSosMessage = async (id, body) => one(await post(`app/sos/${encodeURIComponent(id)}/messages`, { body }));

// ---------- Staff ----------

/** → { requests, counts } (status "active" = open and acknowledged). */
export async function staffSos(status = "active") {
  const r = await get(`console/sos?status=${encodeURIComponent(status)}`, { cache: "no-store" });
  const counts = r?.counts && typeof r.counts === "object" ? r.counts : {};
  return { requests: asList(r, "requests").map(norm).filter(Boolean), counts: { open: counts.open || 0, acknowledged: counts.acknowledged || 0, resolved: counts.resolved || 0 } };
}
export const staffSosOne = async (id) => one(await get(`console/sos/${encodeURIComponent(id)}`, { cache: "no-store" }));
export const replySos = async (id, body) => one(await post(`console/sos/${encodeURIComponent(id)}/reply`, { body }));
export const setSosStatus = async (id, status) => one(await post(`console/sos/${encodeURIComponent(id)}/status`, { status }));

/** Open first, then seen, then resolved; newest first within each. */
export function sortForStaff(list) {
  const rank = { open: 0, acknowledged: 1, resolved: 2 };
  return [...list].sort((a, b) => (rank[a.status] - rank[b.status]) || (Date.parse(b.lastMessageAt || b.createdAt) - Date.parse(a.lastMessageAt || a.createdAt)));
}
