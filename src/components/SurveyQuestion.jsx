import { Star } from "lucide-react";
import { HAS_SCALE, LIMITS, NA } from "../lib/survey";

/* =========================================================
   One survey question as people answer it (Oct 26 2026): the
   public /survey page (src/pages/Survey.jsx) and the live
   preview in Admin › Website & app › Attendee survey render the
   same thing. Native radios and checkboxes (keyboard and screen
   reader friendly, arrow keys move between stars and numbers),
   44 px tap targets, nothing animated.
     rating    five stars (1–5); a tap on the chosen star of an optional question clears it
     nps       0–10 buttons (two rows on a phone)
     choice    chips, pick one;  multi  chips, pick any
     text      one line;  longtext  a box, with a counter near the limit
     consent   one tick box with the question as its label
   With `allowNA` (rating, nps, choice) an "N/A" chip joins the
   choices: picking it clears the score and a score clears it (one
   radio group). Every question can be left empty unless required.
   Its look is the "sv-" classes below, coloured by --sv-* variables
   (src/lib/surveyTheme.js surveyVars(dark)).
========================================================= */

export const SURVEY_QUESTION_CSS = `
  .sv-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .sv-q { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: 10px; }
  .sv-q-label { padding: 0; font-size: 17px; font-weight: 700; line-height: 1.4; color: var(--sv-text); }
  .sv-q-num { color: var(--sv-dim); font-weight: 700; margin-right: 6px; font-variant-numeric: tabular-nums; }
  .sv-req { color: var(--sv-err); margin-left: 3px; }
  .sv-help { margin: -4px 0 0; font-size: 14px; line-height: 1.5; color: var(--sv-mid); }
  .sv-err { margin: 0; font-size: 14px; line-height: 1.4; font-weight: 600; color: var(--sv-err); }
  .sv-pick { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; pointer-events: none; }
  .sv-stars { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
  .sv-star { display: inline-grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; cursor: pointer; color: var(--sv-off); position: relative; }
  .sv-star svg { width: 34px; height: 34px; }
  .sv-star.is-on { color: var(--sv-star); }
  .sv-star.is-on svg { fill: currentColor; }
  .sv-stars-value { margin-left: 6px; font-size: 14px; font-weight: 700; color: var(--sv-mid); font-variant-numeric: tabular-nums; }
  .sv-scale-ends { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--sv-dim); }
  .sv-stars-wrap { display: grid; gap: 4px; max-width: 300px; }
  .sv-nps { display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 6px; }
  .sv-nps-btn { display: grid; place-items: center; min-height: 46px; border-radius: 12px; border: 1.5px solid var(--sv-line); background: var(--sv-input);
    font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; cursor: pointer; position: relative; color: var(--sv-text); }
  .sv-nps-btn.is-on { background: linear-gradient(135deg, #7a3fd1 0%, #b14fc9 100%); border-color: transparent; color: #fff; }
  .sv-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .sv-chip { position: relative; display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 16px; border-radius: 999px;
    border: 1.5px solid var(--sv-line); background: var(--sv-input); cursor: pointer; font-size: 15px; font-weight: 600; color: var(--sv-text); user-select: none; }
  .sv-chip.is-on { border-color: var(--sv-accent); background: var(--sv-chip); color: var(--sv-accent); }
  .sv-chip-mark { width: 18px; height: 18px; flex: none; border-radius: 50%; border: 2px solid var(--sv-line); display: inline-grid; place-items: center; }
  .sv-chip--multi .sv-chip-mark { border-radius: 5px; }
  .sv-chip.is-on .sv-chip-mark { border-color: var(--sv-accent); background: var(--sv-accent); }
  .sv-chip.is-on .sv-chip-mark::after { content: ""; width: 8px; height: 8px; border-radius: inherit; background: var(--sv-bg, #fff); }
  .sv-input { width: 100%; box-sizing: border-box; min-height: 50px; padding: 12px 14px; border-radius: 14px; border: 1.5px solid var(--sv-line);
    background: var(--sv-input); color: var(--sv-text); font-size: 16px; font-family: inherit; line-height: 1.45; }
  .sv-input::placeholder { color: var(--sv-dim); }
  .sv-textarea { min-height: 120px; resize: vertical; }
  .sv-input[aria-invalid="true"] { border-color: var(--sv-err); }
  .sv-count { margin: -4px 0 0; font-size: 12.5px; color: var(--sv-dim); text-align: right; font-variant-numeric: tabular-nums; }
  .sv-consent { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 14px; border: 1.5px solid var(--sv-line); background: var(--sv-input); cursor: pointer; }
  .sv-consent input { width: 22px; height: 22px; margin: 1px 0 0; flex: none; accent-color: #7a3fd1; cursor: pointer; }
  .sv-consent span { font-size: 16px; font-weight: 600; line-height: 1.45; color: var(--sv-text); }
  .sv-chip--na { border-style: dashed; color: var(--sv-mid); }
  .sv-chip--na.is-on { border-style: solid; color: var(--sv-accent); }
  .sv-stars .sv-chip--na { margin-left: 8px; min-height: 40px; padding: 0 14px; }
  .sv-na-row { display: flex; }
  .sv-q.has-err .sv-consent, .sv-q.has-err .sv-nps-btn:not(.is-on), .sv-q.has-err .sv-chip:not(.is-on) { border-color: var(--sv-err); }
  .sv-star:focus-within, .sv-nps-btn:focus-within, .sv-chip:focus-within, .sv-consent:focus-within, .sv-input:focus-visible {
    outline: 3px solid var(--sv-accent); outline-offset: 2px; }
  @supports selector(:has(*)) {
    .sv-star:focus-within, .sv-nps-btn:focus-within, .sv-chip:focus-within, .sv-consent:focus-within { outline: none; }
    .sv-star:has(:focus-visible), .sv-nps-btn:has(:focus-visible), .sv-chip:has(:focus-visible), .sv-consent:has(:focus-visible) {
      outline: 3px solid var(--sv-accent); outline-offset: 2px; }
  }
  @media (max-width: 520px) {
    .sv-nps { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .sv-chip { flex: 1 1 100%; }
  }
`;

const TEXT_TYPES = ["text", "longtext"];

/**
 * One question. `value`: its answer (undefined = none); `onChange(next)` (undefined clears it); `error`: a problem in
 * plain words; `number`: its place in the survey; `idBase`: a prefix that keeps element ids unique on the page.
 */
export default function SurveyQuestion({ q, value, onChange, error, number, idBase = "sv", disabled = false }) {
  const base = `${idBase}-q-${q.id}`;
  const helpId = q.help ? `${base}-help` : undefined;
  const errId = error ? `${base}-err` : undefined;
  const describedBy = [helpId, errId].filter(Boolean).join(" ") || undefined;
  const req = q.required
    ? <><span className="sv-req" aria-hidden="true">*</span><span className="sv-sr"> (required)</span></>
    : null;
  const head = <>{number ? <span className="sv-q-num" aria-hidden="true">{number}.</span> : null}{q.label}{req}</>;
  const help = q.help ? <p id={helpId} className="sv-help">{q.help}</p> : null;
  const err = error ? <p id={errId} className="sv-err">{error}</p> : null;
  const ends = HAS_SCALE.includes(q.type) && (q.minLabel || q.maxLabel)
    ? <div className="sv-scale-ends" aria-hidden="true"><span>{q.minLabel}</span><span>{q.maxLabel}</span></div>
    : null;

  if (TEXT_TYPES.includes(q.type)) {
    const long = q.type === "longtext";
    const max = LIMITS[q.type];
    const len = typeof value === "string" ? value.length : 0;
    const Tag = long ? "textarea" : "input";
    return (
      <div className={"sv-q" + (error ? " has-err" : "")} id={base}>
        <label htmlFor={`${base}-in`} className="sv-q-label">{head}</label>
        {help}
        <Tag id={`${base}-in`} className={long ? "sv-input sv-textarea" : "sv-input"} {...(long ? { rows: 4 } : { type: "text" })}
          value={typeof value === "string" ? value : ""} maxLength={max} disabled={disabled} required={q.required || undefined}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} />
        {long && len > max * 0.8 && <p className="sv-count" aria-live="polite">{len.toLocaleString("en-US")} / {max.toLocaleString("en-US")}</p>}
        {err}
      </div>
    );
  }

  if (q.type === "consent") {
    return (
      <div className={"sv-q" + (error ? " has-err" : "")} id={base}>
        <label className="sv-consent">
          <input type="checkbox" checked={value === true} disabled={disabled} aria-invalid={error ? true : undefined} aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.checked ? true : undefined)} />
          <span>{q.label}{req}</span>
        </label>
        {help}
        {err}
      </div>
    );
  }

  const name = `${base}-pick`;
  // "N/A": one more radio in the same group, so a score and N/A clear each other.
  const na = q.allowNA ? (
    <label className={"sv-chip sv-chip--na" + (value === NA ? " is-on" : "")}>
      <input className="sv-pick" type="radio" name={name} value={NA} checked={value === NA} disabled={disabled}
        onChange={() => onChange(NA)} onClick={() => { if (value === NA && !q.required) onChange(undefined); }} />
      <span className="sv-chip-mark" aria-hidden="true" />
      <span aria-hidden="true">N/A</span><span className="sv-sr">Not applicable</span>
    </label>
  ) : null;
  let body = null;
  if (q.type === "rating") {
    body = (
      <div className="sv-stars-wrap">
        <div className="sv-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={"sv-star" + (Number(value) >= n ? " is-on" : "")} title={`${n} of 5`}>
              <input className="sv-pick" type="radio" name={name} value={n} checked={value === n} disabled={disabled}
                onChange={() => onChange(n)} onClick={() => { if (value === n && !q.required) onChange(undefined); }} />
              <Star aria-hidden="true" />
              <span className="sv-sr">{n} of 5 stars{n === 1 && q.minLabel ? `, ${q.minLabel}` : n === 5 && q.maxLabel ? `, ${q.maxLabel}` : ""}</span>
            </label>
          ))}
          {Number.isInteger(value) && <span className="sv-stars-value" aria-hidden="true">{value} / 5</span>}
          {na}
        </div>
        {ends}
      </div>
    );
  } else if (q.type === "nps") {
    body = (
      <>
        <div className="sv-nps">
          {Array.from({ length: 11 }, (_, n) => (
            <label key={n} className={"sv-nps-btn" + (value === n ? " is-on" : "")}>
              <input className="sv-pick" type="radio" name={name} value={n} checked={value === n} disabled={disabled}
                onChange={() => onChange(n)} onClick={() => { if (value === n && !q.required) onChange(undefined); }} />
              <span aria-hidden="true">{n}</span>
              <span className="sv-sr">{n}{n === 0 && q.minLabel ? `, ${q.minLabel}` : n === 10 && q.maxLabel ? `, ${q.maxLabel}` : ""}</span>
            </label>
          ))}
        </div>
        {ends}
        {na && <div className="sv-na-row">{na}</div>}
      </>
    );
  } else if (q.type === "choice" || q.type === "multi") {
    const multi = q.type === "multi";
    const picked = multi ? (Array.isArray(value) ? value : []) : value;
    const toggle = (o) => {
      if (!multi) { onChange(o); return; }
      const next = picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o];
      onChange(next.length ? next : undefined);
    };
    body = (
      <div className="sv-chips">
        {q.options.map((o) => {
          const on = multi ? picked.includes(o) : picked === o;
          return (
            <label key={o} className={"sv-chip" + (multi ? " sv-chip--multi" : "") + (on ? " is-on" : "")}>
              <input className="sv-pick" type={multi ? "checkbox" : "radio"} name={name} value={o} checked={on} disabled={disabled}
                onChange={() => toggle(o)} onClick={() => { if (!multi && on && !q.required) onChange(undefined); }} />
              <span className="sv-chip-mark" aria-hidden="true" />
              <span>{o}</span>
            </label>
          );
        })}
        {!multi && na}
      </div>
    );
  }

  return (
    <fieldset className={"sv-q" + (error ? " has-err" : "")} id={base} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className="sv-q-label">{head}</legend>
      {help}
      {body}
      {err}
    </fieldset>
  );
}
