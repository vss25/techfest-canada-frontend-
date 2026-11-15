import React from "react";
import { decodeEntities } from "../utils/decodeEntities";

/* =========================================================
   A deliberately small Portable Text renderer (Phase 4) for
   the speaker fullBio mark set (schemaTypes/speaker.ts):
   Normal paragraphs, bullet lists, strong / em, and links.
   No dependency; anything outside that set renders as plain
   text so an editor's content can never break the page.
========================================================= */

function Span({ span, markDefs }) {
  let node = <>{span.text}</>;
  for (const mark of span.marks || []) {
    if (mark === "strong") node = <strong>{node}</strong>;
    else if (mark === "em") node = <em>{node}</em>;
    else if (mark === "underline") node = <u>{node}</u>;
    else {
      const def = (markDefs || []).find((d) => d._key === mark);
      if (def?._type === "link" && def.href) {
        node = (
          <a href={def.href} target="_blank" rel="noreferrer">
            {node}
          </a>
        );
      }
    }
  }
  return node;
}

const renderChildren = (block) =>
  (block.children || []).map((span, i) => <Span key={span._key || i} span={span} markDefs={block.markDefs} />);

export default function PortableText({ value }) {
  const blocks = Array.isArray(value) ? value : [];
  const out = [];
  let list = null;
  const flush = () => {
    if (list) { out.push(<ul key={`ul-${out.length}`}>{list}</ul>); list = null; }
  };
  blocks.forEach((block, i) => {
    if (block?._type !== "block") return;
    if (block.listItem === "bullet") {
      list = list || [];
      list.push(<li key={block._key || i}>{renderChildren(block)}</li>);
      return;
    }
    flush();
    out.push(<p key={block._key || i}>{renderChildren(block)}</p>);
  });
  flush();
  return <>{out}</>;
}

/** Plain-text fallback: a legacy `bio` string as paragraphs.
    The string is raw Sanity text, so decode any HTML entities
    it carries before rendering (the Portable Text renderer
    above works on real text and is untouched). */
export function PlainParagraphs({ text }) {
  const paras = decodeEntities(text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return <>{paras.map((p, i) => <p key={i}>{p}</p>)}</>;
}
