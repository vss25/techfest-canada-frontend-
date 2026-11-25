/* =========================================================
   Dark preview of the public website (Nov 25 2026, the owner: "I also want to see how customer facing website
   looks in dark mode"). A preview only: nobody sees it unless they open the site with ?theme=dark, which keeps
   it on for that browser tab (sessionStorage) until ?theme=light. It sets <html data-site-theme="dark">;
   the colours are in src/redesign/approved/siteDark.css. Not a customer setting: the approved design is light.
========================================================= */
export const SITE_THEME_KEY = "ttfc.site.themePreview";

/** "dark" | "" from the address (wins) or this tab's earlier choice. Pure apart from the storage it is given. */
export function previewTheme(search, store) {
  const q = new URLSearchParams(search || "").get("theme");
  try {
    if (q === "dark") { store?.setItem(SITE_THEME_KEY, "dark"); return "dark"; }
    if (q === "light") { store?.removeItem(SITE_THEME_KEY); return ""; }
    return store?.getItem(SITE_THEME_KEY) === "dark" ? "dark" : "";
  } catch {
    return q === "dark" ? "dark" : "";
  }
}

/** Applies it to <html>; call once when the site starts and on every address change. */
export function applySitePreviewTheme() {
  if (typeof window === "undefined") return "";
  let store = null;
  try { store = window.sessionStorage; } catch { /* storage off */ }
  const t = previewTheme(window.location.search, store);
  if (t) document.documentElement.setAttribute("data-site-theme", t);
  else document.documentElement.removeAttribute("data-site-theme");
  return t;
}
