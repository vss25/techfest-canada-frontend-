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
            name: "citySkyline",
            title: "City Skyline (hero overlay)",
            type: "image",
            description:
                "Optional: the transparent skyline silhouette graphic for this event's city (SVG/PNG with transparency), layered over the hero video so the city is unmistakable — e.g. Vancouver's skyline with the mountains and harbour.",
            options: { hotspot: true },
        }),
        defineField({
            name: "gallery",
            title: "Gallery",
            type: "array",
            description: "Photos for the event page's gallery (and its Past-edition highlights). Optional.",
            of: [
                {
                    type: "image",
                    options: { hotspot: true },
                    fields: [
                        {
                            name: "alt",
                            title: "Alt Text",
                            type: "string",
                            description: "Describes the photo for screen readers and SEO.",
                        },
                    ],
                },
            ],
        }),
        defineField({
            name: "brochure",
            title: "Brochure (PDF)",
            type: "file",
            description: "Optional: the event's brochure PDF, linked from its page.",
            options: { accept: ".pdf" },
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
        defineField({
            name: "pricingAnnounced",
            title: "Pricing Announced",
            type: "boolean",
            description:
                "While off, the site shows “Pricing to be announced” for this event's tickets, exhibitor and sponsor packages. Turn it on only when staff announce the pricing.",
            initialValue: false,
        }),
        // Redesign step 1 (Nov 2026): the event page's own text, edited in Admin › Event pages.
        defineField({ name: "photoCredit", title: "Photo credit", type: "string" }),
        defineField({ name: "theme", title: "Theme", type: "string" }),
        defineField({ name: "tagline", title: "One line under the name", type: "string" }),
        defineField({ name: "formatLine", title: "Format", type: "string", description: "e.g. “One day · 8 sessions”" }),
        defineField({ name: "audience", title: "Who's in the room", type: "string", description: "e.g. “150 senior delegates”" }),
        defineField({
            name: "pageMode",
            title: "Page version",
            type: "string",
            options: { list: [
                { title: "Automatic (coming soon until it has sessions)", value: "auto" },
                { title: "Coming soon", value: "coming-soon" },
                { title: "Full page", value: "full" },
            ] },
            initialValue: "auto",
        }),
        defineField({
            name: "knownSoFar",
            title: "Coming soon: What we know so far",
            type: "array",
            of: [{ type: "object", fields: [
                defineField({ name: "label", type: "string" }),
                defineField({ name: "value", type: "string" }),
            ] }],
        }),
        defineField({
            name: "comingNext",
            title: "Coming soon: Coming next",
            type: "array",
            of: [{ type: "object", fields: [
                defineField({ name: "label", type: "string" }),
                defineField({ name: "when", type: "string" }),
                defineField({ name: "done", type: "boolean" }),
            ] }],
        }),
        defineField({ name: "notifyHeading", title: "Notify form heading", type: "string" }),
        defineField({ name: "showReport", title: "Show the Toronto 2026 report card", type: "boolean", initialValue: true }),
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
