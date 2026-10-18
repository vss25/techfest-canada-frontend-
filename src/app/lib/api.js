import { API } from "./config";

/* =========================================================
   JSON client for the TTFC backend (the same Render service the
   iOS and Android apps use). Signed-in calls send
   `Authorization: Bearer <app JWT>`. In demo mode every call is
   answered by the local demo backend instead (lib/demo.js), so
   nothing ever reaches a real account.
========================================================= */

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let tokenGetter = () => "";
let demoHandler = null;

export function configureApi({ getToken, demo }) {
  if (getToken) tokenGetter = getToken;
  demoHandler = demo || null;
}

export const isDemoApi = () => !!demoHandler;

/**
 * request("social/feed?limit=60") → parsed JSON.
 * Throws ApiError with the server's friendly `error` / `message`.
 */
export async function request(path, { method = "GET", body, auth = true, token, signal } = {}) {
  const clean = String(path).replace(/^\/+/, "");
  if (demoHandler) return demoHandler(clean, { method, body, auth });
  const bearer = token || (auth ? tokenGetter() : "");
  if (auth && !bearer) throw new ApiError("You need to sign in first.", 401);
  let res;
  try {
    res = await fetch(`${API}/${clean}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Can't reach the TTFC server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error === "maintenance" ? data.message : (data?.message && data?.error === "closed" ? data.message : data?.error || data?.message);
    throw new ApiError(msg || `Something went wrong (${res.status}). Please try again.`, res.status, data);
  }
  return data;
}

export const get = (p, o) => request(p, o);
export const post = (p, body, o) => request(p, { ...o, method: "POST", body: body ?? {} });
export const patch = (p, body, o) => request(p, { ...o, method: "PATCH", body: body ?? {} });
export const put = (p, body, o) => request(p, { ...o, method: "PUT", body: body ?? {} });
export const del = (p, o) => request(p, { ...o, method: "DELETE" });
