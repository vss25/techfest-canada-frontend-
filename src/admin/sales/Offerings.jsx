import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Boxes, Lock, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import {
  Badge, Banner, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, IconButton, Input, LoadingState,
  PageHeader, Select, Switch, TableWrap, Tabs, Textarea,
} from "../ui";
import { dollars, eventKeyOf, money } from "./contractsShared";

/* =========================================================
   Admin › Sales › Offerings (Nov 18 2026)
   The catalogue contracts are built from: offerings (a booth, a pass, a LinkedIn post, a spotlight…)
   and packages (several offerings at one price). Only the super admin adds, edits, retires or
   deletes them, and sets the contract settings (discount limit, tax, payment terms, terms);
   everyone else sees the catalogue read only. A retired item leaves new contracts; contracts that
   have it keep it exactly as sold. API: /api/console/offerings (routes/contracts.js).
========================================================= */

const BLANK = { kind: "offering", name: "", category: "booth", description: "", price: "", unit: "each", taxable: true,
                track: "once", limit: "", eventKeys: [], active: true, items: [] };

function EventPicker({ value, onChange, disabled }) {
  const { events } = useAdminEvent();
  const list = (events || []).map((e) => ({ key: eventKeyOf(e), name: e.name })).filter((e) => e.key);
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" checked={!value.length} disabled={disabled} onChange={() => onChange([])} /> Every event
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" checked={!!value.length} disabled={disabled} onChange={() => onChange(list.slice(0, 1).map((e) => e.key))} /> Only these events
      </label>
      {!!value.length && (
        <div className="ml-6 flex flex-col gap-1">
          {list.map((e) => (
            <label key={e.key} className="flex items-center gap-2 text-sm text-ttfc-muted">
              <input type="checkbox" checked={value.includes(e.key)} disabled={disabled} onChange={() => toggle(e.key)} /> {e.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ open, item, data, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(item);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isPkg = form.kind === "package";
  const canEdit = data.canEdit;
  const offerings = data.offerings.filter((o) => o.kind === "offering");
  const byId = Object.fromEntries(offerings.map((o) => [o.id, o]));
  const itemsValue = (form.items || []).reduce((s, it) => s + (byId[it.offeringId]?.price || 0) * (Number(it.qty) || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, items: (form.items || []).map((it) => ({ offeringId: it.offeringId, qty: Number(it.qty) })),
                     limit: form.limit === "" ? null : Number(form.limit) };
      const r = form.id
        ? await adminFetch(`/console/offerings/${form.id}`, { method: "PATCH", body })
        : await adminFetch("/console/offerings", { method: "POST", body });
      toast.success(form.id ? "Saved" : `${isPkg ? "Package" : "Offering"} added`);
      onSaved(r.offering);
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  return (
    <Drawer open={open} onClose={onClose}
      title={form.id ? form.name || "Edit" : isPkg ? "New package" : "New offering"}
      description={isPkg ? "Several offerings sold together at one price." : "Something a partner can buy. It shows on every contract that includes it."}
      footer={canEdit ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></> : <Button onClick={onClose}>Close</Button>}>
      <div className="flex flex-col gap-4">
        <Field label="Name" required>{(id) => <Input id={id} value={form.name} disabled={!canEdit} onChange={(e) => set("name", e.target.value)} placeholder={isPkg ? "Gold sponsor" : "LinkedIn post"} />}</Field>
        {!isPkg && (
          <Field label="Category">{(id) => (
            <Select id={id} value={form.category} disabled={!canEdit} onChange={(e) => set("category", e.target.value)}>
              {data.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </Select>
          )}</Field>
        )}
        <Field label="Description" hint="Printed under the item on the contract.">{(id) => <Textarea id={id} rows={3} value={form.description} disabled={!canEdit} onChange={(e) => set("description", e.target.value)} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (CAD, before tax)" required>{(id) => <Input id={id} inputMode="decimal" value={form.price} disabled={!canEdit} onChange={(e) => set("price", e.target.value)} placeholder="500" />}</Field>
          <Field label="Unit" hint="each, post, pass, 30 days…">{(id) => <Input id={id} value={form.unit} disabled={!canEdit} onChange={(e) => set("unit", e.target.value)} />}</Field>
        </div>
        {isPkg && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ttfc-text">What's in it</p>
            {(form.items || []).map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="w-20" inputMode="numeric" aria-label="Quantity" value={it.qty} disabled={!canEdit}
                  onChange={(e) => set("items", form.items.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
                <span className="text-sm text-ttfc-muted">×</span>
                <Select value={it.offeringId} disabled={!canEdit} aria-label="Offering"
                  onChange={(e) => set("items", form.items.map((x, j) => (j === i ? { ...x, offeringId: e.target.value } : x)))}>
                  {offerings.map((o) => <option key={o.id} value={o.id}>{o.name}{o.active ? "" : " (retired)"}</option>)}
                </Select>
                {canEdit && <IconButton icon={X} label="Remove" onClick={() => set("items", form.items.filter((_, j) => j !== i))} />}
              </div>
            ))}
            {canEdit && offerings.length > 0 && (
              <Button size="sm" icon={Plus} className="self-start" onClick={() => set("items", [...(form.items || []), { offeringId: offerings[0].id, qty: 1 }])}>Add an offering</Button>
            )}
            {!offerings.length && <p className="text-sm text-ttfc-muted">Add offerings first, then bundle them here.</p>}
            {itemsValue > 0 && <p className="text-xs text-ttfc-muted">Bought one by one: {money(itemsValue)}</p>}
          </div>
        )}
        {!isPkg && (
          <>
            <Field label="After signing" hint="Tasks show on the signed contract so the team can tick them off.">{(id) => (
              <Select id={id} value={form.track} disabled={!canEdit} onChange={(e) => set("track", e.target.value)}>
                {data.track.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </Select>
            )}</Field>
            <Field label="How many we can sell per event" hint="Leave empty for no limit. Counts sent and signed contracts.">{(id) => (
              <Input id={id} inputMode="numeric" value={form.limit ?? ""} disabled={!canEdit} onChange={(e) => set("limit", e.target.value)} placeholder="No limit" />
            )}</Field>
          </>
        )}
        <Field label="Offered for"><EventPicker value={form.eventKeys || []} onChange={(v) => set("eventKeys", v)} disabled={!canEdit} /></Field>
        <Switch checked={form.taxable} onChange={(v) => set("taxable", v)} disabled={!canEdit} label="Tax applies" />
        <Switch checked={form.active} onChange={(v) => set("active", v)} disabled={!canEdit} label="Available for new contracts"
          description="Off = retired. Contracts that already have it keep it." />
      </div>
    </Drawer>
  );
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg)$/.test(file.type)) { reject(new Error("Use a PNG or JPG image.")); return; }
    if (file.size > 200 * 1024) { reject(new Error("Keep the signature image under 200 KB.")); return; }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Couldn't read that image."));
    r.readAsDataURL(file);
  });
}

function Section({ title, hint, children }) {
  return (
    <section className="flex flex-col gap-3 border-b border-[#F0EEF6] pb-6">
      <div><h2 className="text-base font-semibold text-ttfc-text">{title}</h2>{hint && <p className="mt-0.5 text-xs text-ttfc-muted">{hint}</p>}</div>
      {children}
    </section>
  );
}

function SettingsTab({ data, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...data.settings, nextNumber: data.settings.nextNumber });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setIn = (k, sub, v) => setForm((f) => ({ ...f, [k]: { ...f[k], [sub]: v } }));
  const setSig = (i, sub, v) => setForm((f) => ({ ...f, signatories: f.signatories.map((s, j) => (j === i ? { ...s, [sub]: v } : s)) }));
  const setClause = (i, sub, v) => setForm((f) => ({ ...f, clauses: f.clauses.map((c, j) => (j === i ? { ...c, [sub]: v } : c)) }));
  const moveClause = (i, d) => setForm((f) => {
    const list = [...f.clauses]; const j = i + d;
    if (j < 0 || j >= list.length) return f;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...f, clauses: list };
  });
  const can = data.canEdit;
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, nextNumber: Number(form.nextNumber) === data.settings.nextNumber ? undefined : form.nextNumber };
      const r = await adminFetch("/console/offerings/settings", { method: "PUT", body });
      toast.success("Saved"); onSaved(r.settings); setForm(r.settings);
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  const year = String(new Date().getFullYear() + 1).slice(-2);
  const preview = `${form.numbering.prefix ? `${form.numbering.prefix}-` : ""}${year}-${String(form.nextNumber || 1).padStart(Number(form.numbering.digits) || 4, "0")}`;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Section title="TTFC's details" hint="Printed at the top of every contract.">
        <Field label="Legal name" required>{(id) => <Input id={id} value={form.company.legalName} disabled={!can} onChange={(e) => setIn("company", "legalName", e.target.value)} />}</Field>
        <Field label="Address">{(id) => <Textarea id={id} rows={2} value={form.company.address} disabled={!can} onChange={(e) => setIn("company", "address", e.target.value)} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="HST / GST number">{(id) => <Input id={id} value={form.company.hstNumber} disabled={!can} placeholder="123456789 RT0001" onChange={(e) => setIn("company", "hstNumber", e.target.value)} />}</Field>
          <Field label="Website">{(id) => <Input id={id} value={form.company.website} disabled={!can} onChange={(e) => setIn("company", "website", e.target.value)} />}</Field>
          <Field label="Email">{(id) => <Input id={id} value={form.company.email} disabled={!can} onChange={(e) => setIn("company", "email", e.target.value)} />}</Field>
          <Field label="Phone">{(id) => <Input id={id} value={form.company.phone} disabled={!can} onChange={(e) => setIn("company", "phone", e.target.value)} />}</Field>
        </div>
      </Section>

      <Section title="Who can sign for TTFC" hint="The people allowed to sign contracts for TTFC. Whoever drafts a contract picks one of them, and only that person's name and signature print on it. A signature image prints only on contracts that are sent or signed, never on drafts.">
        {form.signatories.map((sg, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[10px] border border-[#F0EEF6] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">{(id) => <Input id={id} value={sg.name} disabled={!can} onChange={(e) => setSig(i, "name", e.target.value)} />}</Field>
              <Field label="Title">{(id) => <Input id={id} value={sg.title} disabled={!can} onChange={(e) => setSig(i, "title", e.target.value)} />}</Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sg.signature ? <img src={sg.signature} alt={`${sg.name || "Director"}'s signature`} className="h-10 rounded border border-[#F0EEF6] bg-white px-2" /> : <span className="text-xs text-ttfc-muted">No signature image</span>}
              {can && (
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-ttfc-line px-3 py-1.5 text-xs font-semibold hover:bg-ttfc-panel2">
                  {sg.signature ? "Replace signature" : "Add signature image"}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; e.target.value = "";
                    if (f) try { setSig(i, "signature", await readImage(f)); } catch (err) { toast.error(err); }
                  }} />
                </label>
              )}
              {can && sg.signature && <Button size="sm" variant="ghost" onClick={() => setSig(i, "signature", "")}>Remove image</Button>}
              {can && form.signatories.length > 1 && <Button size="sm" variant="ghost" icon={X} onClick={() => set("signatories", form.signatories.filter((_, j) => j !== i))}>Remove this person</Button>}
            </div>
          </div>
        ))}
        {can && form.signatories.length < 8 && <Button size="sm" icon={Plus} className="self-start" onClick={() => set("signatories", [...form.signatories, { name: "", title: "Director", signature: "" }])}>Add a person who can sign</Button>}
      </Section>

      <Section title="Contract numbers" hint={`The next contract will be ${preview}. The two digits after the prefix are the event's year.`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Prefix">{(id) => <Input id={id} value={form.numbering.prefix} disabled={!can} onChange={(e) => setIn("numbering", "prefix", e.target.value.toUpperCase())} />}</Field>
          <Field label="Digits">{(id) => (
            <Select id={id} value={form.numbering.digits} disabled={!can} onChange={(e) => setIn("numbering", "digits", Number(e.target.value))}>
              {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          )}</Field>
          <Field label="Next number" hint="Only goes up.">{(id) => <Input id={id} inputMode="numeric" value={form.nextNumber} disabled={!can} onChange={(e) => set("nextNumber", e.target.value)} />}</Field>
        </div>
      </Section>

      <Section title="Header and footer">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title at the top">{(id) => <Input id={id} value={form.document.header} disabled={!can} onChange={(e) => setIn("document", "header", e.target.value)} />}</Field>
          <Field label="Footer line" hint="Under the page numbers on every page.">{(id) => <Input id={id} value={form.document.footer} disabled={!can} onChange={(e) => setIn("document", "footer", e.target.value)} />}</Field>
        </div>
        <Switch checked={form.document.confidential} disabled={!can} onChange={(v) => setIn("document", "confidential", v)} label="Mark contracts confidential" description="Prints the label in the header and on every page's footer." />
        {form.document.confidential && <Field label="Label">{(id) => <Input id={id} className="max-w-xs" value={form.document.confidentialLabel} disabled={!can} onChange={(e) => setIn("document", "confidentialLabel", e.target.value)} />}</Field>}
      </Section>

      <Section title="Prices and payment">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Discount staff can give without approval (%)" hint="Further below the catalogue waits for a manager.">{(id) => (
            <Input id={id} inputMode="decimal" value={form.maxDiscountPct} disabled={!can} onChange={(e) => set("maxDiscountPct", e.target.value)} />
          )}</Field>
          <Field label="Tax on new contracts">{(id) => (
            <Select id={id} value={form.taxRate} disabled={!can} onChange={(e) => set("taxRate", Number(e.target.value))}>
              {data.taxRates.map((t) => <option key={t.rate} value={t.rate}>{t.label}</option>)}
            </Select>
          )}</Field>
        </div>
        <Field label="Payment terms" hint="New contracts start with this; each can change its own.">{(id) => <Textarea id={id} rows={2} value={form.paymentTerms} disabled={!can} onChange={(e) => set("paymentTerms", e.target.value)} />}</Field>
      </Section>

      <Section title="Terms and conditions" hint="Numbered clauses on every contract: indemnity, liability, confidentiality, governing law… Drafts always use the current clauses; a contract keeps the clauses it was sent or signed with. The starting text is a template: have a lawyer review it.">
        {form.clauses.map((cl, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[10px] border border-[#F0EEF6] p-3">
            <div className="flex items-center gap-2">
              <span className="w-6 text-sm font-semibold text-ttfc-muted">{i + 1}.</span>
              <Input aria-label={`Clause ${i + 1} title`} value={cl.title} disabled={!can} onChange={(e) => setClause(i, "title", e.target.value)} />
              {can && <>
                <IconButton icon={ArrowUp} label="Move up" disabled={i === 0} onClick={() => moveClause(i, -1)} />
                <IconButton icon={ArrowDown} label="Move down" disabled={i === form.clauses.length - 1} onClick={() => moveClause(i, 1)} />
                <IconButton icon={X} label="Remove clause" onClick={() => set("clauses", form.clauses.filter((_, j) => j !== i))} />
              </>}
            </div>
            <Textarea aria-label={`Clause ${i + 1} text`} rows={3} value={cl.body} disabled={!can} onChange={(e) => setClause(i, "body", e.target.value)} />
          </div>
        ))}
        {can && <Button size="sm" icon={Plus} className="self-start" onClick={() => set("clauses", [...form.clauses, { title: "", body: "" }])}>Add a clause</Button>}
      </Section>

      {can && <div className="sticky bottom-0 border-t border-[#E3E0EE] bg-white/95 py-3 backdrop-blur"><Button variant="primary" loading={saving} onClick={save}>Save contract settings</Button></div>}
    </div>
  );
}

export default function Offerings() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi("/console/offerings");
  const [tab, setTab] = useState("offerings");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const catLabel = useMemo(() => Object.fromEntries((data?.categories || []).map((c) => [c.key, c.label])), [data]);
  const trackLabel = { each: "One task per unit", once: "One task", none: "—" };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const kind = tab === "packages" ? "package" : "offering";
  const rows = data.offerings.filter((o) => o.kind === kind);
  const byId = Object.fromEntries(data.offerings.map((o) => [o.id, o]));
  const saved = (o) => {
    setData((d) => ({ ...d, offerings: d.offerings.some((x) => x.id === o.id) ? d.offerings.map((x) => (x.id === o.id ? o : x)) : [...d.offerings, o] }));
    setEditing(null);
  };
  const open = (o) => setEditing(o ? { ...BLANK, ...o, price: dollars(o.price), limit: o.limit ?? "" } : { ...BLANK, kind });

  return (
    <div>
      <PageHeader title="Offerings" description="What partners can buy: booths, passes, branding, social posts, spotlights and packages. Sales builds every contract from this list."
        actions={data.canEdit && tab !== "settings" && <Button variant="primary" icon={Plus} onClick={() => open(null)}>{tab === "packages" ? "New package" : "New offering"}</Button>} />
      {!data.canEdit && <Banner icon={Lock} className="mb-4">Only the super admin can change the catalogue. You can use everything here on contracts.</Banner>}
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: "offerings", label: "Offerings", count: data.offerings.filter((o) => o.kind === "offering").length },
        { key: "packages", label: "Packages", count: data.offerings.filter((o) => o.kind === "package").length },
        { key: "settings", label: "Contract settings" },
      ]} />
      {tab === "settings" ? <SettingsTab data={data} onSaved={(s) => setData((d) => ({ ...d, settings: s }))} />
        : !rows.length ? (
          <EmptyState icon={tab === "packages" ? Package : Boxes} title={tab === "packages" ? "No packages yet" : "No offerings yet"}
            body={tab === "packages" ? "Bundle offerings at one price, like Gold sponsor = booth + 4 passes + 2 LinkedIn posts." : "Add booths, passes, LinkedIn and Instagram posts, website spotlights…"}
            action={data.canEdit && <Button variant="primary" icon={Plus} onClick={() => open(null)}>{tab === "packages" ? "New package" : "New offering"}</Button>} />
        ) : (
          <TableWrap>
            <thead><tr>
              <th>Name</th>{kind === "offering" ? <th>Category</th> : <th>Includes</th>}<th className="text-right">Price</th><th>Unit</th>
              {kind === "offering" && <><th>After signing</th><th>Limit</th></>}<th>Events</th><th>Status</th><th />
            </tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={o.active ? "" : "opacity-60"}>
                  <td><button type="button" className="text-left font-semibold text-ttfc-text hover:underline" onClick={() => open(o)}>{o.name}</button>
                    {o.description && <p className="max-w-xs truncate text-xs text-ttfc-muted">{o.description}</p>}</td>
                  {kind === "offering" ? <td>{catLabel[o.category] || o.category}</td>
                    : <td className="text-xs text-ttfc-muted">{o.items.map((it) => `${it.qty} × ${byId[it.offeringId]?.name || "?"}`).join(", ")}</td>}
                  <td className="text-right tabular-nums">{money(o.price)}</td>
                  <td>{o.unit}</td>
                  {kind === "offering" && <><td className="text-xs">{trackLabel[o.track]}</td><td>{o.limit ?? "—"}</td></>}
                  <td className="text-xs">{o.eventKeys?.length ? `${o.eventKeys.length} event${o.eventKeys.length > 1 ? "s" : ""}` : "All"}</td>
                  <td>{o.active ? <Badge tone="good">Available</Badge> : <Badge>Retired</Badge>}</td>
                  <td className="whitespace-nowrap text-right">
                    <IconButton icon={Pencil} label={data.canEdit ? "Edit" : "View"} onClick={() => open(o)} />
                    {data.canEdit && <IconButton icon={Trash2} label="Delete" onClick={() => setRemoving(o)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      {editing && <Editor open item={editing} data={data} onClose={() => setEditing(null)} onSaved={saved} />}
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} title={`Delete ${removing?.name || ""}?`}
        body="Only items that were never put on a contract or in a package can be deleted. Otherwise retire it: switch off “Available for new contracts”."
        confirmLabel="Delete"
        onConfirm={async () => {
          await adminFetch(`/console/offerings/${removing.id}`, { method: "DELETE" });
          setData((d) => ({ ...d, offerings: d.offerings.filter((x) => x.id !== removing.id) }));
          toast.success("Deleted");
        }} />
    </div>
  );
}
