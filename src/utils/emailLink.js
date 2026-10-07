import { PUBLIC_API } from "../hooks/useSiteSettings";

/* =========================================================
   "Email me a sign-in link" helpers (AuthModal + /app-login).
   Backend: POST /api/auth/email-link        { email, client } → { sent }
            POST /api/auth/email-link/verify { token } | { email, code } → { token, created }
========================================================= */

const AUTH = `${PUBLIC_API}/auth`;

/** "jane.doe@acme.com" → "ja•••@acme.com" */
export function maskEmail(email) {
  const [local = "", domain = ""] = String(email || "").trim().toLowerCase().split("@");
  if (!local || !domain) return String(email || "");
  const keep = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${keep}•••@${domain}`;
}

/** Keeps digits only, at most 6. */
export function cleanCode(raw) {
  return String(raw || "").replace(/\D/g, "").slice(0, 6);
}

export function appLoginUrl(token) {
  return `ttfc://login?token=${encodeURIComponent(token)}`;
}

/** Phones and tablets, where the TTFC app can be installed. */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS reports itself as a Mac; touch points give it away.
  return /iPhone|iPad|iPod|Android/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${AUTH}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("We couldn't reach TTFC. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export const requestEmailLink = (email) => post("/email-link", { email: String(email || "").trim(), client: "web" });

export const verifyEmailLink = (token) => post("/email-link/verify", { token });

export const verifyEmailCode = (email, code) =>
  post("/email-link/verify", { email: String(email || "").trim(), code: cleanCode(code) });

/** Stores the session the same way the rest of the site does. */
export function storeSession(token) {
  localStorage.setItem("token", token);
  window.dispatchEvent(new Event("authChanged"));
  window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { token } }));
}
