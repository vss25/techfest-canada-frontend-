import { useEffect, useLayoutEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { focusRing } from "./ui";
import { cleanItem, splitPasted } from "./bulletList";

/* =========================================================
   A list typed as bullet points (Nov 24 2026, the owner: "I need bullet points in UX as I add ticket details").
   One input per bullet. Enter starts the next bullet, Backspace in an empty one removes it, pasting several lines
   makes one bullet each (bullet marks taken off), arrows move a bullet. Always at least one empty row to type in.
   `value` is the list of strings; empty rows are kept while editing (save with finishList from ./bulletList).
     <BulletListEditor id={id} value={list} onChange={setList} placeholder="e.g. Both conference days" />
========================================================= */

/* Each point is a one-row textarea that grows with its text, so a long point wraps instead of being cut off
   (Nov 25 2026, the owner: "the spacing, scrolling is such that its not easily manageable"). */
function PointInput({ inputRef, value, ...rest }) {
  const el = useRef(null);
  useLayoutEffect(() => {
    const t = el.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={(node) => { el.current = node; inputRef(node); }}
      rows={1}
      value={value}
      className="block min-h-[38px] w-full min-w-0 flex-1 resize-none overflow-hidden rounded-[9px] border border-[#E3E0EE] bg-white px-3 py-[8px] text-sm leading-[21px] text-[#151035] placeholder:text-[#8A86A0] transition focus:border-[#D6308C] focus:outline-none focus:ring-2 focus:ring-[#D6308C]/20 disabled:cursor-not-allowed disabled:bg-[#F6F5FA] disabled:text-[#6B6688]"
      {...rest}
    />
  );
}

const iconBtn = `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6B6688] transition hover:bg-[#FDF2F8] hover:text-[#D6308C] disabled:pointer-events-none disabled:opacity-30 ${focusRing}`;

export default function BulletListEditor({ id, value, onChange, disabled, placeholder, addLabel = "Add a line", itemLabel = "Item", tone = "include" }) {
  const items = Array.isArray(value) && value.length ? value : [""];
  const refs = useRef([]);
  const focusNext = useRef(null);

  useEffect(() => {
    if (focusNext.current == null) return;
    const { index, atEnd, caret } = focusNext.current;
    focusNext.current = null;
    const el = refs.current[index];
    if (!el) return;
    el.focus();
    const at = caret ?? (atEnd ? el.value.length : 0);
    el.setSelectionRange?.(at, at);
  });

  const commit = (next, focus) => {
    if (focus) focusNext.current = focus;
    onChange(next.length ? next : [""]);
  };
  const setAt = (i, text) => commit(items.map((x, j) => (j === i ? text : x)));
  const insertAfter = (i, text = "") => commit([...items.slice(0, i + 1), text, ...items.slice(i + 1)], { index: i + 1 });
  const removeAt = (i, focusPrev = false) => commit(items.filter((_, j) => j !== i), { index: Math.max(0, focusPrev ? i - 1 : Math.min(i, items.length - 2)), atEnd: true });
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next, { index: j, atEnd: true });
  };

  const onKeyDown = (i) => (e) => {
    if (e.nativeEvent?.isComposing) return;
    const el = e.currentTarget;
    if (e.key === "Enter") {
      e.preventDefault();
      // Enter in the middle of a line splits it, like a word processor's bullets.
      const pos = el.selectionStart ?? el.value.length;
      const before = el.value.slice(0, pos);
      const after = el.value.slice(el.selectionEnd ?? pos);
      if (!before.trim() && !after.trim() && i === items.length - 1 && items.length > 1) return; // an empty last line: nothing to add
      const next = [...items.slice(0, i), before.trimEnd(), after.trimStart(), ...items.slice(i + 1)];
      commit(next, { index: i + 1, caret: 0 });
    } else if (e.key === "Backspace" && !el.value && items.length > 1) {
      e.preventDefault();
      removeAt(i, true);
    } else if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0 && i > 0) {
      // At the start of a line: join it to the line above.
      e.preventDefault();
      const prev = items[i - 1];
      const gap = prev && el.value ? " " : "";
      commit([...items.slice(0, i - 1), prev + gap + el.value, ...items.slice(i + 1)], { index: i - 1, caret: prev.length + gap.length });
    } else if (e.key === "ArrowUp" && e.altKey) { e.preventDefault(); move(i, -1); }
    else if (e.key === "ArrowDown" && e.altKey) { e.preventDefault(); move(i, 1); }
    // Plain arrows move between points only from the first / last character (a wrapped point keeps its own lines).
    else if (e.key === "ArrowUp" && i > 0 && el.selectionStart === 0 && el.selectionEnd === 0) { e.preventDefault(); refs.current[i - 1]?.focus(); }
    else if (e.key === "ArrowDown" && i < items.length - 1 && el.selectionStart === el.value.length) { e.preventDefault(); refs.current[i + 1]?.focus(); }
  };

  const onPaste = (i) => (e) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    if (!/\r?\n/.test(text.trim())) return; // one line: the browser pastes it as usual
    e.preventDefault();
    const pasted = splitPasted(text);
    if (!pasted.length) return;
    const cur = items[i];
    const first = cur.trim() ? [cur] : [];
    const next = [...items.slice(0, i), ...first, ...pasted, ...items.slice(i + 1)];
    commit(next, { index: i + first.length + pasted.length - 1, atEnd: true });
  };

  const mark = tone === "exclude"
    ? <span aria-hidden="true" className="mt-[9px] w-4 shrink-0 text-center text-sm font-bold leading-5 text-[#8A86A0]">✕</span>
    : <span aria-hidden="true" className="mt-[16px] flex w-4 shrink-0 justify-center"><span className="h-[7px] w-[7px] rounded-full bg-[#D6308C]" /></span>;

  return (
    <div className="grid gap-1.5">
      <ul className="grid gap-1.5" role="list">
        {items.map((text, i) => (
          <li key={i} className="group flex items-start gap-2">
            {mark}
            <PointInput
              id={i === 0 ? id : undefined}
              inputRef={(el) => { refs.current[i] = el; }}
              value={text}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={onKeyDown(i)}
              onPaste={onPaste(i)}
              onBlur={() => { const c = cleanItem(text); if (c !== text && c) setAt(i, c); }}
              disabled={disabled}
              placeholder={i === 0 ? placeholder : ""}
              aria-label={`${itemLabel} ${i + 1}`}
              maxLength={200}
            />
            {!disabled && (
              <span className="mt-[3px] flex shrink-0 items-center">
                {/* On a phone the move buttons show only on the point being edited, so the text gets the width. */}
                <button type="button" className={`${iconBtn} hidden group-focus-within:inline-flex sm:inline-flex`} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${itemLabel.toLowerCase()} ${i + 1} up`} title="Move up (Alt+↑)"><ArrowUp size={15} /></button>
                <button type="button" className={`${iconBtn} hidden group-focus-within:inline-flex sm:inline-flex`} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${itemLabel.toLowerCase()} ${i + 1} down`} title="Move down (Alt+↓)"><ArrowDown size={15} /></button>
                <button type="button" className={iconBtn} onClick={() => removeAt(i)} disabled={items.length === 1 && !text} aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`} title="Remove"><X size={15} /></button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {!disabled && (
        <div className="pl-6">
          <button type="button" onClick={() => insertAfter(items.length - 1)}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold text-[#D6308C] hover:bg-[#FDF2F8] ${focusRing}`}>
            <Plus size={15} /> {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}
