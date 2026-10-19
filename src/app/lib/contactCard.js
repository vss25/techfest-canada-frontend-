/* =========================================================
   Contact card: pure helpers (no React, no stores), shared by
   the Profile card, the share sheet, the demo backend and the
   node checks. The value rules are a port of the backend's
   services/contactCard.js (cleanValue), so inline errors and
   demo mode say exactly what the server says.

   Item: { id, kind, label, value, shareByDefault, account? }
   account: true = the sign-in email (value read from the
   account; never a @ticket.thetechfestival.com placeholder).
========================================================= */

export const CONTACT_KINDS = ["email", "phone", "whatsapp", "linkedin", "website", "x", "instagram", "wechat", "other"];
export const MAX_CONTACT_ITEMS = 12;
export const MAX_LABEL = 30;
const MAX_OTHER = 200;
const ID_RX = /^[A-Za-z0-9_-]{1,40}$/;
const PLACEHOLDER_RX = /@ticket\.thetechfestival\.com$/i;

export const SHARE_OFF_ERROR = "Contact sharing is off for your pass type.";
export const TOO_MANY_ERROR = `You can add up to ${MAX_CONTACT_ITEMS} contact details.`;

/** Names, placeholders and keyboards per kind (spec section 3). */
export const KIND_META = {
  email: { name: "Email", placeholder: "name@company.com", type: "email", inputMode: "email", autoCapitalize: "none", autoComplete: "email" },
  phone: { name: "Phone", placeholder: "+1 416 555 0100", type: "tel", inputMode: "tel", autoCapitalize: "none", autoComplete: "tel" },
  whatsapp: { name: "WhatsApp", placeholder: "+1 416 555 0100", type: "tel", inputMode: "tel", autoCapitalize: "none", autoComplete: "tel" },
  linkedin: { name: "LinkedIn", placeholder: "linkedin.com/in/yourname", type: "url", inputMode: "url", autoCapitalize: "none", autoComplete: "url" },
  website: { name: "Website", placeholder: "yourcompany.com", type: "url", inputMode: "url", autoCapitalize: "none", autoComplete: "url" },
  x: { name: "X", placeholder: "@yourname", type: "text", inputMode: "text", autoCapitalize: "none", autoComplete: "off" },
  instagram: { name: "Instagram", placeholder: "@yourname", type: "text", inputMode: "text", autoCapitalize: "none", autoComplete: "off" },
  wechat: { name: "WeChat", placeholder: "WeChat ID", type: "text", inputMode: "text", autoCapitalize: "none", autoComplete: "off" },
  other: { name: "Other", placeholder: "How to reach you", type: "text", inputMode: "text", autoCapitalize: "sentences", autoComplete: "off" },
};

export const LABEL_CHIPS = ["Work", "Personal", "Mobile"];

const ERRORS = {
  kind: "Pick what kind of contact detail this is.",
  email: "Enter a valid email address.",
  phone: "Enter a phone number with 6 to 15 digits. A + and the country code are fine.",
  whatsapp: "Enter your WhatsApp number with 6 to 15 digits. A + and the country code are fine.",
  linkedin: "Enter a LinkedIn link, like linkedin.com/in/yourname.",
  website: "Enter a website address, like example.com.",
  x: "Enter an X handle, like @yourname.",
  instagram: "Enter an Instagram handle, like @yourname.",
  wechat: "Enter your WeChat ID (letters, numbers, - and _).",
  other: "Enter the contact detail.",
};

/** 8 url-safe characters from 6 random bytes (base64url), like the server's newItemId. */
export function newItemId() {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Control characters, zero-width and bidi marks (built from code points so the source stays plain ASCII).
const ch = (n) => String.fromCharCode(n);
const CONTROL_RX = new RegExp(`[${ch(0)}-${ch(0x1f)}${ch(0x7f)}${ch(0x200b)}-${ch(0x200f)}${ch(0x2028)}-${ch(0x202e)}${ch(0x2066)}-${ch(0x2069)}]`, "g");

/** Collapses whitespace and drops control characters. */
const tidy = (s) => String(s ?? "").replace(CONTROL_RX, " ").replace(/\s+/g, " ").trim();

export const isPlaceholderEmail = (e) => PLACEHOLDER_RX.test(String(e || "").trim());

/** The sign-in email as a contact detail ("" for none or a ticket sign-in placeholder). */
export function accountEmailOf(email) {
  const e = String(email || "").trim().toLowerCase();
  return !e || isPlaceholderEmail(e) ? "" : e;
}

/** "https://ca.linkedin.com/in/x/" → { host: "ca.linkedin.com", path: "in/x" }. */
function splitUrlish(raw) {
  let s = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  s = s.split(/[?#]/)[0];
  const slash = s.indexOf("/");
  const host = (slash < 0 ? s : s.slice(0, slash)).toLowerCase();
  const path = (slash < 0 ? "" : s.slice(slash + 1)).replace(/\/+$/, "");
  return { host, path };
}

const HANDLE = {
  x: { rx: /^[A-Za-z0-9_]{1,15}$/, hosts: ["x.com", "twitter.com", "mobile.twitter.com", "www.x.com", "www.twitter.com"] },
  instagram: { rx: /^[A-Za-z0-9._]{1,30}$/, hosts: ["instagram.com", "www.instagram.com", "instagr.am"] },
};

function cleanHandle(kind, raw) {
  const { rx, hosts } = HANDLE[kind];
  let s = raw;
  if (/[./]/.test(s) && !/^@/.test(s)) {
    const { host, path } = splitUrlish(s);
    if (hosts.includes(host)) s = path.split("/")[0];
    else if (kind === "instagram" && !s.includes("/") && rx.test(s)) s = raw;   // dots are fine in Instagram names
    else return null;
  }
  s = s.replace(/^@+/, "");
  return rx.test(s) ? `@${s}` : null;
}

function cleanLinkedIn(raw) {
  const s = raw;
  if (/\s/.test(s)) return null;
  let path;
  if (/linkedin\.com/i.test(s)) {
    const { host, path: p } = splitUrlish(s);
    if (!/^([a-z]{2,3}\.|www\.)?linkedin\.com$/.test(host)) return null;
    path = p;
  } else if (/^(in|company|school|pub|showcase)\/[^/\s]+\/?$/i.test(s)) {
    path = s.replace(/\/$/, "");
  } else if (/^@?[A-Za-z0-9_%-]{3,100}$/.test(s)) {
    path = `in/${s.replace(/^@/, "")}`;
  } else return null;
  if (!/^(in|company|school|pub|showcase)\/[^/\s]+(\/[^\s]*)?$/i.test(path)) return null;
  return `https://www.linkedin.com/${path}`;
}

function cleanWebsite(raw) {
  if (/\s/.test(raw) || raw.length > 300) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u;
  try { u = new URL(withScheme); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname) && !/^xn--/.test(u.hostname)) return null;
  const href = u.href;
  return u.pathname === "/" && !u.search && !u.hash ? href.replace(/\/$/, "") : href;
}

function cleanPhone(raw) {
  const s = raw.replace(/\s+/g, " ");
  if (!/^\+?[\d ().-]+$/.test(s)) return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return s;
}

/** One value, checked and tidied for its kind → { value } or { error } (a sentence to show as it is). */
export function cleanValue(kind, raw) {
  if (!CONTACT_KINDS.includes(kind)) return { error: ERRORS.kind };
  const s = tidy(raw);
  if (!s) return { error: ERRORS[kind] };
  let v = null;
  switch (kind) {
    case "email": {
      const e = s.toLowerCase();
      v = e.length <= 254 && /^[^\s@<>()",;:\\[\]]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(e) ? e : null;
      break;
    }
    case "phone": case "whatsapp": v = cleanPhone(s); break;
    case "linkedin": v = cleanLinkedIn(s); break;
    case "website": v = cleanWebsite(s); break;
    case "x": case "instagram": v = cleanHandle(kind, s); break;
    case "wechat": {
      const w = s.replace(/^@/, "");
      v = /^[A-Za-z0-9_-]{2,40}$/.test(w) ? w : null;
      break;
    }
    case "other": v = s.length <= MAX_OTHER ? s : null; break;
  }
  return v ? { value: v } : { error: ERRORS[kind] };
}

export const cleanLabel = (raw) => tidy(raw).slice(0, MAX_LABEL);

/**
 * A whole list, as PUT /social/contact-card checks it → { items } or { error, index }.
 * Bad or repeated ids get a new one; one account item at most (none without an account email).
 */
export function cleanItems(input, { accountEmail = "" } = {}) {
  if (!Array.isArray(input)) return { error: "items must be a list" };
  if (input.length > MAX_CONTACT_ITEMS) return { error: TOO_MANY_ERROR };
  const items = [];
  const ids = new Set();
  let hasAccount = false;
  for (let index = 0; index < input.length; index++) {
    const raw = input[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "Each contact detail must be an object.", index };
    let id = typeof raw.id === "string" && ID_RX.test(raw.id) ? raw.id : "";
    if (!id || ids.has(id)) id = newItemId();
    const shareByDefault = raw.shareByDefault === true;
    if (raw.account === true) {
      if (!accountEmail || hasAccount) continue;
      hasAccount = true;
      ids.add(id);
      items.push({ id, kind: "email", label: cleanLabel(raw.label), value: "", shareByDefault, account: true });
      continue;
    }
    const kind = String(raw.kind || "");
    const v = cleanValue(kind, raw.value);
    if (v.error) return { error: v.error, index };
    ids.add(id);
    items.push({ id, kind, label: cleanLabel(raw.label), value: v.value, shareByDefault });
  }
  return { items };
}

/** Stored items as the owner sees them: the account item's value filled in from the account email. */
export function resolveItems(stored, accountEmail) {
  const out = [];
  for (const it of stored || []) {
    if (!it?.id) continue;
    if (it.account) {
      if (accountEmail) out.push({ id: it.id, kind: "email", label: it.label || "", value: accountEmail, shareByDefault: !!it.shareByDefault, account: true });
    } else if (CONTACT_KINDS.includes(it.kind) && it.value) {
      out.push({ id: it.id, kind: it.kind, label: it.label || "", value: it.value, shareByDefault: !!it.shareByDefault });
    }
  }
  return out;
}

/** The card before it was ever saved: the account email and the profile LinkedIn, both shared by default. */
export function derivedItems({ accountEmail = "", linkedinUrl = "" } = {}) {
  const out = [];
  if (accountEmail) out.push({ id: "account", kind: "email", label: "", value: accountEmail, shareByDefault: true, account: true });
  const li = linkedinUrl ? cleanValue("linkedin", linkedinUrl) : null;
  if (li?.value) out.push({ id: "linkedin", kind: "linkedin", label: "", value: li.value, shareByDefault: true });
  return out;
}

/** What to send in PUT /social/contact-card (the account item's value is never sent). */
export const itemsForSave = (items) => (items || []).map((it) => (it.account
  ? { id: it.id, kind: "email", label: it.label || "", value: "", shareByDefault: !!it.shareByDefault, account: true }
  : { id: it.id, kind: it.kind, label: it.label || "", value: it.value, shareByDefault: !!it.shareByDefault }));

/** First LinkedIn item's value ("" when none): the profile LinkedIn. */
export const firstLinkedIn = (items) => (items || []).find((it) => it.kind === "linkedin" && it.value)?.value || "";

// ---------- Showing items ----------

export const kindName = (kind) => KIND_META[kind]?.name || "Other";

/** Row title: the label, else the kind name ("Account email" for the sign-in email). */
export function itemTitle(it) {
  if (it?.label) return it.label;
  return it?.account ? "Account email" : kindName(it?.kind);
}

/** LinkedIn and websites without https:// / www. and the trailing slash; others as stored. */
export function displayValue(it) {
  const v = String(it?.value || "");
  if (it?.kind === "linkedin" || it?.kind === "website") return v.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  return v;
}

const handleOf = (v) => String(v || "").replace(/^@+/, "");

/** What tapping a shared detail does → { href } (mailto:, tel:, https:) or { copy: true }. */
export function tapAction(it) {
  const v = String(it?.value || "");
  switch (it?.kind) {
    case "email": return { href: `mailto:${v}` };
    case "phone": return { href: `tel:${v.replace(/[^\d+]/g, "")}` };
    case "whatsapp": return { href: `https://wa.me/${v.replace(/\D/g, "")}` };
    case "linkedin": case "website": return /^https?:\/\//i.test(v) ? { href: v } : { copy: true };
    case "x": return { href: `https://x.com/${handleOf(v)}` };
    case "instagram": return { href: `https://www.instagram.com/${handleOf(v)}` };
    default: return { copy: true };
  }
}

// ---------- What gets ticked ----------

export const defaultIds = (items) => (items || []).filter((it) => it.shareByDefault).map((it) => it.id);

/** Keeps only ids of current items, in the card's order. */
export function keepKnown(ids, items) {
  const want = new Set((ids || []).map(String));
  return (items || []).filter((it) => want.has(it.id)).map((it) => it.id);
}

/**
 * The ticks a share sheet opens with.
 *   manage: what I share now (conn.myShare)
 *   vcard:  my share-by-default items
 *   request / accept / scan: what I picked before for this person, else my defaults
 */
export function preTicked(moment, items, conn) {
  if (moment === "manage") return keepKnown(conn?.myShare, items);
  if (moment === "vcard") return defaultIds(items);
  if (conn && conn.mySharePicked && Array.isArray(conn.myShare)) return keepKnown(conn.myShare, items);
  return defaultIds(items);
}

/**
 * The email / LinkedIn fields of the connect QR (lib/qr.js keeps its format): the first ticked
 * LinkedIn always; the first ticked email only without a server to deliver it (demo mode).
 */
export function qrContactFields(items, ticked, { local = false } = {}) {
  const first = (kind) => (items || []).find((it) => it.kind === kind && (ticked || []).includes(it.id))?.value || "";
  return { linkedIn: first("linkedin"), email: local ? first("email") : "" };
}

// ---------- The collapsed Profile card (spec section 10) ----------

/** Details that count towards "at least 2": items with a value (the account email only as an item). */
export const detailCount = (items) => (items || []).filter((it) => String(it?.value || "").trim()).length;

/** "Add how people can reach you" / "1 way to reach you" / "3 ways to reach you" */
export const waysSummary = (n) => (!n ? "Add how people can reach you" : n === 1 ? "1 way to reach you" : `${n} ways to reach you`);

/** The collapsed row's accessible name. */
export const cardRowLabel = (n) => (n < 2 ? "Contact card, needs 2 details" : `Contact card, ${n} details`);

/** "You shared 2 contact details." / "You shared 1 contact detail." / "You didn't share contact details." */
export function sharedSentence(n) {
  if (!n) return "You didn't share contact details.";
  return `You shared ${n} contact detail${n === 1 ? "" : "s"}.`;
}

/** "2 details" / "1 detail" / "Nothing yet" */
export const detailsCount = (n) => (!n ? "Nothing yet" : `${n} detail${n === 1 ? "" : "s"}`);

// ---------- vCard 3.0 ----------

/** "Dr. Maya Singh" → { first: "Dr.", last: "Maya Singh" }: first word, then the rest. */
export function splitName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

/** Escapes \ , ; and newlines in a vCard value. */
export const vEscape = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r\n|\r|\n/g, "\\n");

const labelIs = (it, ...names) => names.includes(String(it?.label || "").trim().toLowerCase());

/**
 * A vCard 3.0 with name, title, company and the given items (in order), CRLF line endings.
 * The same builder makes "Share my contact" and "Save to contacts".
 */
export function buildVCard({ name = "", jobTitle = "", organization = "", items = [] } = {}) {
  const { first, last } = splitName(name);
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${vEscape(last)};${vEscape(first)};;;`, `FN:${vEscape(String(name || "").trim())}`];
  if (organization) lines.push(`ORG:${vEscape(organization)}`);
  if (jobTitle) lines.push(`TITLE:${vEscape(jobTitle)}`);
  const notes = [];
  let n = 0;
  for (const it of items) {
    const v = String(it?.value || "");
    if (!v) continue;
    switch (it.kind) {
      case "email": {
        const type = labelIs(it, "work") ? ",WORK" : labelIs(it, "personal", "home") ? ",HOME" : "";
        lines.push(`EMAIL;TYPE=INTERNET${type}:${vEscape(v)}`);
        break;
      }
      case "phone": {
        const type = labelIs(it, "work") ? "WORK" : labelIs(it, "home", "personal") ? "HOME" : "CELL";
        lines.push(`TEL;TYPE=${type}:${vEscape(v)}`);
        break;
      }
      case "whatsapp":
        n += 1;
        lines.push(`item${n}.TEL:${vEscape(v)}`, `item${n}.X-ABLabel:WhatsApp`);
        break;
      case "linkedin":
        n += 1;
        lines.push(`item${n}.URL:${vEscape(v)}`, `item${n}.X-ABLabel:${vEscape(it.label || "LinkedIn")}`, `X-SOCIALPROFILE;TYPE=linkedin:${vEscape(v)}`);
        break;
      case "website":
        n += 1;
        lines.push(`item${n}.URL:${vEscape(v)}`, `item${n}.X-ABLabel:${vEscape(it.label || "Website")}`);
        break;
      case "x":
        lines.push(`X-SOCIALPROFILE;TYPE=twitter:${vEscape(`https://x.com/${handleOf(v)}`)}`);
        break;
      case "instagram":
        lines.push(`X-SOCIALPROFILE;TYPE=instagram:${vEscape(`https://www.instagram.com/${handleOf(v)}`)}`);
        break;
      case "wechat":
        notes.push(`WeChat: ${v}`);
        break;
      default:
        notes.push(`${it.label || "Other"}: ${v}`);
    }
  }
  notes.push("Met at The Tech Festival Canada 2026, Toronto");
  lines.push(`NOTE:${notes.map(vEscape).join("\\n")}`);
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

const fileSafe = (s) => String(s || "").normalize("NFC").replace(/['\u2019]/g, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/** "Alex Morgan" → "Alex-Morgan.vcf"; nothing usable → "contact.vcf". */
export function vcfFileName(name) {
  const { first, last } = splitName(name);
  const base = [fileSafe(first), fileSafe(last)].filter(Boolean).join("-");
  return base ? `${base}.vcf` : "contact.vcf";
}
