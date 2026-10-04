import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Copy, EyeOff, Info, RefreshCw, RotateCcw, Search, Sparkles, Tag, Ticket, X,
} from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, ConfirmDialog, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Tabs, TableWrap,
} from "../ui";
import { day } from "../format";

const PAGE = 100;
const SAFE_NOTE = "This only hides tickets from staff lists and analytics. The owner's ticket stays valid in the app, on the website and at the door.";
const tierLabel = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "—");

function Check({ checked, indeterminate, onChange, label }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = !!indeterminate; }}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded accent-[#E8458B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ttfc-purple"
    />
  );
}

function RowsPreview({ rows, max = 50 }) {
  if (!rows?.length) return null;
  return (
    <div className="mt-1 max-h-64 overflow-y-auto rounded-xl border border-ttfc-line">
      <ul className="divide-y divide-ttfc-line/70 text-sm">
        {rows.slice(0, max).map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{r.name || "No name"}</span>
              <span className="block truncate text-xs text-ttfc-muted">{r.email} · <span className="font-mono">{r.ticketId}</span></span>
            </span>
            <span className="shrink-0 text-xs text-ttfc-dim">{tierLabel(r.tier)} · {day(r.purchaseDate)}</span>
          </li>
        ))}
      </ul>
      {rows.length > max && <p className="border-t border-ttfc-line px-3 py-2 text-xs text-ttfc-dim">…and {rows.length - max} more</p>}
    </div>
  );
}

export default function TicketManager() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const promo = (params.get("promo") || "").trim().toUpperCase(); // "" | "ANY" | a code
  const [show, setShow] = useState("visible");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [confirmHide, setConfirmHide] = useState(null); // { keys, rows }
  const [dupes, setDupes] = useState(null);             // { count, rows }
  const [busy, setBusy] = useState("");
  const dq = useDebounced(q.trim(), 300);

  const qs = new URLSearchParams({ show, page: String(page) });
  if (promo) qs.set("promo", promo);
  if (dq) qs.set("q", dq);
  const { data, error, loading, reload, refreshing } = useApi(`/console/tickets?${qs}`);
  const rows = useMemo(() => data?.rows || [], [data]);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const clearSel = () => { setSelected(new Set()); setAllMatching(false); };
  const changeTab = (k) => { setShow(k); setPage(0); clearSel(); };
  const changeQ = (v) => { setQ(v); setPage(0); clearSel(); };
  const changePromo = (v) => {
    const p = new URLSearchParams(params);
    if (v) p.set("promo", v); else p.delete("promo");
    setParams(p, { replace: true }); setPage(0); clearSel();
  };

  const pageKeys = rows.map((r) => r.key);
  const pageAllSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
  const pageSomeSelected = pageKeys.some((k) => selected.has(k));
  const toggle = (key, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(key); else n.delete(key); return n; });
  const togglePage = (on) => {
    setAllMatching(false);
    setSelected((s) => { const n = new Set(s); pageKeys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
  };

  const selectAllMatching = async () => {
    setSelecting(true);
    try {
      const keys = new Set();
      for (let p = 0; p < pages; p++) {
        const qp = new URLSearchParams({ show, page: String(p) });
        if (dq) qp.set("q", dq);
        if (promo) qp.set("promo", promo);
        const d = await api.get(`/console/tickets?${qp}`);
        (d.rows || []).forEach((r) => keys.add(r.key));
      }
      setSelected(keys); setAllMatching(true);
    } catch (err) { toast.error(err); } finally { setSelecting(false); }
  };

  const setHidden = async (keys, hidden) => {
    const r = await api.post("/console/tickets/hide", { keys, hidden });
    const n = r?.changed ?? keys.length;
    toast.success(hidden
      ? `${n} ticket${n === 1 ? "" : "s"} removed from staff lists. Owners keep their tickets.`
      : `${n} ticket${n === 1 ? "" : "s"} restored to staff lists`);
    clearSel(); reload();
  };

  const restore = async (keys) => {
    setBusy("restore");
    try { await setHidden(keys, false); } catch (err) { toast.error(err); } finally { setBusy(""); }
  };

  const askHide = (keys) => setConfirmHide({ keys, rows: rows.filter((r) => keys.includes(r.key)) });

  const previewDupes = async () => {
    setBusy("dupes");
    try {
      const r = await api.post("/console/tickets/hide-duplicates", { preview: true });
      if (!r?.count) toast.info("No duplicates found — every person has one visible ticket.");
      else setDupes(r);
    } catch (err) { toast.error(err); } finally { setBusy(""); }
  };

  const syncStripe = async () => {
    setBusy("sync");
    try {
      const r = await api.post("/admin/sync-guests-from-stripe");
      toast.success(`Synced ${r.synced ?? 0} purchase${r.synced === 1 ? "" : "s"} from Stripe${r.skipped ? ` · skipped ${r.skipped}` : ""}`);
      reload();
    } catch (err) { toast.error(err); } finally { setBusy(""); }
  };

  const tabs = [
    { key: "visible", label: "Visible" },
    { key: "duplicates", label: "Duplicates", count: data?.duplicates ?? undefined },
    { key: "hidden", label: "Hidden" },
  ];
  const selCount = selected.size;
  const hiddenTab = show === "hidden";

  return (
    <>
      <PageHeader
        eyebrow="Tickets & attendees"
        title="Tickets"
        description="Every ticket — app accounts and guest checkouts — in one list. Tidy up what staff see without touching anyone's ticket."
        actions={
          <>
            <Button icon={RefreshCw} loading={busy === "sync"} onClick={syncStripe} title="Pull in any recent Stripe purchases that are missing">Sync from Stripe</Button>
            <Button variant="primary" icon={Sparkles} loading={busy === "dupes"} onClick={previewDupes}>Clean up duplicates</Button>
          </>
        }
      />

      <Banner tone="info" icon={Info} className="mb-6" title="Removing a ticket here is safe">{SAFE_NOTE}</Banner>

      <Tabs tabs={tabs} value={show} onChange={changeTab} label="Which tickets" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => changeQ(e.target.value)} placeholder="Search name, email or ticket ID" className="pl-9" aria-label="Search tickets" />
        </div>
        <Select value={promo} onChange={(e) => changePromo(e.target.value)} aria-label="Promo code filter" className="sm:w-56">
          <option value="">All tickets</option>
          <option value="ANY">Used a promo code</option>
          {promo && promo !== "ANY" && <option value={promo}>Promo code {promo}</option>}
        </Select>
        <p className="text-sm text-ttfc-muted" aria-live="polite">
          {loading ? "Loading…" : `${total.toLocaleString()} ticket${total === 1 ? "" : "s"}`}{refreshing && !loading ? " · updating…" : ""}
        </p>
      </div>

      {selCount > 0 && (
        <div className="sticky top-[72px] z-20 mb-4 flex flex-col gap-3 rounded-2xl border border-ttfc-pink/40 bg-ttfc-panel2/95 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur sm:flex-row sm:items-center" role="region" aria-label="Selected tickets">
          <p className="flex-1 text-sm">
            <b>{selCount.toLocaleString()}</b> selected{allMatching ? " (all matching)" : ""}
            {!allMatching && pageAllSelected && total > rows.length && (
              <button type="button" onClick={selectAllMatching} disabled={selecting} className="ml-2 font-semibold text-ttfc-pink underline-offset-2 hover:underline disabled:opacity-60">
                {selecting ? "Selecting…" : `Select all ${total.toLocaleString()} matching`}
              </button>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" icon={X} onClick={clearSel}>Clear</Button>
            {hiddenTab
              ? <Button size="sm" variant="success" icon={RotateCcw} loading={busy === "restore"} onClick={() => restore([...selected])}>Restore to staff lists</Button>
              : <Button size="sm" variant="danger" icon={EyeOff} onClick={() => askHide([...selected])}>Remove from staff lists</Button>}
          </div>
        </div>
      )}

      {loading ? <LoadingState label="Loading tickets…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !rows.length ? (
        <EmptyState
          icon={show === "duplicates" ? Copy : Ticket}
          title={dq || promo ? "No tickets match" : show === "duplicates" ? "No duplicates" : show === "hidden" ? "Nothing hidden" : "No tickets yet"}
          body={promo && !dq ? (promo === "ANY" ? "No tickets in this list used a promo code." : `No tickets in this list used ${promo}.`) : dq ? "Try a different name, email or ticket ID." : show === "duplicates" ? "Every person has a single visible ticket." : show === "hidden" ? "Tickets you remove from staff lists appear here, and can be restored any time." : "Tickets appear here as soon as people buy them."}
        />
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <th className="w-10"><Check checked={pageAllSelected} indeterminate={!pageAllSelected && pageSomeSelected} onChange={togglePage} label="Select all on this page" /></th>
                <th>Name</th><th>Email</th><th>Ticket ID</th><th>Pass</th><th>Source</th><th>Bought</th><th>Check-in</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const on = selected.has(r.key);
                return (
                  <tr key={r.key} className={on ? "bg-ttfc-pink/5" : undefined}>
                    <td><Check checked={on} onChange={(v) => toggle(r.key, v)} label={`Select ${r.name || r.ticketId}`} /></td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="whitespace-nowrap font-semibold">{r.name || <span className="text-ttfc-dim">No name</span>}</span>
                        {r.duplicate && <Badge tone="warn" icon={Copy}>Duplicate</Badge>}
                        {r.hidden && <Badge tone="neutral" icon={EyeOff}>Hidden</Badge>}
                        {r.promoCode && <Badge tone="pink" icon={Tag} className="font-mono">{r.promoCode}</Badge>}
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate font-mono text-xs text-ttfc-muted" title={r.email}>{r.email || "—"}</td>
                    <td className="whitespace-nowrap font-mono text-xs">{r.ticketId}</td>
                    <td><Badge tone="purple">{tierLabel(r.tier)}</Badge></td>
                    <td className="whitespace-nowrap text-ttfc-muted">{r.source === "account" ? "App account" : "Guest checkout"}</td>
                    <td className="whitespace-nowrap text-ttfc-muted">{day(r.purchaseDate)}</td>
                    <td>{r.checkedIn ? <Badge tone="good" icon={CheckCircle2}>Checked in</Badge> : <span className="text-xs text-ttfc-dim">Not yet</span>}</td>
                    <td className="text-right">
                      {r.hidden
                        ? <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => restore([r.key])}>Restore</Button>
                        : <Button size="sm" variant="ghost" icon={EyeOff} onClick={() => askHide([r.key])}>Remove</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button icon={ChevronLeft} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-ttfc-muted">Page {page + 1} of {pages}</span>
              <Button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!confirmHide}
        onClose={() => setConfirmHide(null)}
        title={`Remove ${confirmHide?.keys.length === 1 ? "this ticket" : `${confirmHide?.keys.length?.toLocaleString()} tickets`} from staff lists?`}
        body={`${SAFE_NOTE} You can restore them from the Hidden tab.`}
        confirmLabel="Remove from staff lists"
        onConfirm={() => setHidden(confirmHide.keys, true)}
      >
        <RowsPreview rows={confirmHide?.rows} />
      </ConfirmDialog>

      <ConfirmDialog
        open={!!dupes}
        onClose={() => setDupes(null)}
        title={`Hide ${dupes?.count} duplicate ticket${dupes?.count === 1 ? "" : "s"}?`}
        body="These people have more than one ticket under the same email. Each person's most recent ticket stays visible; the older copies below are hidden from staff lists and analytics. Nobody loses a ticket."
        confirmLabel={`Hide ${dupes?.count ?? ""} duplicates`}
        onConfirm={async () => {
          const r = await api.post("/console/tickets/hide-duplicates", {});
          toast.success(`${r?.changed ?? dupes.count} duplicate ticket${(r?.changed ?? dupes.count) === 1 ? "" : "s"} hidden from staff lists`);
          clearSel(); reload();
        }}
      >
        <RowsPreview rows={dupes?.rows} max={100} />
      </ConfirmDialog>
    </>
  );
}
