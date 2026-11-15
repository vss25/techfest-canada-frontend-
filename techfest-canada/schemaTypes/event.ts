// schemaTypes/event.ts — one TTFC event (a city briefing or the main event).
// The public face of the event spine: name, dates, venue and hero media for
// the event's pages. The backend's EventConfig record with the same eventKey
// is the operational half (attendee visibility, switches) — the two are tied
// together by eventKey alone.
import { defineField, defineType } from "sanity";
import type { StringRule, NumberRule } from "sanity";

export default defineType({
    name: "event",
    title: "Events",
    type: "document",

    fields: [
        defineField({
            name: "name",
            title: "Event Name",
            type: "string",
            description: "e.g. The Tech Festival Canada 2026, or Calgary Briefing 2027",
            validation: (Rule: StringRule) => Rule.required().error("Event name is required."),
        }),
        defineField({
            name: "eventKey",
            title: "Event Key",
            type: "slug",
            description:
                "Must match the backend EventConfig key exactly (e.g. ttfc-2026-main, calgary-2027-briefing). It ties this event to its tickets, attendees and visibility settings — don't change it once the event is live.",
            options: { source: "name", maxLength: 96 },
            validation: (Rule) => Rule.required().error("Event key is required."),
        }),
        defineField({
            name: "city",
            title: "City",
            type: "string",
            description: "e.g. Toronto, Calgary, Vancouver",
        }),
        defineField({
            name: "type",
            title: "Event Type",
            type: "string",
            description: "A one-day city Briefing, or the two-day Main Event.",
            options: {
                list: [
                    { title: "Briefing", value: "briefing" },
                    { title: "Main Event", value: "main-event" },
                ],
                layout: "radio",
            },
        }),
        defineField({
            name: "year",
            title: "Year",
            type: "number",
            description: "e.g. 2027",
            validation: (Rule: NumberRule) => Rule.integer().min(2026).max(2100),
        }),
        defineField({
            name: "startDate",
            title: "Start Date",
            type: "date",
        }),
        defineField({
            name: "endDate",
            title: "End Date",
            type: "date",
        }),
        defineField({
            name: "venueName",
            title: "Venue Name",
            type: "string",
            description: "e.g. The Westin Harbour Castle",
        }),
        defineField({
            name: "venueAddress",
            title: "Venue Address",
            type: "string",
            description: "Full address, as shown wherever the venue is named.",
        }),
        defineField({
            name: "heroImage",
            title: "Hero Image",
            type: "image",
            description: "The event's hero/poster image. The site crops it per layout from the hotspot.",
            options: { hotspot: true },
        }),
        defineField({
            name: "heroVideoUrl",
            title: "Hero Video URL",
            type: "url",
            description: "Optional: a short, silent hero loop (YouTube/Vimeo or a hosted file). The hero image is the poster and the mobile fallback.",
        }),
        defineField({
            name: "description",
            title: "Description",
            type: "text",
            rows: 4,
            description: "One short paragraph for the event's landing page.",
        }),
        defineField({
            name: "statusNote",
            title: "Status Note",
            type: "string",
            description: "Optional short line shown with the event's status, e.g. “Tickets on sale soon” or “Sold out”.",
        }),
    ],

    // Preview in Studio list — name + city
    preview: {
        select: {
            title: "name",
            subtitle: "city",
            media: "heroImage",
        },
    },
});
