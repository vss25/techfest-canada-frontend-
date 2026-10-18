// schemaTypes/session.ts — one slot on the TTFC agenda.
// Mirrors techfest-canada-backend services/cmsSchema.js ("session") and the
// website's src/data/agenda.js shape. Normally edited in the TTFC admin panel
// (Website content → Agenda); the website and the app read it from here.
import { defineArrayMember, defineField, defineType } from "sanity";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const FORMATS = [
  { title: "Opening", value: "opening" },
  { title: "Keynote", value: "keynote" },
  { title: "Fireside", value: "fireside" },
  { title: "Panel", value: "panel" },
  { title: "Boardroom Briefing", value: "briefing" },
  { title: "Provocation", value: "provocation" },
  { title: "Leadership Dialogue", value: "dialogue" },
  { title: "Networking", value: "networking" },
  { title: "Break", value: "break" },
  { title: "Awards / Gala", value: "awards" },
  { title: "Closing", value: "closing" },
  { title: "Performance", value: "Performance" },
];

const PILLARS = [
  { title: "AI / ML", value: "ai" },
  { title: "Quantum", value: "quantum" },
  { title: "Cybersecurity", value: "cybersecurity" },
  { title: "Robotics", value: "robotics" },
  { title: "Climate Tech", value: "climate" },
];

const SECTORS = [
  { title: "Financial Services", value: "fintech" },
  { title: "Healthcare & Life Sci", value: "healthcare" },
  { title: "Energy & Infrastructure", value: "energy" },
  { title: "Manufacturing & Supply", value: "manufacturing" },
  { title: "Public Sector & Defence", value: "public" },
  { title: "Startups & Capital", value: "startups" },
];

// Per-session live polls / audience Q&A. Missing = "auto". The rule (backend
// services/sessionLive.js, admin src/admin/cms/sessionLive.js): "auto" is on when
// the session has a moderator and isn't a keynote or a break.
const LIVE_MODES = [
  { title: "Auto (on when there's a moderator)", value: "auto" },
  { title: "On", value: "on" },
  { title: "Off", value: "off" },
];
const liveModeRule = (Rule: any) => Rule.custom((v: string | undefined) =>
  (v === undefined || LIVE_MODES.some((m) => m.value === v) ? true : "Pick Auto, On or Off"));

const timeRule = (Rule: any) =>
  Rule.required().custom((v: string | undefined) => (!v || TIME.test(v) ? true : "Use 24-hour time like 09:30"));

export default defineType({
  name: "session",
  title: "Agenda Session",
  type: "document",
  fieldsets: [
    {
      name: "live",
      title: "Live features",
      description: "What the app offers during this session. Auto never turns them on for keynotes or breaks. The global switches in the admin panel still apply.",
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Session Title",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "sessionId",
      title: "Session ID",
      type: "string",
      description: "Stable id used by the app and links (e.g. d1-06). Don't change it once published.",
      validation: (Rule) => Rule.max(40),
    }),
    defineField({
      name: "day",
      title: "Day",
      type: "number",
      options: { list: [{ title: "Day 1 — Mon Oct 26", value: 1 }, { title: "Day 2 — Tue Oct 27", value: 2 }], layout: "radio" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: "time", title: "Start time (HH:MM, 24h)", type: "string", validation: timeRule }),
    defineField({ name: "endTime", title: "End time (HH:MM, 24h)", type: "string", validation: timeRule }),
    defineField({
      name: "type",
      title: "Session type label",
      type: "string",
      description: "Shown on the card, e.g. “Fireside Chat”, “Panel Session”, “Lunch Break”.",
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: "format",
      title: "Format",
      type: "string",
      description: "Controls the colour and badge on the agenda.",
      options: { list: FORMATS },
    }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false }),
    defineField({ name: "isBreak", title: "Break / meal", type: "boolean", initialValue: false }),
    defineField({ name: "pillar", title: "Tech pillar", type: "string", options: { list: PILLARS } }),
    defineField({ name: "sector", title: "Sector", type: "string", options: { list: SECTORS } }),
    defineField({
      name: "speakers",
      title: "Speakers",
      type: "array",
      description: "Names should match the Speakers list so photos and profile links appear.",
      of: [
        defineArrayMember({
          type: "object",
          name: "agendaPerson",
          fields: [
            defineField({ name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "org", title: "Organisation", type: "string" }),
            defineField({ name: "tentative", title: "Tentative", type: "boolean", initialValue: false }),
          ],
          preview: { select: { title: "name", subtitle: "org" } },
        }),
      ],
    }),
    defineField({
      name: "moderator",
      title: "Moderator",
      type: "object",
      fields: [
        defineField({ name: "name", title: "Name", type: "string" }),
        defineField({ name: "org", title: "Organisation", type: "string" }),
      ],
    }),
    defineField({ name: "stage", title: "Stage / room", type: "string", validation: (Rule) => Rule.max(80) }),
    defineField({ name: "description", title: "Description", type: "text", rows: 4, validation: (Rule) => Rule.max(1500) }),
    defineField({
      name: "polls",
      title: "Live polls",
      type: "string",
      fieldset: "live",
      options: { list: LIVE_MODES, layout: "radio", direction: "horizontal" },
      initialValue: "auto",
      validation: liveModeRule,
    }),
    defineField({
      name: "qa",
      title: "Audience Q&A",
      type: "string",
      fieldset: "live",
      options: { list: LIVE_MODES, layout: "radio", direction: "horizontal" },
      initialValue: "auto",
      validation: liveModeRule,
    }),
  ],
  orderings: [
    {
      title: "Day & time",
      name: "dayTime",
      by: [{ field: "day", direction: "asc" as const }, { field: "time", direction: "asc" as const }],
    },
  ],
  preview: {
    select: { title: "title", day: "day", time: "time", type: "type" },
    prepare({ title, day, time, type }: { title?: string; day?: number; time?: string; type?: string }) {
      return { title: title || "Untitled session", subtitle: `Day ${day ?? "?"} · ${time || "--:--"}${type ? ` · ${type}` : ""}` };
    },
  },
});
