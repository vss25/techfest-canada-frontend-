import { useMemo, useState } from "react";
import { RefreshCw, ScrollText, Search } from "lucide-react";
import { useApi } from "../hooks";
import { Badge, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, TableWrap } from "../ui";
import { when } from "../format";

const tone = (a = "") =>
  a === "view_messages" || a === "list_threads" ? "warn"
    : /delete|kill_switch|remove|denied/.test(a) ? "bad"
      : /^cms_/.test(a) ? "purple" : "neutral";

export default function AuditLog() {
  const { data, error, loading, reload, refreshing } = useApi("/console/audit");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data || []).filter((r) => !n || [r.adminName, r.action, r.targetType, r.targetId, r.detail].some((x) => String(x || "").toLowerCase().includes(n)));
  }, [data, q]);
  return (
    <>
      <PageHeader
        eyebrow="App"
        title="Audit log"
        description="Every change made by staff — including website edits, the kill switch and every time someone opened private messages. Latest 300."
        actions={<Button icon={RefreshCw} onClick={reload} loading={refreshing && !loading}>Refresh</Button>}
      />
      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by staff, action or detail" className="pl-9" aria-label="Filter audit log" />
      </div>
      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState icon={ScrollText} title={q ? "Nothing matches" : "Nothing yet"} />
      ) : (
        <TableWrap>
          <thead><tr><th>When</th><th>Staff</th><th>Action</th><th>On</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r._id || i}>
                <td className="whitespace-nowrap text-ttfc-muted">{when(r.at)}</td>
                <td className="whitespace-nowrap font-semibold">{r.adminName}</td>
                <td><Badge tone={tone(r.action)}>{String(r.action || "").replace(/_/g, " ")}</Badge></td>
                <td className="max-w-[220px] truncate font-mono text-xs text-ttfc-muted" title={`${r.targetType} ${r.targetId}`}>{r.targetType} {r.targetId}</td>
                <td className="max-w-md text-ttfc-muted"><p className="line-clamp-2">{r.detail}</p></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
