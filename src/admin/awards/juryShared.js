/* Shared constants and helpers for Admin › Catalyst Awards › Jury, Allocation, Scoring rubric and Jury results.
   Backend: /console/jury (routes/juryAdmin.js). */
import { ADMIN_API, getToken } from "../api";

export const JURY = "/console/jury";
export const EYEBROW = "Catalyst Awards";
export const PORTAL_URL = "https://www.thetechfestival.com/awards/jury-admin";

export const STATE = {
  not_started: { tone: "neutral", label: "Not started" },
  draft: { tone: "warn", label: "Draft" },
  editing: { tone: "purple", label: "Editing" },
  submitted: { tone: "good", label: "Submitted" },
  conflict: { tone: "bad", label: "Conflict" },
};

export const NOMINATION_STATUS = {
  pending: { tone: "neutral", label: "Pending" },
  shortlisted: { tone: "purple", label: "Shortlisted" },
  winner: { tone: "good", label: "Winner" },
  rejected: { tone: "warn", label: "Not progressing" },
};

export const plural = (n, one, many = `${one}s`) => `${(n || 0).toLocaleString()} ${n === 1 ? one : many}`;

/** "8 of 12 submitted · 2 drafts · 1 conflict". */
export function progressText(p = {}) {
  if (!p.assigned && !p.conflicts) return "No nominations yet";
  const parts = [`${p.submitted || 0} of ${p.assigned || 0} submitted`];
  if (p.drafts) parts.push(plural(p.drafts, "draft"));
  if (p.editing) parts.push(`${p.editing} being edited`);
  if (p.conflicts) parts.push(plural(p.conflicts, "conflict"));
  return parts.join(" · ");
}

/** Downloads a CSV from the admin API with the staff token. */
export async function downloadCsv(path, filename) {
  const res = await fetch(`${ADMIN_API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Export failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fmtScore = (v) => (v === null || v === undefined ? "—" : String(Math.round(v * 10) / 10));
