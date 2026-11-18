import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileSignature, Plus, Search } from "lucide-react";
import { useApi } from "../hooks";
import { useAdminEvent } from "../eventContext";
import { Badge, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, TableWrap, Tabs } from "../ui";
import { day } from "../format";
import { STATUS_LABEL, STATUS_TONE, eventKeyOf, money } from "./contractsShared";

/* =========================================================
   Admin › Sales › Contracts (Nov 18 2026): the chosen event's sponsor and exhibitor contracts,
   newest first, by status. Each opens in the builder (ContractEditor.jsx). API: /api/console/contracts.
========================================================= */

export default function Contracts() {
  const { current } = useAdminEvent();
  const navigate = useNavigate();
  const eventKey = eventKeyOf(current);
  const { data, error, loading, reload } = useApi(eventKey ? `/console/contracts?eventKey=${encodeURIComponent(eventKey)}` : null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = data?.contracts || [];
    const needle = q.trim().toLowerCase();
    return list.filter((c) => (tab === "all" || (tab === "approval" ? c.approvalNeeded && c.status === "draft" : c.status === tab))
      && (!needle || `${c.number} ${c.company} ${c.contact}`.toLowerCase().includes(needle)));
  }, [data, tab, q]);

  if (!current) return <EmptyState icon={FileSignature} title="Choose an event" body="Pick the event in the top bar to see its contracts." />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const counts = data.counts;

  return (
    <div>
      <PageHeader title="Contracts" description="Sponsor and exhibitor contracts for this event, built from the offerings catalogue. Signed contracts turn every promised item into a task."
        actions={<>
          <Button onClick={() => navigate("/admin/offerings")}>Offerings</Button>
          <Button variant="primary" icon={Plus} onClick={() => navigate("/admin/contracts/new")}>New contract</Button>
        </>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: "all", label: "All", count: data.contracts.length },
        ...(counts.approval ? [{ key: "approval", label: "Needs approval", count: counts.approval }] : []),
        { key: "draft", label: "Drafts", count: counts.draft },
        { key: "sent", label: "Sent", count: counts.sent },
        { key: "signed", label: "Signed", count: counts.signed },
        { key: "cancelled", label: "Cancelled", count: counts.cancelled },
      ]} />
      {data.contracts.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input className="pl-9" placeholder="Search company, contact or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search contracts" />
        </div>
      )}
      {!rows.length ? (
        <EmptyState icon={FileSignature} title={data.contracts.length ? "Nothing matches" : "No contracts yet"}
          body={data.contracts.length ? "Try another tab or search." : `Start one for ${current.name}: pick the partner, add offerings and packages, then download the PDF.`}
          action={!data.contracts.length && <Button variant="primary" icon={Plus} onClick={() => navigate("/admin/contracts/new")}>New contract</Button>} />
      ) : (
        <TableWrap>
          <thead><tr><th>Number</th><th>Partner</th><th>Status</th><th className="text-right">Total</th><th>Tasks</th><th>By</th><th>Updated</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap"><Link className="font-semibold text-ttfc-text hover:underline" to={`/admin/contracts/${c.id}`}>{c.number}</Link></td>
                <td><span className="font-semibold">{c.company}</span>{c.contact && <span className="block text-xs text-ttfc-muted">{c.contact}</span>}</td>
                <td className="whitespace-nowrap"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  {c.approvalNeeded && c.status === "draft" && <Badge tone="warn" className="ml-1">Needs approval</Badge>}</td>
                <td className="text-right tabular-nums">{money(c.total)}</td>
                <td className="text-xs">{c.deliverables.total ? `${c.deliverables.done} of ${c.deliverables.total} done` : "—"}</td>
                <td className="text-xs">{c.createdBy}</td>
                <td className="whitespace-nowrap text-xs">{day(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
