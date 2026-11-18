import { ADMIN_API, getToken } from "../api";

/* Shared bits of Sales › Contracts and Sales › Offerings (Nov 18 2026). Money arrives in cents. */

export const money = (cents) =>
  `$${(Math.round(Number(cents) || 0) / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** cents → "1250.5" for an input box */
export const dollars = (cents) => (cents === null || cents === undefined ? "" : String(Math.round(Number(cents) || 0) / 100));

export const STATUS_TONE = { draft: "neutral", sent: "purple", signed: "good", cancelled: "bad" };
export const STATUS_LABEL = { draft: "Draft", sent: "Sent", signed: "Signed", cancelled: "Cancelled" };

/** The event chosen in the top bar → its key. */
export const eventKeyOf = (ev) => (ev ? ev.eventKey?.current || ev.eventKey || ev._id || "" : "");

/** Download a file from the admin API with the staff sign-in. */
export async function downloadFile(path, name) {
  const res = await fetch(`${ADMIN_API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Upload a PDF to the admin API (raw body) → parsed JSON. */
export async function uploadPdf(path, file) {
  const res = await fetch(`${ADMIN_API}${path}?name=${encodeURIComponent(file.name)}`, {
    method: "POST", headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/pdf" }, body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}
