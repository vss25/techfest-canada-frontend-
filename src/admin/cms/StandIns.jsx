import { useMemo } from "react";
import { Card, Field, Input, Select, Textarea } from "../ui";
import { useApi } from "../hooks";
import { STAND_IN_DEFAULT_FROM, STAND_IN_MAX, standInLabel, standInWords } from "../../lib/standIns";

/* =========================================================
   Event page › "While speakers and partners are being confirmed"
   (Nov 22 2026, the owner). Until this event has its own speakers
   (or partners), its page shows another event's: which event,
   which people / logos (none picked = featured first), and the
   heading and note above them. Saved with the event page, so it
   goes save → staging → live like everything else.
========================================================= */

const refOf = (r) => (typeof r === "string" ? r : r?._ref || "");
/** On that event: no events listed = every event (the website's rule). */
const onEvent = (doc, id) => !doc.events?.length || doc.events.some((r) => refOf(r) === id);

function Picker({ kind, items, picked, onChange, disabled }) {
  const toggle = (id) => onChange(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < STAND_IN_MAX ? [...picked, id] : picked);
  if (!items) return <p className="text-sm text-ttfc-muted">Loading…</p>;
  if (!items.length) return <p className="text-sm text-ttfc-muted">That event has no {kind === "speakers" ? "speakers with a photo" : "partners with a logo"} yet.</p>;
  return (
    <div className="grid gap-2">
      <p className="text-xs text-ttfc-muted">
        {picked.length
          ? `${picked.length} picked, shown in the order you picked them (the event page shows the first 4). Untick to remove.`
          : `None picked: the page shows this event's featured ${kind} first, then the rest in their order. Pick up to ${STAND_IN_MAX} to choose them yourself.`}
      </p>
      <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const n = picked.indexOf(it._id);
          const on = n >= 0;
          return (
            <label key={it._id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-sm ${on ? "border-[#D6308C] bg-[#FDF2F8]" : "border-ttfc-line bg-white"} ${disabled ? "cursor-default opacity-60" : ""}`}>
              <input type="checkbox" className="sr-only" checked={on} disabled={disabled || (!on && picked.length >= STAND_IN_MAX)} onChange={() => toggle(it._id)} />
              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${on ? "border-[#D6308C] bg-[#D6308C] text-white" : "border-[#CFCBE0] text-transparent"}`} aria-hidden="true">{on ? n + 1 : "·"}</span>
              {kind === "speakers"
                ? <img src={`${it.imageUrl}?w=80&h=80&fit=crop`} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" />
                : <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-white"><img src={`${it.logoUrl}?h=60&fit=max`} alt="" className="max-h-8 max-w-full object-contain" loading="lazy" /></span>}
              <span className="min-w-0">
                <span className="block truncate font-medium text-ttfc-text">{it.name}</span>
                {kind === "speakers" && <span className="block truncate text-xs text-ttfc-muted">{[it.title, it.company].filter(Boolean).join(", ")}{it.featured ? " · Featured" : ""}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Section({ kind, form, setForm, events, current, docs, disabled }) {
  const cap = kind === "speakers" ? "Speakers" : "Partners";
  const key = (f) => `standIn${cap}${f}`;
  const fromId = form[key("From")] || STAND_IN_DEFAULT_FROM;
  const from = events.find((e) => e._id === fromId);
  const words = standInWords(kind, standInLabel(from));
  const items = useMemo(() => {
    if (!docs) return null;
    const list = docs.filter((d) => d && d.name && !d.unpublished && onEvent(d, fromId) && (kind === "speakers" ? d.imageUrl : d.logoUrl && d.active !== false && d.showOnWebsite !== false));
    return kind === "speakers"
      ? list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (Number(a.order) || 999) - (Number(b.order) || 999))
      : list.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  }, [docs, fromId, kind]);
  const set = (f) => (e) => setForm((x) => ({ ...x, [key(f)]: e?.target ? e.target.value : e }));
  return (
    <section className="grid gap-4 border-t border-ttfc-line pt-4 first:border-0 first:pt-0">
      <h4 className="text-sm font-semibold text-ttfc-text">{cap}</h4>
      <Field label={`Show ${kind} from`} hint={`Shown until ${current.name || "this event"} has ${kind} of its own. Each card says which event they're from.`}>
        {(id) => (
          <Select id={id} value={fromId} onChange={(e) => setForm((x) => ({ ...x, [key("From")]: e.target.value === STAND_IN_DEFAULT_FROM ? "" : e.target.value, [key("")]: [] }))} disabled={disabled}>
            {events.filter((e) => e._id !== current._id).map((e) => <option key={e._id} value={e._id}>{e.name}{e._id === STAND_IN_DEFAULT_FROM ? " (default)" : ""}</option>)}
          </Select>
        )}
      </Field>
      <Picker kind={kind} items={items} picked={form[key("")]} onChange={set("")} disabled={disabled} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Heading" hint="Leave empty for the default shown.">{(id) => <Input id={id} value={form[key("Heading")]} onChange={set("Heading")} placeholder={words.heading} disabled={disabled} />}</Field>
        <Field label="Note under the heading" hint="Leave empty for the default shown. {event} becomes the chosen event's name.">
          {(id) => <Textarea id={id} rows={2} value={form[key("Text")]} onChange={set("Text")} placeholder={words.text} disabled={disabled} />}
        </Field>
      </div>
    </section>
  );
}

export default function StandIns({ form, setForm, events, current, disabled }) {
  const speakers = useApi("/cms/speaker?drafts=1");
  const partners = useApi("/cms/partner?drafts=1");
  return (
    <Card className="grid gap-4">
      <div>
        <h3 className="font-semibold">While speakers and partners are being confirmed</h3>
        <p className="mt-0.5 text-sm text-ttfc-muted">Who this page shows until the event has its own. They disappear by themselves once this event's own speakers or partners are added.</p>
      </div>
      <Section kind="speakers" form={form} setForm={setForm} events={events} current={current} docs={speakers.data} disabled={disabled} />
      <Section kind="partners" form={form} setForm={setForm} events={events} current={current} docs={partners.data} disabled={disabled} />
    </Card>
  );
}
