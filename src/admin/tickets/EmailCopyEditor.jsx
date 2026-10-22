import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ListPlus, PenLine, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Input, Textarea } from "../ui";
import { listText } from "./speakerEmailHooks";
import { countSet } from "./passEmailHooks";

/* =========================================================
   Every word of a pass email, editable (Oct 19 2026)
   ---------------------------------------------------------
   One editor for the four pass emails (Speaker Pass, issued,
   exhibitor and the purchase confirmation), at both levels:
   the email template (every pass of that kind) and one pass.
   The server sends the fields (key, section, label, type:
   line | text | pairs | list, max, hint, tier) and the
   built-in text; this shows them grouped by section, each
   with its built-in text in grey and "Reset to default".
   Templates that cover every pass type keep the pass-type
   fields (`tier: true`: pass name, what's included…) per
   type: value.tiers[tier][key]. Backend: services/passEmailCopy.js.
   Everything staff type is plain text: the server escapes it.
========================================================= */

const isSet = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.length > 0);
const clone = (v) => JSON.parse(JSON.stringify(v ?? []));

const ROW_BTN = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ttfc-muted hover:bg-ttfc-contrast/5 hover:text-ttfc-text disabled:opacity-30";

/** A list field: the built-in list until staff choose to change it; then rows to reword, reorder, add and remove. */
function ListEditor({ field, value, builtIn = [], onChange, disabled }) {
  const pairs = field.type === "pairs";
  const rows = isSet(value) ? value : null;
  if (!rows) {
    return (
      <div className="rounded-xl border border-dashed border-ttfc-line px-3 py-2.5">
        <ul className="space-y-1 text-sm text-ttfc-dim">
          {builtIn.length ? builtIn.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{pairs ? <><span className="text-ttfc-muted">{r[0]}</span>{r[1] ? ` · ${r[1]}` : ""}</> : r}</span>
            </li>
          )) : <li>Nothing by default.</li>}
        </ul>
        {!disabled && (
          <button type="button" onClick={() => onChange(builtIn.length ? clone(builtIn) : [pairs ? ["", ""] : ""])}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ttfc-pink hover:text-ttfc-contrast">
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" /> Change this list
          </button>
        )}
      </div>
    );
  }
  const set = (i, part, v) => onChange(rows.map((r, j) => (j !== i ? r : pairs ? (part === 0 ? [v, r[1] ?? ""] : [r[0] ?? "", v]) : v)));
  const move = (i, d) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-2.5 w-5 shrink-0 text-right text-xs tabular-nums text-ttfc-dim">{i + 1}.</span>
          <div className="grid min-w-0 flex-1 gap-1">
            <Input value={pairs ? r[0] ?? "" : r} onChange={(e) => set(i, 0, e.target.value)} placeholder={pairs ? "Heading" : "Item"}
              maxLength={pairs ? 120 : 300} disabled={disabled} aria-label={`${field.label} ${i + 1}${pairs ? ": heading" : ""}`} className="py-2" />
            {pairs && (
              <Input value={r[1] ?? ""} onChange={(e) => set(i, 1, e.target.value)} placeholder="Detail (optional)" maxLength={200}
                disabled={disabled} aria-label={`${field.label} ${i + 1}: detail`} className="py-1.5 text-xs text-ttfc-muted" />
            )}
          </div>
          {!disabled && (
            <div className="flex shrink-0">
              <button type="button" className={ROW_BTN} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move item ${i + 1} up`} title="Move up"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" className={ROW_BTN} onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move item ${i + 1} down`} title="Move down"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" className={ROW_BTN} onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`} title="Remove"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          )}
        </div>
      ))}
      {!disabled && rows.length < (field.max || 20) && (
        <button type="button" onClick={() => onChange([...rows, pairs ? ["", ""] : ""])}
          className="inline-flex items-center gap-1.5 self-start pl-6 text-xs font-semibold text-ttfc-pink hover:text-ttfc-contrast">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add an item
        </button>
      )}
    </div>
  );
}

function FieldRow({ field, value, builtIn, onChange, disabled, tierLabel }) {
  const set = isSet(value);
  const id = `ec-${field.key}`;
  const builtInText = Array.isArray(builtIn) ? "" : String(builtIn ?? "");
  const rows = field.type === "text" ? Math.min(6, Math.max(2, Math.ceil((String(value || builtInText).length || 1) / 70))) : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={field.type === "pairs" || field.type === "list" ? undefined : id} className="text-[13px] font-semibold text-ttfc-text/90">
          {field.label}
          {field.tier && tierLabel && <span className="ml-1.5 rounded-full bg-ttfc-purple/20 px-1.5 py-0.5 text-[10px] font-semibold text-ttfc-text/80">{tierLabel} only</span>}
          {set && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-ttfc-pink">Changed</span>}
        </label>
        {set && !disabled && (
          <button type="button" onClick={() => onChange(field.type === "pairs" || field.type === "list" ? [] : "")}
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-ttfc-muted hover:text-ttfc-text">
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset to default
          </button>
        )}
      </div>
      {field.type === "pairs" || field.type === "list" ? (
        <ListEditor field={field} value={value} builtIn={Array.isArray(builtIn) ? builtIn : []} onChange={onChange} disabled={disabled} />
      ) : field.type === "text" ? (
        <Textarea id={id} rows={rows} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={builtInText} maxLength={field.max} disabled={disabled} />
      ) : (
        <Input id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={builtInText} maxLength={field.max} disabled={disabled} />
      )}
      {field.hint && <p className="text-xs text-ttfc-dim">{field.hint}</p>}
    </div>
  );
}

/**
 * @param {object} p
 * @param {Array} p.fields     the server's field list ({ key, section, label, type, max, hint, tier })
 * @param {Array} p.sections   [{ key, title }] in the email's order
 * @param {object} p.value     staff's wording ("" / [] = built-in); `tiers[tier]` for the pass-type fields
 * @param {Function} p.onChange (next value) => void
 * @param {object} p.defaults  each field's built-in text for what's being edited (placeholders not filled in)
 * @param {string} [p.tier]    the pass type being edited, in a template that covers every pass type
 * @param {string} [p.tierLabel]
 * @param {string[]} [p.placeholders] e.g. ["{firstName}", "{passName}"]
 * @param {string} [p.note]    a line under the placeholders (what this level means)
 */
export function EmailCopyEditor({ fields = [], sections = [], value = {}, onChange, defaults = {}, tier = null, tierLabel = "", placeholders = [], note, disabled }) {
  const [q, setQ] = useState("");
  const get = (f) => (f.tier && tier ? value?.tiers?.[tier]?.[f.key] : value?.[f.key]);
  const put = (f, v) => {
    if (f.tier && tier) {
      const tiers = { ...(value?.tiers || {}) };
      tiers[tier] = { ...(tiers[tier] || {}), [f.key]: v };
      onChange({ ...value, tiers });
    } else onChange({ ...value, [f.key]: v });
  };
  const needle = q.trim().toLowerCase();
  const matches = (f) => {
    if (!needle) return true;
    const d = defaults?.[f.key];
    const text = [f.label, f.hint, Array.isArray(d) ? d.flat().join(" ") : d, JSON.stringify(get(f) ?? "")].join(" ").toLowerCase();
    return text.includes(needle);
  };
  const groups = useMemo(() => sections
    .map((s) => ({ ...s, fields: fields.filter((f) => f.section === s.key) }))
    .filter((s) => s.fields.length), [fields, sections]);
  const changed = countSet(value, fields, tier);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-ttfc-line bg-ttfc-panel2 px-3 py-2.5 text-xs leading-relaxed text-ttfc-muted">
        Empty fields use the built-in text shown in grey.
        {placeholders.length > 0 && <> {listText(placeholders)} are filled in for each person.</>}
        {" "}Plain text only: line breaks are kept, nothing becomes HTML.
        {note && <span className="mt-1 block text-ttfc-text/80">{note}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ttfc-dim" aria-hidden="true" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a field or a word in the email" className="py-2 pl-9" aria-label="Find a field" />
        </div>
        <span className="text-xs text-ttfc-muted">{changed ? `${changed} changed` : "Nothing changed"}</span>
      </div>
      {groups.map((g) => {
        const shown = g.fields.filter(matches);
        if (!shown.length) return null;
        const n = countSet(value, g.fields, tier);
        return (
          <details key={`${g.key}${needle ? "-q" : ""}`} open={!!needle || n > 0 || g.key === groups[0].key} className="group rounded-xl border border-ttfc-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2"><ListPlus className="h-4 w-4 text-ttfc-dim transition group-open:rotate-90" aria-hidden="true" />{g.title}</span>
              {n > 0 && <span className="rounded-full bg-ttfc-pink/20 px-2 py-0.5 text-[11px] text-ttfc-contrast">{n} changed</span>}
            </summary>
            <div className="flex flex-col gap-4 border-t border-ttfc-line px-3 py-3">
              {g.hint && <p className="-mb-1 text-xs text-ttfc-muted">{g.hint}</p>}
              {shown.map((f) => (
                <FieldRow key={f.key} field={f} value={get(f)} builtIn={defaults?.[f.key]} onChange={(v) => put(f, v)} disabled={disabled} tierLabel={tierLabel} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** The email in a sandboxed frame (no scripts, no same-origin access), with its plain-text version. */
export function EmailPreview({ preview, loading, error, title = "Email preview", className = "h-[70vh] min-h-[460px]", attachment }) {
  const [mode, setMode] = useState("html");
  if (!preview) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-ttfc-line">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ttfc-line bg-ttfc-panel2 px-3 py-2 text-xs">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate"><span className="text-ttfc-dim">Subject</span> <b>{preview.subject || "—"}</b></p>
          {preview.preheader && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Preview text</span> {preview.preheader}</p>}
          {preview.to && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">To:</span> {preview.to}</p>}
          {preview.cc?.length > 0 && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Cc:</span> {listText(preview.cc)}</p>}
          {attachment && <p className="truncate text-ttfc-muted"><span className="text-ttfc-dim">Attached:</span> {attachment}</p>}
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[11px] text-ttfc-dim">Updating…</span>}
          {preview.text && (
            <div className="flex gap-1" role="tablist" aria-label="Email format">
              {[["html", "Email"], ["text", "Plain text"]].map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${mode === k ? "bg-ttfc-purple/30 text-ttfc-contrast" : "text-ttfc-muted hover:text-ttfc-text"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <p className="border-b border-ttfc-line bg-red-500/10 px-3 py-2 text-xs text-red-200">{error.message || String(error)}</p>}
      {mode === "html" || !preview.text
        ? <iframe title={title} sandbox="" srcDoc={preview.html || ""} className={`block w-full bg-white ${className}`} />
        : <pre className={`overflow-auto whitespace-pre-wrap bg-ttfc-ink px-4 py-3 font-mono text-xs leading-relaxed text-ttfc-muted ${className}`}>{preview.text}</pre>}
    </div>
  );
}
