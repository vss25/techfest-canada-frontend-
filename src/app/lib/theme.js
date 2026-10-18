import { createStore, local } from "./store";

/* Theme: follow the system (default), or always light / dark (Profile). */

const KEY = "ttfc.app.theme";
const DARK_BG = "#0E0828";
const LIGHT_BG = "#FCF8FB";

export const theme = createStore({ value: local.get(KEY, "system") });

function apply(value) {
  const root = document.documentElement;
  if (value === "light" || value === "dark") root.setAttribute("data-theme", value);
  else root.removeAttribute("data-theme");
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((m) => {
    const media = m.getAttribute("data-media") || m.getAttribute("media") || "";
    if (!m.getAttribute("data-media")) m.setAttribute("data-media", media);
    if (value === "system") {
      m.setAttribute("media", m.getAttribute("data-media"));
      m.setAttribute("content", /light/.test(m.getAttribute("data-media")) ? LIGHT_BG : DARK_BG);
    } else {
      m.removeAttribute("media");
      m.setAttribute("content", value === "light" ? LIGHT_BG : DARK_BG);
    }
  });
}

export function setTheme(value) {
  local.set(KEY, value === "system" ? null : value);
  theme.set({ value });
  apply(value);
}

apply(theme.get().value);

export const THEME_LABEL = { system: "System", light: "Light", dark: "Dark" };
