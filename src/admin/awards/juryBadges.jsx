/* Badges and the progress bar for Admin › Catalyst Awards › Jury, Allocation and Jury results. */
import { Badge } from "../ui";
import { NOMINATION_STATUS, STATE } from "./juryShared";

export function StateBadge({ state, children, title }) {
  const s = STATE[state] || STATE.not_started;
  return <span title={title}><Badge tone={s.tone}>{children || s.label}</Badge></span>;
}

export function StatusBadge({ status }) {
  const s = NOMINATION_STATUS[status] || NOMINATION_STATUS.pending;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ProgressBar({ done = 0, total = 0, className = "" }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`h-1.5 w-full rounded-full bg-white/5 ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Submitted">
      <div className="h-1.5 rounded-full bg-gradient-to-r from-ttfc-pink to-ttfc-purple" style={{ width: `${Math.max(pct ? 3 : 0, pct)}%` }} />
    </div>
  );
}
