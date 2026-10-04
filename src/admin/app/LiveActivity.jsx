import { useState } from "react";
import { Activity, Pause, Play } from "lucide-react";
import { useApi } from "../hooks";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, Select } from "../ui";
import { EventRow } from "./parts";

const KINDS = [
  ["", "All actions"], ["screen_view", "Screen views"], ["tap", "Taps"], ["search", "Searches"], ["interest", "Interests"],
  ["session_registered", "Session registrations"], ["message_sent", "Messages sent"],
];

export default function LiveActivity() {
  const [kind, setKind] = useState("");
  const [paused, setPaused] = useState(false);
  const { data, error, loading, reload, refreshing } = useApi(`/console/events${kind ? `?name=${kind}` : ""}`, { interval: paused ? 0 : 10000 });

  return (
    <>
      <PageHeader
        eyebrow="App"
        title="Live activity"
        description="Every screen and button press in the app, newest first. Refreshes every 10 seconds."
        actions={
          <>
            <span className="inline-flex items-center gap-2 text-xs text-ttfc-muted" aria-live="polite">
              <span className={`h-2 w-2 rounded-full ${paused ? "bg-ttfc-dim" : "animate-pulse bg-emerald-400"}`} aria-hidden="true" />
              {paused ? "Paused" : refreshing ? "Updating…" : "Live"}
            </span>
            <Button icon={paused ? Play : Pause} onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</Button>
          </>
        }
      />
      <div className="mb-5 max-w-xs">
        <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by kind of action">
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !data?.length ? (
        <EmptyState icon={Activity} title="No activity yet" body="It appears here as soon as people use the app." />
      ) : (
        <Card className="p-0 sm:p-0"><ul>{data.map((e, i) => <EventRow key={e._id || i} e={e} showUser />)}</ul></Card>
      )}
    </>
  );
}
