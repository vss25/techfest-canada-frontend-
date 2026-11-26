import { useState } from "react";
import { Info, Save } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import {
  Badge, Banner, Button, Card, ErrorState, Field, Input, LoadingState,
  PageHeader, Select, Switch, TableWrap, Tabs,
} from "../ui";

/* Admin › Events: the event spine's settings (GET/PATCH /api/admin/events).
   Each event carries its attendee-visibility policy — what it exposes about
   its own attendees, and to whom — plus its lifecycle grace days and the
   pricing-announced switch. The matrix tab is the cross-event view of the
   same data (GET /api/admin/events/visibility-matrix): rows are whose
   attendees, columns are who can see them; a shared pair is written into
   sharedWith through the same PATCH endpoint. Enforcement is server-side
   (services/attendeeVisibility.js in the backend); this page only edits. */

const MODES = [
  { value: "hidden", label: "Hidden — nothing is shown" },
  { value: "count", label: "Count — how many attendees, never who" },
  { value: "names", label: "Names — name, company and job title only" },
  { value: "profiles", label: "Profiles — the full directory entry" },
];

const AUDIENCES = [
  { value: "public", label: "Public — anyone signed in" },
  { value: "own-event", label: "Own event — this event's attendees" },
  { value: "all-events", label: "All events — any event's attendees" },
  { value: "staff-only", label: "Staff only" },
];

const modeLabel = (m) => MODES.find((x) => x.value === m)?.label.split(" — ")[0] || m;
const audienceLabel = (a) => AUDIENCES.find((x) => x.value === a)?.label.split(" — ")[0] || a;
const eventName = (e) => e?.name || e?.eventKey || "";

export default function Events() {
  const eventsApi = useApi("/admin/events");
  const matrixApi = useApi("/admin/events/visibility-matrix");
  const [tab, setTab] = useState("events");
  const [selectedKey, setSelectedKey] = useState(null);
  // Until a row is clicked: the event chosen in the top bar (so Home's "Set targets" opens the right one).
  const { current: chosen } = useAdminEvent();
  const chosenKey = chosen?.eventKey?.current || chosen?.eventKey || "";

  if (eventsApi.loading) return <LoadingState label="Loading events…" />;
  if (eventsApi.error && !eventsApi.data) return <ErrorState error={eventsApi.error} onRetry={eventsApi.reload} />;

  const events = eventsApi.data?.events || [];
  const selected = events.find((e) => e.eventKey === (selectedKey || chosenKey)) || events[0] || null;
  const reloadAll = () => { eventsApi.reload(); matrixApi.reload(); };

  return (
    <>
      <PageHeader
        title="Event settings"
        description="Each event's settings: who can see its attendees, how long it stays “just ended”, and whether its pricing is announced. Changes apply on the server as soon as you save."
      />
      <Tabs
        label="Events views"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "events", label: "Events", count: events.length },
          { key: "matrix", label: "Visibility matrix" },
        ]}
      />
      {tab === "events" ? (
        events.length === 0 ? (
          <Banner tone="info" icon={Info}>No events yet. Events are created through the API for now; they will appear here.</Banner>
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">City</th>
                  <th scope="col">Type</th>
                  <th scope="col">Year</th>
                  <th scope="col">Status</th>
                  <th scope="col">Attendees visible</th>
                  <th scope="col">Pricing</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const active = selected && e.eventKey === selected.eventKey;
                  return (
                    <tr
                      key={e.eventKey}
                      onClick={() => setSelectedKey(e.eventKey)}
                      aria-selected={!!active}
                      className={`cursor-pointer ${active ? "bg-ttfc-contrast/[0.04]" : ""}`}
                    >
                      <td>
                        <span className="font-semibold text-ttfc-text">{eventName(e)}</span>
                        <span className="block text-xs text-ttfc-dim">{e.eventKey}</span>
                      </td>
                      <td>{e.city || "—"}</td>
                      <td>{e.type === "main-event" ? "Main event" : e.type === "briefing" ? "Briefing" : "—"}</td>
                      <td>{e.year || "—"}</td>
                      <td>{e.status || "—"}</td>
                      <td>
                        {modeLabel(e.attendeeVisibility?.mode || "hidden")}
                        <span className="block text-xs text-ttfc-dim">to {audienceLabel(e.attendeeVisibility?.audience || "staff-only").toLowerCase()}</span>
                      </td>
                      <td>
                        {e.settings?.pricingAnnounced
                          ? <Badge tone="good">Announced</Badge>
                          : <Badge tone="neutral">To be announced</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
            {selected && (
              <EventEditor
                key={selected.eventKey}
                event={selected}
                events={events}
                onSaved={reloadAll}
              />
            )}
          </>
        )
      ) : (
        <VisibilityMatrix matrixApi={matrixApi} onChanged={reloadAll} />
      )}
    </>
  );
}

/* The per-event editor: visibility policy, grace days, pricing switch. */
function EventEditor({ event, events, onSaved }) {
  const toast = useToast();
  const [mode, setMode] = useState(event.attendeeVisibility?.mode || "hidden");
  const [audience, setAudience] = useState(event.attendeeVisibility?.audience || "staff-only");
  const [sharedWith, setSharedWith] = useState(event.attendeeVisibility?.sharedWith || []);
  const [graceDays, setGraceDays] = useState(String(event.settings?.lifecycleGraceDays ?? 7));
  const [pricingAnnounced, setPricingAnnounced] = useState(!!event.settings?.pricingAnnounced);
  // Private sales goals (Nov 22 2026): the dashboard shows sold vs these. Never on the website.
  const [targetDelegates, setTargetDelegates] = useState(event.settings?.targets?.delegates ?? "");
  const [targetExhibitors, setTargetExhibitors] = useState(event.settings?.targets?.exhibitors ?? "");
  const [saving, setSaving] = useState(false);

  const others = events.filter((e) => e.eventKey !== event.eventKey);
  const toggleShared = (key, on) =>
    setSharedWith((list) => (on ? [...new Set([...list, key])] : list.filter((k) => k !== key)));

  const save = async () => {
    const days = Number(graceDays);
    if (!Number.isFinite(days) || days < 0) { toast.error("Grace days must be a number of 0 or more."); return; }
    const target = (v) => (String(v).trim() === "" ? null : Number(v));
    const targets = { delegates: target(targetDelegates), exhibitors: target(targetExhibitors) };
    if (Object.values(targets).some((n) => n !== null && (!Number.isInteger(n) || n < 0))) { toast.error("Targets must be whole numbers, or empty for no target."); return; }
    setSaving(true);
    try {
      await api.patch(`/admin/events/${encodeURIComponent(event.eventKey)}`, {
        attendeeVisibility: { mode, audience, sharedWith },
        settings: { lifecycleGraceDays: days, pricingAnnounced, targets },
      });
      toast.success(`${eventName(event)} saved.`);
      onSaved();
    } catch (e) { toast.error(e); } finally { setSaving(false); }
  };

  return (
    <Card className="mt-6 p-5">
      <h2 className="text-base font-bold text-ttfc-text">{eventName(event)}</h2>
      <p className="mt-0.5 text-xs text-ttfc-dim">{event.eventKey}</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="What attendees of this event expose" hint="Applies to the directory, search, profiles and the leaderboard in the app.">
          {(id) => (
            <Select id={id} value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Who can see them" hint="Sharing below adds specific events on top of this.">
          {(id) => (
            <Select id={id} value={audience} onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          )}
        </Field>
      </div>

      {others.length > 0 && (
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-ttfc-text/90">Also share this event's attendees with</p>
          <p className="mt-0.5 text-xs text-ttfc-dim">Attendees of a shared event can see this event's attendees (at the level above), and the other way round.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {others.map((o) => (
              <label key={o.eventKey} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-ttfc-line px-3 py-2 text-sm text-ttfc-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0"
                  checked={sharedWith.includes(o.eventKey)}
                  onChange={(e) => toggleShared(o.eventKey, e.target.checked)}
                />
                <span className="min-w-0">
                  {eventName(o)}
                  <span className="block truncate text-xs text-ttfc-dim">{o.eventKey}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="“Just ended” grace days" hint="After the event ends, its full programme stays up (tickets off) for this many days before it becomes a past event.">
          {(id) => (
            <Input id={id} type="number" min="0" step="1" value={graceDays} onChange={(e) => setGraceDays(e.target.value)} />
          )}
        </Field>
        <div className="flex items-end pb-1">
          <Switch
            checked={pricingAnnounced}
            onChange={setPricingAnnounced}
            label="Pricing announced"
            description={pricingAnnounced
              ? "This event's prices can be shown and sold."
              : "No prices anywhere for this event — pages show “to be announced” and checkout stays closed."}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13px] font-semibold text-ttfc-text/90">Targets for this event</p>
        <p className="mt-0.5 text-xs text-ttfc-dim">What you're aiming for. Private: the dashboard shows sold against these; the website never shows them. Leave empty for no target.</p>
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <Field label="Delegates" hint="People with a ticket or pass for this event.">
            {(id) => <Input id={id} type="number" min="0" step="1" value={targetDelegates} onChange={(e) => setTargetDelegates(e.target.value)} placeholder="e.g. 150" />}
          </Field>
          <Field label="Exhibitors" hint="Companies exhibiting at this event.">
            {(id) => <Input id={id} type="number" min="0" step="1" value={targetExhibitors} onChange={(e) => setTargetExhibitors(e.target.value)} placeholder="e.g. 20" />}
          </Field>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="primary" icon={Save} loading={saving} onClick={save}>Save event</Button>
      </div>
    </Card>
  );
}

/* The cross-event grid: rows = whose attendees, columns = who can see them.
   The diagonal shows the event's own mode; an off-diagonal cell toggles
   sharing between the pair (written into sharedWith via PATCH). Sharing is
   mutual for reads, so a cell counts as shared when either event lists
   the other — switching off clears both sides. */
function VisibilityMatrix({ matrixApi, onChanged }) {
  const toast = useToast();
  const [toggling, setToggling] = useState("");
  const { data, error, loading, reload } = matrixApi;

  if (loading) return <LoadingState label="Loading the visibility matrix…" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const rows = data?.rows || [];
  const byKey = new Map(rows.map((r) => [r.eventKey, r]));
  const shared = (a, b) =>
    (byKey.get(a)?.sharedWith || []).includes(b) || (byKey.get(b)?.sharedWith || []).includes(a);

  const toggle = async (a, b) => {
    const busyKey = `${a}|${b}`;
    setToggling(busyKey);
    try {
      if (shared(a, b)) {
        // Clear both directions so the pair is fully unshared.
        for (const [from, to] of [[a, b], [b, a]]) {
          const list = byKey.get(from)?.sharedWith || [];
          if (list.includes(to)) {
            await api.patch(`/admin/events/${encodeURIComponent(from)}`, {
              attendeeVisibility: { sharedWith: list.filter((k) => k !== to) },
            });
          }
        }
        toast.success("Sharing switched off.");
      } else {
        const list = byKey.get(a)?.sharedWith || [];
        await api.patch(`/admin/events/${encodeURIComponent(a)}`, {
          attendeeVisibility: { sharedWith: [...new Set([...list, b])] },
        });
        toast.success("Sharing switched on.");
      }
      onChanged();
    } catch (e) { toast.error(e); } finally { setToggling(""); }
  };

  if (rows.length === 0) {
    return <Banner tone="info" icon={Info}>No events yet, so there is nothing to share.</Banner>;
  }

  return (
    <>
      <Banner tone="info" icon={Info} className="mb-4">
        Rows are whose attendees; columns are who can see them. The diagonal is the event's own setting.
        Click a cell to share or unshare a pair — sharing is mutual, and what is exposed is still each
        row event's own mode above.
      </Banner>
      <p className="mb-2 text-xs text-ttfc-dim sm:hidden">Scroll sideways to see every event.</p>
      <TableWrap>
        <thead>
          <tr>
            <th scope="col">Attendees of ↓ · seen by →</th>
            {rows.map((c) => (
              <th key={c.eventKey} scope="col" className="text-center">
                {c.name || c.eventKey}
                <span className="block text-[11px] font-normal normal-case text-ttfc-dim">{c.eventKey}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.eventKey}>
              <th scope="row" className="!whitespace-normal text-sm font-semibold normal-case tracking-normal text-ttfc-text">
                {r.name || r.eventKey}
                <span className="block text-xs font-normal text-ttfc-dim">
                  {modeLabel(r.mode)} · to {audienceLabel(r.audience).toLowerCase()}
                </span>
              </th>
              {rows.map((c) => {
                if (c.eventKey === r.eventKey) {
                  return (
                    <td key={c.eventKey} className="text-center">
                      <Badge tone="purple">{modeLabel(r.mode)}</Badge>
                    </td>
                  );
                }
                const isShared = shared(r.eventKey, c.eventKey);
                const busy = toggling === `${r.eventKey}|${c.eventKey}` || toggling === `${c.eventKey}|${r.eventKey}`;
                return (
                  <td key={c.eventKey} className="text-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(r.eventKey, c.eventKey)}
                      title={isShared
                        ? `Attendees of ${c.name || c.eventKey} can see attendees of ${r.name || r.eventKey}. Click to unshare.`
                        : `Share attendees of ${r.name || r.eventKey} with attendees of ${c.name || c.eventKey}.`}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttfc-purple disabled:opacity-50"
                    >
                      {isShared ? <Badge tone="good">Shared</Badge> : <Badge tone="neutral">—</Badge>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
