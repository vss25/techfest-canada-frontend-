/* "Thursday 22nd October" → 22<sup>nd</sup>: ordinal endings after a day number
   are raised, the way they're printed. Used for admin-written banner text. */
const ORDINAL = /(\d{1,2})(st|nd|rd|th)\b/gi;

export function withOrdinals(text) {
  const s = String(text || "");
  const out = [];
  let last = 0;
  for (const m of s.matchAll(ORDINAL)) {
    const end = m.index + m[1].length;
    out.push(s.slice(last, end));
    out.push(<sup key={m.index} style={{ fontSize: "0.62em", lineHeight: 0, verticalAlign: "super", marginLeft: "0.04em" }}>{m[2]}</sup>);
    last = m.index + m[0].length;
  }
  out.push(s.slice(last));
  return out;
}
