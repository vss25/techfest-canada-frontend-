import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useApi } from "../hooks";
import { ADMIN_API, api, getToken } from "../api";
import { useToast } from "../toastContext";
import { Button, ConfirmDialog, Drawer, ErrorState, Field, Input, LoadingState, Textarea } from "../ui";
import { when } from "../format";
import { CopyFields } from "./SpeakerEmailCompose";

/* =========================================================
   Exhibitor passes: the Exhibitor Manual PDF and the email defaults
   ---------------------------------------------------------
   ManualDrawer   every word of the manual (backend
                  services/exhibitorManual.js DEFAULT_MANUAL), with a
                  live PDF preview; Save applies to every exhibitor
                  pass email from then on.
   EmailDrawer    the default subject / headline / message for every
                  exhibitor pass (a pass's own wording still wins).
   PdfModal       one PDF (a pass's attachment, or an unsaved one).
   usePdf         fetches a PDF from the admin API as a blob URL.
========================================================= */

/** A PDF from the admin API as an object URL (POST when `body` is given). Re-fetches when the body changes. */
function usePdf(path, body, { enabled = true, delay = 600 } = {}) {
  const key = `${path} ${body === undefined ? "" : JSON.stringify(body)}`;
  const [state, setState] = useState({ url: null, error: null, key: null });
  const seq = useRef(0);
  useEffect(() => {
    if (!enabled || !path) return undefined;
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${ADMIN_API}${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: { Authorization: `Bearer ${getToken()}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
          ...(body === undefined ? {} : { body: key.slice(path.length + 1) }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Couldn't build the PDF (${res.status})`);
        const url = URL.createObjectURL(await res.blob());
        if (n !== seq.current) { URL.revokeObjectURL(url); return; }
        setState({ url, error: null, key });
      } catch (error) {
        if (n === seq.current) setState((s) => ({ ...s, error, key }));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [path, key, enabled, delay]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (state.url) URL.revokeObjectURL(state.url); }, [state.url]);
  return { url: state.url, error: state.error, loading: enabled && state.key !== key };
}

export function PdfFrame({ pdf, title = "Exhibitor Manual preview", className = "h-[72vh]" }) {
  if (pdf.error && !pdf.url) return <ErrorState error={pdf.error} title="Couldn't build the PDF" />;
  if (!pdf.url) return <LoadingState label="Building the PDF…" />;
  return (
    <div className="relative">
      <iframe src={`${pdf.url}#navpanes=0&view=FitH`} title={title} className={`w-full rounded-xl border border-ttfc-line bg-white ${className}`} />
      {pdf.loading && <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white">Updating…</span>}
    </div>
  );
}

/** One PDF in a drawer: `path` (GET) or `path` + `body` (POST). */
export function PdfModal({ open, onClose, title, path, body }) {
  const pdf = usePdf(open ? path : null, body, { delay: 0, enabled: open });
  return (
    <Drawer open={open} onClose={onClose} title={title} width="max-w-4xl"
      footer={(
        <>
          {pdf.url && <a href={pdf.url} download={`${title || "Exhibitor Manual"}.pdf`} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-ttfc-pink hover:underline"><FileText className="h-4 w-4" aria-hidden="true" /> Download</a>}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </>
      )}
    >
      <PdfFrame pdf={pdf} className="h-[76vh]" />
    </Drawer>
  );
}

/* ---------- the manual editor ---------- */

const get = (obj, p) => p.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
function set(obj, p, v) {
  const keys = p.split(".");
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] = Array.isArray(cur[keys[i]]) ? [...cur[keys[i]]] : { ...cur[keys[i]] };
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = v;
  return out;
}

const pairsText = (list) => (list || []).map((p) => (p[1] ? `${p[0]} | ${p[1]}` : p[0])).join("\n");
const textPairs = (t) => t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
  const i = l.indexOf("|");
  return i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
});
const linesText = (list) => (list || []).join("\n");
const textLines = (t) => t.split("\n").map((l) => l.trim()).filter(Boolean);
const daysText = (days) => (days || []).map((d) => [`# ${d.title}`, ...(d.rows || []).map((r) => `${r[0]} | ${r[1]}`)].join("\n")).join("\n\n");
function textDays(t) {
  const days = [];
  for (const raw of t.split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith("#")) { days.push({ title: l.replace(/^#+\s*/, ""), rows: [] }); continue; }
    if (!days.length) days.push({ title: "", rows: [] });
    const i = l.indexOf("|");
    days[days.length - 1].rows.push(i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]);
  }
  return days;
}

/** A textarea holding a list, parsed on every change (local text so typing isn't reformatted). */
function ListText({ label, hint, value, toText, fromText, rows = 5, onChange }) {
  const [text, setText] = useState(() => toText(value));
  return (
    <Field label={label} hint={hint}>
      {(id) => <Textarea id={id} rows={rows} value={text} onChange={(e) => { setText(e.target.value); onChange(fromText(e.target.value)); }} className="font-mono text-[12.5px]" />}
    </Field>
  );
}

function Vendors({ value = [], onChange }) {
  const change = (i, k, v) => onChange(value.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="flex flex-col gap-3">
      {value.map((v, i) => (
        <div key={i} className="rounded-xl border border-ttfc-line p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Heading">{(id) => <Input id={id} value={v.title} onChange={(e) => change(i, "title", e.target.value)} />}</Field>
            <Field label="Vendor (right-hand side)">{(id) => <Input id={id} value={v.vendor} onChange={(e) => change(i, "vendor", e.target.value)} />}</Field>
          </div>
          <Field label="Text" className="mt-3">{(id) => <Textarea id={id} rows={3} value={v.text} onChange={(e) => change(i, "text", e.target.value)} />}</Field>
          <Field label="Small note" className="mt-3">{(id) => <Input id={id} value={v.note} onChange={(e) => change(i, "note", e.target.value)} />}</Field>
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ttfc-muted hover:text-red-200">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove this vendor
          </button>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={Plus} onClick={() => onChange([...value, { title: "", vendor: "", text: "", note: "" }])}>Add a vendor</Button>
    </div>
  );
}

const PAIRS_HINT = "One per line: the bold part, then | and the text.";
const B = ["bold", "Section title, bold part"];
const L = ["light", "Section title, light part"];
const SECTIONS = [
  { title: "Page header and footer (every page)", fields: [
    ["header.dates", "Dates"], ["header.venue", "Venue"], ["header.label", "Label, top right"], ["header.subtitle", "Subtitle, top right"],
    ["footer.label", "Footer, bold part"], ["footer.text", "Footer text"],
  ] },
  { title: "Page 1: title, key dates, booth allocation", fields: [
    ["title.bold", "Title, bold part"], ["title.light", "Title, light part"],
    ["keyDates", "Key dates band", "pairs", "One per line: label | date."],
    ["allocation.title", "Booth allocation heading"],
    ["allocation.labels", "Booth allocation field labels", "lines", "Four lines: company, booth, zone, passes. Each pass fills these in."],
    ["allocation.note", "Note under the band", "long"],
  ] },
  { title: "1 · Run of show", fields: [
    ["runOfShow." + B[0], B[1]], ["runOfShow." + L[0], L[1]],
    ["runOfShow.columns", "Column headings", "lines", "Two lines."],
    ["runOfShow.days", "Days and times", "days", "A line starting with # starts a day. Then one line per time: time | what happens."],
    ["needs.title", "“What we need from you” heading"],
    ["needs.items", "“What we need from you” items", "pairs", PAIRS_HINT],
  ] },
  { title: "2 · Your booth", fields: [
    ["booth." + B[0], B[1]], ["booth." + L[0], L[1]], ["booth.intro", "Intro", "long"],
    ["booth.sign", "Booth sign on the drawing (when the pass has no company)"],
    ["booth.items", "What's included (numbered on the drawing)", "pairs", "One per line: item | description (the description can be empty)."],
    ["booth.height", "Height label"], ["booth.width", "Width label"],
    ["booth.caption", "Caption under the drawing", "long"],
    ["booth.notes", "Notes under the drawing", "pairs", PAIRS_HINT],
  ] },
  { title: "3 · Ordering extras", fields: [
    ["extras." + B[0], B[1]], ["extras." + L[0], L[1]], ["extras.intro", "Intro", "long"], ["extras.vendors", "Vendors", "vendors"],
  ] },
  { title: "4 · On-site rules", fields: [
    ["rules." + B[0], B[1]], ["rules." + L[0], L[1]], ["rules.items", "Rules", "pairs", PAIRS_HINT],
  ] },
  { title: "5 · Return form", fields: [
    ["returnForm." + B[0], B[1]], ["returnForm." + L[0], L[1]], ["returnForm.intro", "Intro", "long"],
    ["returnForm.badges.title", "A. Badge holders heading"], ["returnForm.badges.text", "A. Text", "long"],
    ["returnForm.badges.columns", "A. Column headings", "lines", "Four lines."],
    ["returnForm.badges.rows", "A. Number of rows", "number"],
    ["returnForm.badges.note", "A. Note", "long"],
    ["returnForm.fascia.title", "B. Fascia heading"], ["returnForm.fascia.text", "B. Text", "long"],
    ["returnForm.fascia.fieldLabel", "B. Field label"], ["returnForm.fascia.hint", "B. Field hint"],
    ["returnForm.fascia.exampleLabel", "B. Example label"],
    ["returnForm.fascia.example", "B. Example sign (when the pass has no company)"], ["returnForm.fascia.exampleHint", "B. Example hint"],
    ["returnForm.needs.title", "C. Heading"], ["returnForm.needs.kicker", "C. Line above the tick boxes"],
    ["returnForm.needs.options", "C. Tick boxes", "lines", "One per line (up to six)."],
    ["returnForm.needs.contactLabels", "C. Field labels", "lines", "Four lines."],
    ["returnForm.needs.notesLabel", "C. Notes box label"],
    ["returnForm.declaration", "Declaration", "long"],
    ["returnForm.office.title", "Office-use heading"], ["returnForm.office.labels", "Office-use labels", "lines"],
  ] },
  { title: "Contact band (end of page 4)", fields: [
    ["contact.tagline", "Tagline"], ["contact.site", "Website"], ["contact.dates", "Dates"], ["contact.address", "Address"],
    ["contact.lines", "Contact lines", "pairs", "One per line: label | email or phone."],
  ] },
];

function ManualFields({ manual, onChange, disabled }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      {SECTIONS.map((s, i) => (
        <section key={s.title} className="rounded-xl border border-ttfc-line">
          <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold">
            {s.title}
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {open === i && (
            <fieldset disabled={disabled} className="flex flex-col gap-3 border-t border-ttfc-line px-4 py-4">
              {s.fields.map(([p, label, type = "text", hint]) => {
                const v = get(manual, p);
                const change = (x) => onChange(set(manual, p, x));
                if (type === "pairs") return <ListText key={p} label={label} hint={hint} value={v} toText={pairsText} fromText={textPairs} onChange={change} />;
                if (type === "lines") return <ListText key={p} label={label} hint={hint} value={v} toText={linesText} fromText={textLines} rows={4} onChange={change} />;
                if (type === "days") return <ListText key={p} label={label} hint={hint} value={v} toText={daysText} fromText={textDays} rows={16} onChange={change} />;
                if (type === "vendors") return <Field key={p} label={label}>{() => <Vendors value={v} onChange={change} />}</Field>;
                if (type === "number") return <Field key={p} label={label}>{(id) => <Input id={id} type="number" min={1} max={12} value={v} onChange={(e) => change(Number(e.target.value) || 1)} className="max-w-[120px]" />}</Field>;
                if (type === "long") return <Field key={p} label={label}>{(id) => <Textarea id={id} rows={3} value={v || ""} onChange={(e) => change(e.target.value)} />}</Field>;
                return <Field key={p} label={label}>{(id) => <Input id={id} value={v || ""} onChange={(e) => change(e.target.value)} />}</Field>;
              })}
            </fieldset>
          )}
        </section>
      ))}
    </div>
  );
}

const SAMPLE = { company: "Acme Robotics", booth: "07", zone: "Zone A - Harbour Ballroom Foyer", passes: "4", name: "Jane Doe", title: "Head of Sales", email: "jane@acme.com" };

/** Every word of the Exhibitor Manual, with a live PDF preview. */
export function ManualDrawer({ base, canEdit, onClose }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(`${base}/manual`);
  const [draft, setDraft] = useState(null);
  const [version, setVersion] = useState(0); // remounts the list fields after a load / reset
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sample, setSample] = useState(SAMPLE);
  const manual = draft || data?.manual || null;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(data?.manual);
  const body = useMemo(() => (manual ? { manual, ...sample } : undefined), [manual, sample]);
  const pdf = usePdf(manual ? `${base}/manual/preview` : null, body, { enabled: !!manual, delay: 700 });

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${base}/manual`, { manual: draft });
      setData(r);
      setDraft(null);
      setVersion((v) => v + 1);
      toast.success("Manual saved. Every exhibitor pass email attaches this version from now on.");
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-[1400px]"
      title="Exhibitor Manual"
      description={data?.saved ? `The PDF attached to every exhibitor pass email. Last saved${data.updatedBy ? ` by ${data.updatedBy}` : ""} ${when(data.updatedAt)}.` : "The PDF attached to every exhibitor pass email. Using the built-in text."}
      footer={canEdit ? (
        <>
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>Save manual</Button>
          {dirty && <Button variant="ghost" onClick={() => { setDraft(null); setVersion((v) => v + 1); }}>Discard changes</Button>}
          <Button variant="ghost" icon={RotateCcw} className="ml-auto" disabled={!data} onClick={() => setResetting(true)}>Built-in text</Button>
        </>
      ) : undefined}
    >
      {loading ? <LoadingState label="Loading the manual…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : manual && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="min-w-0">
            {!canEdit && <p className="mb-3 text-sm text-ttfc-muted">Changing the manual is for management. You can read it and preview the PDF.</p>}
            <ManualFields key={version} manual={manual} onChange={setDraft} disabled={!canEdit} />
          </div>
          <div className="min-w-0 xl:sticky xl:top-0 xl:self-start">
            <p className="mb-2 text-sm font-semibold">Preview{dirty ? " (unsaved changes)" : ""}</p>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["company", "Sample company"], ["booth", "Booth"], ["zone", "Zone"], ["passes", "Passes"]].map(([k, l]) => (
                <Input key={k} aria-label={l} placeholder={l} value={sample[k]} onChange={(e) => setSample((s) => ({ ...s, [k]: e.target.value }))} />
              ))}
            </div>
            <PdfFrame pdf={pdf} />
            <p className="mt-2 text-xs text-ttfc-dim">Each exhibitor's PDF has their own company, booth, zone and passes on page 1 and their company on the booth sign; the pass holder is the first badge holder on the return form.</p>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        title="Go back to the built-in text?"
        body="Every field goes back to the original manual's wording. Nothing changes until you click Save manual."
        confirmLabel="Use the built-in text"
        tone="primary"
        onConfirm={() => { setDraft(structuredClone(data.defaults)); setVersion((v) => v + 1); }}
      />
    </Drawer>
  );
}

/** The default email wording for every exhibitor pass. */
export function EmailDrawer({ base, canEdit, onClose, onSaved }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi(`${base}/email`);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const copy = draft || data?.copy || { subject: "", headline: "", message: "" };
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(data?.copy);
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`${base}/email`, draft);
      setData(r);
      setDraft(null);
      toast.success("Email wording saved for every exhibitor pass");
      onSaved?.();
    } catch (err) { toast.error(err); } finally { setSaving(false); }
  };
  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title="Exhibitor pass email"
      description={`The wording every exhibitor pass email starts from. A pass's own wording (Edit on the list) still wins.${data?.updatedBy ? ` Last saved by ${data.updatedBy} ${when(data.updatedAt)}.` : ""}`}
      footer={canEdit ? (
        <>
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={save}>Save wording</Button>
          {dirty && <Button variant="ghost" onClick={() => setDraft(null)}>Discard changes</Button>}
        </>
      ) : undefined}
    >
      {loading ? <LoadingState label="Loading…" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <CopyFields value={copy} onChange={(c) => setDraft({ subject: c.subject || "", headline: c.headline || "", message: c.message || "" })} defaults={data?.defaults || {}} disabled={!canEdit} />
      )}
    </Drawer>
  );
}
