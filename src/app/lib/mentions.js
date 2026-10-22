import { speakerById, speakerByName } from "./cms";

/* =========================================================
   "@Name" in posts (iOS PostMentions): the post carries who was
   tagged; each "@Name" links to their profile or speaker page.
   Older posts without the list still link when the name matches
   someone in the People directory.
========================================================= */

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** → [{ text } | { mention: {type, id, name}, text }] */
export function splitMentions(body, mentions = [], people = []) {
  const all = [...(mentions || [])];
  for (const p of people) {
    if (p?.name && !all.some((m) => m.name === p.name) && body.includes("@" + p.name)) all.push({ type: "user", id: p.id, name: p.name });
  }
  if (!all.length) return [{ text: body }];
  const sorted = [...all].filter((m) => m.name).sort((a, b) => b.name.length - a.name.length);
  const re = new RegExp("@(" + sorted.map((m) => escapeRe(m.name)).join("|") + ")", "g");
  const out = [];
  let last = 0;
  for (const match of body.matchAll(re)) {
    if (match.index > last) out.push({ text: body.slice(last, match.index) });
    out.push({ text: match[0], mention: sorted.find((m) => m.name === match[1]) });
    last = match.index + match[0].length;
  }
  if (last < body.length) out.push({ text: body.slice(last) });
  return out;
}

/** Where a mention goes. */
export function mentionPath(m, cmsState) {
  if (m.type === "speaker") {
    const sp = speakerById(m.id, cmsState) || speakerByName(m.name, cmsState);
    return sp ? `/speakers/${encodeURIComponent(sp.id)}` : null;
  }
  return m.id ? `/people/${encodeURIComponent(m.id)}` : null;
}

/** The "@query" being typed at the end of the text (or before the caret). */
export function mentionQuery(text, caret = text.length) {
  const before = text.slice(0, caret);
  const m = before.match(/(?:^|\s)@([^\s@]{0,30}(?:\s[^\s@]{0,30})?)$/);
  return m ? m[1] : null;
}

/** Replaces the "@query" before the caret with "@Full Name ". */
export function insertMention(text, name, caret = text.length) {
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  const replaced = before.replace(/@([^\s@]{0,30}(?:\s[^\s@]{0,30})?)$/, `@${name} `);
  if (replaced === before) return `${before}${before && !/\s$/.test(before) ? " " : ""}@${name} ${after}`;
  return replaced + after;
}

/** Up to 6 people whose name contains the "@query" being typed (none when nothing is being typed). */
export const mentionSuggestions = (candidates, query) =>
  (query === null ? [] : candidates.filter((x) => x.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6));

/** The tags still in the text when it's sent (one removed by editing doesn't go). */
export const keptMentions = (body, mentions) => mentions.filter((m) => body.includes("@" + m.name));
