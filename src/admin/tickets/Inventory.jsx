import { useMemo, useState } from "react";
import {
  AlertTriangle, Archive, ArchiveRestore, ChevronDown, Package, Percent, Plus, RefreshCw, Save, Sparkles, Store, Tag, Ticket, Trash2,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, StatTile, Switch,
  TableWrap, focusRing,
} from "../ui";
import { num } from "../format";

/* Passes the Tickets page sells. A missing row means checkout for it would fail. */
const SITE_PASSES = ["connect", "influence", "power", "apex"];
const TIER_NAMES = { vip: "VIP", "booth-single": "Single booth", "booth-double": "Double booth", "booth-triple": "Triple booth", "booth-quadruple": "Quadruple booth" };
const isBooth = (t) => String(t).startsWith("booth-");
const label = (t) => TIER_NAMES[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, " ") : "—");
const cadFmt = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const cad = (v) => cadFmt.format(Number(v) || 0);

function TierCard({ item, onSaved, onArchive }) {
  const toast = useToast();
  const [price, setPrice] = useState(String(item.price ?? 0));
  const [total, setTotal] = useState(String(item.total ?? 0));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const sold = item.sold || 0;
  const remaining = Math.max(0, (item.total || 0) - sold);
  const pct = item.total > 0 ? Math.min(100, Math.round((sold / item.total) * 100)) : 0;
  const dirty = price !== String(item.price ?? 0) || total !== String(item.total ?? 0);
  const soldOut = item.total > 0 && remaining === 0;

  const save = async (e) => {
    e.preventDefault();
    const p = Number(price); const t = Number(total);
    if (!Number.isFinite(p) || p < 0) { setErr("Price must be 0 or more"); return; }
    if (!Number.isInteger(t) || t < 0) { setErr("Allocation must be a whole number"); return; }
    if (t < sold) { setErr(`Allocation can't be below the ${sold} already sold`); return; }
    setErr(""); setSaving(true);
    try {
      const body = {};
      if (p !== item.price) body.price = p;
      if (t !== item.total) body.total = t;
      await api.put(`/admin/inventory/${encodeURIComponent(item.tier)}`, body);
      toast.success(`${label(item.tier)} updated`);
      onSaved();
    } catch (e2) { setErr(e2.message); toast.error(e2); } finally { setSaving(false); }
  };

  return (
    <Card as="form" onSubmit={save} className="flex flex-col gap-4" noValidate>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ttfc-text">{label(item.tier)}</h3>
          <p className="text-sm text-ttfc-muted">{cad(item.price)} <span className="text-ttfc-dim">+ HST</span></p>
        </div>
        {soldOut ? <Badge tone="warn">Sold out</Badge> : <Badge tone="good">On sale</Badge>}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="text-ttfc-muted"><b className="text-ttfc-text tabular-nums">{num(sold)}</b> sold of {num(item.total)}</span>
          <span className="tabular-nums text-ttfc-muted">{num(remaining)} left</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={item.total || 0} aria-valuenow={sold} aria-label={`${label(item.tier)} sold`}>
          <div className="h-2.5 rounded-full bg-gradient-to-r from-ttfc-pink to-ttfc-orange" style={{ width: `${sold > 0 ? Math.max(3, pct) : 0}%` }} />
        </div>
        <p className="mt-1 text-xs text-ttfc-dim">{pct}% sold</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (CAD)">{(id) => <Input id={id} type="number" min={0} step="1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />}</Field>
        <Field label="Allocation">{(id) => <Input id={id} type="number" min={sold} step="1" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} />}</Field>
      </div>
      {err && <p role="alert" className="-mt-2 text-xs text-red-300">{err}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ttfc-line pt-4">
        <Button type="submit" size="sm" variant="primary" icon={Save} disabled={!dirty} loading={saving}>Save</Button>
        {dirty && <Button size="sm" variant="ghost" onClick={() => { setPrice(String(item.price ?? 0)); setTotal(String(item.total ?? 0)); setErr(""); }}>Undo</Button>}
        <span className="flex-1" />
        <Button size="sm" variant="ghost" icon={Archive} onClick={() => onArchive(item)}>Remove from sale</Button>
      </div>
    </Card>
  );
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TTFC";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function PromoCodes({ passes }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi("/admin/promos");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("10");
  const [tiers, setTiers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(null);

  const create = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/\s+/g, "");
    const d = Number(discount);
    if (!c) { setErr("Enter a code or click Generate"); return; }
    if (!Number.isFinite(d) || d < 1 || d > 100) { setErr("Discount must be between 1 and 100"); return; }
    setErr(""); setBusy(true);
    try {
      const out = await api.post("/admin/promos", { code: c, discount: d, tiers });
      toast.success(`Created ${out.code || c}: ${out.discount ?? d}% off ${tiers.length ? tiers.map(label).join(", ") : "all passes"}`);
      setCode(""); setDiscount("10"); setTiers([]); reload();
    } catch (e2) { setErr(e2.message); toast.error(e2); } finally { setBusy(false); }
  };

  const toggle = async (p) => {
    setData((xs) => (xs || []).map((x) => (x._id === p._id ? { ...x, active: !p.active } : x)));
    try { await api.put(`/admin/promos/${p._id}`, { active: !p.active }); toast.success(`${p.code} ${p.active ? "turned off" : "turned on"}`); }
    catch (e2) { toast.error(e2); reload(); }
  };

  return (
    <section aria-labelledby="promos-h" className="mt-10">
      <h2 id="promos-h" className="mb-1 flex items-center gap-2 text-base font-semibold"><Tag className="h-4 w-4 text-ttfc-pink" aria-hidden="true" /> Promo codes</h2>
      <p className="mb-4 text-sm text-ttfc-muted">Discount codes buyers enter at checkout.</p>
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card as="form" onSubmit={create} className="space-y-4" noValidate>
          <h3 className="text-sm font-semibold">New code</h3>
          <Field label="Code">{(id) => (
            <div className="flex gap-2">
              <Input id={id} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="TTFCSPRING" className="font-mono tracking-wider" />
              <Button icon={Sparkles} onClick={() => setCode(genCode())}>Generate</Button>
            </div>
          )}</Field>
          <Field label="Discount (%)">{(id) => (
            <div className="flex flex-wrap items-center gap-2">
              {["10", "25", "50"].map((d) => (
                <button key={d} type="button" onClick={() => setDiscount(d)} aria-pressed={discount === d}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${discount === d ? "border-ttfc-pink bg-ttfc-pink/15 text-white" : "border-ttfc-line text-ttfc-muted hover:text-ttfc-text"} ${focusRing}`}>{d}%</button>
              ))}
              <Input id={id} type="number" min={1} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-24" aria-label="Custom discount percent" />
            </div>
          )}</Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ttfc-text/90">Valid for</legend>
            <div className="flex flex-wrap gap-2">
              {passes.map((t) => {
                const on = tiers.includes(t);
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => setTiers((xs) => (on ? xs.filter((x) => x !== t) : [...xs, t]))}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${on ? "border-ttfc-purple bg-ttfc-purple/20 text-white" : "border-ttfc-line text-ttfc-muted hover:text-ttfc-text"} ${focusRing}`}>{label(t)}</button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-ttfc-dim">{tiers.length ? `Only ${tiers.map(label).join(", ")}` : "Nothing selected = all passes"}</p>
          </fieldset>
          {err && <p role="alert" className="text-xs text-red-300">{err}</p>}
          <Button type="submit" variant="primary" icon={Plus} loading={busy} className="w-full">Create promo code</Button>
        </Card>

        <div className="min-w-0">
          {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !data?.length ? (
            <EmptyState icon={Percent} title="No promo codes yet" body="Create one on the left." />
          ) : (
            <TableWrap>
              <thead><tr><th>Code</th><th>Discount</th><th>Valid for</th><th>Used</th><th>Active</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p._id}>
                    <td className="font-mono font-bold tracking-wider">{p.code}</td>
                    <td className="tabular-nums">{p.discount}%</td>
                    <td>{Array.isArray(p.tiers) && p.tiers.length ? <div className="flex flex-wrap gap-1">{p.tiers.map((t) => <Badge key={t} tone="purple">{label(t)}</Badge>)}</div> : <Badge tone="good">All passes</Badge>}</td>
                    <td className="tabular-nums">{p.timesUsed ?? 0}</td>
                    <td><Switch checked={!!p.active} onChange={() => toggle(p)} ariaLabel={`${p.code} active`} /></td>
                    <td className="text-right"><Button size="sm" variant="dangerOutline" icon={Trash2} onClick={() => setDeleting(p)}>Delete</Button></td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete promo code ${deleting?.code}?`}
        body="Buyers won't be able to use it any more. Orders already paid with it aren't affected. To pause it instead, switch it off."
        confirmLabel="Delete code"
        onConfirm={async () => { await api.del(`/admin/promos/${deleting._id}`); setData((xs) => (xs || []).filter((x) => x._id !== deleting._id)); toast.success(`${deleting.code} deleted`); }}
      />
    </section>
  );
}

export default function Inventory() {
  const toast = useToast();
  const { data, error, loading, reload, refreshing } = useApi("/admin/inventory");
  const [archiving, setArchiving] = useState(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [restoring, setRestoring] = useState("");

  const list = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const order = (a, b) => (a.price || 0) - (b.price || 0);
  const passes = list.filter((t) => !t.archived && !isBooth(t.tier)).sort(order);
  const booths = list.filter((t) => !t.archived && isBooth(t.tier)).sort(order);
  const removed = list.filter((t) => t.archived).sort((a, b) => a.tier.localeCompare(b.tier));
  const missing = SITE_PASSES.filter((t) => !list.some((i) => i.tier === t));
  const passSold = passes.reduce((s, t) => s + (t.sold || 0), 0);
  const passLeft = passes.reduce((s, t) => s + Math.max(0, (t.total || 0) - (t.sold || 0)), 0);
  const boothSold = booths.reduce((s, t) => s + (t.sold || 0), 0);

  const setArchived = async (item, archived) => {
    await api.put(`/admin/inventory/${encodeURIComponent(item.tier)}`, { archived });
    toast.success(archived ? `${label(item.tier)} removed from sale` : `${label(item.tier)} is back on sale`);
    reload();
  };

  const restore = async (item) => {
    setRestoring(item.tier);
    try { await setArchived(item, false); } catch (e) { toast.error(e); } finally { setRestoring(""); }
  };

  const grid = (items, emptyTitle) => items.length ? (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {items.map((t) => <TierCard key={`${t.tier}:${t.price}:${t.total}:${t.sold}`} item={t} onSaved={reload} onArchive={setArchiving} />)}
    </div>
  ) : <EmptyState title={emptyTitle} className="py-10" />;

  return (
    <>
      <PageHeader
        eyebrow="Tickets & attendees"
        title="Inventory"
        description="Prices and allocations for every pass and booth. Prices here are what Stripe charges."
        actions={<Button icon={RefreshCw} onClick={reload} loading={refreshing && !loading}>Refresh</Button>}
      />

      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          {missing.length > 0 && (
            <Banner tone="danger" icon={AlertTriangle} className="mb-6" title="Some passes can't be sold">
              {missing.map(label).join(", ")} {missing.length === 1 ? "is" : "are"} on the Tickets page but {missing.length === 1 ? "has" : "have"} no inventory row, so checkout would fail.
            </Banner>
          )}

          <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatTile label="Passes sold" value={num(passSold)} icon={Ticket} tone="pink" hint="Passes on sale now" />
            <StatTile label="Passes left" value={num(passLeft)} icon={Package} tone="purple" />
            <StatTile label="Booths sold" value={num(boothSold)} icon={Store} tone="orange" />
          </div>

          <section aria-labelledby="passes-h" className="mb-10">
            <h2 id="passes-h" className="mb-3 text-base font-semibold">Passes</h2>
            {grid(passes, "No passes on sale")}
          </section>

          <section aria-labelledby="booths-h" className="mb-10">
            <h2 id="booths-h" className="mb-3 text-base font-semibold">Exhibitor booths</h2>
            {grid(booths, "No booths on sale")}
          </section>

          <section aria-labelledby="removed-h">
            <button
              type="button"
              onClick={() => setShowRemoved((v) => !v)}
              aria-expanded={showRemoved}
              aria-controls="removed-list"
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-ttfc-line bg-ttfc-panel px-5 py-4 text-left transition hover:border-ttfc-purple/50 ${focusRing}`}
            >
              <span>
                <span id="removed-h" className="block text-base font-semibold">Removed from sale <span className="ml-1 font-normal text-ttfc-dim">({removed.length})</span></span>
                <span className="block text-xs text-ttfc-muted">Hidden from the website, the app and checkout. Tickets already sold stay valid.</span>
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-ttfc-muted transition ${showRemoved ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {showRemoved && (
              <div id="removed-list" className="mt-3">
                {!removed.length ? <EmptyState icon={Archive} title="Nothing removed" className="py-8" /> : (
                  <TableWrap>
                    <thead><tr><th>Pass</th><th>Price</th><th>Sold</th><th><span className="sr-only">Actions</span></th></tr></thead>
                    <tbody>
                      {removed.map((t) => (
                        <tr key={t.tier}>
                          <td className="font-semibold">{label(t.tier)}</td>
                          <td className="text-ttfc-muted">{cad(t.price)}</td>
                          <td className="tabular-nums text-ttfc-muted">{num(t.sold)} of {num(t.total)}</td>
                          <td className="text-right"><Button size="sm" icon={ArchiveRestore} loading={restoring === t.tier} onClick={() => restore(t)}>Restore</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                )}
              </div>
            )}
          </section>

          <PromoCodes passes={passes.map((p) => p.tier)} />
        </>
      )}

      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title={`Remove ${archiving ? label(archiving.tier) : ""} from sale?`}
        body="It disappears from the website, the app and checkout. Tickets already sold for it stay valid, and you can restore it any time from “Removed from sale”."
        confirmLabel="Remove from sale"
        onConfirm={() => setArchived(archiving, true)}
      />
    </>
  );
}
