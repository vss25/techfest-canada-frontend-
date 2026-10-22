import { useMemo, useState } from "react";
import { Download, Eye, MousePointerClick, RefreshCw, Rocket, Search, Smartphone, Table2, BarChart3, Users } from "lucide-react";
import { useApi, useDebounced } from "../hooks";
import { Banner, Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, SkeletonGrid, StatTile, TableWrap } from "../ui";
import { ago, day, num } from "../format";

/* =========================================================
   App › PWA installs: who installed the web app (/app) and who
   opens it from their Home Screen. GET /console/pwa?days=N
   (staff). The backend counts an iPhone that has launched from
   the Home Screen as an install (iOS has no install event).
========================================================= */

/** "2026-10-18" → "Oct 18" (read as a calendar day, not UTC midnight). */
const dayLabel = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }) : "—");

const OS_LABEL = { ios: "iPhone / iPad", android: "Android", desktop: "Computer", other: "Other" };

/** One count per day, as thin columns with a hover readout (single series: the title names it). */
function DayColumns({ rows, field, label }) {
  const [hover, setHover] = useState(null);
  const W = 300, H = 72, pad = 2;
  const max = Math.max(1, ...rows.map((r) => r[field] || 0));
  const total = rows.reduce((a, r) => a + (r[field] || 0), 0);
  const band = W / Math.max(1, rows.length);
  const bw = Math.min(24, Math.max(2, band - pad));
  const h = hover != null ? rows[hover] : null;
  return (
    <div className="relative">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ttfc-text">{label}</p>
        <p className="text-xs tabular-nums text-ttfc-muted">{h ? `${dayLabel(h.day)} · ${num(h[field] || 0)}` : `${num(total)} in total · peak ${num(max)}`}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 1}`} className="block h-[76px] w-full" role="img" aria-label={`${label} per day: ${num(total)} in total`} onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H + 0.5} y2={H + 0.5} className="stroke-ttfc-line" strokeWidth="1" />
        {rows.map((r, i) => {
          const v = r[field] || 0;
          const bh = v ? Math.max(2, (v / max) * (H - 4)) : 0;
          const x = i * band + (band - bw) / 2;
          const rr = Math.min(4, bw / 2, bh);
          const y = H - bh;
          return (
            <g key={r.day}>
              {bh > 0 && (
                <path
                  d={`M${x},${H} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + bw - rr} Q${x + bw},${y} ${x + bw},${y + rr} V${H} Z`}
                  className="fill-ttfc-purple"
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              <rect x={i * band} y="0" width={band} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}>
                <title>{`${dayLabel(r.day)}: ${v}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      {rows.length > 0 && (
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-ttfc-dim">
          <span>{dayLabel(rows[0].day)}</span><span>{dayLabel(rows[rows.length - 1].day)}</span>
        </div>
      )}
    </div>
  );
}

function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.value || 0);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1].value : null;
        const rate = prev ? Math.round((s.value / Math.max(1, prev)) * 100) : null;
        return (
          <li key={s.label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-ttfc-text/90">{s.label}</p>
                {rate !== null && <p className="text-xs text-ttfc-dim">{rate}% of the step before</p>}
              </div>
              <div className="mt-1 h-2 rounded-full bg-ttfc-contrast/5">
                <div className="h-2 rounded-full bg-ttfc-purple" style={{ width: `${Math.max(2, (s.value / top) * 100)}%` }} />
              </div>
            </div>
            <span className="w-16 text-right font-semibold tabular-nums text-ttfc-text">{num(s.value)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PwaInstalls() {
  const [days, setDays] = useState("30");
  const [nonce, setNonce] = useState(0);
  const [q, setQ] = useState("");
  const [asTable, setAsTable] = useState(false);
  const dq = useDebounced(q.trim().toLowerCase(), 200);
  const { data, error, loading, refreshing } = useApi(`/console/pwa?days=${days}${nonce ? `&refresh=${nonce}` : ""}`);
  const missing = error?.status === 404;

  const t = data?.totals || {};
  const people = useMemo(() => (data?.people || []).filter((p) => !dq || [p.name, p.email, p.os].some((x) => String(x || "").toLowerCase().includes(dq))), [data, dq]);
  const byDay = data?.byDay || [];
  const platforms = (data?.byPlatform || []).filter((p) => p.installs || p.launches);
  const pmax = Math.max(1, ...platforms.map((p) => Math.max(p.installs, p.launches)));

  return (
    <>
      <PageHeader
        eyebrow="More › App reports"
        title="Web app installs"
        description="The TTFC web app at thetechfestival.com/app: who saw the install prompt, opened the guide, installed it and opens it from their Home Screen."
        actions={
          <div className="flex gap-2">
            <Select value={days} onChange={(e) => setDays(e.target.value)} aria-label="Period" className="w-36">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
            <Button icon={RefreshCw} onClick={() => setNonce(Date.now())} loading={refreshing && !loading}>Refresh</Button>
          </div>
        }
      />
      {loading ? <SkeletonGrid count={8} className="h-28" /> : missing ? (
        <Banner tone="info" title="Needs the latest backend">
          These numbers come from the backend's PWA tracking (GET /api/console/pwa). They'll appear here as soon as that update is deployed.
        </Banner>
      ) : error && !data ? <ErrorState error={error} onRetry={() => setNonce(Date.now())} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <StatTile label="Install prompts shown" value={num(t.promptsShown)} icon={Eye} tone="purple" />
            <StatTile label="Install guide opened" value={num(t.guideOpens)} icon={MousePointerClick} tone="pink" hint={`${num(t.installClicks)} tapped Install app`} />
            <StatTile label="Installs" value={num(t.installs)} icon={Download} tone="good" hint={`${num(t.installDevices)} devices`} />
            <StatTile label="Home Screen launches" value={num(t.launches)} icon={Rocket} tone="orange" hint={`${num(t.launchDevices)} devices`} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-base font-semibold">From prompt to launch <span className="font-normal text-ttfc-dim">· {days} days</span></h2>
              <Funnel steps={[
                { label: "Saw the install prompt", value: t.promptsShown || 0 },
                { label: "Opened the install guide", value: t.guideOpens || 0 },
                { label: "Installed", value: t.installs || 0 },
                { label: "Opened from the Home Screen", value: t.launches || 0 },
              ]} />
              <p className="mt-4 text-xs text-ttfc-dim">
                {num(t.signedInPeople)} people signed in inside the installed app · {num(data?.anonymousDevices)} devices not signed in yet.
                iPhones count as installed the first time they open from the Home Screen.
              </p>
            </Card>
            <Card>
              <h2 className="mb-4 text-base font-semibold">By platform</h2>
              {platforms.length === 0 ? <p className="py-6 text-center text-sm text-ttfc-dim">No installs yet</p> : (
                <ul className="space-y-3">
                  {platforms.map((p) => (
                    <li key={p.os} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-ttfc-muted" aria-hidden="true" />
                        <span className="flex-1 text-ttfc-text/90">{OS_LABEL[p.os] || p.os}</span>
                        <span className="tabular-nums text-ttfc-muted">{num(p.installs)} installs · {num(p.launches)} launches</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-ttfc-contrast/5"><div className="h-1.5 rounded-full bg-ttfc-purple" style={{ width: `${Math.max(2, (p.installs / pmax) * 100)}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card className="mt-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Per day</h2>
              <Button size="sm" variant="ghost" icon={asTable ? BarChart3 : Table2} onClick={() => setAsTable((v) => !v)}>{asTable ? "Show charts" : "Show as table"}</Button>
            </div>
            {byDay.length === 0 ? <p className="py-6 text-center text-sm text-ttfc-dim">No activity in this period</p> : asTable ? (
              <TableWrap>
                <thead><tr><th>Day</th><th className="text-right">Prompts shown</th><th className="text-right">Installs</th><th className="text-right">Launches</th></tr></thead>
                <tbody>{byDay.map((r) => <tr key={r.day}><td>{dayLabel(r.day)}</td><td className="text-right tabular-nums">{num(r.prompts)}</td><td className="text-right tabular-nums">{num(r.installs)}</td><td className="text-right tabular-nums">{num(r.launches)}</td></tr>)}</tbody>
              </TableWrap>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                <DayColumns rows={byDay} field="prompts" label="Prompts shown" />
                <DayColumns rows={byDay} field="installs" label="Installs" />
                <DayColumns rows={byDay} field="launches" label="Launches" />
              </div>
            )}
          </Card>

          <div className="mb-3 mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className="flex-1 text-base font-semibold">People who installed <span className="font-normal text-ttfc-dim">· signed in inside the app</span></h2>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or platform" className="pl-9" aria-label="Search people who installed" />
            </div>
          </div>
          {people.length === 0 ? (
            <EmptyState icon={Users} title={dq ? "No one matches" : "No signed-in installs yet"} body={dq ? undefined : "People appear here once they sign in inside the installed app."} />
          ) : (
            <TableWrap>
              <thead><tr><th>Name</th><th>Email</th><th>Platform</th><th>First install</th><th>Last launch</th><th className="text-right">Launches</th></tr></thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.userId}>
                    <td className="font-medium">{p.name || "—"}</td>
                    <td className="text-ttfc-muted">{p.email || "—"}</td>
                    <td>{OS_LABEL[p.os] || p.os || "—"}</td>
                    <td title={p.firstInstallAt || ""}>{p.firstInstallAt ? day(p.firstInstallAt) : "—"}</td>
                    <td title={p.lastLaunchAt || ""}>{p.lastLaunchAt ? ago(p.lastLaunchAt) : "Not yet"}</td>
                    <td className="text-right tabular-nums">{num(p.launches)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </>
      )}
    </>
  );
}
