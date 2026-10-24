import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CalendarCheck, CalendarDays, Download, Info, RefreshCw, ScanLine, Ticket, UserCheck, UserX, Users,
} from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { Badge, Banner, Button, Card, ErrorState, LoadingState, PageHeader, SectionTitle, StatTile, TableWrap } from "../ui";
import { personPath } from "../people/peopleMeta";
import { csvFileName, dietChips, pctText, summaryCsv, torontoTime } from "./eventSummaryParts";
import { OVERALL_LABEL, attendanceView } from "../../checkin/lib/attendance.js";

/* Admin › RSVPs & meals › Event summary (Oct 23 2026). The organiser: "Create an admin panel summary of
   registration, breakfast included, lunch, dinner, etc. pass types, day 1 and day 2". Read only: one call,
   GET /console/summary, which counts everything from the People directory on the server (backend
   services/eventSummary.js; refreshed by itself every minute, Refresh reads the records again now).
   Nothing here changes data or sends anything. The CSV is the tables, built in the browser (eventSummaryParts.js). */

const TIER_TONE = { connect: "neutral", influence: "pink", power: "orange", apex: "purple", speaker: "good" };
const num = (n) => (typeof n === "number" ? n.toLocaleString() : "—");
const R = "!text-right tabular-nums"; // number columns
// Phones: tighter cells so the number tables fit a 360–390 px screen without sideways scrolling.
const COMPACT = "max-sm:[&_td]:!px-2 max-sm:[&_th]:!px-2 max-sm:[&_th]:!tracking-normal max-sm:[&_td]:!py-2.5 max-sm:[&_td]:text-[13px]";
/** A heading or label in full, and shorter on a phone (the full one stays for screen readers). */
const Short = ({ full, short }) => (
  <><span className="max-sm:hidden">{full}</span><span className="sm:hidden" aria-hidden="true" title={full}>{short}</span><span className="sr-only sm:hidden">{full}</span></>
);
const STRIPE_WHY = {
  slow: "Stripe was slow to answer",
  error: "Stripe couldn't be read",
  off: "Stripe isn't connected on this server",
};

function PassTable({ s }) {
  const { rows = [], total, marks = [] } = s.passes || {};
  const line = (r, { strong = false, mark = false } = {}) => (
    <tr key={r.tier || r.key} className={strong ? "font-semibold [&>td]:bg-ttfc-contrast/[0.03]" : mark ? "text-ttfc-muted" : ""}>
      <td className="whitespace-nowrap max-sm:whitespace-normal">
        {mark || strong ? r.label : <Badge tone={TIER_TONE[r.tier] || "neutral"}><Short full={r.label} short={String(r.label).replace(/ Pass$/, "")} /></Badge>}
      </td>
      <td className={R}>{num(r.people)}</td>
      <td className={R}>{num(r.rsvpd)}</td>
      <td className={R}>{pctText(r.pct)}</td>
      <td className={R}>{num(r.day1)}</td>
      <td className={R}>{num(r.day2)}</td>
      <td className={R}>{r.pending ? num(r.pending) : <span className="text-ttfc-dim">0</span>}</td>
    </tr>
  );
  return (
    <TableWrap className={COMPACT}>
      <thead>
        <tr>
          <th><Short full="Pass type" short="Pass" /></th><th className={R}>People</th><th className={R}>RSVP’d</th><th className={R}><Short full="% RSVP’d" short="%" /></th>
          <th className={R}><Short full="Day 1" short="D1" /></th><th className={R}><Short full="Day 2" short="D2" /></th><th className={R}><Short full="Pending" short="Pend." /></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => line(r))}
        {total && line(total, { strong: true })}
        <tr>
          <td colSpan={7} className="!pb-1 !pt-4 text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">Also counted above</td>
        </tr>
        {marks.map((r) => line(r, { mark: true }))}
      </tbody>
    </TableWrap>
  );
}

function DietCell({ row, keys }) {
  const chips = dietChips(row, keys);
  if (!row.rsvpd) return <span className="text-ttfc-dim">—</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => <Badge key={c.key} tone="orange">{c.label} {c.count}</Badge>)}
      <span className="whitespace-nowrap text-xs text-ttfc-muted">{chips.length ? "· " : ""}no needs {num(row.noNeeds)}</span>
    </span>
  );
}

/** Phones: one card per meal (the table needs more width than a phone has). */
function MealCards({ s }) {
  const { rows = [], allRsvps, dietaryKeys = [] } = s.meals || {};
  const all = allRsvps ? [...rows, { key: "all", label: allRsvps.label, entitled: s.totals?.people, rsvpd: allRsvps.rsvpd, pct: s.totals?.pct, ...allRsvps }] : rows;
  return (
    <ul className="space-y-3 sm:hidden">
      {all.map((m) => (
        <li key={m.key} className={`rounded-[18px] border border-ttfc-line p-4 ${m.key === "all" ? "bg-ttfc-panel2" : "bg-ttfc-panel"}`}>
          <p className="font-semibold leading-snug text-ttfc-text">{m.label}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[["Entitled", num(m.entitled)], ["RSVP’d", num(m.rsvpd)], ["%", pctText(m.pct)]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-ttfc-contrast/[0.04] px-2 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ttfc-dim">{k}</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-ttfc-text">{v}</dd>
              </div>
            ))}
          </dl>
          {(m.entitledPending > 0 || m.outsidePass > 0) && (
            <p className="mt-2 text-xs text-ttfc-muted">
              {m.entitledPending > 0 && `Entitled incl. ${num(m.entitledPending)} pending. `}
              {m.outsidePass > 0 && <span className="text-amber-200/80">RSVP’d incl. {num(m.outsidePass)} outside their pass.</span>}
            </p>
          )}
          <div className="mt-3"><DietCell row={m} keys={dietaryKeys} /></div>
        </li>
      ))}
    </ul>
  );
}

function MealTable({ s }) {
  const { rows = [], allRsvps, dietaryKeys = [] } = s.meals || {};
  return (
    <TableWrap className="hidden sm:block">
      <thead>
        <tr>
          <th>Meal or event</th><th className={R}>People entitled</th><th className={R}>RSVP’d</th><th className={R}>%</th>
          <th className="min-w-[260px]">Dietary needs of those RSVP’d</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.key} className="align-top">
            <td className="min-w-[200px] font-semibold">{m.label}</td>
            <td className={R}>
              {num(m.entitled)}
              {m.entitledPending > 0 && <span className="block text-[11px] font-normal text-ttfc-dim">incl. {num(m.entitledPending)} pending</span>}
            </td>
            <td className={R}>
              {num(m.rsvpd)}
              {m.outsidePass > 0 && <span className="block text-[11px] text-amber-200/80" title="Staff added it, or it was on their RSVP before their pass changed">incl. {num(m.outsidePass)} outside their pass</span>}
            </td>
            <td className={R}>{pctText(m.pct)}</td>
            <td><DietCell row={m} keys={dietaryKeys} /></td>
          </tr>
        ))}
        {allRsvps && (
          <tr className="align-top font-semibold [&>td]:bg-ttfc-contrast/[0.03]">
            <td>{allRsvps.label} <span className="block text-[11px] font-normal text-ttfc-dim">any day, all meals and breaks</span></td>
            <td className={R}>{num(s.totals?.people)}</td>
            <td className={R}>{num(allRsvps.rsvpd)}</td>
            <td className={R}>{pctText(s.totals?.pct)}</td>
            <td className="font-normal"><DietCell row={allRsvps} keys={dietaryKeys} /></td>
          </tr>
        )}
      </tbody>
    </TableWrap>
  );
}

function CheckinSection({ s }) {
  const c = s.checkin || {};
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Checked in" value={num(c.checkedIn)} icon={ScanLine} tone="purple" hint={`of ${num(s.totals?.people)} with a pass`} />
        <StatTile label="First scan on Day 1" value={num(c.day1)} icon={CalendarCheck} tone="pink" hint={s.days?.[0]?.long} />
        <StatTile label="First scan on Day 2" value={num(c.day2)} icon={CalendarCheck} tone="orange" hint={s.days?.[1]?.long} />
        <StatTile label="Checked in, no RSVP" value={num(c.notRsvpd)} icon={UserX} tone="neutral" hint="came without RSVP’ing" />
      </div>
      <TableWrap className={COMPACT}>
        <thead>
          <tr>
            <th><Short full="Pass type" short="Pass" /></th><th className={R}>People</th><th className={R}><Short full="Checked in" short="In" /></th>
            <th className={R}><Short full="First scan Day 1" short="1st D1" /></th><th className={R}><Short full="First scan Day 2" short="1st D2" /></th>
          </tr>
        </thead>
        <tbody>
          {(c.byPass || []).map((r) => (
            <tr key={r.tier}>
              <td><Badge tone={TIER_TONE[r.tier] || "neutral"}><Short full={r.label} short={String(r.label).replace(/ Pass$/, "")} /></Badge></td>
              <td className={R}>{num(r.people)}</td>
              <td className={R}>{num(r.checkedIn)}</td>
              <td className={R}>{num(r.day1)}</td>
              <td className={R}>{num(r.day2)}</td>
            </tr>
          ))}
          <tr className="font-semibold [&>td]:bg-ttfc-contrast/[0.03]">
            <td>Total</td><td className={R}>{num(s.totals?.people)}</td><td className={R}>{num(c.checkedIn)}</td><td className={R}>{num(c.day1)}</td><td className={R}>{num(c.day2)}</td>
          </tr>
        </tbody>
      </TableWrap>
      <p className="mt-3 text-sm leading-relaxed text-ttfc-muted">
        A pass is checked in once, on its first scan. Scanning it again on Day 2 shows “already checked in” and isn’t recorded,
        so Day 2 counts people whose <em>first</em> scan was on Day 2, not everyone in the room that day. Meals aren’t scanned,
        so there’s no check-in per meal.
        {(c.otherDay > 0 || c.noTime > 0) && (
          <> {c.otherDay > 0 && `${num(c.otherDay)} checked in on another date (a scan before the event, for example). `}
            {c.noTime > 0 && `${num(c.noTime)} checked in with no time recorded (the older scanner).`}</>
        )}
      </p>
    </>
  );
}

/**
 * Attendance by day (contract C10): from the check-in desk app's marks (each person once per point per day; practice
 * marks never). Day 1 | Day 2: arrived, checked in, each meal's admitted / entitled with RSVP'd, % of RSVP'd,
 * no-shows and overrides; then by pass type; ISSUE PASS and NO DETAILS FOUND. The same words as the desk's staff Counts
 * screen (src/checkin/lib/attendance.js). Refreshed with the page.
 */
function AttendanceSection({ s }) {
  if (!s.attendance) {
    return <p className="text-sm text-ttfc-muted">Attendance by day isn’t available from the server yet. It appears here once the check-in desk counts reach this page.</p>;
  }
  const v = attendanceView(s.attendance);
  const o = v.overall;
  return (
    <>
      {o && (
        // Both days together, each person once (the server's overall): someone who came on both days counts once here.
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={`${OVERALL_LABEL}: ${o.text}`}>
          <StatTile label="Arrived, Day 1 or Day 2" value={num(o.arrived ?? undefined)} icon={Users} tone="purple" hint="each person once" />
          <StatTile label="Checked in, Day 1 or Day 2" value={num(o.checkedIn ?? undefined)} icon={UserCheck} tone="good" hint="each person once" />
          <StatTile label="Came on both days" value={num(o.bothDays ?? undefined)} icon={CalendarCheck} tone="pink" hint="arrived on Day 1 and on Day 2" />
        </div>
      )}
      <TableWrap className={COMPACT}>
        <thead>
          <tr>
            <th className="w-[34%]">Count</th>
            {v.days.map((d) => <th key={d.key} className={R}><Short full={d.label} short={d.key === "day1" ? "Day 1" : "Day 2"} /></th>)}
          </tr>
        </thead>
        <tbody>
          {v.rows.map((r) => (
            <tr key={r.key} className="align-top">
              <td className="font-semibold">{r.label}</td>
              {r.cells.map((c, i) => (
                <td key={v.days[i].key} className={R}>
                  {c.label && <span className="block text-[11px] font-normal text-ttfc-dim">{c.label}</span>}
                  <span className="text-[15px] font-semibold text-ttfc-text">{c.main}</span>
                  {c.sub && <span className="block text-[11px] font-normal leading-snug text-ttfc-muted">{c.sub}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {v.byPass.length > 0 && (
        <div className="mt-4 grid gap-4 2xl:grid-cols-2">
          {v.byPass.map((d) => (
            <div key={d.day}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ttfc-dim">By pass type · {d.label}</p>
              <TableWrap className={COMPACT}>
                <thead>
                  <tr>
                    <th><Short full="Pass type" short="Pass" /></th>{d.rows.some((r) => r.people !== null) && <th className={R}>People</th>}<th className={R}><Short full="Arrived" short="Arr." /></th><th className={R}><Short full="Checked in" short="In" /></th>
                    <th className={R}>CxO</th><th className={R}>Lunch</th><th className={R}>Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.key}>
                      <td>{r.label}</td>{d.rows.some((x) => x.people !== null) && <td className={R}>{num(r.people ?? undefined)}</td>}<td className={R}>{num(r.arrived)}</td><td className={R}>{num(r.checkedIn)}</td>
                      <td className={R}>{num(r.cxo)}</td><td className={R}>{num(r.lunch)}</td><td className={R}>{num(r.dinner)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-ttfc-muted">
        From the check-in desk app: each person once per point per day{o ? " (and once across both days in the tiles above)" : ""},
        practice taps before the event never counted.
        “Admitted / entitled”: admitted at the door out of everyone whose pass includes it; no-shows are people who RSVP’d
        and weren’t admitted; overrides were admitted outside the hours with “Admit anyway” (counted in the admitted
        number too). By pass type, each person is in one colour group, as on the desk (VIP, then Media, then Speaker, then
        the pass type).{v.builtAt ? ` Counted ${torontoTime(v.builtAt)} Toronto time.` : ""}
      </p>
    </>
  );
}

const MEAL_SHORT = { cxo_d1: "CxO D1", cxo_d2: "CxO D2", lunch_d1: "Lunch D1", lunch_d2: "Lunch D2", awards: "Awards", gala: "Gala" };

export default function EventSummary() {
  const toast = useToast();
  const { data: s, error, loading, refreshing, setData } = useApi("/console/summary", { interval: 60000 });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try { setData(await api.get("/console/summary?refresh=1")); } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`\uFEFF${summaryCsv(s)}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFileName(s?.builtAt);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const t = s?.totals || {};
  const asOf = s?.builtAt ? torontoTime(s.builtAt) : "";
  const left = s?.leftOut || {};

  return (
    <>
      <PageHeader
        eyebrow="RSVPs & meals"
        title="Event summary"
        description="TTFC 2026 at a glance: passes, RSVPs, meals and check-in for Day 1 (Mon 26 Oct) and Day 2 (Tue 27 Oct). One row per person, counted live from People. Read only."
        actions={(
          <>
            {asOf && <span className="text-xs text-ttfc-muted" aria-live="polite">As of {asOf} Toronto time{refreshing && !busy ? " · updating…" : ""}</span>}
            <Button icon={RefreshCw} loading={busy} onClick={refresh} disabled={!s}>Refresh</Button>
            <Button icon={Download} onClick={download} disabled={!s}>Download CSV</Button>
          </>
        )}
      />

      {loading ? <LoadingState label="Counting…" /> : error && !s ? <ErrorState error={error} onRetry={refresh} /> : !s ? null : (
        <>
          {!s.refundsChecked && (
            <Banner tone="warn" icon={AlertTriangle} className="mb-6" title="Refunds couldn’t be checked">
              {STRIPE_WHY[s.stripe] || "Stripe couldn't be read"}, so a refunded pass may be counted. Refresh in a minute.
            </Banner>
          )}

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
            <StatTile label="People with a pass" value={num(t.people)} icon={Users} tone="purple" hint={t.pending ? `incl. ${num(t.pending)} pending` : "none pending"} />
            <StatTile label="RSVP’d" value={num(t.rsvpd)} icon={UserCheck} tone="good" hint={`${pctText(t.pct)} of people with a pass`} />
            <StatTile label="Not RSVP’d" value={num(t.notRsvpd)} icon={UserX} tone="neutral" hint={t.people ? `${pctText(Math.round((t.notRsvpd * 100) / t.people))} still to RSVP` : undefined} />
            <StatTile label="Day 1 RSVPs" value={num(t.day1)} icon={CalendarDays} tone="pink" hint={`Mon 26 Oct · ${pctText(t.day1Pct)} of RSVPs`} />
            <StatTile label="Day 2 RSVPs" value={num(t.day2)} icon={CalendarDays} tone="orange" hint={`Tue 27 Oct · ${num(t.bothDays)} both days`} />
          </div>

          <section className="mb-8" aria-labelledby="sum-passes">
            <SectionTitle hint="Each person once, under one pass. Pending: a pass staff made that hasn't been emailed yet.">
              <span id="sum-passes">Passes by type</span>
            </SectionTitle>
            <PassTable s={s} />
            <p className="mt-3 text-sm text-ttfc-muted">
              Of the RSVPs: <span className="font-semibold text-ttfc-text">{num(t.day1)}</span> said Day 1 and{" "}
              <span className="font-semibold text-ttfc-text">{num(t.day2)}</span> said Day 2 ({num(t.bothDays)} both days).
            </p>
            <p className="mt-1 text-sm text-ttfc-muted">
              People holding two passes: <span className="font-semibold text-ttfc-text">{num(s.multiPass?.length || 0)}</span> (counted once)
              {s.multiPass?.length > 0 && (
                <>
                  {": "}
                  {s.multiPass.map((m, i) => (
                    <span key={m.id}>
                      {i > 0 && ", "}
                      <Link to={personPath(m.id)} className="text-ttfc-pink underline-offset-2 hover:underline">{m.name}</Link>
                      <span className="text-ttfc-dim"> ({m.passes.map((p) => p.label).join(" + ")}, counted as {m.countedAs}{m.peopleShows && m.peopleShows !== m.countedAs ? `; People shows ${m.peopleShows}` : ""})</span>
                    </span>
                  ))}
                </>
              )}
            </p>
          </section>

          <section className="mb-8" aria-labelledby="sum-meals">
            <SectionTitle hint="Entitled: their pass includes it, by pass type or a staff switch in People. RSVP'd: it's on their RSVP.">
              <span id="sum-meals">Meals and events</span>
            </SectionTitle>
            <MealCards s={s} />
            <MealTable s={s} />
            {s.meals?.otherNotes?.length > 0 && (
              <Card className="mt-4 p-5">
                <SectionTitle hint="Dietary “Other”, for catering">Other dietary needs, in their words</SectionTitle>
                <ul className="space-y-1.5 text-sm">
                  {s.meals.otherNotes.map((n) => (
                    <li key={n.id}>
                      <Link to={personPath(n.id)} className="text-ttfc-muted hover:text-ttfc-pink hover:underline">{n.name}</Link>: {n.note}
                      {n.meals.length > 0 && <span className="ml-1.5 text-xs text-ttfc-dim">({n.meals.map((k) => MEAL_SHORT[k] || k).join(", ")})</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section className="mb-8" aria-labelledby="sum-attendance">
            <SectionTitle hint="Arrivals, check-ins and each meal and evening, per event day, from the check-in desk app. Live with this page.">
              <span id="sum-attendance">Attendance by day</span>
            </SectionTitle>
            <AttendanceSection s={s} />
          </section>

          <section className="mb-8" aria-labelledby="sum-checkin">
            <SectionTitle hint="From the door scanner (Event day › Check-in and the apps). These read 0 until the event.">
              <span id="sum-checkin">Registration and check-in</span>
            </SectionTitle>
            <CheckinSection s={s} />
          </section>

          <Card className="p-5">
            <SectionTitle>How this is counted</SectionTitle>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ttfc-muted">
              <li>One row per person (the People directory joins their account, passes and RSVP). Each person is in exactly one pass row, so the rows add up to the total.</li>
              <li>Someone holding two passes counts once: under their Speaker Pass if they have one, otherwise under the pass People shows for them.</li>
              <li>Two different people on one email address (a colleague’s or assistant’s pass bought on someone else’s email) count as two.</li>
              <li>Pending passes (made by staff, not emailed yet) are counted and also shown in the Pending column.</li>
              <li>Exhibitor passes are Connect Passes, so they count under Connect.</li>
              <li>Left out: passes hidden by staff, refunded passes, and staff accounts with no pass.</li>
              <li>RSVP’d means they sent their RSVP or staff entered one; a possible duplicate RSVP waiting for review in Headcounts &amp; RSVPs doesn’t count.</li>
              <li>Entitled means one of their passes includes it, by pass type or because staff switched it on in People. “Outside their pass” is an RSVP for something their pass doesn’t include (added by staff, or kept from before a pass change).</li>
              <li>Check-in counts the day of each person’s first scan, in Toronto time.</li>
            </ul>
            <p className="mt-4 flex items-start gap-2 text-sm text-ttfc-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Not counted now: {num(left.refunded || 0)} {left.refunded === 1 ? "person" : "people"} whose passes were all refunded, {num(left.hidden || 0)} whose
                passes are all hidden, {num(left.staffNoPass || 0)} staff account{left.staffNoPass === 1 ? "" : "s"} with no pass.
                {left.rsvpNoPass > 0 && (
                  <> {num(left.rsvpNoPass)} RSVP{left.rsvpNoPass === 1 ? "" : "s"} from people with no pass that counts:{" "}
                    {(left.rsvpNoPassPeople || []).map((p, i) => (
                      <span key={p.id}>{i > 0 && ", "}<Link to={personPath(p.id)} className="text-ttfc-pink hover:underline">{p.name}</Link>
                        <span className="text-ttfc-dim"> ({p.why === "refunded" ? "refunded" : p.why === "hidden" ? "pass hidden" : "no pass"})</span></span>
                    ))}.</>
                )}
                {" "}Numbers as of {asOf || "—"} Toronto time; the page updates every minute.
              </span>
            </p>
          </Card>

          <p className="mt-6 flex items-center gap-2 text-xs text-ttfc-dim">
            <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Who’s coming to each meal, by name: <Link to="/admin/rsvps" className="font-semibold text-ttfc-pink hover:underline">Headcounts &amp; RSVPs</Link>.</span>
          </p>
        </>
      )}
    </>
  );
}
