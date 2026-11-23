/* =========================================================
   Templated social posts (Nov 23 2026): what each template is built from and what it says.
   The owner: speaker, panel, partnership announcements and calls to action, "standardized for each platform",
   one click, built from the agenda and speaker profiles; "I will not be making edits, I will just upload a
   speaker photo". The same keys as the backend (services/socialPosts.js POST_TEMPLATES).

   For each template:
     source     which website record it's built from: speaker | session | partner | event
     spec()     what the image says (postArt.js draws it)
     context()  the facts Claude writes from (nothing else is stated)
     fallback() a plain finished post per channel, used when Claude isn't available
     link       where the post sends people
   Pure: no React, no network.
========================================================= */

export const SITE = "https://www.thetechfestival.com";

export const TEMPLATES = [
  { key: "speaker", label: "Speaker announcement", hint: "One speaker, with their session", source: "speaker", link: "/tickets" },
  { key: "panel", label: "Panel announcement", hint: "A session and everyone on it", source: "session", link: "/tickets" },
  { key: "partner", label: "Partnership announcement", hint: "Welcome a partner or sponsor", source: "partner", link: "" },
  { key: "callSpeakers", label: "Call for speakers", hint: "Invite people to apply to speak", source: "event", link: "/speak" },
  { key: "callSponsors", label: "Call for sponsors and exhibitors", hint: "Invite companies to take part", source: "event", link: "/sponsor" },
  { key: "tickets", label: "Tickets on sale", hint: "Tell people they can register", source: "event", link: "/tickets" },
];
export const templateOf = (key) => TEMPLATES.find((t) => t.key === key) || null;

/* ---------- small helpers ---------- */
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
/** No em-dashes in anything we produce (the owner's rule), whatever the records say. */
export const noDashes = (t) => String(t || "")
  .replace(/(\d)\s*[–‒]\s*(\d)/g, "$1-$2")
  .replace(/\s*[—–―‒]+\s*(?=[,.;:!?)]|$)/gm, "")
  .replace(/\s*[—–―‒]+\s*/g, ", ");
const role = (p) => [clean(p?.title), clean(p?.company || p?.org)].filter(Boolean).join(", ");
const nameKey = (s) => clean(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** "Tuesday, February 3, 2027" from an event and an optional session day (1 = the start date). */
export function eventWhen(event, day) {
  if (!event) return "";
  if (!event.startDate) return clean(event.statusNote);
  const d = new Date(`${event.startDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return clean(event.statusNote);
  if (day && day > 1) d.setUTCDate(d.getUTCDate() + day - 1);
  const opts = { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" };
  if (!day && event.endDate && event.endDate !== event.startDate) {
    const e = new Date(`${event.endDate}T12:00:00Z`);
    if (!Number.isNaN(e.getTime())) {
      const md = (x) => x.toLocaleDateString("en-CA", { month: "long", day: "numeric", timeZone: "UTC" });
      const end = e.getUTCMonth() === d.getUTCMonth() ? String(e.getUTCDate()) : md(e);
      return `${md(d)}-${end}, ${e.getUTCFullYear()}`;
    }
  }
  return d.toLocaleDateString("en-CA", opts);
}
/** "3 Feb 2027", "26-27 Oct 2026", "31 Jan-1 Feb 2027"; the status note while there's no date. Never a logo's old date. */
export function shortWhen(event) {
  if (!event) return "";
  const d = event.startDate ? new Date(`${event.startDate}T12:00:00Z`) : null;
  if (!d || Number.isNaN(d.getTime())) return clean(event.statusNote);
  const e = event.endDate ? new Date(`${event.endDate}T12:00:00Z`) : d;
  const mon = (x) => x.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  if (Number.isNaN(e.getTime()) || e.getTime() === d.getTime()) return `${d.getUTCDate()} ${mon(d)} ${d.getUTCFullYear()}`;
  if (e.getUTCMonth() === d.getUTCMonth()) return `${d.getUTCDate()}-${e.getUTCDate()} ${mon(e)} ${e.getUTCFullYear()}`;
  return `${d.getUTCDate()} ${mon(d)}-${e.getUTCDate()} ${mon(e)} ${e.getUTCFullYear()}`;
}
/** "The Westin Harbour Castle, Toronto", else the city. */
export const venueOf = (event) => clean([event?.venueName, event?.city && !String(event?.venueName || "").includes(event.city) ? event.city : ""].filter(Boolean).join(", "));

/** The two-colour title of TTFC's posts: the part up to the colon in purple, else the first two words. */
export function splitTitle(text) {
  const t = clean(text);
  const i = t.indexOf(":");
  if (i > 0 && i < t.length - 1) return { accent: t.slice(0, i + 1), rest: t.slice(i + 1).trim() };
  const w = t.split(" ");
  const k = w.length >= 4 ? 2 : 1;
  return { accent: w.slice(0, k).join(" "), rest: w.slice(k).join(" ") };
}

export const eventTitle = (event) => (event ? clean([event.name, event.city && !String(event.name || "").includes(event.city) ? event.city : ""].filter(Boolean).join(", ")) : "The Tech Festival Canada");

/** "10:00 AM" from "10:00". */
export function clock(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return "";
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** The sessions a speaker is on (by name, as the agenda stores them). */
export function sessionsFor(speaker, sessions = []) {
  const k = nameKey(speaker?.name);
  if (!k) return [];
  return sessions.filter((s) => !s.isBreak && ([...(s.speakers || []), s.moderator].filter(Boolean).some((p) => nameKey(p.name) === k)));
}

/** The speaker records for a session's people, in agenda order, the moderator last. */
export function panelPeople(session, speakers = []) {
  const byName = new Map(speakers.map((s) => [nameKey(s.name), s]));
  const list = (session?.speakers || []).filter((p) => p?.name && !p.tentative).map((p) => ({ ...p, record: byName.get(nameKey(p.name)) || null }));
  if (session?.moderator?.name) list.push({ ...session.moderator, record: byName.get(nameKey(session.moderator.name)) || null, moderator: true });
  return list;
}

const sessionLine = (s, event) => (s ? clean([s.title, [s.day && event?.startDate ? eventWhen(event, s.day) : s.day ? `Day ${s.day}` : "", clock(s.time)].filter(Boolean).join(", ")].filter(Boolean).join(": ")) : "");

/* ---------- per template ---------- */

/**
 * Everything a template needs from the records the person picked:
 *   { template, item (the speaker / session / partner / event), event, speakers, sessions }
 * → { title, spec (without images: postArt fills them), people (for the panel's photos), source (for Claude),
 *     link, fallback: { linkedin, x, instagram }, photoUrl, problems: [..] }
 */
export function buildPost({ template, item, event, speakers = [], sessions = [] }) {
  const t = templateOf(template);
  if (!t) return { problems: ["Pick a template."] };
  if (!item) return { problems: [`Pick ${t.source === "session" ? "a session" : t.source === "event" ? "an event" : `a ${t.source}`}.`] };
  const evName = eventTitle(event);
  const when = eventWhen(event);
  const link = t.link ? `${SITE}${t.link}` : item.url || SITE;
  const tagCity = event?.city ? `#TTFC${String(event.city).replace(/[^A-Za-z]/g, "")}` : "";
  const tags = ["#TTFC2027", tagCity, "#TheTechFestivalCanada"].filter(Boolean).join(" ");
  const facts = [`Event: ${evName}${when ? `, ${when}` : ""}${event?.venueName ? `, ${event.venueName}` : ""}`];
  if (event?.theme) facts.push(`Event theme: ${event.theme}`);
  if (event?.tagline) facts.push(`Event tagline: ${event.tagline}`);
  if (event?.audience) facts.push(`Who attends: ${event.audience}`);
  let out;

  if (template === "speaker") {
    const mine = sessionsFor(item, sessions);
    const first = mine[0];
    const r = role(item);
    out = {
      title: `Speaker: ${clean(item.name)}`,
      spec: { kind: "keynote", tag: item.speakerType === "keynote" ? "Featured Keynote" : "Featured Speaker",
              title: first ? splitTitle(first.title) : { accent: "Speaking at", rest: evName } },
      people: [{ name: clean(item.name), title: clean(item.title), org: clean(item.company), role: "Speaker", url: item.imageUrl || "" }],
      source: [`Speaker: ${clean(item.name)}`, r && `Role: ${r}`, item.bio && `Bio: ${clean(item.bio)}`,
        ...mine.map((s) => `Session: ${sessionLine(s, event)}${s.stage ? `, ${s.stage}` : ""}${s.description ? `. About it: ${clean(s.description)}` : ""}`), ...facts].filter(Boolean).join("\n"),
      fallback: {
        linkedin: `We're pleased to welcome ${clean(item.name)}${r ? `, ${r},` : ""} as a speaker at ${evName}.${first ? `\n\n${clean(item.name).split(" ")[0]} joins us for "${clean(first.title)}".` : ""}\n\n${when ? `Join us on ${when}. ` : ""}Get your ticket: ${link}\n\n${tags}`,
        x: `${clean(item.name)}${r ? `, ${r},` : ""} is speaking at ${evName}. Tickets: ${link} ${tags.split(" ")[0]}`,
        instagram: `Speaker announcement\n\n${clean(item.name)}${r ? `\n${r}` : ""}${first ? `\n\nSpeaking on: ${clean(first.title)}` : ""}\n\n${evName}${when ? `\n${when}` : ""}\n\nTickets: link in bio\n\n${tags}`,
      },
    };
  } else if (template === "panel") {
    const people = panelPeople(item, speakers);
    if (!people.length) return { problems: ["This session has no speakers on the agenda yet."] };
    const line = sessionLine(item, event);
    out = {
      title: `Panel: ${clean(item.title)}`,
      spec: { kind: "session", tag: /keynote/i.test(item.type || "") ? "Featured Keynote" : /fireside/i.test(item.type || "") ? "Fireside Chat" : "Featured Session", title: splitTitle(item.title) },
      // TTFC's posts list the moderator first.
      people: [...people.filter((p) => p.moderator), ...people.filter((p) => !p.moderator)].map((p) => ({
        name: clean(p.name), title: clean(p.record?.title), org: clean(p.record?.company || p.org), role: p.moderator ? "Moderator" : "Speaker", url: p.record?.imageUrl || "" })),
      source: [`Session: ${line}${item.stage ? `, ${item.stage}` : ""}`, item.type && `Format: ${item.type}`, item.description && `About it: ${clean(item.description)}`,
        ...people.map((p) => `${p.moderator ? "Moderator" : "Speaker"}: ${clean(p.name)}${role(p.record || p) ? `, ${role(p.record || p)}` : ""}`), ...facts].filter(Boolean).join("\n"),
      fallback: {
        linkedin: `Announcing "${clean(item.title)}" at ${evName}.\n\nOn the panel:\n${people.map((p) => `${clean(p.name)}${role(p.record || p) ? `, ${role(p.record || p)}` : ""}${p.moderator ? " (moderator)" : ""}`).join("\n")}\n\n${when ? `${when}. ` : ""}Get your ticket: ${link}\n\n${tags}`,
        x: `"${clean(item.title)}" at ${evName} with ${people.filter((p) => !p.moderator).slice(0, 3).map((p) => clean(p.name)).join(", ")}. Tickets: ${link}`,
        instagram: `Panel announcement\n\n${clean(item.title)}\n\n${people.map((p) => `${clean(p.name)}${p.moderator ? " (moderator)" : ""}`).join("\n")}\n\n${evName}${when ? `\n${when}` : ""}\n\nTickets: link in bio\n\n${tags}`,
      },
    };
  } else if (template === "partner") {
    out = {
      title: `Partner: ${clean(item.name)}`,
      spec: { kind: "partner", tag: "Official partner", headline: `Welcome, ${clean(item.name)}` },
      logoUrl: item.logoUrl || "",
      source: [`Partner: ${clean(item.name)}`, item.description && `About them: ${clean(item.description)}`, item.url && `Their website: ${item.url}`, ...facts].filter(Boolean).join("\n"),
      fallback: {
        linkedin: `We're proud to welcome ${clean(item.name)} as a partner of ${evName}.${item.description ? `\n\n${clean(item.description)}` : ""}\n\nThank you for helping us bring Canada's technology community together.\n\n${tags}`,
        x: `Welcome, ${clean(item.name)}! Proud to have you as a partner of ${evName}. ${tags.split(" ")[0]}`,
        instagram: `Partnership announcement\n\nWelcome, ${clean(item.name)}!\n\nThank you for supporting ${evName}.\n\n${tags}`,
      },
    };
  } else {
    const head = { callSpeakers: `Speak at ${evName}`, callSponsors: `Partner with ${evName}`, tickets: `Tickets are on sale for ${evName}` }[template];
    const sub = { callSpeakers: "Share what you're building with Canada's tech leaders.", callSponsors: "Sponsor or exhibit and meet the people shaping Canadian tech.", tickets: event?.tagline ? clean(event.tagline) : "Join Canada's tech leaders for a day of ideas and connections." }[template];
    const ask = { callSpeakers: "Apply to speak", callSponsors: "Enquire about sponsoring or exhibiting", tickets: "Get your ticket" }[template];
    out = {
      title: `${t.label}: ${evName}`,
      spec: { kind: "event", tag: t.label, headline: head, footer: link.replace(/^https:\/\/(www\.)?/, "") },
      photoUrl: item.citySkylineUrl || item.heroImageUrl || "",
      source: [...facts, event?.description && `About the event: ${clean(event.description)}`, event?.formatLine && `Format: ${event.formatLine}`].filter(Boolean).join("\n"),
      fallback: {
        linkedin: `${head}.\n\n${sub}\n\n${when ? `${when}${event?.city ? `, ${event.city}` : ""}. ` : ""}${ask}: ${link}\n\n${tags}`,
        x: `${head}. ${ask}: ${link} ${tags.split(" ")[0]}`,
        instagram: `${head}\n\n${sub}${when ? `\n\n${when}` : ""}\n\n${ask}: link in bio\n\n${tags}`,
      },
    };
  }
  const fallback = Object.fromEntries(Object.entries(out.fallback).map(([k, v]) => [k, noDashes(v)]));
  const spec = { ...out.spec, header: { when: shortWhen(event), venue: venueOf(event) },
    city: clean(event?.city), year: event?.year || (event?.startDate ? Number(String(event.startDate).slice(0, 4)) : ""),
    bio: template === "speaker" ? noDashes(clean(item.bio)) : "",
    headline: noDashes(out.spec.headline || clean(event?.tagline) || `The Tech Festival Canada comes to ${clean(event?.city) || "Canada"}.`),
    title: out.spec.title ? { accent: noDashes(out.spec.title.accent), rest: noDashes(out.spec.title.rest) } : null };
  return { ...out, spec, fallback, link, eventName: evName, problems: [] };
}
