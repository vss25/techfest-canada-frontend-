import { Link } from "react-router-dom";
import { Badge } from "../ui";
import { when } from "../format";

const tone = (name) => (name === "tap" ? "pink" : name === "screen_view" ? "purple" : "orange");

/** One row in an activity timeline. */
export function EventRow({ e, showUser = false }) {
  const props = e.props && Object.keys(e.props).length ? JSON.stringify(e.props) : "";
  return (
    <li className="grid gap-1 border-b border-ttfc-line/60 px-4 py-3 text-sm last:border-0 sm:grid-cols-[140px_auto_1fr] sm:items-center sm:gap-4">
      <span className="text-xs tabular-nums text-ttfc-dim">{when(e.at)}</span>
      <span className="flex flex-wrap items-center gap-2">
        {showUser && (e.userId ? (
          <Link to={`/admin/app/people/${e.userId}`} className="font-semibold text-ttfc-text hover:text-ttfc-pink hover:underline">{e.userName}</Link>
        ) : <span className="text-ttfc-dim">Signed out</span>)}
        <Badge tone={tone(e.name)}>{String(e.name || "").replace(/_/g, " ")}</Badge>
      </span>
      <span className="min-w-0 text-ttfc-text/90">
        {e.screen}{e.target && <> › <b>{e.target}</b></>}
        {props && <span className="ml-2 break-all font-mono text-[11px] text-ttfc-dim">{props}</span>}
      </span>
    </li>
  );
}

export function StatusBadge({ status }) {
  const t = status === "approved" ? "good" : status === "hidden" ? "bad" : "warn";
  const label = { approved: "Live", hidden: "Hidden", held: "Held by filter", pending: "Waiting" }[status] || status;
  return <Badge tone={t}>{label}</Badge>;
}
