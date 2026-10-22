/* =========================================================
   Server calls for the website pages the app links to (Oct 22
   2026), in one place so a changed route is a one-line edit:
     /share/linkedin?t=<token>   a session chat or poll, as an
                                 editable LinkedIn post
       GET  {API}/share/linkedin?t=…            → the draft (below)
       POST {API}/share/linkedin/post {t, text} → { id }, then
            {API}/share/linkedin/start?d=<id>  (LinkedIn OAuth →
            Posts API → back to /share/linkedin?t=…#posted=1&post=<url>
            or #post_error=<code>, as /attending does)
     /unsubscribe?t=<token>      "What you missed" emails off / on
       POST {API}/notify/email-prefs {t, digestEmail} → { digestEmail, email? }
   Tokens starting "demo." never reach the server: sample answers,
   and "posting" only pretends (nothing goes to LinkedIn).
========================================================= */

import { API } from "./forms";

export const isDemoToken = (t) => typeof t === "string" && t.startsWith("demo.");
const isToken = (t) => typeof t === "string" && t.length >= 6 && t.length <= 600 && /^[A-Za-z0-9._~-]+$/.test(t);

async function json(res) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.error || j.message || `Request failed (${res.status})`), { status: res.status, code: j.code || "" });
  return j;
}

/**
 * The draft: { kind: "discussion" | "poll", session: { title, when, place, url }, topic?, poll?: { question,
 * options: [{ label, pct }], total }, text, article: { title, description, url }, posted?: { url } }.
 */
export async function loadShareDraft(t) {
  if (isDemoToken(t)) return demoDraft(t);
  if (!isToken(t)) throw Object.assign(new Error("This link isn't complete."), { code: "invalid" });
  return json(await fetch(`${API}/share/linkedin?t=${encodeURIComponent(t)}`, { credentials: "omit" }));
}

/** Saves the edited text with the token, then LinkedIn asks to allow posting (the page goes there). */
export async function startSharePost(t, text) {
  if (isDemoToken(t)) return { demo: true };
  const j = await json(await fetch(`${API}/share/linkedin/post`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", body: JSON.stringify({ t, text }),
  }));
  if (!j.id) throw Object.assign(new Error("failed"), { code: "failed" });
  return { redirect: `${API}/share/linkedin/start?d=${encodeURIComponent(j.id)}` };
}

/** Turns "What you missed" emails off (false) or back on (true) for the person the email was sent to. */
export async function setDigestEmail(t, on) {
  if (isDemoToken(t)) return { digestEmail: on, email: "al•••@example.com" };
  if (!isToken(t)) throw Object.assign(new Error("This link isn't complete."), { code: "invalid" });
  return json(await fetch(`${API}/notify/email-prefs`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "omit", body: JSON.stringify({ t, digestEmail: on }),
  }));
}

// ---------- Demo (t=demo.<kind>.<id>.<sessionId>, from the web app's demo mode) ----------

const SITE = "https://www.thetechfestival.com";
function demoDraft(t) {
  const kind = t.split(".")[1] === "poll" ? "poll" : "discussion";
  const session = { title: "Conviction Before Consensus: A Bet on Canadian Deep Tech", when: "Mon, Oct 26 · 10:05 AM", place: "Centre Stage", url: `${SITE}/agenda` };
  const poll = kind === "poll" ? { question: "Where will Canadian deep tech win first?", total: 214, options: [
    { label: "Quantum", pct: 38 }, { label: "AI infrastructure", pct: 34 }, { label: "Clean energy", pct: 19 }, { label: "Robotics", pct: 9 },
  ] } : null;
  const topic = kind === "discussion" ? "The session chat: what founders said about raising before the market agrees" : "";
  const text = kind === "poll"
    ? `Live poll at The Tech Festival Canada 2026: "${poll.question}"\n\n${poll.options.map((o) => `${o.label}: ${o.pct}%`).join("\n")}\n\n(${poll.total} votes in the room at "${session.title}".) What would you have picked?\n\n#TTFC2026`
    : `Great conversation in the "${session.title}" session chat at The Tech Festival Canada 2026.\n\nThe question everyone kept coming back to: how do you build conviction before the market agrees with you?\n\n#TTFC2026`;
  return Promise.resolve({
    kind, session, poll, topic, text, demo: true,
    article: { title: session.title, description: `${session.when} · ${session.place} · The Tech Festival Canada 2026, Toronto`, url: session.url },
  });
}
