import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

/* =========================================================
   The staff panel's light / dark theme.
   Choice: "system" (default: follows the device), "light" or
   "dark", remembered in this browser (localStorage, best effort:
   private windows just follow the device). The theme in use is
   set as <html data-admin-theme="light|dark">; admin.css swaps
   the ttfc colour variables on it. index.html sets the same
   attribute before the first paint on /admin and /admin-login,
   so the panel never flashes the other theme while it loads.
   Only the panel sets the attribute, and it's removed when the
   panel closes, so the website never sees it.
========================================================= */

export const THEME_KEY = "ttfc.admin.theme";
export const THEME_CHOICES = ["system", "light", "dark"];
const ATTR = "data-admin-theme";

export function readThemeChoice() {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return THEME_CHOICES.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

function saveThemeChoice(choice) {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch { /* storage off: the choice lasts until the page closes */ }
}

const darkQuery = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null);
// No preference from the device (or no matchMedia): dark, the panel's look before light mode.
const systemIsDark = () => { const q = darkQuery(); return q ? q.matches || !window.matchMedia("(prefers-color-scheme: light)").matches : true; };

export const resolveTheme = (choice, sysDark = systemIsDark()) => (choice === "light" || choice === "dark" ? choice : sysDark ? "dark" : "light");

/**
 * Applies the theme to <html> while the calling page (the panel or its sign-in page) is open.
 * Returns { choice, theme, systemTheme, setChoice }: theme (in use) and systemTheme (the device's) are "light" or "dark".
 */
export function useAdminThemeRoot() {
  const [choice, setChoiceState] = useState(readThemeChoice);
  const [sysDark, setSysDark] = useState(systemIsDark);

  // The device switching between light and dark (System follows it).
  useEffect(() => {
    const q = darkQuery();
    if (!q) return undefined;
    const on = () => setSysDark(systemIsDark());
    q.addEventListener?.("change", on);
    return () => q.removeEventListener?.("change", on);
  }, []);

  // A choice made in another tab.
  useEffect(() => {
    const on = (e) => { if (e.key === THEME_KEY || e.key === null) setChoiceState(readThemeChoice()); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const theme = resolveTheme(choice, sysDark);
  useLayoutEffect(() => { document.documentElement.setAttribute(ATTR, theme); }, [theme]);
  useLayoutEffect(() => () => document.documentElement.removeAttribute(ATTR), []);

  const setChoice = useCallback((next) => {
    if (!THEME_CHOICES.includes(next)) return;
    saveThemeChoice(next);
    setChoiceState(next);
  }, []);

  const systemTheme = sysDark ? "dark" : "light";
  return useMemo(() => ({ choice, theme, systemTheme, setChoice }), [choice, theme, systemTheme, setChoice]);
}

export const AdminThemeContext = createContext({ choice: "system", theme: "dark", systemTheme: "dark", setChoice: () => {} });
/** { choice, theme, systemTheme, setChoice } of the panel's theme (see useAdminThemeRoot). */
export const useAdminTheme = () => useContext(AdminThemeContext);

/* Chart colours (Recharts takes plain colours, not CSS variables): the ttfc palette per theme. */
const CHART = {
  dark: { grid: "#2A2143", axis: "#7B7296", label: "#A9A1C2", cursor: "#A9A1C2", dotRing: "#130D22", pink: "#E8458B", purple: "#8B5CF6", orange: "#F59E42", hover: "rgba(255,255,255,0.04)" },
  light: { grid: "#DED8E9", axis: "#625B79", label: "#4D4663", cursor: "#625B79", dotRing: "#FFFFFF", pink: "#C21C64", purple: "#6E3FDB", orange: "#984607", hover: "rgba(28,21,48,0.05)" },
};
export const chartColors = (theme) => CHART[theme === "light" ? "light" : "dark"];
