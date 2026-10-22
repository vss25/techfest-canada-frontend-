import { get, patch, post } from "./api";
import { createStore } from "./store";
import { showAlert } from "./ui";

/* =========================================================
   Batch 4 (Oct 22 2026) server calls, all in one place so a
   changed route is a one-line edit here:
     GET   social/notify/prefs          → { prefs: {8 switches}, options: [{key, label}] }
     PATCH social/notify/prefs {key: b} → the same
     GET   app/attending-link           → { url, posted, points }  the website's
           "I'm attending" page for this person (their signed r token)
     POST  app/linkedin/share           → 201 { url, expiresAt, points } the website's
           /share/linkedin?t=… draft (2 hours):
             a session's discussion: { kind: "discussion", id: <session id> }
             a poll: { kind: "poll", id: <poll id>, sessionId, question, options: [labels] }
             (the server adds the results from the votes); 404 when the session isn't on the
             agenda, 503 { code: "unavailable" } when LinkedIn isn't set up
     POST  app/events                   → presence (markActive): the "What you missed"
           email skips what you'd have seen by opening the app
   Demo mode answers all of them (lib/demo.js).

   Opening a link: Safari only opens a new tab straight from a tap
   (after an await it's silently blocked), so links are fetched
   ahead (prefetchAttending / prefetchShare when the button shows)
   and a tap opens the cached one at once. If it isn't ready yet
   the tap fetches it and a toast offers "Open" (a fresh tap).
========================================================= */

// ---------- Notification settings ----------

/** The switches, in the order Settings › Notifications shows them (wording from the shared contract). */
export const NOTIFY_PREFS = [
  { key: "messages", label: "Messages", hint: "Someone writes to you." },
  { key: "comments", label: "Comments and replies", hint: "On your posts and comments." },
  { key: "mentions", label: "Mentions", hint: "Someone @mentions you." },
  { key: "likes", label: "Likes", hint: "At most one per post an hour." },
  { key: "groups", label: "Group and session chats", hint: "At most one per chat every 10 minutes, unless you're mentioned." },
  { key: "connections", label: "Connection requests", hint: "Someone wants to connect." },
  { key: "announcements", label: "Announcements from TTFC", hint: "Updates from the TTFC team." },
];
export const DIGEST_PREF = {
  key: "digestEmail", label: "Email me a summary of what I missed",
  hint: "Only when you've missed something: about 3 hours after the first thing, or at 5 PM. Never at night.",
};
const DEFAULTS = Object.fromEntries([...NOTIFY_PREFS, DIGEST_PREF].map((p) => [p.key, true]));

export const notifyPrefs = createStore({ prefs: null, labels: {}, error: "", saving: {} });
let version = 0; // a load that set off before a change can't put the old value back

export async function loadNotifyPrefs() {
  const v = version;
  try {
    const r = await get("social/notify/prefs");
    const labels = Object.fromEntries((Array.isArray(r?.options) ? r.options : []).filter((o) => o?.key && o?.label).map((o) => [o.key, String(o.label)]));
    if (v === version) notifyPrefs.set((s) => ({ ...s, prefs: { ...DEFAULTS, ...pick(r?.prefs || r) }, labels, error: "" }));
  } catch (e) {
    notifyPrefs.set((s) => ({ ...s, error: e.message || "Couldn't load your notification settings." }));
  }
}

const pick = (r) => Object.fromEntries(Object.keys(DEFAULTS).filter((k) => typeof r?.[k] === "boolean").map((k) => [k, r[k]]));

/** Optimistic: the switch moves at once, is disabled while it saves, and goes back (with an alert) if it can't. */
export async function setNotifyPref(key, value) {
  const before = notifyPrefs.get().prefs?.[key] ?? true;
  version++;
  notifyPrefs.set((s) => ({ ...s, prefs: { ...(s.prefs || DEFAULTS), [key]: value }, saving: { ...s.saving, [key]: true } }));
  try {
    const r = await patch("social/notify/prefs", { [key]: value });
    const got = r?.prefs || r;
    const saved = typeof got?.[key] === "boolean" ? got[key] : value;
    version++;
    notifyPrefs.set((s) => ({ ...s, prefs: { ...(s.prefs || DEFAULTS), [key]: saved }, saving: { ...s.saving, [key]: false } }));
  } catch (e) {
    version++;
    notifyPrefs.set((s) => ({ ...s, prefs: { ...(s.prefs || DEFAULTS), [key]: before }, saving: { ...s.saving, [key]: false } }));
    showAlert("Couldn't save", e.message || "Check your connection and try again.");
  }
}

window.addEventListener("ttfc:signed-out", () => { version++; notifyPrefs.set({ prefs: null, labels: {}, error: "", saving: {} }); });

// ---------- Links to the website (I'm attending, LinkedIn shares) ----------

const TTL = 20 * 60 * 1000;
const links = new Map(); // key → { url, at, posted } | { promise }

/** The website opened from the app: it says "Back to the TTFC app" afterwards (and keeps the r token's fragment). */
export function fromApp(url) {
  try {
    const u = new URL(url, window.location.origin);
    if (!/(^|\.)thetechfestival\.com$|^localhost$|^127\.0\.0\.1$/.test(u.hostname)) return "";
    if (!u.searchParams.has("from")) u.searchParams.set("from", "app");
    return u.href;
  } catch { return ""; }
}

function fresh(key) {
  const hit = links.get(key);
  return hit?.url && Date.now() < hit.until ? hit : null;
}

function fetchLink(key, load) {
  const hit = links.get(key);
  if (hit?.promise) return hit.promise;
  const promise = load().then((r) => {
    const url = fromApp(r?.url || "");
    if (!url) throw new Error("No link came back. Try again in a moment.");
    // A share link lasts 2 hours (expiresAt): reuse it until 10 minutes before, so a draft isn't made on every view.
    const ends = Date.parse(r?.expiresAt || "");
    const until = Number.isFinite(ends) ? Math.max(Date.now(), ends - 10 * 60 * 1000) : Date.now() + TTL;
    const entry = { url, until, posted: !!r?.posted };
    links.set(key, entry);
    return entry;
  }, (e) => { links.delete(key); throw e; });
  links.set(key, { promise });
  return promise;
}

/** Opens the link straight from the tap when it's cached; else fetches it, then a toast offers Open. */
function openLink(key, load, label) {
  const hit = fresh(key);
  if (hit && openNow(hit.url)) return;
  fetchLink(key, load).then(
    (e) => showAlert(label, "Your page is ready.", { action: { label: "Open", run: () => openNow(e.url, true) }, ms: 12000 }),
    (e) => (e?.status === 503 || e?.data?.code === "unavailable"
      ? showAlert("LinkedIn sharing isn't available right now", "Try again later.")
      : showAlert("Couldn't open LinkedIn", e.message || "Check your connection and try again.")),
  );
}

/** A new tab (the in-app browser in the Home Screen app). → false if the browser wouldn't. */
function openNow(url, sameTabIfBlocked = false) {
  let w = null;
  try { w = window.open(url, "_blank"); } catch { w = null; }
  if (w) { try { w.opener = null; } catch { /* cross-origin already */ } return true; }
  if (sameTabIfBlocked) window.location.href = url;
  return false;
}

const ATTENDING = "attending";
export const prefetchAttending = () => { if (!fresh(ATTENDING)) fetchLink(ATTENDING, () => get("app/attending-link")).catch(() => {}); };
/** The link and whether their I'm-attending post is confirmed: { url, posted } (cached like the prefetch). */
export const loadAttending = () => Promise.resolve(fresh(ATTENDING) || fetchLink(ATTENDING, () => get("app/attending-link")));
export const openAttending = () => openLink(ATTENDING, () => get("app/attending-link"), "Tell your network you're attending");
/** The server said this person's I'm-attending post is confirmed (the points also say so). */
export const attendingPostedHint = () => !!links.get(ATTENDING)?.posted;

/**
 * What to share: { kind: "discussion", sessionId } (the session's discussion: its chat), or { kind: "poll", id,
 * sessionId, question, options } (options as the labels the app shows; the server adds the results).
 */
const shareKey = (item) => `share:${item.kind}:${item.kind === "poll" ? `${item.sessionId}/${item.id}` : item.sessionId || item.id}`;
const shareBody = (item) => (item.kind === "poll"
  ? { kind: "poll", id: item.id, sessionId: item.sessionId, question: item.question || "", options: item.options || [] }
  : { kind: "discussion", id: item.sessionId || item.id });
const loadShare = (item) => () => post("app/linkedin/share", shareBody(item));
export function prefetchShare(item) {
  const key = shareKey(item);
  if (!fresh(key)) fetchLink(key, loadShare(item)).catch(() => {});
}
export const openShare = (item) => openLink(shareKey(item), loadShare(item), "Share on LinkedIn");

// ---------- Presence ----------

let lastActive = 0;
/**
 * Tells the server this person has the app open (POST app/events: it updates lastActiveAt), so the "What you
 * missed" email leaves out what they'd have seen. At most once a minute (`minGap`); no analytics event when the website's
 * cookie choice is "Essential only" (the empty ping still counts as being here).
 */
export function markActive(reason = "foreground", minGap = 60000) {
  if (Date.now() - lastActive < minGap) return;
  lastActive = Date.now();
  let essentialOnly = false;
  try { essentialOnly = localStorage.getItem("tfc_cookie_consent") === "essential"; } catch { /* storage blocked */ }
  const events = essentialOnly ? [] : [{ name: "app_active", at: new Date().toISOString(), props: { reason } }];
  post("app/events", { platform: "web", events }).catch(() => { lastActive = 0; });
}
