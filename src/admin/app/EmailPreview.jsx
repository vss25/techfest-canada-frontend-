import { useState } from "react";
import { Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { ErrorState, LoadingState } from "../ui";

/* An email preview from the server ({ subject, preheader, html, text }): the email or its plain text, desktop or
   phone width, dark or light. Used by App invite email and "What you missed" emails. */

export default function EmailPreview({ preview, loading, error, title = "Email preview" }) {
  const [mode, setMode] = useState("html");
  const [width, setWidth] = useState("desktop");
  const [scheme, setScheme] = useState("dark");
  const seg = (value, set, items, label) => (
    <div className="flex gap-1" role="group" aria-label={label}>
      {items.map(([k, text, Icon]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => set(k)}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold ${value === k ? "bg-ttfc-purple/30 text-white" : "text-ttfc-muted hover:text-ttfc-text"}`}>
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{text}
        </button>
      ))}
    </div>
  );
  if (!preview) return loading ? <LoadingState label="Loading the preview…" /> : error ? <ErrorState error={error} title="Couldn't load the preview" /> : null;
  return (
    <div className="overflow-hidden rounded-xl border border-ttfc-line">
      <div className="space-y-2 border-b border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-xs">
        <p className="truncate"><span className="text-ttfc-dim">Subject</span> <b>{preview.subject || "—"}</b></p>
        {preview.preheader && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Preview text</span> {preview.preheader}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {seg(mode, setMode, [["html", "Email"], ["text", "Plain text"]], "Email format")}
          {mode === "html" && seg(width, setWidth, [["desktop", "Desktop", Monitor], ["phone", "Phone", Smartphone]], "Width")}
          {mode === "html" && seg(scheme, setScheme, [["dark", "Dark", Moon], ["light", "Light", Sun]], "Colours")}
          {loading && <span className="text-[11px] text-ttfc-dim">Updating…</span>}
        </div>
      </div>
      {error && <p className="border-b border-ttfc-line bg-red-500/10 px-3 py-2 text-xs text-red-200">{error.message || String(error)}</p>}
      {mode === "html" ? (
        <div className="flex justify-center bg-ttfc-ink p-3">
          <iframe title={title} sandbox="" srcDoc={preview.html || ""} style={{ colorScheme: scheme }}
            className={`block h-[72vh] min-h-[480px] rounded-lg border border-ttfc-line ${width === "phone" ? "w-[375px] max-w-full" : "w-full"} ${scheme === "light" ? "bg-[#f6f2fb]" : "bg-[#06020f]"}`} />
        </div>
      ) : <pre className="h-[72vh] min-h-[480px] overflow-auto whitespace-pre-wrap bg-ttfc-ink px-4 py-3 font-mono text-xs leading-relaxed text-ttfc-muted">{preview.text}</pre>}
    </div>
  );
}
