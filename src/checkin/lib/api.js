/* =========================================================
   TTFC Check-in: talking to the backend (the same Render service as
   the website and apps). Every desk call sends the desk's own sign-in
   (a staff or volunteer password sign-in, POST /api/auth/login
   staffOnly) as `Authorization: Bearer`. Kept apart from the admin
   panel's sign-in (localStorage "token"): signing in or out of one
   never changes the other.
   • A call gives up when nothing arrives for `timeoutMs` (15 s): while
     waiting for the answer AND while its body downloads (a stalled
     body never hangs the guest list, the live connection or the tap
     queue; a slow but moving download is fine).
   • The server's time in any answer (serverTime) sets the device's
     clock offset (lib/clock.js).
   • The shared contract with the backend (C1): a passwordless sign-in
     (ticket, emailed code) gets 403 { code: "password_required" } on
     every desk call; the app then goes back to its sign-in screen.
========================================================= */

const ENV = import.meta.env || {};
export const API = ENV.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";
export const API_ORIGIN = API.replace(/\/api\/?$/, "");
const SESSION_KEY = "ttfc.desk.session.v1";
export const PASSWORD_REQUIRED = "password_required";
export const PASSWORD_REQUIRED_TEXT = "This app needs your staff or volunteer password sign-in.";

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.code = data?.code || "";
  }
}

let session = null;
try { session = JSON.parse(globalThis.localStorage?.getItem(SESSION_KEY) || "null"); } catch { session = null; }
const listeners = new Set();

export const getSession = () => session;
export const getToken = () => session?.token || "";
export function setSession(next) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage blocked: signed in for this visit only */ }
  listeners.forEach((fn) => fn(session));
}
export const onSession = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

let observeTime = null;
let authProblem = null;
/** The server's time seen in an answer: fn(serverTime, sentAt, answeredAt) (the device's clock). */
export const setServerTimeObserver = (fn) => { observeTime = fn; };
/** A desk call said the sign-in can't be used here: fn(code) (C1: "password_required"). */
export const setAuthProblemHandler = (fn) => { authProblem = fn; };

const STALLED = "The TTFC server stopped answering. Check the Wi-Fi.";

/**
 * A response's body as text, giving up when no part of it arrives for `idleMs` (a stalled download), or after
 * `totalMs` in all (0: no limit). `abort()` cancels the request underneath. Throws ApiError status 0 on a stall.
 */
export async function readBody(res, { idleMs = 15000, totalMs = 0, abort = () => {}, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let timer = null;
  let total = null;
  let stalled = false;
  let fail = null;
  const stop = new Promise((_, reject) => { fail = reject; });
  stop.catch(() => {});
  const giveUp = () => { stalled = true; try { abort(); } catch { /* already gone */ } fail(new ApiError(STALLED, 0)); };
  const arm = () => { if (timer) clearTimer(timer); timer = setTimer(giveUp, idleMs); };
  try {
    arm();
    if (totalMs > 0) total = setTimer(giveUp, totalMs);
    const reader = res.body?.getReader?.();
    if (!reader) return await Promise.race([res.text(), stop]);
    const dec = new TextDecoder();
    let text = "";
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), stop]);
      if (done) break;
      arm();
      text += dec.decode(value, { stream: true });
    }
    return text + dec.decode();
  } catch (err) {
    if (stalled || err instanceof ApiError) throw err instanceof ApiError ? err : new ApiError(STALLED, 0);
    throw new ApiError(STALLED, 0);
  } finally {
    if (timer) clearTimer(timer);
    if (total) clearTimer(total);
  }
}

/**
 * fetch → JSON; throws ApiError (status 0 = no connection, or the server stopped answering).
 *   timeoutMs  nothing for this long (no answer yet, or the body stopped arriving) → give up
 *   totalMs    give up after this long in all (0: no limit; a slow but moving download is fine)
 */
export async function api(path, { method = "GET", body, signal, token = getToken(), timeoutMs = 15000, totalMs = 0, fetchFn = globalThis.fetch } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => ctl.abort(), { once: true });
  const sentAt = Date.now();
  let res;
  try {
    res = await fetchFn(`${API}${path}`, {
      method,
      signal: ctl.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    clearTimeout(timer);
    if (signal?.aborted) throw err;
    throw new ApiError("Can't reach the TTFC server. Check the Wi-Fi.", 0);
  }
  clearTimeout(timer);
  const answeredAt = Date.now();
  let text = "";
  try {
    text = await readBody(res, { idleMs: timeoutMs, totalMs, abort: () => ctl.abort() });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw err instanceof ApiError ? err : new ApiError(STALLED, 0);
  }
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (data && typeof data === "object" && data.serverTime) { try { observeTime?.(data.serverTime, sentAt, answeredAt); } catch { /* the clock's problem */ } }
  if (!res.ok) {
    const msg = data?.error === "maintenance" ? data.message : data?.error || data?.message || `Something went wrong (${res.status}).`;
    const err = new ApiError(data?.code === PASSWORD_REQUIRED ? PASSWORD_REQUIRED_TEXT : msg, res.status, data);
    // The device's own sign-in can't be used here (C1): back to the sign-in screen. (A sign-in being tried says so itself.)
    if (res.status === 403 && data?.code === PASSWORD_REQUIRED && token && token === getToken()) { try { authProblem?.(PASSWORD_REQUIRED); } catch { /* */ } }
    throw err;
  }
  return data;
}

/** Staff and volunteer sign-in (the apps' staff sign-in). → { token, user, staff } */
export async function signIn(email, password) {
  const r = await api("/auth/login", { method: "POST", body: { email: String(email || "").trim(), password, staffOnly: true }, token: "" });
  if (!r?.token) throw new ApiError("Sign-in failed. Try again.", 500);
  let me;
  try {
    me = await api("/checkin/desk/me", { token: r.token });
  } catch (err) {
    if (err.status === 403 && err.code === PASSWORD_REQUIRED) throw new ApiError(PASSWORD_REQUIRED_TEXT, 403, err.data);
    if (err.status === 403) throw new ApiError("This account can't use check-in. Ask a staff member to give you check-in access.", 403, err.data);
    throw err;
  }
  const next = { token: r.token, user: me.user, staff: !!me.staff, at: Date.now() };
  setSession(next);
  return next;
}
