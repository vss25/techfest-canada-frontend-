import { useState } from "react";
import { ListChecks, Lock, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import {
  Badge, Banner, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, Input, LoadingState, PageHeader, Select,
  Switch, Tabs, Textarea,
} from "../ui";
import { fillWording } from "./mouShared";

/* =========================================================
   Admin › Sales › MOU catalogue (Nov 23 2026)
   The general items MOUs are built from, on two sides: what TTFC offers (LinkedIn, Instagram and
   newsletter shoutouts, free and discounted passes, logo, speaking…) and what partners deliver
   (shoutouts, newsletter features, sharing a code, a ticket sales target…). Each has its default
   wording with placeholders, the details an MOU asks for and default values. Only the super admin
   changes it; everyone else sees it read only. A retired item leaves new MOUs; old ones keep it.
   API: /api/console/mou-items (backend routes/mous.js).
========================================================= */

const BLANK = (side) => ({ side, name: "", category: "other", fields: ["qty", "schedule"], wording: "", qty: "", value: "", code: "", active: true });
const SAMPLE = { partner: "Acme Tech Network", event: "Vancouver Briefing 2027" };

function Editor({ item, cat, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...item, qty: item.qty ?? "" });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canEdit = cat.canEdit;
  const isNew = !item.id;
  const sample = fillWording(form.wording || (form.side === "ttfc" ? `TTFC will provide ${form.name || "this"}{when}.` : `{partner} will provide ${form.name || "this"}{when}.`),
    { ...SAMPLE, qty: form.qty === "" ? 2 : form.qty, value: form.value || "Connect Pass", code: form.code || "ACME15",
      schedule: { mode: "dates", dates: ["2027-01-15"] } });

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, qty: form.qty === "" ? null : Number(form.qty) };
      const r = isNew ? await adminFetch("/console/mou-items", { method: "POST", body }) : await adminFetch(`/console/mou-items/${item.id}`, { method: "PATCH", body });
      toast.success(isNew ? "Added" : "Saved");
      onSaved(r.item);
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  return (
    <Drawer open onClose={onClose} title={isNew ? "New item" : item.name}
      description={form.side === "ttfc" ? "Something TTFC offers partners." : "Something partners deliver to TTFC."}
      footer={canEdit && <div className="flex w-full items-center justify-between gap-2">
        {!isNew ? <Button variant="dangerOutline" icon={Trash2} onClick={() => setConfirm(true)}>Delete</Button> : <span />}
        <div className="flex gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>{isNew ? "Add" : "Save"}</Button></div>
      </div>}>
      <div className="flex flex-col gap-4">
        <Field label="Name" required>{(id) => <Input id={id} value={form.name} disabled={!canEdit} onChange={(e) => set("name", e.target.value)} placeholder="LinkedIn shoutout" />}</Field>
        <Field label="Category">{(id) => (
          <Select id={id} value={form.category} disabled={!canEdit} onChange={(e) => set("category", e.target.value)}>
            {cat.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
        )}</Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ttfc-text">What an MOU asks for</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {cat.fields.map((f) => (
              <label key={f.key} className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[#E3E0EE] px-3 py-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[#D6308C]" checked={form.fields.includes(f.key)} disabled={!canEdit}
                  onChange={(e) => set("fields", e.target.checked ? [...form.fields, f.key] : form.fields.filter((x) => x !== f.key))} />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {form.fields.includes("qty") && <Field label="Default how many">{(id) => <Input id={id} inputMode="numeric" value={form.qty} disabled={!canEdit} onChange={(e) => set("qty", e.target.value.replace(/[^\d]/g, ""))} />}</Field>}
          {form.fields.includes("value") && <Field label="Default detail">{(id) => <Input id={id} value={form.value} disabled={!canEdit} onChange={(e) => set("value", e.target.value)} />}</Field>}
          {form.fields.includes("code") && <Field label="Default code">{(id) => <Input id={id} value={form.code} disabled={!canEdit} onChange={(e) => set("code", e.target.value.toUpperCase())} />}</Field>}
        </div>
        <Field label="Wording" hint="How it reads on the MOU. Each MOU can change it for its own partner.">{(id) => <Textarea id={id} rows={3} value={form.wording} disabled={!canEdit} onChange={(e) => set("wording", e.target.value)} />}</Field>
        {canEdit && (
          <div className="flex flex-wrap gap-1.5">
            {cat.placeholders.map((p) => (
              <button key={p.key} type="button" title={p.label} onClick={() => set("wording", `${form.wording}${p.key}`)}
                className="rounded-full border border-[#E3E0EE] bg-white px-2.5 py-1 text-xs font-semibold text-ttfc-text hover:border-[#D6308C]">{p.key}</button>
            ))}
          </div>
        )}
        <div className="rounded-lg border-l-4 border-[#D6308C] bg-[#FBFAFE] px-3 py-2 text-sm">
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ttfc-muted">Example</p>{sample}
        </div>
        <Switch checked={form.active} disabled={!canEdit} onChange={(v) => set("active", v)} label="Available for new MOUs"
          description="Switch off to retire it. MOUs that already have it keep it." />
      </div>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete this item?" body="Only an item that's on no MOU can be deleted. Otherwise retire it." confirmLabel="Delete"
        onConfirm={async () => {
          try { await adminFetch(`/console/mou-items/${item.id}`, { method: "DELETE" }); toast.success("Deleted"); onSaved(null); }
          catch (err) { toast.error(err); }
        }} />
    </Drawer>
  );
}

export default function MouCatalogue() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi("/console/mou-items");
  const [side, setSide] = useState("ttfc");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const items = data.items.filter((i) => i.side === side);
  const groups = data.categories.map((c) => ({ ...c, items: items.filter((i) => i.category === c.key) })).filter((g) => g.items.length);
  const starter = async () => {
    setAdding(true);
    try { const r = await adminFetch("/console/mou-items/starter", { method: "POST" }); toast.success(`${r.added} items added`); reload(); }
    catch (err) { toast.error(err); } finally { setAdding(false); }
  };

  return (
    <div>
      <PageHeader title="MOU catalogue" description="The general items MOUs are built from. Each MOU ticks the ones it needs and sets how many, when, codes and wording for that partner."
        actions={data.canEdit && <Button variant="primary" icon={Plus} onClick={() => setEditing(BLANK(side))}>New item</Button>} />
      {!data.canEdit && <Banner tone="info" icon={Lock} className="mb-4" title="Read only">Only the super admin changes the MOU catalogue. You can use every item on an MOU.</Banner>}
      <Tabs value={side} onChange={setSide} tabs={data.sides.map((s) => ({ key: s.key, label: s.label, count: data.items.filter((i) => i.side === s.key).length }))} />
      {!data.items.length ? (
        <EmptyState icon={ListChecks} title="The catalogue is empty"
          body={data.canEdit ? `Start with the ${data.starterCount} usual items (LinkedIn, Instagram and newsletter shoutouts, free and discounted passes, a ticket sales target…), then change them as you like.` : "Ask the super admin to add the items."}
          action={data.canEdit && <Button variant="primary" icon={Sparkles} loading={adding} onClick={starter}>Add the usual items</Button>} />
      ) : !items.length ? (
        <EmptyState icon={ListChecks} title="Nothing on this side yet" action={data.canEdit && <Button icon={Plus} onClick={() => setEditing(BLANK(side))}>New item</Button>} />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ttfc-muted">{g.label}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {g.items.map((it) => (
                  <button key={it.id} type="button" onClick={() => setEditing(it)}
                    className="flex items-start justify-between gap-3 rounded-xl border border-[#E3E0EE] bg-white p-3 text-left hover:border-[#D6308C]">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 font-semibold text-ttfc-text">{it.name}{!it.active && <Badge tone="warn">Retired</Badge>}</span>
                      <span className="mt-1 block text-xs text-ttfc-muted">{fillWording(it.wording, { partner: "the partner", event: "the event", qty: it.qty ?? 1, value: it.value, code: it.code, schedule: {} })}</span>
                    </span>
                    <Pencil className="mt-1 h-4 w-4 shrink-0 text-ttfc-dim" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <Editor item={editing} cat={data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}
