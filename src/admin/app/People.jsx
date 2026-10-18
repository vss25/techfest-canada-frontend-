import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { Badge, Button, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, TableWrap } from "../ui";
import { ago } from "../format";
import { PERSON_TYPES, TYPE_LABELS, TYPE_TONE, typeTags } from "./personTypes";

export default function People() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const filter = params.get("f") || "";
  const typeFilter = PERSON_TYPES.includes(params.get("t")) ? params.get("t") : "";
  const page = Math.max(0, Number(params.get("page")) || 0);
  const dq = useDebounced(q.trim(), 300);

  const qs = new URLSearchParams({ page: String(page) });
  if (dq) qs.set("q", dq);
  if (filter === "admin") qs.set("role", "admin");
  if (filter === "volunteer") qs.set("role", "volunteer");
  if (filter === "banned") qs.set("banned", "true");
  if (typeFilter) qs.set("type", typeFilter);
  const { data, error, loading, reload, refreshing } = useApi(`/console/users?${qs}`);

  const update = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) { if (v === "" || v == null || v === 0) p.delete(k); else p.set(k, String(v)); }
    setParams(p, { replace: true });
  };
  const onSearch = (v) => { setQ(v); update({ q: v.trim(), page: 0 }); };

  const users = data?.users || [];
  const total = data?.total ?? 0;
  const open = (id) => navigate(`/admin/app/people/${id}`);

  return (
    <>
      <PageHeader eyebrow="App" title="People" description="Every account on the app. Open someone to see and change everything about them." />
      <div className="mb-5 flex flex-col gap-3 rounded-[18px] border border-ttfc-line bg-ttfc-panel p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email, company or ticket ID" className="pl-9" aria-label="Search people" />
        </div>
        <Select value={filter} onChange={(e) => update({ f: e.target.value, page: 0 })} aria-label="Filter people by account" className="sm:w-48">
          <option value="">Every account</option>
          <option value="admin">Staff accounts</option>
          <option value="volunteer">Volunteer accounts</option>
          <option value="banned">Suspended</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => update({ t: e.target.value, page: 0 })} aria-label="Filter people by type" className="sm:w-44">
          <option value="">Any type</option>
          {PERSON_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </Select>
      </div>

      {loading ? <LoadingState label="Loading people…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <p className="mb-3 text-sm text-ttfc-muted" aria-live="polite">
            {total.toLocaleString()} {total === 1 ? "person" : "people"}{refreshing && " · updating…"}
          </p>
          {users.length ? (
            <TableWrap>
              <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Interests</th><th>Tickets</th><th>Last active</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="is-clickable" tabIndex={0} onClick={() => open(u.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(u.id); } }}
                    aria-label={`Open ${u.name}`}>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{u.name}</span>
                        {u.role === "admin" && <Badge tone="pink">Staff</Badge>}
                        {u.role === "volunteer" && <Badge tone="purple">Volunteer</Badge>}
                        {typeTags(u.types, u.role).map((t) => <Badge key={t} tone={TYPE_TONE[t]}>{TYPE_LABELS[t]}</Badge>)}
                        {u.banned && <Badge tone="bad">Suspended</Badge>}
                        {u.directoryHidden && <Badge>Hidden</Badge>}
                        {u.messagesOff && <Badge>No messages</Badge>}
                        {u.requestsOff && <Badge>No requests</Badge>}
                      </div>
                    </td>
                    <td className="font-mono text-xs text-ttfc-muted">{u.email}</td>
                    <td className="text-ttfc-muted">{[u.jobTitle, u.organization].filter(Boolean).join(" · ")}</td>
                    <td><div className="flex flex-wrap gap-1">{(u.topics || []).slice(0, 3).map((t) => <Badge key={t}>{t}</Badge>)}</div></td>
                    <td className="tabular-nums">{u.tickets}</td>
                    <td className="whitespace-nowrap text-ttfc-muted">{ago(u.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState icon={Users} title="No one matches" body="Try a different name, email or ticket ID." />
          )}
          {(page > 0 || (page + 1) * 50 < total) && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button icon={ChevronLeft} disabled={page === 0} onClick={() => update({ page: page - 1 })}>Previous</Button>
              <span className="text-sm text-ttfc-muted">Page {page + 1} of {Math.max(1, Math.ceil(total / 50))}</span>
              <Button disabled={(page + 1) * 50 >= total} onClick={() => update({ page: page + 1 })}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
