/* =========================================================
   Admin API helper.
   Same backend and the same auth pattern as the existing admin
   components (e.g. CheckIn): the staff JWT lives in
   localStorage under "token" and is sent as
   `Authorization: Bearer <token>`.
========================================================= */

export const ADMIN_API =
  import.meta.env.VITE_ADMIN_API_URL || "https://techfest-canada-backend.onrender.com/api";

export const getToken = () => {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
};

export function signOut() {
  try { localStorage.removeItem("token"); } catch { /* ignore */ }
  window.dispatchEvent(new Event("authChanged"));
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * fetch wrapper → parsed JSON. Throws ApiError with the server's
 * `error` / `message` text so the UI can show it as-is.
 */
export async function adminFetch(path, { method = "GET", body, signal } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${ADMIN_API}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("ttfc:admin-unauthorized"));
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new ApiError(msg === "maintenance" ? data?.message || msg : msg, res.status);
  }
  return data;
}

export const api = {
  get: (p, opts) => adminFetch(p, opts),
  post: (p, body) => adminFetch(p, { method: "POST", body: body ?? {} }),
  put: (p, body) => adminFetch(p, { method: "PUT", body: body ?? {} }),
  patch: (p, body) => adminFetch(p, { method: "PATCH", body: body ?? {} }),
  del: (p) => adminFetch(p, { method: "DELETE" }),
};
