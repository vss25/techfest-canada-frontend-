/* The small picture beside a step in the short install list (AppNotices' install sheet): the button the
   step starts with, drawn like Safari's / Chrome's own. Kept apart from InstallMockups so the sheet
   doesn't pull the whole guide into the first load. */

export default function StepGlyph({ name }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "dots") return <svg {...common}><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></svg>;
  if (name === "kebab") return <svg {...common}><circle cx="12" cy="5" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="19" r="1.6" fill="currentColor" /></svg>;
  if (name === "lines") return <svg {...common}><path d="M4 7h16M4 12h16M4 17h10" /></svg>;
  if (name === "plus") return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></svg>;
  if (name === "safari") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>;
  if (name === "home") return <svg {...common}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>;
  return <svg {...common}><path d="M8 9H6v11h12V9h-2" /><path d="M12 14V3M8 7l4-4 4 4" /></svg>;
}
