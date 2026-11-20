import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileUp, Send, ShieldCheck, Trash2, Undo2, X, XCircle } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import { useAutosave } from "../cms/useAutosave";
import { AutosaveNote } from "../cms/AutosaveNote";
import {
  Badge, Banner, Button, Card, ConfirmDialog, ErrorState, Field, IconButton, Input, LoadingState, Modal, PageHeader,
  SectionTitle, Select, TableWrap, Textarea,
} from "../ui";
import { day } from "../format";
import { STATUS_LABEL, STATUS_TONE, dollars, downloadFile, eventKeyOf, money, uploadPdf } from "./contractsShared";

/* =========================================================
   Admin › Sales › Contracts › one contract (Nov 18 2026)
   The builder: the partner and their contact, items from the offerings catalogue (quantities and,
   when agreed, a lower price), tax, payment terms and terms. Drafts save automatically 30 seconds
   after a change. A price further below the catalogue than Contract settings allow waits for a
   manager's Approve before it can be sent or signed; items past what's left to sell for the event
   block it too. Signing turns every promised item into a task (LinkedIn post 1 of 2…) with a due
   date, an owner and the post's link. The PDF downloads at any time; the signed copy can be uploaded.
========================================================= */

const toCents = (v) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

const formOf = (c) => ({
  company: { name: c.company?.name || "", address: c.company?.address || "", website: c.company?.website || "" },
  contact: { name: c.contact?.name || "", title: c.contact?.title || "", email: c.contact?.email || "", phone: c.contact?.phone || "" },
  lines: (c.lines || []).map((l) => ({ ...l, unitPrice: dollars(l.unitPrice), qty: String(l.qty) })),
  taxRate: c.taxRate, paymentTerms: c.paymentTerms || "", terms: c.terms || "", notes: c.notes || "",
  signatoryId: c.signatoryId || "",
});

const bodyOf = (f) => ({ ...f, lines: f.lines.map((l) => ({ offeringId: l.offeringId, qty: Number(l.qty), unitPrice: l.unitPrice })) });

function Tasks({ contract, onChange }) {
  const toast = useToast();
  const patch = async (key, body) => {
    try { const r = await adminFetch(`/console/contracts/${contract.id}/deliverables/${encodeURIComponent(key)}`, { method: "PATCH", body }); onChange(r.contract); }
    catch (err) { toast.error(err); }
  };
  const list = contract.deliverables || [];
  const done = list.filter((d) => d.done).length;
  if (!list.length) return null;
  return (
    <Card className="mb-4">
      <SectionTitle hint="Everything promised in this contract. Tick each one off with the post's link once it's live.">Tasks · {done} of {list.length} done</SectionTitle>
      <TableWrap>
        <thead><tr><th>Done</th><th>Task</th><th>Due</th><th>Owner</th><th>Link</th></tr></thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.key}>
              <td><input type="checkbox" aria-label={`${d.label} done`} checked={!!d.done} onChange={(e) => patch(d.key, { done: e.target.checked })} /></td>
              <td className={d.done ? "text-ttfc-muted line-through" : "font-semibold"}>{d.label}
                {d.done && d.doneBy && <span className="block text-[11px] no-underline">{d.doneBy}, {day(d.doneAt)}</span>}</td>
              <td><Input type="date" className="w-40" defaultValue={d.dueDate} aria-label="Due date" onBlur={(e) => e.target.value !== d.dueDate && patch(d.key, { dueDate: e.target.value })} /></td>
              <td><Input className="w-36" defaultValue={d.owner} aria-label="Owner" placeholder="Who" onBlur={(e) => e.target.value !== d.owner && patch(d.key, { owner: e.target.value })} /></td>
              <td><Input className="w-56" defaultValue={d.link} aria-label="Link" placeholder="https://" onBlur={(e) => e.target.value !== d.link && patch(d.key, { link: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Card>
  );
}

export default function ContractEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const toast = useToast();
  const { current } = useAdminEvent();
  const eventKey = eventKeyOf(current);
  const existing = useApi(isNew ? null : `/console/contracts/${id}`);
  const contract = existing.data?.contract || null;
  const catKey = isNew ? eventKey : contract?.eventKey;
  const cat = useApi(catKey ? `/console/offerings?eventKey=${encodeURIComponent(catKey)}` : null);
  const [form, setForm] = useState(null);
  const [base, setBase] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState("");
  const [signing, setSigning] = useState(false);
  const [signer, setSigner] = useState("");
  const [confirm, setConfirm] = useState(null); // "cancel" | "delete"
  const fileRef = useRef(null);

  // Load the form once: the contract's own values, or a new draft with the catalogue's settings.
  useEffect(() => {
    if (form) return;
    if (!isNew && contract) { const f = formOf(contract); setForm(f); setBase(JSON.stringify(f)); }
    if (isNew && cat.data) {
      const s = cat.data.settings;
      // A new contract starts with the first signing authority; the person drafting it can pick another.
      const f = formOf({ taxRate: s.taxRate, paymentTerms: s.paymentTerms, terms: "", signatoryId: (s.signatories || []).find((x) => x.name)?.id || "" });
      setForm(f); setBase(JSON.stringify(f));
    }
  }, [isNew, contract, cat.data, form]);

  const value = form ? JSON.stringify(form) : "";
  const dirty = !!form && value !== base;
  const editable = isNew || contract?.status === "draft";
  const settings = cat.data?.settings;
  const signers = (settings?.signatories || []).filter((x) => x.name);
  const offerings = useMemo(() => (cat.data?.offerings || []).filter((o) => o.active && (!o.eventKeys?.length || o.eventKeys.includes(catKey))), [cat.data, catKey]);

  const setContract = (c) => {
    existing.setData((d) => ({ ...(d || {}), contract: c }));
    const f = formOf(c); setForm(f); setBase(JSON.stringify(f));
  };

  const saveDraft = async ({ quiet = false } = {}) => {
    if (!form.company.name.trim()) { if (!quiet) toast.error("Enter the company's name."); return "Enter the company's name."; }
    const body = bodyOf(form);
    if (isNew) {
      const r = await adminFetch("/console/contracts", { method: "POST", body: { ...body, eventKey, eventName: current?.name || "", eventYear: current?.year || String(current?.startDate || "").slice(0, 4) } });
      setBase(value);
      navigate(`/admin/contracts/${r.contract.id}`, { replace: true });
      return true;
    }
    const r = await adminFetch(`/console/contracts/${contract.id}`, { method: "PATCH", body });
    existing.setData((d) => ({ ...(d || {}), contract: r.contract }));
    setBase(value);
    return true;
  };

  const auto = useAutosave({
    value, enabled: editable && !!form, // a new contract is created by its first autosave
    save: async () => (dirty && !saving ? saveDraft({ quiet: true }) : false),
  });

  const save = async () => {
    setSaving(true);
    try { const ok = await saveDraft(); if (ok === true) { auto.markSaved(); toast.success(isNew ? "Contract created" : "Saved"); } }
    catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  const act = async (path, body, msg) => {
    try { const r = await adminFetch(`/console/contracts/${contract.id}${path}`, { method: "POST", body }); setContract(r.contract); toast.success(msg); }
    catch (err) { toast.error(err); }
  };

  if (!isNew && existing.loading) return <LoadingState />;
  if (!isNew && existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />;
  if (isNew && !current) return <ErrorState title="Choose an event first" error={{ message: "Pick the event in the top bar, then start the contract." }} />;
  if (cat.error) return <ErrorState error={cat.error} onRetry={cat.reload} />;
  if (!form || !cat.data) return <LoadingState />;

  const set = (path, v) => setForm((f) => {
    const [a, b] = path.split(".");
    return b ? { ...f, [a]: { ...f[a], [b]: v } } : { ...f, [a]: v };
  });
  const setLine = (i, k, v) => setForm((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const addLine = (oid) => {
    const o = offerings.find((x) => x.id === oid);
    if (!o) return;
    setForm((f) => ({ ...f, lines: [...f.lines, { offeringId: o.id, kind: o.kind, name: o.name, description: o.description, unit: o.unit,
      listPrice: o.price, unitPrice: dollars(o.price), qty: "1", taxable: o.taxable,
      items: (o.items || []).map((it) => ({ ...it, name: cat.data.offerings.find((x) => x.id === it.offeringId)?.name || "" })) }] }));
    setAdding("");
  };

  // Live totals (the server works out the same on save).
  let subtotal = 0, list = 0, taxable = 0;
  const lineInfo = form.lines.map((l) => {
    const unit = toCents(l.unitPrice) ?? 0, qty = Number(l.qty) || 0;
    subtotal += unit * qty; list += l.listPrice * qty; if (l.taxable !== false) taxable += unit * qty;
    const pct = l.listPrice > 0 ? Math.round(((l.listPrice - unit) / l.listPrice) * 1000) / 10 : 0;
    return { amount: unit * qty, pct };
  });
  const tax = Math.round((taxable * (Number(form.taxRate) || 0)) / 100);
  const overPct = form.lines.filter((_, i) => lineInfo[i].pct > (settings?.maxDiscountPct ?? 10));
  const can = contract?.can || {};
  const status = contract?.status || "draft";
  const left = (oid) => cat.data.offerings.find((o) => o.id === oid)?.left;

  return (
    <div>
      <Link to="/admin/contracts" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-ttfc-muted hover:text-ttfc-text"><ArrowLeft className="h-3.5 w-3.5" /> Contracts</Link>
      <PageHeader title={isNew ? "New contract" : `${contract.number} · ${contract.company?.name}`}
        status={!isNew && <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>}
        description={isNew ? `For ${current?.name}. Saved as a draft; nothing is sent to the partner from here.` : `${contract.eventName || contract.eventKey} · made by ${contract.createdBy}${contract.signedAt ? ` · signed ${day(contract.signedAt)}${contract.signerName ? ` by ${contract.signerName}` : ""}` : ""}`}
        actions={!isNew && <>
          <Button icon={Download} disabled={dirty} title={dirty ? "Save first" : undefined}
            onClick={() => downloadFile(`/console/contracts/${contract.id}/pdf`, `${contract.number}.pdf`).catch((e) => toast.error(e))}>PDF</Button>
          {can.approve && <Button icon={ShieldCheck} disabled={dirty} onClick={() => act("/approve", {}, "Prices approved")}>Approve prices</Button>}
          {status === "draft" && <Button icon={Send} disabled={dirty || !can.send} onClick={() => act("/status", { status: "sent" }, "Marked as sent")}>Mark as sent</Button>}
          {status === "sent" && <Button icon={Undo2} onClick={() => act("/status", { status: "draft" }, "Back to draft")}>Back to draft</Button>}
          {can.sign && <Button variant="primary" icon={CheckCircle2} disabled={dirty} onClick={() => { setSigner(contract.contact?.name || ""); setSigning(true); }}>Mark signed</Button>}
        </>} />

      {!isNew && !contract.approvedPrices && (
        <Banner tone="warn" icon={AlertTriangle} className="mb-4" title="A manager needs to approve the prices">
          {contract.overDiscount.map((x) => `${x.name} is ${x.pct}% below the catalogue`).join("; ")}. The limit is {settings?.maxDiscountPct}%. It can't be sent or signed until then.
        </Banner>
      )}
      {!isNew && contract.overLimits?.length > 0 && (
        <Banner tone="danger" icon={AlertTriangle} className="mb-4" title="Over what's left to sell">
          {contract.overLimits.map((x) => `${x.name}: ${x.asked} asked, ${x.left} left of ${x.limit}`).join("; ")}.
        </Banner>
      )}
      {status === "signed" && <Tasks contract={contract} onChange={setContract} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Partner</SectionTitle>
          <div className="flex flex-col gap-3">
            <Field label="Company" required>{(fid) => <Input id={fid} value={form.company.name} disabled={!editable} onChange={(e) => set("company.name", e.target.value)} />}</Field>
            <Field label="Address">{(fid) => <Textarea id={fid} rows={2} value={form.company.address} disabled={!editable} onChange={(e) => set("company.address", e.target.value)} />}</Field>
            <Field label="Website">{(fid) => <Input id={fid} value={form.company.website} disabled={!editable} onChange={(e) => set("company.website", e.target.value)} />}</Field>
          </div>
        </Card>
        <Card>
          <SectionTitle>Contact</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">{(fid) => <Input id={fid} value={form.contact.name} disabled={!editable} onChange={(e) => set("contact.name", e.target.value)} />}</Field>
            <Field label="Title">{(fid) => <Input id={fid} value={form.contact.title} disabled={!editable} onChange={(e) => set("contact.title", e.target.value)} />}</Field>
            <Field label="Email">{(fid) => <Input id={fid} type="email" value={form.contact.email} disabled={!editable} onChange={(e) => set("contact.email", e.target.value)} />}</Field>
            <Field label="Phone">{(fid) => <Input id={fid} value={form.contact.phone} disabled={!editable} onChange={(e) => set("contact.phone", e.target.value)} />}</Field>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <SectionTitle hint={editable ? "Pick from the offerings catalogue. Change the price only when a discount was agreed." : undefined}>Items</SectionTitle>
        {form.lines.length > 0 && (
          <TableWrap className="mb-3">
            <thead><tr><th>Item</th><th className="w-24">Qty</th><th className="w-36">Unit price</th><th className="text-right">Catalogue</th><th className="text-right">Amount</th>{editable && <th />}</tr></thead>
            <tbody>
              {form.lines.map((l, i) => (
                <tr key={`${l.offeringId}-${i}`}>
                  <td><span className="font-semibold">{l.name}</span>
                    {l.kind === "package" && <span className="block text-xs text-ttfc-muted">{(l.items || []).map((it) => `${it.qty} × ${it.name}`).join(", ")}</span>}
                    {editable && left(l.offeringId) != null && <span className="block text-[11px] text-ttfc-muted">{left(l.offeringId)} left to sell</span>}</td>
                  <td><Input inputMode="numeric" aria-label={`${l.name} quantity`} value={l.qty} disabled={!editable} onChange={(e) => setLine(i, "qty", e.target.value)} /></td>
                  <td><Input inputMode="decimal" aria-label={`${l.name} unit price`} value={l.unitPrice} disabled={!editable} onChange={(e) => setLine(i, "unitPrice", e.target.value)} />
                    {lineInfo[i].pct > 0 && <span className={`block text-[11px] ${lineInfo[i].pct > (settings?.maxDiscountPct ?? 10) ? "font-semibold text-[#92400E]" : "text-ttfc-muted"}`}>{lineInfo[i].pct}% off</span>}</td>
                  <td className="text-right tabular-nums text-ttfc-muted">{money(l.listPrice)}</td>
                  <td className="text-right font-semibold tabular-nums">{money(lineInfo[i].amount)}</td>
                  {editable && <td><IconButton icon={X} label={`Remove ${l.name}`} onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))} /></td>}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        {editable && (
          <div className="flex flex-wrap items-center gap-2">
            <Select className="max-w-md" aria-label="Add an item" value={adding} onChange={(e) => addLine(e.target.value)}>
              <option value="">Add an offering or package…</option>
              {cat.data.categories.map((c) => {
                const items = offerings.filter((o) => o.kind === "offering" && o.category === c.key);
                return items.length ? <optgroup key={c.key} label={c.label}>{items.map((o) => <option key={o.id} value={o.id}>{o.name} · {money(o.price)}{o.left != null ? ` · ${o.left} left` : ""}</option>)}</optgroup> : null;
              })}
              {offerings.some((o) => o.kind === "package") && (
                <optgroup label="Packages">{offerings.filter((o) => o.kind === "package").map((o) => <option key={o.id} value={o.id}>{o.name} · {money(o.price)}</option>)}</optgroup>
              )}
            </Select>
            {!offerings.length && <span className="text-sm text-ttfc-muted">The catalogue is empty for this event. <Link className="underline" to="/admin/offerings">Offerings</Link></span>}
          </div>
        )}
        {overPct.length > 0 && editable && (
          <p className="mt-3 text-xs text-[#92400E]">More than {settings?.maxDiscountPct}% off: a manager approves these prices before the contract can be sent.</p>
        )}
        <div className="mt-4 ml-auto flex max-w-xs flex-col gap-1 text-sm">
          {list > subtotal && <div className="flex justify-between text-ttfc-muted"><span>Partner discount</span><span className="tabular-nums">−{money(list - subtotal)}</span></div>}
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2">
            <Select className="h-8 min-h-0 py-0 text-xs" aria-label="Tax" value={form.taxRate} disabled={!editable} onChange={(e) => set("taxRate", Number(e.target.value))}>
              {cat.data.taxRates.map((t) => <option key={t.rate} value={t.rate}>{t.label}</option>)}
            </Select>
            <span className="tabular-nums">{money(tax)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-[#F5A623] pt-2 text-base font-bold"><span>Total (CAD)</span><span className="tabular-nums">{money(subtotal + tax)}</span></div>
        </div>
      </Card>

      <Card className="mt-4">
        <SectionTitle>Terms</SectionTitle>
        <div className="flex flex-col gap-3">
          <Field label="Who signs for TTFC" hint={signers.length ? "Their name, title and signature print on this contract. The list is kept by an admin in Catalogue › Contract settings." : "No signing authority has been added yet. Ask an admin to add one in Catalogue › Contract settings."}>{(fid) => (
            <Select id={fid} value={form.signatoryId} disabled={!editable || !signers.length} onChange={(e) => set("signatoryId", e.target.value)}>
              <option value="">{signers.length ? "Choose who signs" : "None added yet"}</option>
              {signers.map((x) => <option key={x.id} value={x.id}>{[x.name, x.title].filter(Boolean).join(", ")}</option>)}
            </Select>
          )}</Field>
          <Field label="Payment terms">{(fid) => <Textarea id={fid} rows={2} value={form.paymentTerms} disabled={!editable} onChange={(e) => set("paymentTerms", e.target.value)} />}</Field>
          <Field label="Special terms for this contract" hint="Anything agreed only with this partner. The standard terms and conditions (indemnity, liability, governing law…) come from Contract settings and print after these.">{(fid) => <Textarea id={fid} rows={6} value={form.terms} disabled={!editable} onChange={(e) => set("terms", e.target.value)} />}</Field>
          <Field label="Internal notes" hint="For the team only. Never printed.">{(fid) => <Textarea id={fid} rows={2} value={form.notes} disabled={!editable} onChange={(e) => set("notes", e.target.value)} />}</Field>
        </div>
      </Card>

      {!isNew && (
        <Card className="mt-4">
          <SectionTitle hint="The copy the partner signed and sent back (PDF, up to 10 MB).">Signed copy</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            {contract.hasSignedCopy && <Button icon={Download} onClick={() => downloadFile(`/console/contracts/${contract.id}/signed-copy`, contract.signedCopy.name).catch((e) => toast.error(e))}>{contract.signedCopy.name}</Button>}
            {contract.hasSignedCopy && <span className="text-xs text-ttfc-muted">Uploaded by {contract.signedCopy.by}, {day(contract.signedCopy.at)}</span>}
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              try { const r = await uploadPdf(`/console/contracts/${contract.id}/signed-copy`, f); setContract(r.contract); toast.success("Signed copy uploaded"); }
              catch (err) { toast.error(err); }
            }} />
            <Button icon={FileUp} onClick={() => fileRef.current?.click()}>{contract.hasSignedCopy ? "Replace" : "Upload signed copy"}</Button>
          </div>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E0EE] bg-white/95 py-3 backdrop-blur">
        <div className="flex gap-2">
          {can.remove && <Button variant="dangerOutline" icon={Trash2} onClick={() => setConfirm("delete")}>Delete draft</Button>}
          {can.cancel && status !== "draft" && <Button variant="dangerOutline" icon={XCircle} onClick={() => setConfirm("cancel")}>Cancel contract</Button>}
        </div>
        {editable && (
          <div className="flex items-center gap-3">
            {!isNew && <AutosaveNote auto={auto} />}
            <Button variant="primary" loading={saving} disabled={!dirty && !isNew} onClick={save}>{isNew ? "Create draft" : "Save"}</Button>
          </div>
        )}
      </div>

      <Modal open={signing} onClose={() => setSigning(false)} title="Mark as signed" size="sm"
        description="Record that the partner signed. Every promised item becomes a task on this contract."
        footer={<><Button onClick={() => setSigning(false)}>Cancel</Button>
          <Button variant="primary" onClick={async () => { await act("/status", { status: "signed", signerName: signer }, "Signed: tasks added"); setSigning(false); }}>Mark signed</Button></>}>
        <Field label="Signed by (partner's side)">{(fid) => <Input id={fid} value={signer} onChange={(e) => setSigner(e.target.value)} />}</Field>
      </Modal>
      <ConfirmDialog open={confirm === "delete"} onClose={() => setConfirm(null)} title="Delete this draft?" body="It can't be brought back." confirmLabel="Delete"
        onConfirm={async () => { await adminFetch(`/console/contracts/${contract.id}`, { method: "DELETE" }); toast.success("Deleted"); navigate("/admin/contracts"); }} />
      <ConfirmDialog open={confirm === "cancel"} onClose={() => setConfirm(null)} title="Cancel this contract?" body="It stays on the list as cancelled, and what it held goes back on sale." confirmLabel="Cancel contract"
        onConfirm={async () => { const r = await adminFetch(`/console/contracts/${contract.id}/status`, { method: "POST", body: { status: "cancelled" } }); setContract(r.contract); toast.success("Cancelled"); }} />
    </div>
  );
}
