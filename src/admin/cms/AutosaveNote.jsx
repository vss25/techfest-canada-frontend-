/* The autosave status next to Save (useAutosave.js). */
const timeOf = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** The small line next to Save: "Autosaved 2:41 PM", "Saving…", or why it's waiting. */
export function AutosaveNote({ auto, className = "" }) {
  const text = auto.status === "saving" ? "Saving…"
    : auto.status === "waiting" ? `Not saved yet: ${auto.why}`
      : auto.status === "error" ? "Autosave didn't go through. It tries again in 30 seconds, or press Save."
        : auto.at ? `Saved ${timeOf(auto.at)}` : "Saves automatically 30 seconds after you stop typing";
  const tone = auto.status === "waiting" || auto.status === "error" ? "text-[#B45309]" : "text-ttfc-muted";
  return <span role="status" aria-live="polite" className={`text-xs ${tone} ${className}`}>{text}</span>;
}
