/* =========================================================
   The public website's dark look (Nov 25 2026). It began as a staff preview (?theme=dark); the owner then chose
   dark for everyone, so it is now the default and ?theme=light previews the light version for that browser tab
   (sessionStorage) until ?theme=dark. It sets <html data-site-theme="dark"> while a page of the new design is
   open; the colours are in src/redesign/approved/siteDark.css.
========================================================= */
export const SITE_THEME_KEY = "ttfc.site.themePreview";

/** "dark" | "" from the address (wins) or this tab's earlier choice.
    Nov 25 2026 (the owner, after seeing both: too much white): dark is the website's look for everyone;
    ?theme=light shows the light version for this tab (a staff preview), ?theme=dark goes back.
    Pure apart from the storage it is given. */
export function previewTheme(search, store) {
  const q = new URLSearchParams(search || "").get("theme");
  try {
    if (q === "light") { store?.setItem(SITE_THEME_KEY, "light"); return ""; }
    if (q === "dark") { store?.removeItem(SITE_THEME_KEY); return "dark"; }
    return store?.getItem(SITE_THEME_KEY) === "light" ? "" : "dark";
  } catch {
    return q === "light" ? "" : "dark";
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
