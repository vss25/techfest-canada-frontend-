import { useRef, useState } from "react";

/* =========================================================
   A–Z index down the right edge (iOS AlphaIndexBar): tap a
   letter or drag along the bar to jump to the first name
   with it. Shown when a list has 12+ names and 4+ letters.
========================================================= */

const ROW = 16;
const INSET = 6;

export function AlphaIndexBar({ letters, onPick }) {
  const [current, setCurrent] = useState(null);
  const ref = useRef(null);
  const last = useRef(null);
  const pick = (clientY) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !letters.length) return;
    const i = Math.min(Math.max(Math.floor((clientY - r.top - INSET) / ROW), 0), letters.length - 1);
    const x = letters[i];
    if (last.current === x.l) return;
    last.current = x.l;
    setCurrent(x.l);
    onPick(x);
  };
  const end = () => { last.current = null; setCurrent(null); };
  const onKey = (e) => {
    const i = Math.max(0, letters.findIndex((x) => x.l === (current || letters[0].l)));
    const next = e.key === "ArrowDown" ? Math.min(i + 1, letters.length - 1) : e.key === "ArrowUp" ? Math.max(i - 1, 0) : -1;
    if (next < 0) return;
    e.preventDefault();
    setCurrent(letters[next].l);
    onPick(letters[next]);
  };
  return (
    <nav
      ref={ref}
      className="az-bar"
      aria-label="Jump to a letter"
      tabIndex={0}
      role="slider"
      aria-valuetext={current || letters[0]?.l}
      aria-valuenow={Math.max(0, letters.findIndex((x) => x.l === current))}
      aria-valuemin={0}
      aria-valuemax={letters.length - 1}
      onKeyDown={onKey}
      onBlur={end}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); pick(e.clientY); }}
      onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") pick(e.clientY); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {letters.map((x) => <span key={x.l} className={x.l === current ? "on" : undefined} aria-hidden="true">{x.l}</span>)}
    </nav>
  );
}
