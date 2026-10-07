/* Where a personal notification opens when the person taps it.
   Mirrors the backend whitelist (services/notifyHelpers.js → cleanLink):
   ttfc://tab/<tab>, ttfc://session/<id>, or an https:// web page. */

export const LINK_CHOICES = [
  { key: "home", label: "Home", link: "ttfc://tab/home" },
  { key: "feed", label: "Feed", link: "ttfc://tab/feed" },
  { key: "network", label: "Network", link: "ttfc://tab/network" },
  { key: "schedule", label: "Schedule", link: "ttfc://tab/schedule" },
  { key: "ticket", label: "My ticket", link: "ttfc://tab/ticket" },
  { key: "session", label: "A session…" },
  { key: "web", label: "A web page…" },
];

export const TITLE_MAX = 80;
export const BODY_MAX = 500;
export const MAX_RECIPIENTS = 100;

const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** https URL check matching the server; returns an error message or "". */
export function webLinkError(url) {
  const s = String(url || "").trim();
  if (!s) return "Paste the web address.";
  if (!/^https:\/\//i.test(s)) return "Use a secure link that starts with https://";
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".") || /\s/.test(s) || u.username || u.password) return "That doesn't look like a web address.";
  } catch {
    return "That doesn't look like a web address.";
  }
  return "";
}

/** { choice, sessionId, url } → { link, error } */
export function buildLink({ choice, sessionId, url }) {
  const fixed = LINK_CHOICES.find((c) => c.key === choice && c.link);
  if (fixed) return { link: fixed.link, error: "" };
  if (choice === "session") {
    const id = String(sessionId || "").trim();
    if (!id) return { link: "", error: "Pick a session." };
    if (!SESSION_ID.test(id)) return { link: "", error: "That session ID isn't valid." };
    return { link: `ttfc://session/${id}`, error: "" };
  }
  if (choice === "web") {
    const error = webLinkError(url);
    return { link: error ? "" : String(url).trim(), error };
  }
  return { link: "ttfc://tab/home", error: "" };
}

/** Plain-English label for a stored link (history table, preview). */
export function describeLink(link, sessions = []) {
  const s = String(link || "");
  if (!s) return "Home";
  const tab = /^ttfc:\/\/tab\/([a-z]+)/.exec(s);
  if (tab) return LINK_CHOICES.find((c) => c.key === tab[1])?.label || tab[1];
  const session = /^ttfc:\/\/session\/([^/]+)/.exec(s);
  if (session) {
    const found = sessions.find((x) => x.id === session[1]);
    return found ? `Session: ${found.title}` : `Session ${session[1]}`;
  }
  try { return new URL(s).hostname.replace(/^www\./, ""); } catch { return s; }
}
