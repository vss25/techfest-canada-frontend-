import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "../ui";
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

/* Nov 26 2026 (step 3 of the admin redesign): this was every speaker or partner of the chosen event as a grid of
   tick boxes, about 250 on one page. Now: the ones picked, in order, and a search box to add more. */
function Thumb({ kind, it }) {
  return kind === "speakers"
    ? <img src={`${it.imageUrl}?w=80&h=80&fit=crop`} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" />
    : <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-white"><img src={`${it.logoUrl}?h=60&fit=max`} alt="" className="max-h-8 max-w-full object-contain" loading="lazy" /></span>;
}
const subOf = (kind, it) => (kind === "speakers" ? `${[it.title, it.company].filter(Boolean).join(", ")}${it.featured ? " · Featured" : ""}` : "");

function Picker({ kind, items, picked, onChange, disabled }) {
  const [q, setQ] = useState("");
  if (!items) return <p className="text-sm text-ttfc-muted">Loading…</p>;
  if (!items.length) return <p className="text-sm text-ttfc-muted">That event has no {kind === "speakers" ? "speakers with a photo" : "partners with a logo"} yet.</p>;
  const one = kind === "speakers" ? "speaker" : "partner";
  const full = picked.length >= STAND_IN_MAX;
  const add = (id) => { if (!full && !picked.includes(id)) onChange([...picked, id]); setQ(""); };
  const move = (i, by) => { const j = i + by; if (j < 0 || j >= picked.length) return; const list = picked.slice(); [list[i], list[j]] = [list[j], list[i]]; onChange(list); };
  const needle = q.trim().toLowerCase();
  const found = needle.length >= 2 ? items.filter((it) => !picked.includes(it._id) && `${it.name} ${it.title || ""} ${it.company || ""}`.toLowerCase().includes(needle)).slice(0, 12) : [];
  return (
    <div className="grid gap-3">
      <p className="text-xs text-ttfc-muted">
        {picked.length
          ? `${picked.length} picked, shown in this order (the event page shows the first 4).`
          : `None picked: the page shows this event's featured ${kind} first, then the rest in their order. Pick up to ${STAND_IN_MAX} to choose them yourself.`}
      </p>
      {picked.length > 0 && (
        <ol className="divide-y divide-ttfc-line rounded-xl border border-ttfc-line">
          {picked.map((id, i) => {
            const it = items.find((x) => x._id === id);
            const name = it ? it.name : `A ${one} no longer on that event`;
            return (
              <li key={id} className="flex items-center gap-2.5 px-3 py-2">
                <span className="w-5 text-center text-xs font-semibold text-ttfc-muted">{i + 1}</span>
                {it ? <Thumb kind={kind} it={it} /> : <span className="h-9 w-9 shrink-0 rounded-full bg-ttfc-ink/40" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ttfc-text">{name}</span>
                  {it && subOf(kind, it) && <span className="block truncate text-xs text-ttfc-muted">{subOf(kind, it)}</span>}
                </span>
                <Button size="sm" variant="ghost" icon={ArrowUp} disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${name} up`} />
                <Button size="sm" variant="ghost" icon={ArrowDown} disabled={disabled || i === picked.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${name} down`} />
                <Button size="sm" variant="ghost" icon={X} disabled={disabled} onClick={() => onChange(picked.filter((x) => x !== id))} aria-label={`Remove ${name}`} />
              </li>
            );
          })}
        </ol>
      )}
      <Field label={`Add a ${one}`} hint={full ? `That's the most you can pick (${STAND_IN_MAX}). Remove one to add another.` : `Type a name to search the ${items.length} on that event.`}>
        {(id) => <Input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === "speakers" ? "Search by name or organisation" : "Search by name"} disabled={disabled || full} />}
      </Field>
      {needle.length >= 2 && (
        <ul className="max-h-64 divide-y divide-ttfc-line overflow-y-auto rounded-xl border border-ttfc-line">
          {found.map((it) => (
            <li key={it._id}>
              <button type="button" disabled={disabled || full} onClick={() => add(it._id)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-ttfc-contrast/5 disabled:cursor-not-allowed disabled:opacity-50">
                <Thumb kind={kind} it={it} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ttfc-text">{it.name}</span>
                  {subOf(kind, it) && <span className="block truncate text-xs text-ttfc-muted">{subOf(kind, it)}</span>}
                </span>
              </button>
            </li>
          ))}
          {!found.length && <li className="px-3 py-2 text-sm text-ttfc-muted">No {one} on that event matches “{q.trim()}”.</li>}
        </ul>
      )}
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
