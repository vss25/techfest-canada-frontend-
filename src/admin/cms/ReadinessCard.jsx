import { Link } from "react-router-dom";
import { Check, Circle, Lock } from "lucide-react";
import { Card, focusRing } from "../ui";

/** "Ready to go live · 64%": the bar, the reason Publish is off, and every item with where to fix it. */
export function ReadinessCard({ r }) {
  const missing = r.items.filter((i) => i.required && !i.ok);
  const color = r.ready ? "#15803D" : r.pct >= 60 ? "#B45309" : "#D6308C";
  return (
    <Card className="grid gap-3.5" aria-label="Ready to go live">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-base font-bold text-[#151035]">Ready to go live</h2>
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{r.loading ? "…" : `${r.pct}%`}</span>
        <span className="text-xs text-[#6B6688]">{r.done} of {r.total} needed{r.past ? " for the 2026 archive page" : ""}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F1F0F5]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.pct} aria-label="Ready to go live">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${r.pct}%`, background: color }} />
      </div>
      {!r.loading && (
        <p className="flex items-start gap-2 rounded-[10px] bg-[#F6F5FA] px-3 py-2.5 text-[13px] text-[#4A4566]">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {r.ready
              ? r.paused
                ? "Everything needed is in. Publishing is paused until the new website launches: a manager turns it on in Home › Website changes."
                : "Everything needed is in. You can publish this page to the live website."
              : <>Publish to live turns on when these are done: <b className="text-[#151035]">{missing.map((i) => i.label).join(", ")}</b>.</>}
          </span>
        </p>
      )}
      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {r.items.map((i) => {
          const body = (
            <>
              {i.ok ? <Check className="h-4 w-4 shrink-0 text-[#15803D]" aria-hidden="true" /> : <Circle className={`h-4 w-4 shrink-0 ${i.required ? "text-[#D6308C]" : "text-[#CFCBE0]"}`} aria-hidden="true" />}
              <span className={i.ok ? "text-[#4A4566]" : "font-semibold text-[#151035]"}>{i.label}</span>
              {!i.required && <span className="text-[11px] text-[#8A86A0]">nice to have</span>}
              {i.detail && <span className="ml-auto text-xs text-[#8A86A0]">{i.detail}</span>}
              <span className="sr-only">{i.ok ? "done" : i.required ? "needed" : "not yet"}</span>
            </>
          );
          return (
            <li key={i.key}>
              {i.to && !i.ok
                ? <Link to={i.to} className={`flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] hover:bg-[#F6F5FA] ${focusRing}`}>{body}</Link>
                : <span className="flex items-center gap-2 px-1.5 py-1 text-[13px]">{body}</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
