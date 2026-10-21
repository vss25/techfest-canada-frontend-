/* =========================================================
   Jury portal API helper (/api/jury on the TTFC backend).
   The juror's session token lives under its own key
   ("ttfc.jury.token"), never the site's "token": signing in to
   the jury portal doesn't sign anyone in to the website, the
   admin panel or the web app, and the other way round.
========================================================= */
import { API } from "../lib/forms";

export const JURY_API = `${API}/jury`;
const TOKEN_KEY = "ttfc.jury.token";
const EMAIL_KEY = "ttfc.jury.email";
export const SIGNED_OUT_EVENT = "ttfc:jury-signed-out";

const read = (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const write = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* storage off: this tab only */ } };

let memoryToken = "";
export const getJuryToken = () => read(TOKEN_KEY) || memoryToken;
export function setJuryToken(t) { memoryToken = t || ""; write(TOKEN_KEY, t || ""); }
export function clearJuryToken() { setJuryToken(""); }
export const lastEmail = () => read(EMAIL_KEY);
export const rememberEmail = (e) => write(EMAIL_KEY, String(e || "").trim().toLowerCase());

export class JuryError extends Error {
  constructor(message, status, code = "", data = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/** fetch → parsed JSON; throws JuryError with the server's wording. A dead session signs the juror out. */
export async function juryFetch(path, { method = "GET", body, signal, keepalive } = {}) {
  const token = getJuryToken();
  let res;
  try {
    res = await fetch(`${JURY_API}${path}`, {
      method, signal, keepalive,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new JuryError("Can't reach the server. Check your connection and try again.", 0, "offline");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && data?.code === "jury_signin" && token) {
    clearJuryToken();
    window.dispatchEvent(new CustomEvent(SIGNED_OUT_EVENT, { detail: { message: data.error || "" } }));
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Something went wrong (${res.status}). Please try again.`;
    throw new JuryError(msg === "maintenance" ? data?.message || msg : msg, res.status, data?.code || "", data);
  }
  return data;
}

export const jury = {
  get: (p, opts) => juryFetch(p, opts),
  post: (p, body, opts) => juryFetch(p, { method: "POST", body: body ?? {}, ...opts }),
  put: (p, body, opts) => juryFetch(p, { method: "PUT", body: body ?? {}, ...opts }),
};
