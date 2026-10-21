import { configureApi, get, patch, post, ApiError } from "./api";
import { CONSENT_VERSION, tierRank, tierName } from "./config";
import { createStore, local } from "./store";
import { configureEvents, track } from "../../lib/pwaEvents";
import { demoBackend, DEMO_TOKEN } from "./demo";

/* =========================================================
   Who's using the app:
   • "user"  – signed in with an app JWT (email link / code,
               or pass ID + last name), same token as the apps.
   • "guest" – browsing the agenda and speakers, no account.
   • "demo"  – /app?demo=1: a sample account on this device only.
   • "out"   – the sign-in screen.
   The JWT is kept in memory and in localStorage (this origin
   only); it's sent as `Authorization: Bearer` to the backend.
========================================================= */

const TOKEN_KEY = "ttfc.app.jwt";
const GUEST_KEY = "ttfc.app.guest";
const DEMO_KEY = "ttfc.app.demo";
const CONSENT_KEY = "ttfc.consent.version";

let token = local.get(TOKEN_KEY, "");

function bootMode() {
  try {
    const q = new URLSearchParams(window.location.search).get("demo");
    if (q === "1") local.set(DEMO_KEY, "1");
    if (q === "0") local.set(DEMO_KEY, null);
  } catch { /* ignore */ }
  if (local.get(DEMO_KEY) === "1") return "demo";
  if (token) return "user";
  if (local.get(GUEST_KEY) === "1") return "guest";
  return "out";
}

export const auth = createStore({
  mode: bootMode(),
  me: null,        // /social/me card (+ rights, role, email)
  user: null,      // /auth/me (tickets, profile fields)
  loading: false,
  notice: "",      // shown on the sign-in screen (e.g. "session ended")
});

const isDemo = () => auth.get().mode === "demo";
export const getToken = () => (isDemo() ? DEMO_TOKEN : token);

configureApi({ getToken, demo: isDemo() ? demoBackend : null });
configureEvents({ getToken: () => (isDemo() ? "" : token), isBlocked: isDemo });

function applyMode(mode) {
  configureApi({ getToken, demo: mode === "demo" ? demoBackend : null });
}

// ---------- Session ----------

function decodeExp(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return (payload.exp || 0) * 1000;
  } catch { return 0; }
}

/** Store a new app JWT and load the account. */
export async function signInWithToken(jwt, { method = "token" } = {}) {
  token = jwt;
  local.set(TOKEN_KEY, jwt);
  local.set(GUEST_KEY, null);
  applyMode("user");
  auth.set({ mode: "user", notice: "" });
  await loadAccount();
  track("pwa_signed_in", { method });
  recordConsent();
}

export function enterGuest() {
  local.set(GUEST_KEY, "1");
  local.set(CONSENT_KEY, CONSENT_VERSION);
  auth.set({ mode: "guest", me: null, user: null, notice: "" });
}

export function enterDemo() {
  local.set(DEMO_KEY, "1");
  applyMode("demo");
  auth.set({ mode: "demo", notice: "" });
  return loadAccount();
}

const signOutHooks = [];
/** `fn({ mode, token })` runs just before signing out, while the old token still works (lib/webpush.js). */
export function beforeSignOut(fn) { signOutHooks.push(fn); }

export function signOut(notice = "") {
  const was = { mode: auth.get().mode, token };
  for (const fn of signOutHooks) { try { fn(was); } catch { /* never blocks signing out */ } }
  token = "";
  local.set(TOKEN_KEY, null);
  local.set(GUEST_KEY, null);
  local.set(DEMO_KEY, null);
  applyMode("out");
  auth.set({ mode: "out", me: null, user: null, notice });
  window.dispatchEvent(new Event("ttfc:signed-out"));
}

/** /social/me + /auth/me. A rejected token signs out. */
export async function loadAccount() {
  const { mode } = auth.get();
  if (mode !== "user" && mode !== "demo") return;
  auth.set({ loading: true });
  try {
    const [me, user] = await Promise.all([get("social/me"), get("auth/me").catch(() => null)]);
    auth.set({ me, user: user?.user || user, loading: false });
    maybeRefresh();
  } catch (e) {
    auth.set({ loading: false });
    if (e instanceof ApiError && e.status === 401) signOut("Your session ended. Please sign in again.");
    else if (e instanceof ApiError && e.status === 403) signOut(e.message);
  }
}

/** Swaps the 30-day token for a fresh one once it's a week old. */
async function maybeRefresh() {
  if (isDemo() || !token) return;
  const exp = decodeExp(token);
  if (!exp || exp - Date.now() > 23 * 86400000) return;
  try {
    const r = await post("auth/refresh", {});
    if (r?.token) { token = r.token; local.set(TOKEN_KEY, r.token); }
  } catch { /* keep the current one */ }
}

/** "By continuing, you confirm you're 18+ and agree…": recorded once per Terms version. */
function recordConsent() {
  local.set(CONSENT_KEY, CONSENT_VERSION);
  const u = auth.get().user;
  if (!u || u.termsVersion === CONSENT_VERSION) return;
  patch("profile", { ageConfirmed: true, termsVersion: CONSENT_VERSION }).catch(() => {});
}

// ---------- Sign-in calls ----------

export const requestEmailLink = (email) =>
  post("auth/email-link", { email: String(email || "").trim(), client: "web" }, { auth: false });

export async function verifyEmailToken(t) {
  const r = await post("auth/email-link/verify", { token: t }, { auth: false });
  await signInWithToken(r.token, { method: "email_link" });
  return r;
}

export async function verifyEmailCode(email, code) {
  const r = await post("auth/email-link/verify", { email: String(email || "").trim(), code: String(code || "").replace(/\D/g, "") }, { auth: false });
  await signInWithToken(r.token, { method: "email_code" });
  return r;
}

/** Pass IDs are 12 letters/numbers; the "TECHFEST:" QR prefix is fine too. */
export const cleanTicketId = (raw) => String(raw || "").trim().replace(/^techfest:/i, "").replace(/\s+/g, "").toLowerCase();

export async function ticketLogin(lastName, ticketId) {
  const r = await post("auth/ticket-login", { lastName: String(lastName || "").trim(), ticketId: cleanTicketId(ticketId) }, { auth: false });
  await signInWithToken(r.token, { method: "pass_id" });
  return r;
}

/** iOS AuthService.staffOnlyMessage. */
export const STAFF_ONLY_MESSAGE = "This sign-in is for TTFC staff and volunteers. Attendees: use a sign-in link or your pass ID.";
/** Staff or volunteer: the TTFC team on the day (iOS RemoteUser.isTeam). */
export const isTeam = (u) => !!u && (u.isAdmin === true || u.role === "admin" || u.role === "volunteer");

/** "Staff sign-in": email + password, staff and volunteer accounts only (the server refuses others too).
    Staff and volunteers can also sign in with the emailed link/code like everyone else: the app reads
    their role and rights from /auth/me and /social/me either way. */
export async function staffSignIn(email, password) {
  const r = await post("auth/login", { email: String(email || "").trim().toLowerCase(), password, staffOnly: true }, { auth: false });
  // Checked before the app switches over, so an attendee account never lands in the app this way.
  const me = await get("auth/me", { token: r.token });
  if (!isTeam(me?.user || me)) throw new ApiError(STAFF_ONLY_MESSAGE, 403);
  await signInWithToken(r.token, { method: "staff" });
  return r;
}

// ---------- Helpers for screens ----------

export const isSignedIn = (s = auth.get()) => s.mode === "user" || s.mode === "demo";

/** What this account may do (server `rights`; missing = allowed, staff-only ones off). */
export function can(right, s = auth.get()) {
  const r = s.me?.rights?.[right];
  if (typeof r === "boolean") return r;
  if (right === "deleteAnyPost" || right === "moderate") return isStaff(s);
  return isSignedIn(s);
}

export const isStaff = (s = auth.get()) => !!(s.me?.isAdmin || s.me?.role === "admin" || s.user?.isAdmin || s.user?.role === "admin");

/** The pass the app shows: the latest purchase, else the highest tier. */
export function bestTicket(user) {
  const real = (user?.tickets || []).map((t) => ({
    ticketId: t.ticketId || t.id || "",
    type: String(t.type || t.tier || "").toLowerCase(),
    purchasedAt: t.purchaseDate || t.purchasedAt || "",
    checkedIn: !!t.checkedIn,
    // Its CxO Breakfasts (true / false; null = not sent) and everything it includes, as the server lists it
    // (the pass's meals and events as staff set them; [] from an older server): My pass › What's included.
    cxoBreakfast: typeof t.cxoBreakfast === "boolean" ? t.cxoBreakfast : null,
    inclusions: Array.isArray(t.inclusions) ? t.inclusions.filter((x) => typeof x === "string") : [],
  })).filter((t) => t.ticketId && !t.ticketId.toUpperCase().startsWith("BOOTH-"));
  if (!real.length) return null;
  const pick = real.some((t) => t.purchasedAt)
    ? real.reduce((a, b) => (String(b.purchasedAt) > String(a.purchasedAt) ? b : a))
    : real.reduce((a, b) => (tierRank(b.type) > tierRank(a.type) ? b : a));
  return { ...pick, tierName: tierName(pick.type) };
}

export const firstName = (name = "") => String(name).trim().split(/\s+/)[0] || "";
