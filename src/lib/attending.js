/* =========================================================
   /attending: post text, link pre-fill and sharing helpers
   ---------------------------------------------------------
   The campaign email links to
     https://www.thetechfestival.com/attending#fn=…&ln=…&title=…&co=…
   The values ride in the URL fragment (never sent to any server);
   the page reads them once and removes them from the address bar.
   After "Use my LinkedIn photo" the backend sends people back with
   #li=1&fn=…&ln=…&pic=<media.licdn.com URL>, or #li_error=<code>.
   After "Post to LinkedIn" (computers): #posted=1&post=<post URL>,
   or #post_error=<code>.
========================================================= */

export const SITE_URL = "https://www.thetechfestival.com";
export const HASHTAGS = "#TTFC2026 #TheTechFestivalCanada";
export const ENQUIRE = "enquire@thetechfestival.com";
/** TTFC's LinkedIn page. "Post to LinkedIn" tags it for people (the backend adds the tag). */
export const LINKEDIN_PAGE = { name: "The Tech Festival Canada", url: "https://www.linkedin.com/company/thetechfestival/" };

/** The pre-written LinkedIn post (people can edit it on the page). */
export function defaultPostText() {
  return [
    "I'm attending The Tech Festival Canada 2026 in Toronto this October 26–27!",
    "",
    "Two days at The Westin Harbour Castle with the founders, leaders and investors shaping Canada's frontier tech, across five pillars: AI, Quantum, Cybersecurity, Robotics and CleanTech.",
    "",
    "I'm looking forward to the keynotes, the conversations and meeting many of you there. If you're going too, let's connect and plan to meet in Toronto.",
    "",
    `Learn more: ${SITE_URL}`,
    "",
    HASHTAGS,
  ].join("\n");
}

/** LinkedIn's share box with the text filled in (an image can't be attached through a URL). */
export const linkedinShareUrl = (text) =>
  `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(String(text || ""))}`;

const LIMITS = { fn: 60, ln: 60, title: 100, co: 100 };
// No control characters or angle brackets from a link.
const tidy = (v, max) => String(v || "").replace(/[\p{Cc}<>]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** LinkedIn picture URLs we accept (the backend proxy only allows the same hosts). */
export function isLinkedinPhotoUrl(raw) {
  try {
    const u = new URL(String(raw || ""));
    return u.protocol === "https:" && /^media(-exp\d+)?\.licdn\.com$/i.test(u.hostname) && !u.username && !u.password && !u.port;
  } catch {
    return false;
  }
}

/** A LinkedIn post's address, as the backend sends it back after posting. */
export const isLinkedinPostUrl = (raw) => /^https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:(share|ugcPost):\d+\/$/.test(String(raw || ""));

/**
 * Reads the fragment: { fields: { firstName, lastName, title, company }, linkedin: { picture } | null,
 * linkedinError: "" | code, posted: { url } | null, postError: "" | code, had: boolean }.
 * `had` is true when there was anything to clear.
 */
export function readFragment(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const p = new URLSearchParams(raw);
  const fields = {
    firstName: tidy(p.get("fn"), LIMITS.fn),
    lastName: tidy(p.get("ln"), LIMITS.ln),
    title: tidy(p.get("title"), LIMITS.title),
    company: tidy(p.get("co"), LIMITS.co),
  };
  const pic = p.get("pic") || "";
  const linkedin = p.get("li") === "1" ? { picture: isLinkedinPhotoUrl(pic) ? pic : "" } : null;
  const linkedinError = tidy(p.get("li_error"), 40);
  const post = p.get("post") || "";
  const posted = p.get("posted") === "1" ? { url: isLinkedinPostUrl(post) ? post : "" } : null;
  const postError = tidy(p.get("post_error"), 40);
  return { fields, linkedin, linkedinError, posted, postError, had: raw.length > 0 };
}

/** Phones and tablets: share straight to the LinkedIn app via the share sheet. */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS reports itself as a Mac.
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

/** True when this browser can hand a PNG file to the share sheet. */
export function canShareFile(file) {
  try {
    return typeof navigator !== "undefined" && typeof navigator.share === "function"
      && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Synchronous copy (a hidden textarea + execCommand): works inside the click, before a new tab takes focus. */
export function copyTextNow(text) {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  const ta = document.createElement("textarea");
  ta.value = String(text || "");
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  if (active && typeof active.focus === "function") active.focus({ preventScroll: true });
  return ok;
}

/** Copy with the async Clipboard API, falling back to copyTextNow. */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text || ""));
      return true;
    }
  } catch { /* fall through */ }
  return copyTextNow(text);
}

/** Saves a Blob as a file (an <a download>). */
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/* What people typed (and their photo) survives the round trip to LinkedIn (this tab only). */
const DRAFT_KEY = "ttfc.attending.draft";
/** True when saved (false: private mode, or too big for the browser's storage). */
export function saveDraft(draft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); return true; } catch { return false; }
}
/** The saved draft (left in place: React may render twice before effects run). */
export function peekDraft() {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    return d && typeof d === "object" ? d : null;
  } catch {
    return null;
  }
}
export function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ }
}
