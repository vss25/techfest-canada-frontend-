import React from "react";

/* Simple text formatting (Nov 20 2026) for a speaker's bio, which is stored as plain text.
   Four things only, so nobody needs to learn an editor:
     a blank line      a new paragraph
     **words**         bold
     *words*           italic
     - at line start   a bullet point
   Anything else stays exactly as typed. Used by the admin's preview and by the website. */

function inline(text, key) {
  const out = [];
  const re = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] != null ? <strong key={`${key}-${m.index}`}>{m[1]}</strong> : <em key={`${key}-${m.index}`}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function FormattedText({ text }) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => /^[-•]\s+/.test(l))) {
          return <ul key={i} style={{ paddingLeft: "1.25em", listStyle: "disc" }}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-•]\s+/, ""), `${i}-${j}`)}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(l, `${i}-${j}`)}</React.Fragment>)}</p>;
      })}
    </>
  );
}
