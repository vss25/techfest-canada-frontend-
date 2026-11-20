import { useState } from "react";
import { Check, Download, Trash2, Upload } from "lucide-react";
import { api } from "../api";
import { useToast } from "../toastContext";
import { ITEM_STATUS, parseCsv } from "./calendarShared";
import { Badge, Banner, Button, Card, Field, Input, Modal, Select, TableWrap, Textarea } from "../ui";

/* Content calendar items (Nov 20 2026): anything planned for a day that isn't one of TTFC's own
   composed social posts — an email, a partner's LinkedIn post about us, a reminder to post. Added
   by hand or from an uploaded spreadsheet; marked done by hand with the day it went out, so the
   calendar shows planned vs executed. API: /console/content-calendar. */

const TONE = { planned: "neutral", done: "good", late: "warn", missed: "bad" };
const pretty = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }) : "");

async function readSheetFile(file) {
  if (/\.csv$|\.tsv$|\.txt$/i.test(file.name) || /^text\//.test(file.type)) return parseCsv(await file.text());
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an Excel file (.xlsx) or a CSV file. From Google Sheets: File › Download › Microsoft Excel.");
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);
  return rows.filter((r) => r.some((c) => c !== null && String(c).trim()));
}

const TEMPLATE = "Date,Title,Channel,By,Owner,Notes,Done date,Link\n2026-11-23,Vancouver tickets on sale,LinkedIn,,Lubna,Announce the three ticket types,,\n2026-11-25,Partner announcement post,LinkedIn,Fraser Basin Hydro,Baldeep,They post it; we share it,,\n2026-11-27,Sponsor spotlight email,Email,,Shweta,,,\n";

export function UploadModal({ onClose, onDone }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const pick = async (file) => {
    if (!file) return;
    setError(""); setCheck(null); setRows(null); setFileName(file.name); setBusy(true);
    try {
      const r = await readSheetFile(file);
      const out = await api.post("/console/content-calendar/import", { rows: r, dryRun: true });
      setRows(r); setCheck(out);
    } catch (err) { setError(err?.message || "That file couldn't be read."); } finally { setBusy(false); }
  };
  const add = async () => {
    setBusy(true);
    try {
      const out = await api.post("/console/content-calendar/import", { rows });
      toast.success(`${out.added} ${out.added === 1 ? "item" : "items"} added to the calendar.`);
      onDone(out);
    } catch (err) { toast.error(err); } finally { setBusy(false); }
  };
  const template = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    a.download = "ttfc-content-calendar-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Modal open size="lg" onClose={() => { if (!busy) onClose(); }} title="Upload a spreadsheet"
      description="Each row becomes one item on the calendar. The first row must be the column names."
      footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" icon={Upload} loading={busy} disabled={!check || !check.added} onClick={add}>{check?.added ? `Add ${check.added} to the calendar` : "Add to the calendar"}</Button></>}>
      <div className="space-y-4">
        <div className="rounded-xl border border-[#E3E0EE] bg-[#F6F5FA] p-4 text-[13px] leading-5 text-[#4A4566]">
          <p><strong className="text-[#151035]">Columns it needs:</strong> Date and Title.</p>
          <p><strong className="text-[#151035]">Columns it also reads:</strong> Channel (LinkedIn, Instagram, X, Email…), By (the partner, when they post it; leave empty for TTFC), Owner, Notes, Done date, Link.</p>
          <button type="button" onClick={template} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#9D1D63] hover:underline"><Download className="h-4 w-4" aria-hidden="true" />Download an example to fill in</button>
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#C9C4D9] px-4 py-8 text-center text-sm text-[#4A4566] hover:border-[#D6308C]">
          <Upload className="h-6 w-6" aria-hidden="true" />
          <span className="font-semibold text-[#151035]">{fileName || "Choose an Excel (.xlsx) or CSV file"}</span>
          <span className="text-xs">From Google Sheets: File › Download › Microsoft Excel</span>
          <input type="file" accept=".xlsx,.csv,.tsv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {error && <Banner tone="danger" title="This file can't be used yet">{error}</Banner>}
        {check && (
          <div className="space-y-3">
            <Banner tone={check.added ? "good" : "warn"} title={check.added ? `${check.added} ${check.added === 1 ? "row is" : "rows are"} ready to add` : "No rows can be added"}>
              {check.skipped.length ? `${check.skipped.length} ${check.skipped.length === 1 ? "row" : "rows"} will be left out (listed below). Fix them in the sheet and upload again, or add them by hand.` : "Check the first few below, then add them."}
            </Banner>
            {check.preview?.length > 0 && (
              <TableWrap>
                <thead><tr><th>Date</th><th>Title</th><th>Channel</th><th>By</th></tr></thead>
                <tbody>{check.preview.map((p, i) => <tr key={i}><td className="whitespace-nowrap">{pretty(p.date)}</td><td>{p.title}</td><td>{p.channel}</td><td>{p.by || "TTFC"}</td></tr>)}</tbody>
              </TableWrap>
            )}
            {check.skipped.length > 0 && (
              <ul className="list-disc pl-5 text-[13px] text-[#991B1B]">{check.skipped.slice(0, 10).map((s) => <li key={s.row}>Row {s.row}: {s.why}</li>)}</ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ItemModal({ item, date, channels, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !item;
  const [form, setForm] = useState({ title: item?.title || "", date: item?.date || date || "", channel: item?.channel || "LinkedIn", by: item?.by || "", ownerName: item?.ownerName || "", notes: item?.notes || "" });
  const [doneDate, setDoneDate] = useState(item?.doneDate || "");
  const [doneUrl, setDoneUrl] = useState(item?.doneUrl || "");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const today = new Date().toLocaleDateString("en-CA");

  const run = async (fn, msg) => { setBusy(true); try { await fn(); toast.success(msg); onSaved(); } catch (err) { toast.error(err); } finally { setBusy(false); } };
  const save = () => run(() => (isNew ? api.post("/console/content-calendar", form) : api.patch(`/console/content-calendar/${item.id}`, form)), isNew ? "Added to the calendar." : "Saved.");
  const markDone = () => run(() => api.patch(`/console/content-calendar/${item.id}`, { ...form, doneDate: doneDate || today, doneUrl }), "Marked as done.");
  const notDone = () => run(() => api.patch(`/console/content-calendar/${item.id}`, { doneDate: "", doneUrl: "" }), "Marked as not done.");
  const remove = () => { if (window.confirm("Remove this from the calendar?")) run(() => api.del(`/console/content-calendar/${item.id}`), "Removed."); };

  return (
    <Modal open size="lg" onClose={() => { if (!busy) onClose(); }} title={isNew ? "Add to the calendar" : "Calendar item"}
      description={isNew ? "For anything planned on a day: a post, an email, or something a partner will post about us." : undefined}
      footer={<>{!isNew && <Button variant="dangerOutline" icon={Trash2} onClick={remove} disabled={busy}>Remove</Button>}<span className="flex-1" /><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{isNew ? "Add" : "Save"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What is it?" required className="sm:col-span-2">
          {(id) => <Input id={id} value={form.title} onChange={set("title")} maxLength={200} placeholder="e.g. Partner announcement post" data-autofocus />}
        </Field>
        <Field label="Planned day" required>{(id) => <Input id={id} type="date" value={form.date} onChange={set("date")} />}</Field>
        <Field label="Where">
          {(id) => <Select id={id} value={form.channel} onChange={set("channel")}>{(channels || ["LinkedIn", "Instagram", "X", "Email", "Website", "Other"]).map((c) => <option key={c}>{c}</option>)}</Select>}
        </Field>
        <Field label="Who posts or sends it?" hint="Leave empty for TTFC. For a partner's own post, type the partner's name.">
          {(id) => <Input id={id} value={form.by} onChange={set("by")} maxLength={120} placeholder="e.g. Fraser Basin Hydro" />}
        </Field>
        <Field label="Who looks after it?" hint="The staff member who makes sure it happens.">
          {(id) => <Input id={id} value={form.ownerName} onChange={set("ownerName")} maxLength={120} />}
        </Field>
        <Field label="Notes" className="sm:col-span-2">{(id) => <Textarea id={id} rows={2} value={form.notes} onChange={set("notes")} maxLength={1000} />}</Field>
      </div>
      {!isNew && (
        <div className="mt-5 rounded-xl border border-[#E3E0EE] p-4">
          <h3 className="text-sm font-bold">{item.doneDate ? `Done on ${pretty(item.doneDate)}${item.doneByName ? ` · marked by ${item.doneByName}` : ""}` : "Has it gone out?"}</h3>
          <p className="mb-3 mt-0.5 text-xs text-[#6B6688]">When the post or email has gone out, record the day and paste its link. This is how the calendar knows what was done.</p>
          <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
            <Field label="Day it went out">{(id) => <Input id={id} type="date" value={doneDate || today} onChange={(e) => setDoneDate(e.target.value)} />}</Field>
            <Field label="Link to it (optional)">{(id) => <Input id={id} type="url" value={doneUrl} onChange={(e) => setDoneUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/…" />}</Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon={Check} onClick={markDone} disabled={busy}>{item.doneDate ? "Update" : "Mark as done"}</Button>
            {item.doneDate && <Button onClick={notDone} disabled={busy}>Not done after all</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** The month as a list: planned day beside the day it went out. */
export function PlanTable({ items, kpis, onOpen }) {
  if (!items.length) return null;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-base font-bold">Planned vs done</h2>
        <span className="text-xs text-[#6B6688]">{kpis.planned} planned · {kpis.done} done on time · {kpis.late} done late · {kpis.missed} not done · {kpis.ahead} still to come</span>
      </div>
      <TableWrap>
        <thead><tr><th>Planned</th><th>What</th><th>Where</th><th>By</th><th>Went out</th><th>Status</th></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="is-clickable" tabIndex={0} onClick={() => onOpen(it)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(it); }}>
              <td className="whitespace-nowrap">{pretty(it.date)}</td>
              <td className="font-semibold">{it.title}</td>
              <td>{it.channel}</td>
              <td>{it.by || "TTFC"}</td>
              <td className="whitespace-nowrap">{it.doneDate ? (it.doneUrl ? <a href={it.doneUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-[#9D1D63] hover:underline">{pretty(it.doneDate)} ↗</a> : pretty(it.doneDate)) : "—"}</td>
              <td><Badge tone={TONE[it.status]}>{ITEM_STATUS[it.status][2]}</Badge></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <span className="text-xs text-[#6B6688]">Click a row to mark it done, change it or remove it.</span>
    </Card>
  );
}
