import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { HelpLabel } from "../HelpButton";

/* Pick several from a list, and add your own (Nov 26 2026, the owner: "select multiple tech pillars, or multiple
   sectors from the drop down … add a custom sector or a pillar"). The session editor's Tech pillars and Sectors.
     options  the built-in ones: [{ value, label }] (saved by value)
     extras   names staff added: [name] (saved as the name)
     value    what this session has: [value | name], in the order picked
   The dropdown stays open while you tick; "Add your own" at its foot saves the name for every session's list. */
const cx = (...a) => a.filter(Boolean).join(" ");

export default function TagPicker({ label, noun = "item", options, extras = [], value = [], onChange, onAddExtra, disabled, max = 8 }) {
  const id = useId();
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const known = [...options, ...extras.filter((n) => !options.some((o) => o.value === n)).map((n) => ({ value: n, label: n, extra: true }))];
  // Something saved on this session that is no longer in either list still shows, so it can be kept or removed.
  const all = [...known, ...value.filter((v) => !known.some((o) => o.value === v)).map((v) => ({ value: v, label: v, extra: true }))];
  const labelOf = (v) => all.find((o) => o.value === v)?.label || v;
  const full = value.length >= max;
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : full ? value : [...value, v]);

  const addOwn = async () => {
    const name = draft.replace(/\s+/g, " ").trim();
    if (!name || busy) return;
    setErr("");
    const builtIn = options.find((o) => o.label.toLowerCase() === name.toLowerCase());
    if (builtIn) { if (!value.includes(builtIn.value) && !full) onChange([...value, builtIn.value]); setDraft(""); return; }
    setBusy(true);
    try {
      const saved = await onAddExtra(name);
      if (saved && !value.includes(saved) && !full) onChange([...value, saved]);
      setDraft("");
    } catch (e) { setErr(e?.message || "That couldn't be added. Try again."); } finally { setBusy(false); }
  };

  return (
    <div ref={boxRef} className="relative flex flex-col gap-[5px]">
      <HelpLabel label={label} htmlFor={id}>{label}</HelpLabel>
      <button id={id} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cx("flex min-h-[40px] w-full items-center gap-2 rounded-[10px] border border-[#D9D5E6] bg-white px-3 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D6308C]", disabled && "cursor-not-allowed opacity-60")}>
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {value.length === 0 && <span className="text-[#8A86A0]">None</span>}
          {value.map((v) => (
            <span key={v} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#F1EDFB] py-0.5 pl-2.5 pr-1 text-[13px] font-semibold text-[#151035]">
              <span className="truncate">{labelOf(v)}</span>
              {!disabled && (
                <span role="button" tabIndex={0} aria-label={`Remove ${labelOf(v)}`} className="rounded-full p-0.5 hover:bg-white"
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggle(v); } }}>
                  <X className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
            </span>
          ))}
        </span>
        <ChevronDown className={cx("h-4 w-4 shrink-0 text-[#6B6688] transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-[#E3E0EE] bg-white p-1.5 shadow-[0_14px_34px_rgba(21,16,53,.14)]">
          <ul role="listbox" aria-multiselectable="true" aria-label={label} className="max-h-60 overflow-y-auto">
            {all.map((o) => {
              const on = value.includes(o.value);
              return (
                <li key={o.value} role="option" aria-selected={on}>
                  <button type="button" disabled={!on && full} onClick={() => toggle(o.value)}
                    className={cx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none hover:bg-[#F6F5FA] focus-visible:ring-2 focus-visible:ring-[#D6308C] disabled:cursor-not-allowed disabled:opacity-50", on && "font-semibold text-[#151035]")}>
                    <span className={cx("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border", on ? "border-[#D6308C] bg-[#D6308C] text-white" : "border-[#CFCBE0] text-transparent")} aria-hidden="true"><Check className="h-3 w-3" /></span>
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.extra && <span className="shrink-0 text-[11px] text-[#8A86A0]">added</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-[#F0EEF6] px-1 pt-2">
            <div className="flex gap-1.5">
              <input value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} placeholder={`Add your own ${noun}`} aria-label={`Add your own ${noun}`}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwn(); } }}
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#D9D5E6] bg-white px-2.5 text-sm text-[#151035] outline-none focus:border-[#D6308C]" />
              <button type="button" onClick={addOwn} disabled={!draft.trim() || busy}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#151035] px-3 text-sm font-semibold text-white disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />{busy ? "Adding…" : "Add"}
              </button>
            </div>
            {err && <p role="alert" className="px-1 pt-1 text-xs text-red-600">{err}</p>}
            <p className="px-1 pb-0.5 pt-1.5 text-[11px] text-[#8A86A0]">{full ? `That's the most a session can have (${max}). Remove one to add another.` : `Tick as many as apply (up to ${max}). One you add is offered on every session.`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
