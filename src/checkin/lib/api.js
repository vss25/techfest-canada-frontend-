/* =========================================================
   TTFC Check-in: talking to the backend (the same Render service as
   the website and apps). Every desk call sends the desk's own sign-in
   (a staff or volunteer password sign-in, POST /api/auth/login
   staffOnly) as `Authorization: Bearer`. Kept apart from the admin
   panel's sign-in (localStorage "token"): signing in or out of one
   never changes the other.
========================================================= */

export const API = import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";
export const API_ORIGIN = API.replace(/\/api\/?$/, "");
const SESSION_KEY = "ttfc.desk.session.v1";

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.code = data?.code || "";
  }
}

let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { session = null; }
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

/** fetch → JSON; throws ApiError (status 0 = no connection). */
export async function api(path, { method = "GET", body, signal, token = getToken(), timeoutMs = 15000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => ctl.abort(), { once: true });
  let res;
  try {
    res = await fetch(`${API}${path}`, {
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error === "maintenance" ? data.message : data?.error || data?.message || `Something went wrong (${res.status}).`;
    throw new ApiError(msg, res.status, data);
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
    if (err.status === 403) throw new ApiError("This account can't use check-in. Ask a staff member to give you check-in access.", 403);
    throw err;
  }
  const next = { token: r.token, user: me.user, staff: !!me.staff, at: Date.now() };
  setSession(next);
  return next;
}
