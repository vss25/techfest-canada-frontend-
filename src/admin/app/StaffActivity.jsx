import { useMemo, useState } from "react";
import { Clock, FileText, LogIn, MousePointerClick, PenLine, RefreshCw, ShieldX, Timer } from "lucide-react";
import { useApi } from "../hooks";
import { useAdmin } from "../adminContext";
import { Badge, Button, Drawer, EmptyState, ErrorState, LoadingState, PageHeader, Select, StatTile, TableWrap } from "../ui";
import { ago, num } from "../format";
import { RANGES, formatDuration, heatLevel, hourLabel, hourSpan, rangeFor, statusText, sumTotals, viewerTz } from "./staffActivityRules";
import LogTabs from "./LogTabs";

/* =========================================================
   Settings › Staff activity (Nov 24 2026), the super admin only (the server answers 403 to anyone else;
   the menu hides it, nav.js superAdmin). For each staff member: their sessions (sign-in or back after a
   break → sign-out or idle), active time per session and per day, pages opened and records changed by
   hour. Time counts only while someone is using the panel (staffActivity.js); 15 idle minutes end a session.
   Gold is the one accent here (the hours' shading).
========================================================= */

const GOLD = ["#FFFFFF", "#FDF1DC", "#FBDDA6", "#F8C46A", "#F5A623"];
const time = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—");
const dayTitle = (ymd) => new Date(`${ymd}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const statusTone = (s) => (s === "active" ? "good" : s === "signout" ? "neutral" : "warn");

export default function StaffActivity() {
  const { isSuperAdmin } = useAdmin();
  const [range, setRange] = useState("7");
  const [who, setWho] = useState("");
  const [open, setOpen] = useState(null);
  const { from, to } = rangeFor(range);
  const tz = viewerTz();
  const path = isSuperAdmin ? `/admin/staff-activity?from=${from}&to=${to}&tz=${encodeURIComponent(tz)}` : null;
  const { data, error, loading, reload, refreshing } = useApi(path);
  const staff = useMemo(() => (data?.staff || []).filter((s) => !who || s.userId === who), [data, who]);
  const totals = sumTotals(staff);
  const person = open ? (data?.staff || []).find((s) => s.userId === open) : null;

  if (!isSuperAdmin) {
    return (
      <>
        <PageHeader eyebrow="Settings" title="Staff activity" />
        <EmptyState icon={ShieldX} title="Only the super admin can see staff activity" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Staff activity"
        description="When each staff member worked in the panel, for how long, and how many pages they opened and records they changed. Time counts only while someone is using the panel; 15 idle minutes end a session. Only you can see this."
        actions={<Button icon={RefreshCw} onClick={reload} loading={refreshing && !loading}>Refresh</Button>}
      />
      <LogTabs value="staff" />
      <div className="mb-5 flex flex-wrap gap-3">
        <Select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Dates" className="w-auto min-w-[160px]">
          {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </Select>
        <Select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Staff member" className="w-auto min-w-[200px]">
          <option value="">All staff</option>
          {(data?.staff || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.userId} value={s.userId}>{s.name || s.email}</option>)}
        </Select>
      </div>

      {loading ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Active time" value={formatDuration(totals.activeSeconds)} icon={Timer} />
            <StatTile label="Sessions" value={num(totals.sessions)} icon={LogIn} />
            <StatTile label="Pages opened" value={num(totals.pageViews)} icon={FileText} />
            <StatTile label="Records changed" value={num(totals.edits)} icon={PenLine} />
          </div>
          {!staff.length ? <EmptyState icon={Clock} title="No staff accounts" /> : (
            <TableWrap>
              <thead><tr><th>Staff</th><th>Last active</th><th className="text-right">Time</th><th className="text-right">Sessions</th><th className="text-right">Pages</th><th className="text-right">Edits</th><th><span className="sr-only">Details</span></th></tr></thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.userId}>
                    <td><p className="font-semibold">{s.name || s.email}</p><p className="text-xs text-ttfc-muted">{s.email}</p></td>
                    <td className="whitespace-nowrap text-ttfc-muted">{s.lastSeenAt ? ago(s.lastSeenAt) : "Not in this period"}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatDuration(s.totals.activeSeconds)}</td>
                    <td className="text-right tabular-nums">{num(s.totals.sessions)}</td>
                    <td className="text-right tabular-nums">{num(s.totals.pageViews)}</td>
                    <td className="text-right tabular-nums">{num(s.totals.edits)}</td>
                    <td className="text-right"><Button size="sm" variant="ghost" icon={MousePointerClick} disabled={!s.days.length} onClick={() => setOpen(s.userId)}>Details</Button></td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
          <p className="mt-3 text-xs text-ttfc-muted">Times are in your time zone ({data?.tz || tz}). Records changed = saves, deletes and other changes made in the panel. Activity is kept for 180 days.</p>
        </>
      )}

      <Drawer open={!!person} onClose={() => setOpen(null)} title={person?.name || person?.email || ""}
        description={person ? `${formatDuration(person.totals.activeSeconds)} active · ${num(person.totals.sessions)} sessions · ${num(person.totals.pageViews)} pages · ${num(person.totals.edits)} edits` : ""}
        width="max-w-2xl">
        {person?.days.map((d) => <DayCard key={d.date} day={d} />)}
      </Drawer>
    </>
  );
}

function DayCard({ day }) {
  const span = hourSpan(day.hours);
  return (
    <section className="mb-6 rounded-xl border border-[#E3E0EE] bg-white p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold text-[#151035]">{dayTitle(day.date)}</h3>
        <p className="text-sm text-[#4A4566]"><b className="tabular-nums">{formatDuration(day.activeSeconds)}</b> · {num(day.pageViews)} pages · {num(day.edits)} edits</p>
      </header>
      {!!day.sessions.length && (
        <ul className="mb-4 divide-y divide-[#F0EEF6]">
          {day.sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="tabular-nums font-semibold text-[#151035]">
                {time(s.startedAt)} – {s.status === "active" ? "now" : time(s.endedAt || s.lastSeenAt)}
                <span className="ml-2 font-normal text-[#6B6688]">{s.via === "sign-in" ? "signed in" : "came back"}</span>
              </span>
              <span className="flex items-center gap-3 text-[#4A4566]">
                <span className="tabular-nums">{formatDuration(s.activeSeconds)}</span>
                <span className="tabular-nums">{num(s.pageViews)} pages</span>
                <span className="tabular-nums">{num(s.edits)} edits</span>
                <Badge tone={statusTone(s.status)}>{statusText(s)}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
      {!!span.length && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-1 text-center text-xs" aria-label={`By hour, ${dayTitle(day.date)}`}>
            <thead>
              <tr><th className="pr-2 text-left font-semibold text-[#6B6688]">Hour</th>{span.map((h) => <th key={h.hour} className="min-w-[44px] font-semibold text-[#6B6688]">{hourLabel(h.hour)}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <th className="pr-2 text-left font-semibold text-[#4A4566]">Time</th>
                {span.map((h) => (
                  <td key={h.hour} className="rounded-md border border-[#F0EEF6] py-1.5 tabular-nums text-[#151035]" style={{ background: GOLD[heatLevel(h.activeSeconds)] }} title={formatDuration(h.activeSeconds)}>
                    {h.activeSeconds ? Math.max(1, Math.round(h.activeSeconds / 60)) : "·"}
                  </td>
                ))}
              </tr>
              <tr><th className="pr-2 text-left font-semibold text-[#4A4566]">Pages</th>{span.map((h) => <td key={h.hour} className="tabular-nums text-[#4A4566]">{h.pageViews || "·"}</td>)}</tr>
              <tr><th className="pr-2 text-left font-semibold text-[#4A4566]">Edits</th>{span.map((h) => <td key={h.hour} className="tabular-nums text-[#4A4566]">{h.edits || "·"}</td>)}</tr>
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-[#6B6688]">Time row: active minutes in that hour.</p>
        </div>
      )}
    </section>
  );
}
