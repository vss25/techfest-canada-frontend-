/* =========================================================
   Uploaded post templates (Nov 23 2026): the layout rules, shared by Marketing › Post templates (where management
   uploads a blank design and places the boxes) and Create from a template (where posts are made from it).
   Pure: no React, no network. The server checks the same shapes (backend services/postTemplateLibrary.js).

   The owner's guidelines, as rules a template carries:
     - one speaker: centred in the photo area at a set size (people.maxCard), never stretched
     - two or more: side by side, the same gap between each (people.gap), centred as a group, one row up to the
       "per row" number, then a second row
     - titles, names, partner names: a character limit (maxChars) and a size that only shrinks to a minimum;
       more lines than allowed end with "…"
     - logos: fitted inside their box (contain), on an optional card, and a minimum width so a blurry logo is caught
========================================================= */

export const KIND_LABEL = { keynote: "One speaker", session: "Panel or session", partner: "Partner", event: "Event or call to action" };
export const BOX_LABEL = {
  tag: "Tag", title: "Title", when: "Date", venue: "Venue", people: "Photos", name: "Speaker name", role: "Speaker title and organisation",
  footer: "Link", logo: "Partner logo", photo: "Event photo", brand: "TTFC logo",
};
export const TEXT_BOXES = ["tag", "title", "when", "venue", "name", "role", "footer"];
export const PALETTE = ["#141414", "#FFFFFF", "#7B3B9E", "#D6308C", "#F5A623", "#151035", "#6D3A97", "#E6E6EA"];

const text = (x, y, w, h, extra = {}) => ({ on: true, x, y, w, h, align: "left", valign: "top", color: "#141414", accent: "#7B3B9E", size: 40, minSize: 18, maxLines: 1, maxChars: 0, weight: 600, italic: false, upper: false, twoTone: false, fill: "", ...extra });

/** A sensible first layout for a kind, as shares of the image (the same on every channel; staff move them). */
export function defaultBoxes(kind) {
  const head = {
    brand: { on: true, x: 0.05, y: 0.05, w: 0.22, h: 0.09, align: "left", valign: "top", fit: "contain", card: "", radius: 0, minPx: 0, variant: "dark" },
    when: text(0.31, 0.055, 0.45, 0.04, { size: 26, minSize: 16, weight: 600 }),
    venue: text(0.31, 0.098, 0.45, 0.04, { size: 26, minSize: 16, weight: 600, color: "#7B3B9E" }),
    tag: text(0.05, 0.2, 0.4, 0.05, { size: 26, minSize: 16, weight: 500, fill: "#E6E6EA" }),
    footer: text(0.05, 0.93, 0.6, 0.04, { on: false, size: 22, minSize: 14, weight: 500, color: "#3A3A3A" }),
  };
  const title = (y, h, extra) => text(0.05, y, 0.9, h, { size: 66, minSize: 36, maxLines: 2, maxChars: 90, weight: 700, twoTone: true, ...extra });
  if (kind === "keynote") return {
    ...head, title: title(0.27, 0.16),
    people: { on: true, x: 0.44, y: 0.44, w: 0.56, h: 0.56, align: "right", valign: "bottom", card: "cutout", cardColor: "#6D3A97", radius: 0.12, gap: 0.03, perRow: 1, labels: false, labelColor: "#141414", nameColor: "#7B3B9E", maxCard: 0.6 },
    name: text(0.05, 0.68, 0.4, 0.06, { size: 46, minSize: 26, weight: 600, maxChars: 40 }),
    role: text(0.05, 0.75, 0.38, 0.12, { size: 26, minSize: 16, weight: 500, maxLines: 3, maxChars: 120 }),
  };
  if (kind === "session") return {
    ...head, title: title(0.27, 0.15),
    people: { on: true, x: 0.04, y: 0.44, w: 0.92, h: 0.5, align: "center", valign: "top", card: "card", cardColor: "#6D3A97", radius: 0.14, gap: 0.025, perRow: 6, labels: true, labelColor: "#141414", nameColor: "#7B3B9E", maxCard: 0.3 },
  };
  if (kind === "partner") return {
    ...head, title: title(0.27, 0.15, { maxChars: 60 }),
    logo: { on: true, x: 0.2, y: 0.5, w: 0.6, h: 0.35, align: "center", valign: "middle", fit: "contain", card: "#FFFFFF", radius: 0.04, minPx: 300 },
  };
  return {
    ...head, title: title(0.27, 0.15),
    photo: { on: true, x: 0.05, y: 0.5, w: 0.9, h: 0.45, align: "center", valign: "middle", fit: "cover", card: "", radius: 0.04, minPx: 0 },
  };
}

/** The guidelines a template's boxes add up to, in plain words (shown beside the editor). */
export function rulesText(kind, boxes = {}) {
  const out = [];
  const p = boxes.people;
  if (p?.on) {
    const pct = (v) => `${Math.round(v * 100)}%`;
    if (kind === "keynote") out.push(`The speaker's photo: up to ${pct(p.maxCard)} of the image wide, ${p.valign === "bottom" ? "standing on the bottom of its area" : p.valign}, ${p.align}.`);
    else {
      out.push(`One person: centred${p.align === "center" ? "" : ` to the ${p.align}`} in the photo area, at most ${pct(p.maxCard)} of the image wide.`);
      out.push(`Two or more: side by side with a ${pct(p.gap)} gap, the group ${p.align === "center" ? "centred" : `on the ${p.align}`}; up to ${p.perRow} in a row, then a second row.`);
    }
    out.push(p.card === "card" ? "Each photo is cut out onto a rounded card." : p.card === "cutout" ? "Photos are cut out with no card." : "Photos are shown as they are, rounded.");
  }
  for (const k of ["title", "name", "role", "tag", "footer"]) {
    const b = boxes[k];
    if (b?.on && b.maxChars) out.push(`${BOX_LABEL[k]}: up to ${b.maxChars} characters, ${b.maxLines} line${b.maxLines > 1 ? "s" : ""}; it shrinks to ${b.minSize}px before it's cut short.`);
  }
  if (boxes.logo?.on) out.push(`Partner logo: fitted inside its box${boxes.logo.card ? " on a card" : ""}, ${boxes.logo.align}; files under ${boxes.logo.minPx}px wide are flagged as blurry.`);
  return out;
}

/** People placed in the photo area by the template's rules → [{ x, y, w, h, labelY }] in canvas pixels. */
export function placePeople(n, box, W, H, { labelH = 0 } = {}) {
  const bx = box.x * W, by = box.y * H, bw = box.w * W, bh = box.h * H;
  const perRow = Math.max(1, Math.min(n, box.perRow || n));
  const rows = Math.ceil(n / perRow);
  const gap = (box.gap || 0) * W;
  const rowH = (bh - gap * (rows - 1)) / rows;
  const cardW = Math.max(8, Math.min((box.maxCard || 1) * W, (bw - gap * (perRow - 1)) / perRow, (rowH - labelH) / 1.25));
  const cardH = cardW * 1.25;
  const used = rows * (cardH + labelH) + (rows - 1) * gap;
  const top = box.valign === "bottom" ? by + bh - used : box.valign === "middle" ? by + (bh - used) / 2 : by;
  const out = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const inRow = Math.min(perRow, n - row * perRow);
    const rowW = inRow * cardW + (inRow - 1) * gap;
    const left = box.align === "right" ? bx + bw - rowW : box.align === "left" ? bx : bx + (bw - rowW) / 2;
    const x = left + col * (cardW + gap), y = top + row * (cardH + labelH + gap);
    out.push({ x, y, w: cardW, h: cardH, labelY: y + cardH });
  }
  return out;
}

/** What a post breaks of a template's rules, in plain words: over-long text, blurry logos, missing photos. */
export function rulesProblems(spec, layout) {
  const out = [];
  const boxes = layout?.boxes || {};
  const len = (t) => String(t || "").length;
  const check = (key, value, what) => {
    const b = boxes[key];
    if (b?.on && b.maxChars && len(value) > b.maxChars) out.push(`${what} is ${len(value)} characters; this template allows ${b.maxChars}, so it's cut short.`);
  };
  const title = spec.title ? `${spec.title.accent || ""} ${spec.title.rest || ""}`.trim() : spec.headline;
  check("title", title, spec.kind === "partner" ? "The partner line" : "The title");
  check("tag", spec.tag, "The tag");
  check("footer", spec.footer, "The link");
  const p0 = spec.people?.[0];
  if (p0) { check("name", p0.name, "The name"); check("role", [p0.title, p0.org].filter(Boolean).join(", "), "The title and organisation"); }
  if (boxes.people?.on) for (const p of spec.people || []) if (!p.img) out.push(`${p.name} has no photo yet, so their initials show.`);
  if (boxes.logo?.on) {
    if (!spec.logo) out.push("The partner has no logo on the website yet.");
    else if (boxes.logo.minPx && (spec.logo.naturalWidth || spec.logo.width) < boxes.logo.minPx) out.push(`The partner's logo file is only ${spec.logo.naturalWidth || spec.logo.width}px wide; this template asks for ${boxes.logo.minPx}px, so it may look blurry.`);
  }
  if (boxes.photo?.on && !spec.photo) out.push("The event has no city photo yet.");
  return out;
}

/** Fictional content for previewing a template while it's being laid out. */
export function sampleSpec(kind) {
  const people = [
    { name: "Ada Lovelace", title: "Chief Scientist", org: "Example Labs", role: "Moderator" },
    { name: "Grace Hopper", title: "VP Engineering", org: "Northwind", role: "Speaker" },
    { name: "Alan Turing", title: "Founder", org: "Contoso AI", role: "Speaker" },
    { name: "Katherine Johnson", title: "Head of Research", org: "Fabrikam", role: "Speaker" },
  ];
  return {
    kind, tag: { keynote: "Featured Speaker", session: "Featured Session", partner: "Partnership", event: "Tickets on sale" }[kind],
    title: kind === "partner" || kind === "event" ? null : { accent: "Past the Pilot:", rest: "AI, Identity and the Plumbing of Finance" },
    headline: kind === "partner" ? "Welcome, Northwind" : "Tickets are on sale for the Vancouver Briefing",
    header: { when: "3 Feb 2027", venue: "Vancouver" }, footer: "thetechfestival.com/tickets",
    people: kind === "keynote" ? people.slice(1, 2).map((p) => ({ ...p, role: "Speaker" })) : kind === "session" ? people : [],
  };
}
