/* =========================================================
   Server calls for /share/linkedin?t=<token> (Oct 22 2026), the
   website page the TTFC app opens to post a session's discussion
   or a live poll on LinkedIn (backend routes/linkedinShare.js), in
   one place so a changed route is a one-line edit:
     GET  {API}/linkedin-share/draft?t=  → { kind, sessionTitle, title, description, link, text,
          maxLength, hashtag, page, expiresAt, available }   404 { code: "expired" }
     POST {API}/linkedin-share/text {t, text} → { ok, text }   (the edited post)
     then the page goes to {API}/linkedin-share/post?t=  (LinkedIn sign-in → Posts API →
          back to /share/linkedin#posted=1&post=<URL>, or #post_error=<code>&t=<token>)
   The token "demo" (the app's demo mode) never reaches the server:
   a sample draft from the link's own k / s / q, and posting only
   pretends (nothing goes to LinkedIn).
========================================================= */

import { API } from "./forms";

export const isDemoToken = (t) => t === "demo";
const isToken = (t) => typeof t === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(t);

async function json(res) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.error || j.message || `Request failed (${res.status})`), { status: res.status, code: j.code || "" });
  return j;
}

/** The draft for this token (see the header). */
export async function loadShareDraft(t) {
  if (isDemoToken(t)) return demoDraft();
  if (!isToken(t)) throw Object.assign(new Error("This link isn't complete."), { code: "invalid" });
  return json(await fetch(`${API}/linkedin-share/draft?t=${encodeURIComponent(t)}`, { credentials: "omit", cache: "no-store" }));
}

/** Saves the edited text, then → the address that starts LinkedIn's sign-in ({ demo: true } in the demo). */
export async function startSharePost(t, text) {
  if (isDemoToken(t)) return { demo: true };
  await json(await fetch(`${API}/linkedin-share/text`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", body: JSON.stringify({ t, text }),
  }));
  return { redirect: `${API}/linkedin-share/post?t=${encodeURIComponent(t)}` };
}

// ---------- Demo (/share/linkedin?t=demo&k=poll|discussion&s=<session title>&q=<question>) ----------

function demoDraft() {
  const q = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const kind = q.get("k") === "poll" ? "poll" : "discussion";
  const sessionTitle = (q.get("s") || "Conviction Before Consensus: A Bet on Canadian Deep Tech").slice(0, 160);
  const question = (q.get("q") || "").slice(0, 200);
  const at = `"${sessionTitle}" at The Tech Festival Canada`;
  const text = kind === "poll"
    ? `${question ? `"${question}" ` : ""}I just voted in the live poll at ${at}.\n\n#TTFC2026`
    : `A great discussion at ${at}.\n\n#TTFC2026`;
  return Promise.resolve({
    kind, sessionTitle, title: sessionTitle, description: "The Tech Festival Canada · Oct 26–27, 2026 · Toronto",
    link: "https://www.thetechfestival.com/agenda", text, maxLength: 3000, hashtag: "#TTFC2026", page: "The Tech Festival Canada",
    expiresAt: new Date(Date.now() + 2 * 3600000).toISOString(), available: true, demo: true,
  });
}
