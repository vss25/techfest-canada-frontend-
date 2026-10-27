/* The survey's colours as --sv-* variables (Oct 26 2026): the public /survey page and the admin's live preview
   (components/SurveyQuestion.jsx uses them). The same palette as /swag and /stay-updated, light and dark. */

/** The page's colours (the same palette as /swag and /stay-updated). */
export function surveyVars(dark) {
  const t = dark
    ? { bg: "#06020f", text: "#ffffff", mid: "rgba(225,215,255,0.82)", dim: "rgba(200,185,255,0.62)", card: "rgba(255,255,255,0.045)", line: "rgba(155,135,245,0.22)", accent: "#c4adff", chip: "rgba(155,135,245,0.16)", input: "rgba(255,255,255,0.06)", err: "#ff9b9b", star: "#f5a623", off: "rgba(225,215,255,0.32)" }
    : { bg: "#faf9ff", text: "#0d0520", mid: "rgba(13,5,32,0.72)", dim: "rgba(13,5,32,0.55)", card: "#ffffff", line: "rgba(122,63,209,0.16)", accent: "#6a2fc4", chip: "rgba(122,63,209,0.09)", input: "#ffffff", err: "#b42318", star: "#e8930c", off: "rgba(13,5,32,0.22)" };
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [`--sv-${k}`, v]));
}
