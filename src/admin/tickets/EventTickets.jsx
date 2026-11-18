import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Info, Plus, RotateCcw, Ticket } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdmin } from "../adminContext";
import { useAdminEvent } from "../eventContext";
import {
  Badge, Banner, Button, Card, ConfirmDialog, EditPanel, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Switch,
  TableWrap, Textarea, focusRing,
} from "../ui";
import { ReadinessStrip } from "../cms/ReadinessCard";

/* =========================================================
   Content › Tickets & prices (Nov 17 2026): the chosen event's ticket types.
   "Tickets for each event should be the same by default unless we edit and change this.
   The exception to this is the Toronto Main Event."
   - A Briefing sells the default Briefing tickets until it's customised (then it has its own).
   - The Toronto Main Event has only its own.
   Reading: any staff. Creating, editing, customising: management (the server checks).
   Backend: /api/admin/ticket-types (for-event, customise, use-defaults, CRUD).
========================================================= */

const money = (cents) => (cents == null ? "—" : `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`);
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "");
const toInputDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const lines = (v) => String(v || "").split("\n").map((s) => s.trim()).filter(Boolean);

/* The approved design's three Briefing tickets, as a starting point for the defaults. */
const STARTER = [
  { name: "Buy-side delegate", description: "Asset owners and operators · Director level and above", priceCents: 14900, sortOrder: 1 },
  { name: "Enabler & capital delegate", description: "EPC, engineering, legal and investors · Partner / VP and above", priceCents: 39500, sortOrder: 2 },
  { name: "Technology delegate", description: "Application only · for technology firms not exhibiting", priceCents: 49500, sortOrder: 3 },
];

function TicketForm({ type, eventKey, canEdit, onClose, onSaved }) {
  const toast = useToast();
  const creating = !type;
  const [f, setF] = useState(() => ({
    name: type?.name || "", description: type?.description || "",
    price: type?.priceCents != null ? String(type.priceCents / 100) : "",
    capacity: type?.capacity != null ? String(type.capacity) : "",
    inclusions: (type?.inclusions || []).join("\n"),
    salesStart: toInputDate(type?.salesStart), salesEnd: toInputDate(type?.salesEnd),
    active: type ? type.active !== false : true,
  }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const save = async (e) => {
    e.preventDefault();
    const price = Number(f.price);
    if (!f.name.trim()) { toast.error("Give the ticket a name"); return; }
    if (!Number.isFinite(price) || price < 0) { toast.error("Enter a price"); return; }
    const body = {
      name: f.name.trim(), description: f.description.trim(), priceCents: Math.round(price * 100),
      capacity: f.capacity === "" ? null : Number(f.capacity), inclusions: lines(f.inclusions),
      salesStart: f.salesStart || null, salesEnd: f.salesEnd || null, active: !!f.active,
    };
    setBusy(true);
    try {
      if (creating) await api.post("/admin/ticket-types", { ...body, eventKey });
      else await api.patch(`/admin/ticket-types/${type._id}`, body);
      toast.success(creating ? "Ticket added." : "Saved.");
      onSaved();
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const off = !canEdit || busy;
  return (
    <EditPanel open onClose={onClose} title={creating ? "Add a ticket" : `Edit ticket: ${type.name}`}
      description={canEdit ? "Prices are before HST; Stripe adds HST at checkout." : "Only management can change tickets."}
      footer={<>
        <span className="flex-1" />
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" type="submit" form="ticket-form" loading={busy} disabled={!canEdit}>{creating ? "Add ticket" : "Save changes"}</Button>
      </>}>
      <form id="ticket-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Name" required className="sm:col-span-2">{(id) => <Input id={id} value={f.name} onChange={set("name")} disabled={off} placeholder="e.g. Buy-side delegate" />}</Field>
        <Field label="Who it's for" className="sm:col-span-2">{(id) => <Input id={id} value={f.description} onChange={set("description")} disabled={off} placeholder="e.g. Asset owners and operators · Director level and above" />}</Field>
        <Field label="Price (CAD, before HST)" required>{(id) => <Input id={id} type="number" min="0" step="1" value={f.price} onChange={set("price")} disabled={off} />}</Field>
        <Field label="How many can be sold" hint="Leave empty for no limit.">{(id) => <Input id={id} type="number" min="0" value={f.capacity} onChange={set("capacity")} disabled={off} />}</Field>
        <Field label="On sale from" hint="Empty: on sale now.">{(id) => <Input id={id} type="date" value={f.salesStart} onChange={set("salesStart")} disabled={off} />}</Field>
        <Field label="On sale until" hint="Empty: until the event.">{(id) => <Input id={id} type="date" value={f.salesEnd} onChange={set("salesEnd")} disabled={off} />}</Field>
        <Field label="What's included" hint="One per line." className="sm:col-span-2">{(id) => <Textarea id={id} rows={4} value={f.inclusions} onChange={set("inclusions")} disabled={off} />}</Field>
        <div className="sm:col-span-2"><Switch label="On sale" description="Off hides it from the website without deleting it." checked={!!f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} disabled={off} /></div>
      </form>
    </EditPanel>
  );
}

export default function EventTickets() {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const { current } = useAdminEvent();
  const eventKey = current?.eventKey?.current || current?.eventKey || "";
  const { data, error, loading, reload } = useApi(eventKey ? `/admin/ticket-types/for-event?eventKey=${encodeURIComponent(eventKey)}` : null);
  const configs = useApi("/admin/events");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const isDefault = data?.source === "default";
  const listKey = isDefault ? data?.defaultKey : eventKey;   // where new tickets go
  const types = data?.ticketTypes || [];
  const config = (configs.data?.events || []).find((e) => e.eventKey === eventKey);
  const announced = config?.settings?.pricingAnnounced === true;

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); setEditing(null); reload(); } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const customise = () => setConfirm({
    title: `Give ${current?.name} its own tickets?`,
    body: "The default Briefing tickets are copied onto this event. From then on, changes here only affect this event, and changes to the defaults no longer reach it.",
    label: "Customise for this event", tone: "primary",
    go: () => run(() => api.post("/admin/ticket-types/customise", { eventKey }), "This event now has its own tickets."),
  });
  const useDefaults = () => setConfirm({
    title: `Go back to the default tickets for ${current?.name}?`,
    body: "This event's own tickets are removed and it sells the default Briefing tickets again. Not possible once someone has ordered its own tickets.",
    label: "Use the default tickets", tone: "danger",
    go: () => run(() => api.post("/admin/ticket-types/use-defaults", { eventKey }), "Back to the default tickets."),
  });
  const addStarter = () => run(async () => {
    for (const t of STARTER) await api.post("/admin/ticket-types", { ...t, eventKey: listKey, currency: "CAD", active: true });
  }, "The approved design's three tickets are added. Check the prices.");

  if (!current) return <EmptyState icon={Ticket} title="Choose an event" body="Pick the event in the top bar." />;

  return (
    <>
      <PageHeader
        title="Tickets & prices"
        description={`What ${current.name} sells on the website: each ticket, its price, how many and when it's on sale.`}
        actions={isManagement && <Button variant="primary" icon={Plus} onClick={() => setEditing({ creating: true })} disabled={!data || busy}>Add ticket</Button>}
      />
      <ReadinessStrip />
      {loading && !data ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid gap-3.5">
          {data.usesDefaults && (
            isDefault ? (
              <Banner tone="info" icon={Info} title="Uses the default Briefing tickets"
                action={isManagement && <Button variant="secondary" icon={Copy} onClick={customise} disabled={busy}>Customise for this event</Button>}>
                Every Briefing sells these until it's customised. Changing them here changes them for every Briefing still on the defaults. The Toronto Main Event has its own.
              </Banner>
            ) : (
              <Banner tone="info" icon={Info} title={`${current.name} has its own tickets`}
                action={isManagement && <Button variant="secondary" icon={RotateCcw} onClick={useDefaults} disabled={busy}>Use the default tickets</Button>}>
                Changes here only affect this event. The default Briefing tickets are used by the other Briefings.
              </Banner>
            )
          )}
          {!announced && (
            <Banner tone="warn" icon={Info} title="Prices aren't shown on the website yet">
              {current.name}'s pricing isn't announced, so the website shows "Pricing announced soon" and nothing can be bought. Turn on <b>Pricing announced</b> in <Link className={`font-semibold underline ${focusRing}`} to="/admin/events">Operations › Event settings</Link> when it's time to sell.
            </Banner>
          )}
          <Card className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-base font-bold text-[#151035]">{isDefault ? "Default Briefing tickets" : `Tickets · ${current.name}`}</h2>
              <span className="text-xs text-[#6B6688]">{isManagement ? "Click a row to edit it" : "Only management can change tickets"}</span>
            </div>
            {types.length ? (
              <TableWrap>
                <thead><tr><th>Ticket</th><th>Price</th><th>How many</th><th>On sale</th><th>Status</th></tr></thead>
                <tbody>
                  {types.map((t) => {
                    const open = () => setEditing({ type: t });
                    return (
                      <tr key={t._id} className="is-clickable" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}
                        style={editing?.type?._id === t._id ? { background: "#FBE9F3", boxShadow: "inset 3px 0 0 #D6308C" } : undefined}>
                        <td><b className="text-[#151035]">{t.name}</b>{t.description && <div className="text-xs text-[#6B6688]">{t.description}</div>}</td>
                        <td className="tabular-nums">{money(t.priceCents)} <span className="text-xs text-[#8A86A0]">+ HST</span></td>
                        <td className="tabular-nums">{t.capacity ?? "No limit"}</td>
                        <td className="text-[#4A4566]">{t.salesStart || t.salesEnd ? `${day(t.salesStart) || "Now"} – ${day(t.salesEnd) || "the event"}` : "Now until the event"}</td>
                        <td>{t.active !== false ? <Badge tone="good">On sale</Badge> : <Badge>Hidden</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            ) : (
              <EmptyState icon={Ticket} title={isDefault ? "No default Briefing tickets yet" : "No tickets yet"}
                body={isDefault ? "Add the tickets every Briefing sells. You can start from the approved design's three and change the prices." : "Add the tickets this event sells."}
                action={isManagement && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {isDefault && <Button variant="primary" onClick={addStarter} loading={busy}>Add the approved design's three tickets</Button>}
                    <Button icon={Plus} onClick={() => setEditing({ creating: true })} disabled={busy}>Add a ticket</Button>
                  </div>
                )} />
            )}
          </Card>
          {editing && (
            <TicketForm key={editing.type?._id || "new"} type={editing.type} eventKey={listKey} canEdit={isManagement}
              onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
          )}
        </div>
      )}
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title} body={confirm?.body}
        confirmLabel={confirm?.label} tone={confirm?.tone} onConfirm={async () => { await confirm.go(); setConfirm(null); }} />
    </>
  );
}
