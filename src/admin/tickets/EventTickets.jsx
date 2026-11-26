import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Info, Layers, Plus, Settings2, Ticket } from "lucide-react";
import { useApi } from "../hooks";
import { api } from "../api";
import { useToast } from "../toastContext";
import { useAdmin } from "../adminContext";
import { useAdminEvent } from "../eventContext";
import {
  Badge, Banner, Button, Card, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Switch,
  TableWrap, focusRing,
} from "../ui";
import BulletListEditor from "../BulletListEditor";
import { finishList } from "../bulletList";
import { ReadinessStrip } from "../cms/ReadinessCard";

/* =========================================================
   Website › Events › Tickets (Nov 17 2026): the chosen event's ticket types.
   "Tickets for each event should be the same by default unless we edit and change this.
   The exception to this is the Toronto Main Event."
   Nov 22 2026 (the owner): "every event should have a separate ticket counter and pricing"; own copy
   per event; a pass for a city + the Toronto Main Event, or several cities + Toronto.
   - Every event has its own tickets and prices. A new Briefing starts with a copy of the default
     Briefing tickets (edited under "Defaults for new Briefings").
   - Each ticket shows how many have sold (paid orders), 0 until a sale.
   - Multi-event passes covering this event are listed on their own, with their own sold count.
   Reading: any staff. Creating and editing: management (the server checks).
   Backend: /api/admin/ticket-types (for-event, passes, CRUD).
========================================================= */

const money = (cents) => (cents == null ? "—" : `$${(cents / 100).toLocaleString("en-CA", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`);
const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "");
const toInputDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

/* The approved design's three Briefing tickets, as a starting point for the defaults. */
const STARTER = [
  { name: "Buy-side delegate", description: "Asset owners and operators · Director level and above", priceCents: 14900, sortOrder: 1 },
  { name: "Enabler & capital delegate", description: "EPC, engineering, legal and investors · Partner / VP and above", priceCents: 39500, sortOrder: 2 },
  { name: "Technology delegate", description: "Application only · for technology firms not exhibiting", priceCents: 49500, sortOrder: 3 },
];

const PASS_KEY = "multi-event";
const keyOf = (e) => e?.eventKey?.current || e?.eventKey || "";
const yearOf = (k) => (String(k).match(/-(\d{4})-/) || [])[1] || "";
const isMain = (e) => e.type === "main-event" || /-main$/.test(e.eventKey);
/** The Main Event a pass for this event always includes: the same year's, else the newest. */
function mainFor(events, eventKey) {
  const mains = events.filter(isMain);
  return mains.find((e) => yearOf(e.eventKey) === yearOf(eventKey)) || [...mains].sort((a, b) => (b.year || 0) - (a.year || 0))[0] || null;
}
const eventName = (events, k) => events.find((e) => e.eventKey === k)?.name || k;

/** Which events a pass covers: the Main Event always (locked), and the cities ticked. */
function CoversPicker({ events, mainKey, value, onChange, disabled }) {
  const year = yearOf(mainKey);
  const cities = events.filter((e) => !isMain(e) && (!year || yearOf(e.eventKey) === year));
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  const n = value.filter((k) => k !== mainKey).length;
  return (
    <fieldset className="sm:col-span-2 grid gap-2">
      <legend className="mb-1 text-sm font-semibold text-[#151035]">Events it covers</legend>
      <p className="-mt-1 text-xs text-[#6B6688]">{n <= 1 ? "One city + Toronto: an all access pass for that city and the Main Event. Tick more cities for a multi-city pass." : `${n} cities + Toronto.`}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2.5 rounded-xl border border-[#D6308C] bg-[#FDF2F8] px-3 py-2 text-sm">
          <input type="checkbox" checked readOnly disabled className="h-4 w-4 accent-[#D6308C]" />
          <span><b className="text-[#151035]">{eventName(events, mainKey)}</b> <span className="text-xs text-[#6B6688]">· always included</span></span>
        </label>
        {cities.map((e) => {
          const on = value.includes(e.eventKey);
          return (
            <label key={e.eventKey} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm ${on ? "border-[#D6308C] bg-[#FDF2F8]" : "border-[#E4E1EE] bg-white"} ${disabled ? "cursor-default opacity-60" : ""}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(e.eventKey)} disabled={disabled} className={`h-4 w-4 accent-[#D6308C] ${focusRing}`} />
              <span className="text-[#151035]">{e.name || e.eventKey}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function TicketForm({ type, eventKey, canEdit, onClose, onSaved, pass = null }) {
  const toast = useToast();
  const creating = !type;
  const [f, setF] = useState(() => ({
    name: type?.name || "", description: type?.description || "",
    price: type?.priceCents != null ? String(type.priceCents / 100) : "",
    capacity: type?.capacity != null ? String(type.capacity) : "",
    inclusions: type?.inclusions?.length ? [...type.inclusions] : [""],
    exclusions: type?.exclusions?.length ? [...type.exclusions] : [""],
    salesStart: toInputDate(type?.salesStart), salesEnd: toInputDate(type?.salesEnd),
    active: type ? type.active !== false : true,
    covers: type?.covers || pass?.initial || [],
  }));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const update = (fn) => { setDirty(true); setF(fn); };
  const set = (k) => (e) => update((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  // Closing with Escape, the backdrop or Cancel never throws away typed details without asking.
  const close = () => {
    if (busy) return;
    if (dirty && canEdit && !window.confirm("Discard your changes to this ticket?")) return;
    onClose();
  };
  const save = async (e) => {
    e.preventDefault();
    const price = Number(f.price);
    if (!f.name.trim()) { toast.error("Give the ticket a name"); return; }
    if (!Number.isFinite(price) || price < 0) { toast.error("Enter a price"); return; }
    if (pass && f.covers.filter((k) => k !== pass.mainKey).length < 1) { toast.error("Tick at least one city"); return; }
    const body = {
      name: f.name.trim(), description: f.description.trim(), priceCents: Math.round(price * 100),
      capacity: f.capacity === "" ? null : Number(f.capacity),
      inclusions: finishList(f.inclusions), exclusions: finishList(f.exclusions),
      salesStart: f.salesStart || null, salesEnd: f.salesEnd || null, active: !!f.active,
      ...(pass ? { covers: [...new Set([...f.covers, pass.mainKey])] } : {}),
    };
    setBusy(true);
    try {
      if (creating) await api.post("/admin/ticket-types", { ...body, eventKey: pass ? PASS_KEY : eventKey });
      else await api.patch(`/admin/ticket-types/${type._id}`, body);
      toast.success(creating ? (pass ? "Pass added." : "Ticket added.") : "Saved.");
      onSaved();
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const off = !canEdit || busy;
  return (
    <Drawer open onClose={close} width="max-w-2xl"
      title={creating ? (pass ? "Add a multi-event pass" : "Add a ticket") : `Edit ${pass ? "pass" : "ticket"}: ${type.name}`}
      description={canEdit ? (pass ? "One price for several events. It shows on every event it covers, and buyers get a pass for each. Prices are before HST." : "Prices are before HST; Stripe adds HST at checkout.") : "Only management can change tickets."}
      footer={<>
        <span className="flex-1" />
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button variant="primary" type="submit" form="ticket-form" loading={busy} disabled={!canEdit}>{creating ? (pass ? "Add pass" : "Add ticket") : "Save changes"}</Button>
      </>}>
      <form id="ticket-form" onSubmit={save} className="grid gap-6" noValidate
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <FormSection title="The ticket">
          <Field label="Name" required>{(id) => <Input id={id} value={f.name} onChange={set("name")} disabled={off} placeholder={pass ? "e.g. Vancouver + Toronto all access" : "e.g. Buy-side delegate"} data-autofocus />}</Field>
          {pass && <CoversPicker events={pass.events} mainKey={pass.mainKey} value={f.covers} onChange={(v) => update((x) => ({ ...x, covers: v }))} disabled={off} />}
          <Field label="Who it's for">{(id) => <Input id={id} value={f.description} onChange={set("description")} disabled={off} placeholder="e.g. Asset owners and operators · Director level and above" />}</Field>
        </FormSection>
        <FormSection title="Price and availability">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (CAD, before HST)" required>{(id) => <Input id={id} type="number" inputMode="decimal" min="0" step="1" value={f.price} onChange={set("price")} disabled={off} />}</Field>
            <Field label="How many can be sold" hint="Empty: no limit.">{(id) => <Input id={id} type="number" inputMode="numeric" min="0" value={f.capacity} onChange={set("capacity")} disabled={off} />}</Field>
            <Field label="On sale from" hint="Empty: now.">{(id) => <Input id={id} type="date" value={f.salesStart} onChange={set("salesStart")} disabled={off} />}</Field>
            <Field label="On sale until" hint="Empty: until the event.">{(id) => <Input id={id} type="date" value={f.salesEnd} onChange={set("salesEnd")} disabled={off} />}</Field>
          </div>
          <Switch label="On sale" description="Off hides it from the website without deleting it." checked={!!f.active} onChange={(v) => update((x) => ({ ...x, active: v }))} disabled={off} />
        </FormSection>
        <FormSection title="What's included" hint="One point per line; each shows as a ✓ bullet on the website. Enter adds the next point, and pasting a list adds one point per line.">
          <BulletListEditor value={f.inclusions} onChange={(v) => update((x) => ({ ...x, inclusions: v }))} disabled={off}
            itemLabel="Included point" addLabel="Add a point" placeholder="e.g. Both conference days" />
        </FormSection>
        <FormSection title="Not included" hint="Optional. Shows dimmed with a ✕, so buyers know what to expect.">
          <BulletListEditor value={f.exclusions} onChange={(v) => update((x) => ({ ...x, exclusions: v }))} disabled={off}
            tone="exclude" itemLabel="Not included point" addLabel="Add a point" placeholder="e.g. Gala dinner" />
        </FormSection>
      </form>
    </Drawer>
  );
}

/** One block of the ticket form: a small heading, an optional line of help, then its fields. */
function FormSection({ title, hint, children }) {
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-[#6B6688]">{title}</h3>
        {hint && <p className="mt-1 text-xs leading-relaxed text-[#6B6688]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** The first few "What's included" points under a ticket's name in the table, as bullets. */
function Offer({ t }) {
  const inc = t.inclusions || [];
  const exc = t.exclusions || [];
  if (!inc.length && !exc.length) return null;
  const shown = inc.slice(0, 3);
  const more = inc.length - shown.length + exc.length;
  return (
    <ul className="mt-1.5 grid gap-0.5 text-xs text-[#4A4566]">
      {shown.map((x, i) => <li key={i} className="flex gap-1.5"><span aria-hidden="true" className="text-[#D6308C]">•</span>{x}</li>)}
      {more > 0 && <li className="pl-3 text-[#8A86A0]">+ {more} more</li>}
    </ul>
  );
}

/** Phones: the tickets as tappable cards (the table needs sideways scrolling there). */
function TicketCards({ items, onOpen, selected, meta }) {
  return (
    <ul className="grid gap-2 sm:hidden">
      {items.map((t) => (
        <li key={t._id}>
          <button type="button" onClick={() => onOpen(t)}
            className={`w-full rounded-xl border p-3.5 text-left transition ${selected === t._id ? "border-[#D6308C] bg-[#FBE9F3]" : "border-[#E3E0EE] bg-white active:bg-[#F6F5FA]"} ${focusRing}`}>
            <span className="flex items-start justify-between gap-2">
              <b className="text-[15px] text-[#151035]">{t.name}</b>
              {statusBadge(t)}
            </span>
            {t.description && <span className="mt-0.5 block text-xs text-[#6B6688]">{t.description}</span>}
            <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold tabular-nums text-[#4A4566]">{meta(t).filter(Boolean).map((m, i) => <span key={i}>{m}</span>)}</span>
            <Offer t={t} />
          </button>
        </li>
      ))}
    </ul>
  );
}

const soldLabel = (t) => (t.sold == null ? "—" : t.capacity != null ? `${t.sold} of ${t.capacity}` : `${t.sold} · no limit`);
const statusBadge = (t) => (t.active !== false ? <Badge tone="good">On sale</Badge> : <Badge>Hidden</Badge>);

export default function EventTickets() {
  const toast = useToast();
  const { isManagement } = useAdmin();
  const { current } = useAdminEvent();
  const eventKey = keyOf(current);
  const [defaults, setDefaults] = useState(false);   // editing the defaults for new Briefings
  const own = useApi(eventKey ? `/admin/ticket-types/for-event?eventKey=${encodeURIComponent(eventKey)}` : null);
  const tmpl = useApi(defaults ? "/admin/ticket-types?eventKey=default-briefing" : null);
  const configs = useApi("/admin/events");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, error, loading } = defaults ? tmpl : own;
  const reload = () => { own.reload(); if (defaults) tmpl.reload(); };
  const listKey = defaults ? "default-briefing" : eventKey;   // where new tickets go
  const types = (defaults ? tmpl.data?.ticketTypes : own.data?.ticketTypes) || [];
  // Passes need the backend from Nov 22 2026 (it answers `passes`); until then the button stays hidden.
  const passes = own.data?.passes || [];
  const totals = own.data?.soldTotals;
  const events = (configs.data?.events || []).map((e) => ({ ...e, eventKey: keyOf(e) }));
  const config = events.find((e) => e.eventKey === eventKey);
  const announced = config?.settings?.pricingAnnounced === true;
  const main = mainFor(events, eventKey);
  const isBriefing = own.data?.usesDefaults;

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) toast.success(ok); setEditing(null); reload(); } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const addStarter = () => run(async () => {
    for (const t of STARTER) await api.post("/admin/ticket-types", { ...t, eventKey: listKey, currency: "CAD", active: true });
  }, "The approved design's three tickets are added. Check the prices.");
  const passProps = main ? { events, mainKey: main.eventKey, initial: [...new Set([eventKey, main.eventKey])] } : null;

  if (!current) return <EmptyState icon={Ticket} title="Choose an event" body="Pick the event in the top bar." />;

  return (
    <>
      <PageHeader
        title={defaults ? "Default tickets for new Briefings" : "Tickets & prices"}
        description={defaults
          ? "A new Briefing starts with a copy of these. Changing them doesn't change any existing event."
          : `What ${current.name} sells on the website: each ticket, its price, how many have sold and when it's on sale.`}
        actions={<div className="flex flex-wrap gap-2">
          {defaults
            ? <Button icon={ArrowLeft} onClick={() => { setDefaults(false); setEditing(null); }}>Back to {current.name}</Button>
            : isBriefing && <Button icon={Settings2} onClick={() => { setDefaults(true); setEditing(null); }}>Defaults for new Briefings</Button>}
          {isManagement && <Button variant="primary" icon={Plus} onClick={() => setEditing({ creating: true })} disabled={!data || busy}>Add ticket</Button>}
        </div>}
      />
      {!defaults && <ReadinessStrip />}
      {loading && !data ? <LoadingState /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid min-w-0 grid-cols-1 gap-3.5 [&>*]:min-w-0">
          {!defaults && !announced && (
            <Banner tone="warn" icon={Info} title="Prices aren't shown on the website yet">
              {current.name}'s pricing isn't announced, so the website shows "Pricing announced soon" and nothing can be bought. Turn on <b>Pricing announced</b> in <Link className={`font-semibold underline ${focusRing}`} to="/admin/events">Website › Events › Settings</Link> when it's time to sell.
            </Banner>
          )}
          {!defaults && totals && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Card className="px-3 py-2.5 sm:px-4 sm:py-3"><div className="text-[11px] leading-tight text-[#6B6688] sm:text-xs">Tickets sold</div><div className="text-xl font-bold tabular-nums text-[#151035] sm:text-2xl">{totals.own}</div></Card>
              <Card className="px-3 py-2.5 sm:px-4 sm:py-3"><div className="text-[11px] leading-tight text-[#6B6688] sm:text-xs">Multi-event passes</div><div className="text-xl font-bold tabular-nums text-[#151035] sm:text-2xl">{totals.passes}</div></Card>
              <Card className="px-3 py-2.5 sm:px-4 sm:py-3"><div className="text-[11px] leading-tight text-[#6B6688] sm:text-xs">Delegates in all</div><div className="text-xl font-bold tabular-nums text-[#151035] sm:text-2xl">{totals.own + totals.passes}</div><div className="hidden text-xs text-[#8A86A0] sm:block">paid orders only</div></Card>
            </div>
          )}
          <Card className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="text-base font-bold text-[#151035]">{defaults ? "Default Briefing tickets" : `Tickets · ${current.name}`}</h2>
              <span className="text-xs text-[#6B6688]">{isManagement ? "Choose a ticket to edit it" : "Only management can change tickets"}</span>
            </div>
            {types.length ? (<>
              <TicketCards items={types} onOpen={(t) => setEditing({ type: t })} selected={editing?.type?._id}
                meta={(t) => [`${money(t.priceCents)} + HST`, defaults ? (t.capacity ?? "No limit") + (t.capacity != null ? " max" : "") : `Sold ${soldLabel(t)}`]} />
              <TableWrap className="hidden sm:block">
                <thead><tr><th>Ticket</th><th>Price</th>{!defaults && <th>Sold</th>}{defaults && <th>How many</th>}<th>On sale</th><th>Status</th></tr></thead>
                <tbody>
                  {types.map((t) => {
                    const open = () => setEditing({ type: t });
                    return (
                      <tr key={t._id} className="is-clickable" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}
                        style={editing?.type?._id === t._id ? { background: "#FBE9F3", boxShadow: "inset 3px 0 0 #D6308C" } : undefined}>
                        <td><b className="text-[#151035]">{t.name}</b>{t.description && <div className="text-xs text-[#6B6688]">{t.description}</div>}<Offer t={t} /></td>
                        <td className="tabular-nums">{money(t.priceCents)} <span className="text-xs text-[#8A86A0]">+ HST</span></td>
                        {!defaults && <td className="tabular-nums">{soldLabel(t)}</td>}
                        {defaults && <td className="tabular-nums">{t.capacity ?? "No limit"}</td>}
                        <td className="text-[#4A4566]">{t.salesStart || t.salesEnd ? `${day(t.salesStart) || "Now"} – ${day(t.salesEnd) || "the event"}` : "Now until the event"}</td>
                        <td>{statusBadge(t)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            </>) : (
              <EmptyState icon={Ticket} title={defaults ? "No default Briefing tickets yet" : "No tickets yet"}
                body={defaults ? "Add the tickets a new Briefing starts with. You can start from the approved design's three and change the prices." : "Add the tickets this event sells."}
                action={isManagement && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {(defaults || isBriefing) && <Button variant="primary" onClick={addStarter} loading={busy}>Add the approved design's three tickets</Button>}
                    <Button icon={Plus} onClick={() => setEditing({ creating: true })} disabled={busy}>Add a ticket</Button>
                  </div>
                )} />
            )}
          </Card>
          {!defaults && (
            <Card className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-[#151035]">Multi-event passes</h2>
                <span className="text-xs text-[#6B6688]">One price for this event and others, always including {main?.name || "the Main Event"}. Counted on their own line.</span>
                {isManagement && passProps && Array.isArray(own.data?.passes) && <Button className="ml-auto" icon={Plus} onClick={() => setEditing({ creating: true, pass: true })} disabled={busy}>Add pass</Button>}
              </div>
              {passes.length ? (<>
                <TicketCards items={passes} onOpen={(t) => setEditing({ type: t, pass: true })} selected={editing?.type?._id}
                  meta={(t) => [(t.covers || []).map((k) => eventName(events, k)).join(" + "), `${money(t.priceCents)} + HST`, `Sold ${soldLabel(t)}`]} />
                <TableWrap className="hidden sm:block">
                  <thead><tr><th>Pass</th><th>Covers</th><th>Price</th><th>Sold</th><th>Status</th></tr></thead>
                  <tbody>
                    {passes.map((t) => {
                      const open = () => setEditing({ type: t, pass: true });
                      return (
                        <tr key={t._id} className="is-clickable" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}
                          style={editing?.type?._id === t._id ? { background: "#FBE9F3", boxShadow: "inset 3px 0 0 #D6308C" } : undefined}>
                          <td><b className="text-[#151035]">{t.name}</b>{t.description && <div className="text-xs text-[#6B6688]">{t.description}</div>}<Offer t={t} /></td>
                          <td className="text-[#4A4566]">{(t.covers || []).map((k) => eventName(events, k)).join(" + ")}</td>
                          <td className="tabular-nums">{money(t.priceCents)} <span className="text-xs text-[#8A86A0]">+ HST</span></td>
                          <td className="tabular-nums">{soldLabel(t)}</td>
                          <td>{statusBadge(t)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableWrap>
              </>) : (
                <EmptyState icon={Layers} title="No passes cover this event"
                  body={main ? `A pass for ${current.name} + ${main.name}, or several cities + ${main.name}. It shows on every event it covers.` : "Add the Main Event in Website › Events › Settings first."} />
              )}
            </Card>
          )}
          {editing && (
            <TicketForm key={editing.type?._id || (editing.pass ? "new-pass" : "new")} type={editing.type} eventKey={listKey} canEdit={isManagement}
              pass={editing.pass ? (passProps || { events, mainKey: editing.type?.covers?.find((k) => /-main$/.test(k)) || "", initial: [] }) : null}
              onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
          )}
        </div>
      )}
    </>
  );
}
