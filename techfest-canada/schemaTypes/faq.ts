// schemaTypes/faq.ts — one frequently asked question (Phase 4, IA build-out).
// FAQs are contextual, never a global /faq page: every event page ends with
// its own stack, layered Global → City → Event in the data and rendered
// event-first on the page. A global FAQ is written once and shows everywhere;
// a city FAQ shows on that city's pages; an event FAQ shows only on its event
// and is listed ahead of the wider layers.
import { defineField, defineType } from "sanity";
import type { StringRule, NumberRule } from "sanity";

const CITIES = [
    { title: "Vancouver", value: "Vancouver" },
    { title: "Calgary", value: "Calgary" },
    { title: "Ottawa", value: "Ottawa" },
    { title: "Toronto", value: "Toronto" },
    { title: "Montreal", value: "Montreal" },
];

export default defineType({
    name: "faq",
    title: "FAQs",
    type: "document",

    fields: [
        defineField({
            name: "question",
            title: "Question",
            type: "string",
            validation: (Rule: StringRule) => Rule.required().error("Question is required."),
        }),
        defineField({
            name: "answer",
            title: "Answer",
            type: "text",
            rows: 5,
            description: "Plain text. Blank lines start a new paragraph.",
            validation: (Rule) => Rule.required().error("Answer is required."),
        }),
        defineField({
            name: "scope",
            title: "Scope",
            type: "string",
            description: "Global = every event page. City = that city's pages. Event = one event only (shown first).",
            options: {
                list: [
                    { title: "Global (all events)", value: "global" },
                    { title: "City", value: "city" },
                    { title: "Event", value: "event" },
                ],
                layout: "radio",
            },
            initialValue: "global",
            validation: (Rule: StringRule) => Rule.required().error("Scope is required."),
        }),
        defineField({
            name: "city",
            title: "City",
            type: "string",
            description: "For City-scope FAQs (and optionally to tag an Event FAQ with its city).",
            options: { list: CITIES, layout: "dropdown" },
            hidden: ({ document }) => document?.scope === "global",
        }),
        defineField({
            name: "event",
            title: "Event",
            type: "reference",
            to: [{ type: "event" }],
            description: "For Event-scope FAQs: the one event this question belongs to.",
            hidden: ({ document }) => document?.scope !== "event",
        }),
        defineField({
            name: "order",
            title: "Display Order",
            type: "number",
            description: "Within its layer, lower numbers appear first.",
            initialValue: 99,
            validation: (Rule: NumberRule) => Rule.integer().min(0),
        }),
    ],

    preview: {
        select: { title: "question", subtitle: "scope" },
    },
});
