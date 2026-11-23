import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Handshake, ListChecks, Plus, Search } from "lucide-react";
import { useApi } from "../hooks";
import { useAdminEvent } from "../eventContext";
import { Badge, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, TableWrap, Tabs } from "../ui";
import { day } from "../format";
import { eventKeyOf, money } from "./contractsShared";
import { MOU_STATUS_LABEL, MOU_STATUS_TONE } from "./mouShared";

/* =========================================================
   Admin › Sales › MOUs (Nov 23 2026): the chosen event's memoranda of understanding with community,
   media and ecosystem partners, by status (draft, in review, exported). Each opens in the builder
   (MouEditor.jsx). API: /api/console/mous (backend routes/mous.js).
========================================================= */

export default function Mous() {
  const { current } = useAdminEvent();
  const navigate = useNavigate();
  const eventKey = eventKeyOf(current);
  const { data, error, loading, reload } = useApi(eventKey ? `/console/mous?eventKey=${encodeURIComponent(eventKey)}` : null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.mous || []).filter((m) => (tab === "all" || m.status === tab)
      && (!needle || `${m.number} ${m.partner} ${m.contact}`.toLowerCase().includes(needle)));
  }, [data, tab, q]);

  if (!current) return <EmptyState icon={Handshake} title="Choose an event" body="Pick the event in the top bar to see its MOUs." />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const counts = data.counts;

  return (
    <div>
      <PageHeader title="MOUs" description="Memoranda of understanding with community, media and ecosystem partners: what TTFC offers, what the partner delivers, and the terms. Review, then export as PDF or Word."
        actions={<>
          <Button icon={ListChecks} onClick={() => navigate("/admin/mou-items")}>MOU catalogue</Button>
          <Button variant="primary" icon={Plus} onClick={() => navigate("/admin/mous/new")}>New MOU</Button>
        </>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: "all", label: "All", count: data.mous.length },
        { key: "draft", label: "Drafts", count: counts.draft },
        { key: "review", label: "In review", count: counts.review },
        { key: "exported", label: "Exported", count: counts.exported },
      ]} />
      {data.mous.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input className="pl-9" placeholder="Search partner, contact or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search MOUs" />
        </div>
      )}
      {!rows.length ? (
        <EmptyState icon={Handshake} title={data.mous.length ? "Nothing matches" : "No MOUs yet"}
          body={data.mous.length ? "Try another tab or search." : `Start one for ${current.name}: tick what TTFC offers and what the partner delivers, set the terms, then review and export.`}
          action={!data.mous.length && <Button variant="primary" icon={Plus} onClick={() => navigate("/admin/mous/new")}>New MOU</Button>} />
      ) : (
        <TableWrap>
          <thead><tr><th>Number</th><th>Partner</th><th>Status</th><th>TTFC offers</th><th>Partner delivers</th><th>Terms</th><th>Updated</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap"><Link className="font-semibold text-ttfc-text hover:underline" to={`/admin/mous/${m.id}`}>{m.number}</Link></td>
                <td><span className="font-semibold">{m.partner}</span>{m.contact && <span className="block text-xs text-ttfc-muted">{m.contact}</span>}</td>
                <td className="whitespace-nowrap"><Badge tone={MOU_STATUS_TONE[m.status]}>{MOU_STATUS_LABEL[m.status]}</Badge></td>
                <td className="text-xs">{m.offers || "None"}</td>
                <td className="text-xs">{m.delivers || "None"}</td>
                <td className="whitespace-nowrap text-xs">{m.binding ? "Binding" : "Non-binding"} · {m.financial ? (m.amount ? money(m.amount) : "Financial") : "Non-financial"}</td>
                <td className="whitespace-nowrap text-xs">{day(m.updatedAt)}<span className="block text-ttfc-muted">{m.createdBy}</span></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
