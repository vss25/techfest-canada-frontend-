import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleAlert, Copy, Download, FileText, Plus, Send, Trash2, Undo2, X } from "lucide-react";
import { useApi } from "../hooks";
import { adminFetch } from "../api";
import { useToast } from "../toastContext";
import { useAdminEvent } from "../eventContext";
import { useAutosave } from "../cms/useAutosave";
import { AutosaveNote } from "../cms/AutosaveNote";
import {
  Badge, Banner, Button, Card, ConfirmDialog, ErrorState, Field, IconButton, Input, LoadingState, PageHeader,
  SectionTitle, Select, Switch, Tabs, Textarea,
} from "../ui";
import { day } from "../format";
import { dollars, downloadFile, eventKeyOf } from "./contractsShared";
import { EMPTY_SCHEDULE, MOU_STATUS_LABEL, MOU_STATUS_TONE, lineSentence } from "./mouShared";

/* =========================================================
   Admin › Sales › MOUs › one MOU (Nov 23 2026)
   Build: the partner and contact; tick what TTFC offers and what the partner delivers from the MOU
   catalogue, then set each one's details for this partner (how many, when, the code, the detail,
   for TTFC's items an optional ticket-sales milestone, and this MOU's own wording if wanted); the
   terms (binding or not, financial or not, dates, standard clauses as checkboxes, anything else);
   who signs on both sides. Drafts save 30 seconds after a change.
   Review: what must be fixed and what's worth a look, and the MOU exactly as it exports.
   Draft → Send to review (read only) → Export (PDF or Word; TTFC's details and signers are frozen).
   API: /api/console/mous and /api/console/mou-items (backend routes/mous.js).
========================================================= */

const lineForm = (l) => ({
  itemId: l.itemId, side: l.side, name: l.name, category: l.category, fields: l.fields || [], baseWording: l.baseWording || "",
  qty: l.qty === null || l.qty === undefined ? "" : String(l.qty),
  schedule: { ...EMPTY_SCHEDULE, ...(l.schedule || {}), dates: [...(l.schedule?.dates || [])] },
  code: l.code || "", value: l.value || "",
  ownWording: !!l.wording, wording: l.wording || "",
  unlockOn: !!l.unlockAt, unlockAt: l.unlockAt ? String(l.unlockAt) : "",
});
const lineFromItem = (it) => lineForm({ itemId: it.id, side: it.side, name: it.name, category: it.category, fields: it.fields, baseWording: it.wording, qty: it.qty, value: it.value, code: it.code });

const formOf = (m, defaults) => ({
  partner: { name: m.partner?.name || "", address: m.partner?.address || "", website: m.partner?.website || "" },
  contact: { name: m.contact?.name || "", title: m.contact?.title || "", email: m.contact?.email || "", phone: m.contact?.phone || "" },
  lines: (m.lines || []).map(lineForm),
  terms: { ...defaults, ...(m.terms || {}), amount: dollars(m.terms?.amount ?? null), clauses: (m.terms?.clauses?.length ? m.terms.clauses : defaults.clauses).map((c) => ({ ...c })) },
  ttfcSignatoryIds: m.ttfcSignatoryIds || [],
  partnerSigners: (m.partnerSigners || []).map((s) => ({ ...s })),
  notes: m.notes || "",
});

const bodyOf = (f) => ({
  ...f,
  lines: f.lines.map((l) => ({
    itemId: l.itemId, qty: l.fields.includes("qty") && l.qty !== "" ? Number(l.qty) : null, schedule: l.schedule,
    code: l.code, value: l.value, wording: l.ownWording ? l.wording : "",
    unlockAt: l.side === "ttfc" && l.unlockOn && l.unlockAt !== "" ? Number(l.unlockAt) : null,
  })),
});

function ScheduleEditor({ value, onChange, disabled, modes, every }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-col gap-2">
      <Select aria-label="When" value={value.mode} disabled={disabled} onChange={(e) => onChange({ ...value, mode: e.target.value, dates: e.target.value === "dates" && !value.dates.length ? [""] : value.dates })}>
        {modes.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
      </Select>
      {value.mode === "dates" && (
        <div className="flex flex-col gap-2">
          {value.dates.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input type="date" aria-label={`Day ${i + 1}`} value={d} disabled={disabled} onChange={(e) => set("dates", value.dates.map((x, j) => (j === i ? e.target.value : x)))} />
              {!disabled && <IconButton icon={X} label="Remove this day" onClick={() => set("dates", value.dates.filter((_, j) => j !== i))} />}
            </div>
          ))}
          {!disabled && value.dates.length < 24 && <Button size="sm" icon={Plus} className="self-start" onClick={() => set("dates", [...value.dates, ""])}>Add a day</Button>}
        </div>
      )}
      {value.mode === "repeat" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Select aria-label="How often" value={value.every || "month"} disabled={disabled} onChange={(e) => set("every", e.target.value)}>
            {every.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
          <Input type="date" aria-label="From" title="From" value={value.from} disabled={disabled} onChange={(e) => set("from", e.target.value)} />
          <Input type="date" aria-label="To" title="To" value={value.to} disabled={disabled} onChange={(e) => set("to", e.target.value)} />
        </div>
      )}
      {value.mode === "note" && (
        <Input aria-label="When, in your words" placeholder="in the week before the event" value={value.note} disabled={disabled} onChange={(e) => set("note", e.target.value)} />
      )}
    </div>
  );
}

function LineEditor({ line, onChange, onRemove, onAnother, ctx, cat, disabled, canRemove }) {
  const set = (k, v) => onChange({ ...line, [k]: v });
  const has = (f) => line.fields.includes(f);
  const sentence = lineSentence(line, ctx);
  return (
    <div className="rounded-xl border border-[#E3E0EE] bg-[#FBFAFE] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {has("qty") && <Field label="How many">{(id) => <Input id={id} inputMode="numeric" value={line.qty} disabled={disabled} onChange={(e) => set("qty", e.target.value.replace(/[^\d]/g, ""))} />}</Field>}
        {has("value") && <Field label="Detail" hint="Pass type, discount, title…">{(id) => <Input id={id} value={line.value} disabled={disabled} onChange={(e) => set("value", e.target.value)} />}</Field>}
        {has("code") && <Field label="Code" hint="The promo or tracking code for this partner.">{(id) => <Input id={id} value={line.code} disabled={disabled} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))} />}</Field>}
        {has("schedule") && <Field label="When" className="sm:col-span-2">{() => <ScheduleEditor value={line.schedule} onChange={(v) => set("schedule", v)} disabled={disabled} modes={cat.scheduleModes} every={cat.repeatEvery} />}</Field>}
      </div>
      {line.side === "ttfc" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[#D6308C]" checked={line.unlockOn} disabled={disabled} onChange={(e) => onChange({ ...line, unlockOn: e.target.checked, unlockAt: line.unlockAt || "25" })} />
            Only once ticket sales with the partner's code reach
          </label>
          {line.unlockOn && <Input className="w-24" inputMode="numeric" aria-label="Ticket sales milestone" value={line.unlockAt} disabled={disabled} onChange={(e) => set("unlockAt", e.target.value.replace(/[^\d]/g, ""))} />}
        </div>
      )}
      <div className="mt-3 rounded-lg border-l-4 border-[#D6308C] bg-white px-3 py-2 text-sm text-ttfc-text">{sentence}</div>
      <label className="mt-2 flex items-center gap-2 text-xs text-ttfc-muted">
        <input type="checkbox" className="h-4 w-4 accent-[#D6308C]" checked={line.ownWording} disabled={disabled}
          onChange={(e) => onChange({ ...line, ownWording: e.target.checked, wording: e.target.checked && !line.wording ? lineSentence({ ...line, unlockOn: false }, ctx) : line.wording })} />
        Write this MOU's own wording
      </label>
      {line.ownWording && <Textarea className="mt-2" rows={3} aria-label="This MOU's wording" value={line.wording} disabled={disabled} onChange={(e) => set("wording", e.target.value)} />}
      {!disabled && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" icon={Copy} onClick={onAnother} title="Add the same item again, for a second milestone or a different detail">Add another</Button>
          {canRemove && <Button size="sm" variant="dangerOutline" icon={X} onClick={onRemove}>Remove this one</Button>}
        </div>
      )}
    </div>
  );
}

function SideChecklist({ side, title, hint, form, setForm, cat, ctx, disabled }) {
  const catalogue = cat.items.filter((i) => i.side === side && i.active);
  const onMou = form.lines.filter((l) => l.side === side);
  // Items on this MOU that have since been retired stay listed with their lines.
  const extra = [...new Map(onMou.filter((l) => !catalogue.some((i) => i.id === l.itemId)).map((l) => [l.itemId, { id: l.itemId, name: l.name, category: l.category, retired: true }])).values()];
  const rows = [...catalogue, ...extra];
  const groups = cat.categories.map((c) => ({ ...c, rows: rows.filter((r) => (r.category || "other") === c.key) })).filter((g) => g.rows.length);
  const indexes = (id) => form.lines.map((l, i) => (l.itemId === id ? i : -1)).filter((i) => i >= 0);
  const toggle = (it, on) => setForm((f) => ({ ...f, lines: on ? [...f.lines, lineFromItem(it)] : f.lines.filter((l) => l.itemId !== it.id) }));
  const setLine = (i, v) => setForm((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? v : l)) }));
  const ticked = onMou.length;

  return (
    <Card className="mt-4">
      <SectionTitle hint={hint}>{title}{ticked ? ` · ${ticked} ticked` : ""}</SectionTitle>
      {!rows.length && <p className="text-sm text-ttfc-muted">Nothing in the catalogue yet. <Link className="underline" to="/admin/mou-items">MOU catalogue</Link></p>}
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ttfc-muted">{g.label}</p>
            <div className="flex flex-col gap-2">
              {g.rows.map((it) => {
                const idx = indexes(it.id);
                return (
                  <div key={it.id}>
                    <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${idx.length ? "border-[#D6308C] bg-[#FDF2F8]" : "border-[#E3E0EE] bg-white"}`}>
                      <input type="checkbox" className="h-4 w-4 accent-[#D6308C]" checked={idx.length > 0} disabled={disabled || (it.retired && !idx.length)} onChange={(e) => toggle(it, e.target.checked)} />
                      <span className="font-semibold text-ttfc-text">{it.name}</span>
                      {it.retired && <Badge tone="warn">Retired</Badge>}
                      {idx.length > 1 && <Badge tone="pink">{idx.length} times</Badge>}
                    </label>
                    {idx.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2 sm:ml-7">
                        {idx.map((i) => (
                          <LineEditor key={i} line={form.lines[i]} ctx={ctx} cat={cat} disabled={disabled} canRemove={idx.length > 1}
                            onChange={(v) => setLine(i, v)}
                            onRemove={() => setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}
                            onAnother={() => setForm((f) => { const copy = { ...f.lines[i], schedule: { ...f.lines[i].schedule } }; const lines = [...f.lines]; lines.splice(i + 1, 0, copy); return { ...f, lines }; })} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReviewView({ mou, dirty }) {
  const d = mou.document;
  const blocks = mou.checks.filter((c) => c.level === "block"), warns = mou.checks.filter((c) => c.level === "warn");
  return (
    <div className="flex flex-col gap-4">
      {dirty && <Banner tone="warn" icon={AlertTriangle} title="You have changes not saved yet">Save to see them here.</Banner>}
      <Card>
        <SectionTitle>Before it goes out</SectionTitle>
        {!mou.checks.length && <p className="flex items-center gap-2 text-sm text-[#166534]"><CheckCircle2 className="h-4 w-4" /> Everything is filled in.</p>}
        <ul className="flex flex-col gap-1.5 text-sm">
          {blocks.map((c) => <li key={c.text} className="flex items-start gap-2 text-[#991B1B]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {c.text}</li>)}
          {warns.map((c) => <li key={c.text} className="flex items-start gap-2 text-[#92400E]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {c.text}</li>)}
        </ul>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="bg-[#151035] px-5 py-4 text-white">
          <p className="text-[11px] font-bold tracking-widest text-[#F5A623]">{d.title}</p>
          <p className="text-sm text-[#C9C4E0]">{d.number} · {d.dateLabel}</p>
        </div>
        <div className="h-1 bg-[#F5A623]" />
        <div className="flex flex-col gap-4 px-5 py-5 text-sm leading-relaxed text-ttfc-text">
          {d.banner && <p className="rounded-lg bg-[#FDECF4] py-1.5 text-center text-xs font-bold text-[#D6308C]">{d.banner}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {[["BETWEEN", d.parties.ttfc.slice(0, 2)], ["AND", d.parties.partner]].map(([t, lines]) => (
              <div key={t}>
                <p className="text-[11px] font-bold tracking-wide text-[#D6308C]">{t}</p>
                {lines.map((x, i) => <p key={i} className={i ? "text-ttfc-muted" : "font-semibold"}>{x}</p>)}
              </div>
            ))}
          </div>
          <p className="text-ttfc-muted">About: {d.event}</p>
          {d.sections.map((s) => (
            <section key={s.title}>
              <h3 className="mb-1 text-[11px] font-bold tracking-wide text-[#D6308C]">{s.title}</h3>
              {s.paras.map((p, i) => (
                <p key={i} className={`mb-1.5 ${p.bullet ? "relative pl-4 before:absolute before:left-0 before:text-[#D6308C] before:content-['•']" : ""}`}>
                  {p.lead && <strong>{p.lead}</strong>}{p.text}
                </p>
              ))}
            </section>
          ))}
          <section>
            <h3 className="mb-2 text-[11px] font-bold tracking-wide text-[#D6308C]">SIGNED BY</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {d.signers.map((s, i) => (
                <div key={i} className="border-t border-ttfc-text pt-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-ttfc-muted">{[s.title, `For ${s.side}`].filter(Boolean).join(" · ")}</p>
                </div>
              ))}
              {!d.signers.length && <p className="text-ttfc-muted">Nobody yet.</p>}
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}

export default function MouEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const toast = useToast();
  const { current } = useAdminEvent();
  const eventKey = eventKeyOf(current);
  const existing = useApi(isNew ? null : `/console/mous/${id}`);
  const catalogue = useApi("/console/mou-items");
  const mou = existing.data?.mou || null;
  const cat = catalogue.data;
  const [form, setForm] = useState(null);
  const [base, setBase] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (form || !cat) return;
    if (!isNew && mou) { const f = formOf(mou, cat.defaultTerms); setForm(f); setBase(JSON.stringify(f)); }
    if (isNew) {
      const f = formOf({ ttfcSignatoryIds: cat.signatories.slice(0, 1).map((s) => s.id) }, cat.defaultTerms);
      setForm(f); setBase(JSON.stringify(f));
    }
  }, [isNew, mou, cat, form]);

  const value = form ? JSON.stringify(form) : "";
  const dirty = !!form && value !== base;
  const status = mou?.status || "draft";
  const editable = isNew || status === "draft";
  const ctx = useMemo(() => ({ partner: form?.partner.name.trim(), event: mou?.eventName || current?.name || "" }), [form, mou, current]);

  const setMou = (m) => {
    existing.setData((d) => ({ ...(d || {}), mou: m }));
    const f = formOf(m, cat.defaultTerms); setForm(f); setBase(JSON.stringify(f));
  };

  const saveDraft = async ({ quiet = false } = {}) => {
    if (!form.partner.name.trim()) { if (!quiet) toast.error("Enter the partner's name."); return "Enter the partner's name."; }
    const body = bodyOf(form);
    if (isNew) {
      const r = await adminFetch("/console/mous", { method: "POST", body: { ...body, eventKey, eventName: current?.name || "", eventYear: current?.year || String(current?.startDate || "").slice(0, 4) } });
      setBase(value);
      navigate(`/admin/mous/${r.mou.id}`, { replace: true });
      return true;
    }
    const r = await adminFetch(`/console/mous/${mou.id}`, { method: "PATCH", body });
    existing.setData((d) => ({ ...(d || {}), mou: r.mou }));
    setBase(value);
    return true;
  };

  const auto = useAutosave({ value, enabled: editable && !!form, save: async () => (dirty && !saving ? saveDraft({ quiet: true }) : false) });

  const save = async () => {
    setSaving(true);
    try { const ok = await saveDraft(); if (ok === true) { auto.markSaved(); toast.success(isNew ? "MOU created" : "Saved"); } }
    catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  const post = async (path, body, msg) => {
    try { const r = await adminFetch(`/console/mous/${mou.id}${path}`, { method: "POST", body }); setMou(r.mou); if (msg) toast.success(msg); return r.mou; }
    catch (err) { toast.error(err); return null; }
  };
  const download = (format) => downloadFile(`/console/mous/${mou.id}/file?format=${format}`, `${mou.number}.${format}`).catch((e) => toast.error(e));
  const exportAs = async (format) => {
    const m = status === "exported" ? mou : await post("/export", {}, "Exported");
    if (m) download(format);
  };

  if (!isNew && existing.loading) return <LoadingState />;
  if (!isNew && existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />;
  if (isNew && !current) return <ErrorState title="Choose an event first" error={{ message: "Pick the event in the top bar, then start the MOU." }} />;
  if (catalogue.error) return <ErrorState error={catalogue.error} onRetry={catalogue.reload} />;
  if (!form || !cat) return <LoadingState />;

  const view = tab || (editable ? "build" : "review");
  const set = (path, v) => setForm((f) => {
    const [a, b] = path.split(".");
    return b ? { ...f, [a]: { ...f[a], [b]: v } } : { ...f, [a]: v };
  });
  const setTerm = (k, v) => setForm((f) => ({ ...f, terms: { ...f.terms, [k]: v } }));
  const can = mou?.can || {};
  const blocked = mou?.checks?.some((c) => c.level === "block");

  return (
    <div>
      <Link to="/admin/mous" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-ttfc-muted hover:text-ttfc-text"><ArrowLeft className="h-3.5 w-3.5" /> MOUs</Link>
      <PageHeader title={isNew ? "New MOU" : `${mou.number} · ${mou.partner?.name}`}
        status={!isNew && <Badge tone={MOU_STATUS_TONE[status]}>{MOU_STATUS_LABEL[status]}</Badge>}
        description={isNew ? `For ${current?.name}. Saved as a draft; nothing is sent to the partner from here.`
          : `${mou.eventName || mou.eventKey} · made by ${mou.createdBy}${mou.exportedAt ? ` · ${status === "exported" ? "exported" : "last exported"} ${day(mou.exportedAt)} by ${mou.exportedBy}` : ""}`}
        actions={!isNew && <>
          {status === "draft" && <>
            <Button icon={Download} disabled={dirty} title={dirty ? "Save first" : "A draft copy, marked DRAFT"} onClick={() => download("pdf")}>Draft PDF</Button>
            <Button variant="primary" icon={Send} disabled={dirty || !can.review} title={dirty ? "Save first" : blocked ? "Fix what the Review tab lists first" : undefined}
              onClick={async () => { if (await post("/status", { status: "review" }, "Sent to review")) setTab("review"); }}>Send to review</Button>
          </>}
          {status !== "draft" && <>
            <Button icon={Undo2} onClick={async () => { if (await post("/status", { status: "draft" }, "Back to draft: you can edit it again")) setTab("build"); }}>Back to draft</Button>
            <Button icon={FileText} disabled={!can.export} onClick={() => exportAs("docx")}>{status === "exported" ? "Word" : "Export Word"}</Button>
            <Button variant="primary" icon={Download} disabled={!can.export} onClick={() => exportAs("pdf")}>{status === "exported" ? "PDF" : "Export PDF"}</Button>
          </>}
        </>} />

      {status === "review" && <Banner tone="info" className="mb-4" title="In review">Read it through below. Export makes the final PDF or Word file with TTFC's signers. To change anything, move it back to draft.</Banner>}
      {status === "exported" && <Banner tone="info" className="mb-4" title="Exported">This is the version that went out. Download it again any time. Back to draft lets you change it and export a new version.</Banner>}

      {!isNew && <Tabs value={view} onChange={setTab} tabs={[
        { key: "build", label: editable ? "Build" : "Details" },
        { key: "review", label: "Review", count: mou.checks.filter((c) => c.level === "block").length || undefined },
      ]} />}

      {view === "review" && mou ? <ReviewView mou={mou} dirty={dirty} /> : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle>Partner</SectionTitle>
              <div className="flex flex-col gap-3">
                <Field label="Organisation" required>{(fid) => <Input id={fid} value={form.partner.name} disabled={!editable} onChange={(e) => set("partner.name", e.target.value)} />}</Field>
                <Field label="Address">{(fid) => <Textarea id={fid} rows={2} value={form.partner.address} disabled={!editable} onChange={(e) => set("partner.address", e.target.value)} />}</Field>
                <Field label="Website">{(fid) => <Input id={fid} value={form.partner.website} disabled={!editable} onChange={(e) => set("partner.website", e.target.value)} />}</Field>
              </div>
            </Card>
            <Card>
              <SectionTitle>Contact</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">{(fid) => <Input id={fid} value={form.contact.name} disabled={!editable} onChange={(e) => set("contact.name", e.target.value)} />}</Field>
                <Field label="Title">{(fid) => <Input id={fid} value={form.contact.title} disabled={!editable} onChange={(e) => set("contact.title", e.target.value)} />}</Field>
                <Field label="Email">{(fid) => <Input id={fid} type="email" value={form.contact.email} disabled={!editable} onChange={(e) => set("contact.email", e.target.value)} />}</Field>
                <Field label="Phone">{(fid) => <Input id={fid} value={form.contact.phone} disabled={!editable} onChange={(e) => set("contact.phone", e.target.value)} />}</Field>
              </div>
            </Card>
          </div>

          <SideChecklist side="ttfc" title="What TTFC offers" form={form} setForm={setForm} cat={cat} ctx={ctx} disabled={!editable}
            hint="Tick each item, then set how many, when and any code for this partner. An item can wait for a ticket sales milestone." />
          <SideChecklist side="partner" title="What the partner delivers" form={form} setForm={setForm} cat={cat} ctx={ctx} disabled={!editable}
            hint="Tick what you want from the partner and set the details. Change the wording just for this MOU if you need to." />

          <Card className="mt-4">
            <SectionTitle>Terms</SectionTitle>
            <div className="flex flex-col gap-4">
              <Switch checked={form.terms.binding} disabled={!editable} onChange={(v) => setTerm("binding", v)} label="Binding"
                description={form.terms.binding ? "Both parties are legally bound by everything in it." : "Non-binding: it records what each side intends to do. Only confidentiality and use of logos bind."} />
              <Switch checked={form.terms.financial} disabled={!editable} onChange={(v) => setTerm("financial", v)} label="Money changes hands"
                description={form.terms.financial ? "Financial: set who pays and how much below." : "Non-financial: each party covers its own costs."} />
              {form.terms.financial && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Who pays">{(fid) => (
                    <Select id={fid} value={form.terms.payer} disabled={!editable} onChange={(e) => setTerm("payer", e.target.value)}>
                      <option value="partner">The partner pays TTFC</option>
                      <option value="ttfc">TTFC pays the partner</option>
                    </Select>
                  )}</Field>
                  <Field label="Amount (CAD, before tax)">{(fid) => <Input id={fid} inputMode="decimal" placeholder="0.00" value={form.terms.amount} disabled={!editable} onChange={(e) => setTerm("amount", e.target.value)} />}</Field>
                  <Field label="Payment details" className="sm:col-span-2">{(fid) => <Textarea id={fid} rows={2} placeholder="Due within 30 days of signing." value={form.terms.paymentNote} disabled={!editable} onChange={(e) => setTerm("paymentNote", e.target.value)} />}</Field>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Starts">{(fid) => <Input id={fid} type="date" value={form.terms.startDate} disabled={!editable} onChange={(e) => setTerm("startDate", e.target.value)} />}</Field>
                <Field label="Ends">{(fid) => <Input id={fid} type="date" value={form.terms.endDate} disabled={!editable} onChange={(e) => setTerm("endDate", e.target.value)} />}</Field>
              </div>
              <Field label="Purpose" hint="Leave empty for the standard sentence: both parties want to work together to promote the event.">{(fid) => <Textarea id={fid} rows={2} value={form.terms.purpose} disabled={!editable} onChange={(e) => setTerm("purpose", e.target.value)} />}</Field>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-ttfc-text">Standard clauses</p>
                <div className="flex flex-col gap-2">
                  {cat.clauses.map((c) => {
                    const on = form.terms.clauses.find((x) => x.key === c.key)?.on ?? c.on;
                    return (
                      <label key={c.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E3E0EE] px-3 py-2 text-sm">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#D6308C]" checked={on} disabled={!editable}
                          onChange={(e) => setTerm("clauses", cat.clauses.map((x) => ({ key: x.key, on: x.key === c.key ? e.target.checked : (form.terms.clauses.find((y) => y.key === x.key)?.on ?? x.on) })))} />
                        <span><span className="font-semibold">{c.title}</span><span className="block text-xs text-ttfc-muted">{c.body}</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <Field label="Other terms for this partner" hint="Anything else agreed. Leave a blank line between paragraphs.">{(fid) => <Textarea id={fid} rows={4} value={form.terms.custom} disabled={!editable} onChange={(e) => setTerm("custom", e.target.value)} />}</Field>
            </div>
          </Card>

          <Card className="mt-4">
            <SectionTitle>Who signs</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-sm font-semibold text-ttfc-text">For TTFC</p>
                {!cat.signatories.length && <p className="text-sm text-ttfc-muted">No signing authority yet. The super admin adds them in <Link className="underline" to="/admin/offerings">Offerings › Contract settings</Link>.</p>}
                <div className="flex flex-col gap-2">
                  {cat.signatories.map((s) => (
                    <label key={s.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[#E3E0EE] px-3 py-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 accent-[#D6308C]" checked={form.ttfcSignatoryIds.includes(s.id)} disabled={!editable}
                        onChange={(e) => set("ttfcSignatoryIds", e.target.checked ? [...form.ttfcSignatoryIds, s.id] : form.ttfcSignatoryIds.filter((x) => x !== s.id))} />
                      <span><span className="font-semibold">{s.name}</span>{s.title && <span className="text-ttfc-muted">, {s.title}</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-ttfc-text">For the partner</p>
                <div className="flex flex-col gap-2">
                  {form.partnerSigners.map((s, i) => (
                    <div key={i} className="grid gap-2 rounded-xl border border-[#E3E0EE] p-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input aria-label="Signer's name" placeholder="Name" value={s.name} disabled={!editable} onChange={(e) => set("partnerSigners", form.partnerSigners.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <Input aria-label="Signer's title" placeholder="Title" value={s.title} disabled={!editable} onChange={(e) => set("partnerSigners", form.partnerSigners.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                      {editable && <IconButton icon={X} label="Remove this signer" onClick={() => set("partnerSigners", form.partnerSigners.filter((_, j) => j !== i))} />}
                    </div>
                  ))}
                  {editable && form.partnerSigners.length < 3 && (
                    <div className="flex flex-wrap gap-2">
                      {form.contact.name && !form.partnerSigners.some((s) => s.name === form.contact.name) && (
                        <Button size="sm" icon={Plus} onClick={() => set("partnerSigners", [...form.partnerSigners, { name: form.contact.name, title: form.contact.title, email: form.contact.email }])}>The contact signs</Button>
                      )}
                      <Button size="sm" icon={Plus} onClick={() => set("partnerSigners", [...form.partnerSigners, { name: "", title: "", email: "" }])}>Add a signer</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <Field label="Internal notes" hint="For the team only. Never printed.">{(fid) => <Textarea id={fid} rows={2} value={form.notes} disabled={!editable} onChange={(e) => set("notes", e.target.value)} />}</Field>
          </Card>
        </>
      )}

      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E3E0EE] bg-white/95 py-3 backdrop-blur">
        <div className="flex gap-2">
          {can.remove && <Button variant="dangerOutline" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete draft</Button>}
        </div>
        {editable && (
          <div className="flex items-center gap-3">
            {!isNew && <AutosaveNote auto={auto} />}
            <Button variant="primary" loading={saving} disabled={!dirty && !isNew} onClick={save}>{isNew ? "Create draft" : "Save"}</Button>
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this draft?" body="It can't be brought back." confirmLabel="Delete"
        onConfirm={async () => { await adminFetch(`/console/mous/${mou.id}`, { method: "DELETE" }); toast.success("Deleted"); navigate("/admin/mous"); }} />
    </div>
  );
}
