import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, BadgeCheck, CalendarDays, CreditCard, DollarSign, Info, Receipt, RefreshCw, Ticket, TrendingUp, Users } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, EmptyState, ErrorState, PageHeader, SkeletonGrid, StatTile, focusRing } from "../ui";
import { ago, num } from "../format";

const RANGES = [
  { key: "day", label: "24 hours" },
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "all", label: "All time" },
];
const METRICS = {
  tickets: { label: "Tickets", color: "#E8458B", fmt: (v) => num(v) },
  revenue: { label: "Revenue", color: "#F59E42", fmt: (v) => cad(v) },
};
const cadFmt = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const cad = (v) => cadFmt.format(Number(v) || 0);
const cadExact = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
// "power" → "Power", "upgrades" → "Upgrades", "upgrade → power" → "Upgrade → Power"
const tierLabel = (t) => (t ? String(t).split(/\s*→\s*/).map(cap).join(" → ") : "Other");
const money = (v) => (v == null ? "—" : cad(v));
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

const AXIS = { stroke: "#7B7296", fontSize: 11, tickLine: false, axisLine: false };

function ChartTip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-ttfc-line bg-ttfc-ink/95 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-ttfc-text">{label}</p>
      <p className="text-ttfc-muted">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: METRICS[metric].color }} aria-hidden="true" />
        {METRICS[metric].label}: <b className="text-ttfc-text">{METRICS[metric].fmt(row[metric])}</b>
      </p>
      <p className="mt-0.5 text-ttfc-dim">{metric === "tickets" ? `Revenue ${cad(row.revenue)}` : `${num(row.tickets)} tickets`}</p>
    </div>
  );
}

function TierTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-ttfc-line bg-ttfc-ink/95 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-ttfc-text">{tierLabel(r.tier)}</p>
      <p className="text-ttfc-muted">Revenue <b className="text-ttfc-text">{cad(r.revenue)}</b></p>
      <p className="text-ttfc-muted">{num(r.tickets)} tickets · {num(r.checkedIn)} checked in</p>
    </div>
  );
}

function Segmented({ options, value, onChange, label }) {
  // options: [{ key, label, disabled? }]
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-ttfc-line bg-ttfc-panel p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          disabled={o.disabled}
          onClick={() => onChange(o.key)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${value === o.key ? "bg-white/10 text-ttfc-text" : "text-ttfc-muted hover:text-ttfc-text"} disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SalesAnalytics() {
  const [range, setRange] = useState("month");
  const [metricChoice, setMetric] = useState("tickets");
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();
  const { data, error, loading, reload, refreshing, setData } = useApi(`/console/sales?range=${range}`);
  const revenueKnown = data?.totals ? data.totals.totalRevenue != null : true;
  const metric = revenueKnown ? metricChoice : "tickets";
  const fromStripe = data?.source === "stripe";

  const refreshFromStripe = async () => {
    setSyncing(true);
    try {
      const fresh = await api.get(`/console/sales?range=${range}&refresh=1`);
      setData(fresh);
      if (fresh?.source === "stripe") toast.success("Revenue refreshed from Stripe");
      else toast.error(fresh?.stripeError || "Couldn't reach Stripe");
    } catch (err) { toast.error(err); } finally { setSyncing(false); }
  };

  const t = data?.totals || {};
  const sales = data?.sales || [];
  const byTier = data?.byTier || [];
  const inventory = (data?.inventory || []).filter((r) => !r.archived);
  const recent = data?.recent || [];
  const breakdown = data?.revenueBreakdown;
  const tierRevenueKnown = byTier.some((r) => r.revenue != null);
  const periodTotal = sales.reduce((s, r) => s + (Number(r[metric]) || 0), 0);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label.toLowerCase();

  return (
    <>
      <PageHeader
        eyebrow="Tickets & attendees"
        title="Sales analytics"
        description="Ticket revenue comes from Stripe (what buyers actually paid). Ticket counts, buyers and check-ins come from ticket records; tickets hidden from staff lists aren't counted."
        actions={
          <>
            <Segmented options={RANGES} value={range} onChange={setRange} label="Time range" />
            <Button icon={RefreshCw} onClick={reload} loading={refreshing && !loading && !syncing}>Refresh</Button>
            <Button icon={CreditCard} onClick={refreshFromStripe} loading={syncing} title="Fetch the latest payments from Stripe now (normally cached for 5 minutes)">Refresh from Stripe</Button>
          </>
        }
      />

      {loading ? <SkeletonGrid count={6} className="h-28" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="space-y-6">
          {!revenueKnown && (
            <Banner tone="warn" icon={AlertTriangle} title="Revenue is unavailable right now"
              action={<Button size="sm" icon={RefreshCw} loading={syncing} onClick={refreshFromStripe}>Try again</Button>}>
              We couldn't read payments from Stripe, so revenue isn't shown. Ticket counts below still come from ticket records.
              {data?.stripeError && <span className="mt-1 block font-mono text-xs opacity-80">Stripe said: {data.stripeError}</span>}
            </Banner>
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            <StatTile label="Ticket revenue (Stripe)" value={money(t.totalRevenue)} icon={DollarSign} tone="orange"
              hint={t.totalRevenue == null ? "Stripe unavailable" : "CAD, after promo codes, before HST, minus refunds"} />
            <StatTile label="Tickets" value={num(t.totalTickets)} icon={Ticket} tone="pink" hint="All ticket records" />
            <StatTile label="Paid tickets" value={t.paidTickets == null ? "—" : num(t.paidTickets)} icon={CreditCard} tone="purple"
              hint={t.paidTickets == null ? "Needs Stripe" : "Paid through Stripe checkout"} />
            <StatTile label="Unique buyers" value={num(t.uniqueBuyers)} icon={Users} tone="purple" />
            <StatTile label="Checked in" value={`${pct(t.checkedIn, t.totalTickets)}%`} icon={BadgeCheck} tone="good" hint={`${num(t.checkedIn)} of ${num(t.totalTickets)}`} />
            <StatTile label="Today" value={num(t.today)} icon={CalendarDays} tone="neutral" hint="Last 24 hours" />
            <StatTile label="Last 7 days" value={num(t.last7Days)} icon={TrendingUp} tone="neutral" />
          </div>

          {(t.hiddenTickets > 0 || t.duplicates > 0) && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-ttfc-muted">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              {t.hiddenTickets > 0 && <span>{num(t.hiddenTickets)} hidden ticket{t.hiddenTickets === 1 ? "" : "s"} excluded.</span>}
              {t.duplicates > 0 && <span>{num(t.duplicates)} possible duplicate{t.duplicates === 1 ? "" : "s"} still counted.</span>}
              <Link to="/admin/attendees" className="font-semibold text-ttfc-pink hover:underline">Manage in Tickets</Link>
            </p>
          )}

          <Card>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">{METRICS[metric].label} over time</h2>
                <p className="mt-0.5 text-sm text-ttfc-muted">
                  <b className="text-ttfc-text">{METRICS[metric].fmt(periodTotal)}</b> in the last {rangeLabel}
                </p>
              </div>
              <Segmented options={[{ key: "tickets", label: "Tickets" }, { key: "revenue", label: "Revenue", disabled: !revenueKnown }]} value={metric} onChange={setMetric} label="Measure" />
            </div>
            {periodTotal === 0 ? (
              <EmptyState icon={TrendingUp} title={`No sales in the last ${rangeLabel}`} body="Try a longer time range — new purchases show up here automatically." className="py-10" />
            ) : (
              <div className="h-[280px] w-full" role="img" aria-label={`${METRICS[metric].label} per period, last ${rangeLabel}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={METRICS[metric].color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={METRICS[metric].color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#2A2143" strokeDasharray="3 3" />
                    <XAxis dataKey="name" {...AXIS} minTickGap={24} />
                    <YAxis {...AXIS} width={metric === "revenue" ? 64 : 32} allowDecimals={false}
                      tickFormatter={(v) => (metric === "revenue" ? (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`) : v)} />
                    <Tooltip content={<ChartTip metric={metric} />} cursor={{ stroke: "#A9A1C2", strokeDasharray: "3 3" }} />
                    <Area type="monotone" dataKey={metric} stroke={METRICS[metric].color} strokeWidth={2} fill={`url(#fill-${metric})`}
                      dot={false} activeDot={{ r: 5, stroke: "#130D22", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-base font-semibold">{tierRevenueKnown ? "Revenue by pass" : "Tickets by pass"}</h2>
              <p className="mb-4 text-sm text-ttfc-muted">{tierRevenueKnown ? "All time, from Stripe. Upgrades are shown on their own." : "All time, from ticket records (revenue needs Stripe)."}</p>
              {!byTier.length ? <EmptyState title="No passes sold yet" className="py-10" /> : (
                <>
                  <div style={{ height: Math.max(140, byTier.length * 52) }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byTier} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={10}>
                        <CartesianGrid horizontal={false} stroke="#2A2143" strokeDasharray="3 3" />
                        <XAxis type="number" {...AXIS} allowDecimals={false} tickFormatter={(v) => (!tierRevenueKnown ? v : v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
                        <YAxis type="category" dataKey="tier" {...AXIS} width={84} tickFormatter={tierLabel} stroke="#A9A1C2" />
                        <Tooltip content={<TierTip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey={tierRevenueKnown ? "revenue" : "tickets"} fill="#8B5CF6" radius={[0, 4, 4, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <table className="sr-only">
                    <caption>Revenue by pass</caption>
                    <thead><tr><th>Pass</th><th>Tickets</th><th>Revenue</th><th>Checked in</th></tr></thead>
                    <tbody>{byTier.map((r) => <tr key={r.tier}><td>{tierLabel(r.tier)}</td><td>{r.tickets}</td><td>{money(r.revenue)}</td><td>{r.checkedIn ?? "—"}</td></tr>)}</tbody>
                  </table>
                  <ul className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {byTier.map((r) => (
                      <li key={r.tier} className="rounded-xl border border-ttfc-line bg-ttfc-panel2/60 px-3 py-2">
                        <p className="font-semibold text-ttfc-text">{tierLabel(r.tier)}</p>
                        <p className="text-ttfc-muted">{num(r.tickets)} {r.tier === "upgrades" ? "upgrades" : `sold · ${pct(r.checkedIn || 0, r.tickets)}% in`}</p>
                        {r.revenue != null && <p className="text-ttfc-dim">{cad(r.revenue)}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <Card>
              <h2 className="mb-1 text-base font-semibold">Inventory</h2>
              <p className="mb-5 text-sm text-ttfc-muted">Passes sold against each allocation.</p>
              {!inventory.length ? <EmptyState title="No inventory set up" body="Add pass allocations on the Inventory page." className="py-10" /> : (
                <ul className="space-y-4">
                  {inventory.map((r) => {
                    const p = pct(r.sold, r.total);
                    const full = r.total > 0 && r.sold >= r.total;
                    return (
                      <li key={r.tier}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-semibold text-ttfc-text">{tierLabel(r.tier)} <span className="font-normal text-ttfc-dim">· {cad(r.price)}</span></span>
                          <span className="tabular-nums text-ttfc-muted">{num(r.sold)} / {num(r.total)} {full && <Badge tone="warn" className="ml-1">Sold out</Badge>}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={r.total || 0} aria-valuenow={r.sold} aria-label={`${tierLabel(r.tier)} sold`}>
                          <div className="h-2.5 rounded-full bg-gradient-to-r from-ttfc-pink to-ttfc-orange" style={{ width: `${Math.min(100, Math.max(r.sold > 0 ? 3 : 0, p))}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-ttfc-dim">{p}% sold · {num(Math.max(0, r.total - r.sold))} left</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold"><Receipt className="h-4 w-4 text-ttfc-orange" aria-hidden="true" /> Not ticket sales</h2>
            <p className="mb-4 text-sm text-ttfc-muted">Other payments received through Stripe. They aren't counted in ticket revenue above.</p>
            {!breakdown ? (
              <p className="py-4 text-sm text-ttfc-dim">Shown when Stripe is connected.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-3">
                {[["booths", "Exhibitor booths"], ["pavilion", "Pavilion deposits"], ["other", "Other Stripe payments"]].map(([k, l]) => (
                  <li key={k} className="rounded-2xl border border-ttfc-line bg-ttfc-panel2/60 p-4">
                    <p className="text-sm text-ttfc-muted">{l}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-ttfc-text">{cad(breakdown[k]?.revenue)}</p>
                    <p className="text-xs text-ttfc-dim">{num(breakdown[k]?.count ?? 0)} payment{breakdown[k]?.count === 1 ? "" : "s"}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-ttfc-dim">Sponsorships invoiced outside Stripe aren't included.</p>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold">Recent purchases</h2>
            {!recent.length ? <EmptyState icon={Ticket} title="No purchases yet" className="py-10" /> : (
              <ul className="divide-y divide-ttfc-line/70">
                {recent.map((r, i) => (
                  <li key={`${r.name}-${r.purchaseDate}-${i}`} className="flex items-center gap-3 py-3 text-sm">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ttfc-panel3 text-xs font-bold" aria-hidden="true">
                      {(r.name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{r.name || "No name"}</span>
                      <span className="block text-xs text-ttfc-dim">{r.source === "stripe" ? "Stripe payment" : r.source === "account" ? "App account" : "Guest checkout"}</span>
                    </span>
                    <Badge tone="purple">{tierLabel(r.tier)}</Badge>
                    {r.amount != null && <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">{cadExact.format(Number(r.amount) || 0)}</span>}
                    <span className="w-24 shrink-0 text-right text-xs text-ttfc-muted">{ago(r.purchaseDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {data?.note && (
            <p className="flex items-start gap-2 text-xs text-ttfc-dim">
              {fromStripe && <Badge tone="good">Stripe</Badge>}
              <span>{data.note}</span>
            </p>
          )}
        </div>
      )}
    </>
  );
}
