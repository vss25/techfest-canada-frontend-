import { useEffect, useRef } from "react";

/* =========================================================
   Website forms → TTFC backend (replaces EmailJS, Oct 2026)
   ---------------------------------------------------------
   Every form POSTs to `${API}/forms/<form>`. The backend saves it,
   answers 201 straight away, then emails it to
   baldeep@thetechfestival.com. Staff see it in Admin → Leads →
   Form submissions.

   form = volunteer | speaker | exhibit | sponsor | partnership | inquiry
   (keep in step with services/formSubmissions.js FORMS in the backend).
========================================================= */

export const API = import.meta.env.VITE_API_URL || "https://techfest-canada-backend.onrender.com/api";

/** Shown with every form's error message. */
export const FORMS_FALLBACK_EMAIL = "baldeep@thetechfestival.com";

/**
 * Honeypot + timer for one form. `open` restarts the timer when a pop-up opens.
 *   const guard = useFormGuard(isOpen);
 *   <input {...guard.honeypotProps} />            // hidden from people, bots fill it
 *   submitForm("volunteer", data, guard.meta())
 */
export function useFormGuard(open = true) {
  const hp = useRef("");
  const startedAt = useRef(0); // set when the form (or pop-up) opens
  useEffect(() => {
    if (open) {
      startedAt.current = Date.now();
      hp.current = "";
    }
  }, [open]);
  return {
    honeypotProps: {
      type: "text",
      name: "website",
      tabIndex: -1,
      autoComplete: "off",
      "aria-hidden": "true",
      defaultValue: "",
      onChange: (e) => { hp.current = e.target.value; },
      style: { position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" },
    },
    meta: () => ({ _hp: hp.current, elapsedMs: Date.now() - startedAt.current }),
  };
}

/**
 * Send one form. Resolves on any 2xx answer; throws otherwise (network error,
 * 4xx, 5xx) with the server's message when it gave one.
 * @param {string} form  volunteer | speaker | exhibit | sponsor | partnership | inquiry
 * @param {object} data  { name? | firstName + lastName, email, phone?, company?, jobTitle?, message?, fields?: {...} }
 * @param {{_hp: string, elapsedMs: number}} meta  from useFormGuard().meta()
 */
export async function submitForm(form, data, meta = {}) {
  const res = await fetch(`${API}/forms/${encodeURIComponent(form)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      page: window.location.pathname,
      referrer: document.referrer,
      _hp: meta._hp || "",
      elapsedMs: meta.elapsedMs,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.message || body?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}
