// schemaTypes/speaker.ts
import { defineField, defineType } from "sanity";
import type { StringRule, NumberRule, ImageRule, TextRule } from "sanity";

export default defineType({
    name: "speaker",
    title: "Speakers",
    type: "document",

    fields: [
        defineField({
            name: "name",
            title: "Full Name",
            type: "string",
            validation: (Rule: StringRule) => Rule.required().error("Speaker name is required."),
        }),
        defineField({
            name: "title",
            title: "Job Title",
            type: "string",
            description: "e.g. Chief Executive Officer",
            validation: (Rule: StringRule) => Rule.required().error("Job title is required."),
        }),
        defineField({
            name: "company",
            title: "Company",
            type: "string",
            description: "e.g. Shopify",
            validation: (Rule: StringRule) => Rule.required().error("Company is required."),
        }),
        defineField({
            name: "bio",
            title: "Bio",
            type: "text",
            rows: 4,
            description: "A short speaker bio shown on the card (2–3 sentences recommended).",
        }),
        // ── Bios (Phase 1 schema; the site keeps reading `bio` until the Phase 4 switch) ──
        defineField({
            name: "shortBio",
            title: "Short Bio (cards)",
            type: "text",
            rows: 3,
            description:
                "One or two sentences for speaker cards and grids. Aim for 240 characters or fewer so it never truncates mid-sentence.",
            validation: (Rule: TextRule) =>
                Rule.max(240).warning("Short bios over 240 characters may truncate on cards."),
        }),
        defineField({
            name: "fullBio",
            title: "Full Bio (profile page)",
            type: "array",
            description:
                "The full speaker bio for the profile page: paragraphs, bold/italic, links and bullet lists. The mark set is deliberately small so formatting stays on-brand.",
            of: [
                {
                    type: "block",
                    styles: [{ title: "Normal", value: "normal" }],
                    lists: [{ title: "Bullet", value: "bullet" }],
                    marks: {
                        decorators: [
                            { title: "Bold", value: "strong" },
                            { title: "Italic", value: "em" },
                        ],
                        annotations: [
                            {
                                name: "link",
                                title: "Link",
                                type: "object",
                                fields: [
                                    {
                                        name: "href",
                                        title: "URL",
                                        type: "url",
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
        }),
        defineField({
            name: "imageOriginal",
            title: "Original photo (as uploaded)",
            type: "image",
            description: "Kept by the TTFC admin panel's photo studio so the speaker photo can be redone. Not shown on the website.",
            readOnly: true,
        }),
        defineField({
            name: "image",
            title: "Profile Photo",
            type: "image",
            description:
                "Headshot, 800×800 px or larger recommended. The site crops it per layout (square on cards, 4:5 on the profile) from the hotspot — set the hotspot on the face.",
            options: { hotspot: true },
            fields: [
                {
                    name: "alt",
                    title: "Alt Text",
                    type: "string",
                    description: "Describes the photo for screen readers and SEO, e.g. “Jane Doe, CEO of Shopify”.",
                },
            ],
            validation: (Rule: ImageRule) => Rule.required().error("Profile photo is required."),
        }),
        defineField({
            name: "bannerImage",
            title: "Banner Image (profile header)",
            type: "image",
            description:
                "Optional wide image for the top of the speaker's profile page, e.g. them speaking on stage. Landscape, 1600×900 px or larger recommended.",
            options: { hotspot: true },
            fields: [
                {
                    name: "alt",
                    title: "Alt Text",
                    type: "string",
                    description: "Describes the photo for screen readers and SEO.",
                },
            ],
        }),

        // ── Ordering ──
        defineField({
            name: "order",
            title: "Display Order",
            type: "number",
            description: "Controls the order speakers appear. Lower numbers appear first.",
            validation: (Rule: NumberRule) => Rule.required().min(1).error("Display order is required."),
        }),
        defineField({
            name: "rowPosition",
            title: "Position in Row",
            type: "number",
            description:
                "Fine-tunes where this speaker sits within their row/group. Lower numbers appear first. Leave empty to fall back to Display Order.",
            validation: (Rule: NumberRule) =>
                Rule.min(1).integer().error("Position in row must be a whole number of 1 or more."),
        }),
        defineField({
            name: "featured",
            title: "Featured Speaker",
            type: "boolean",
            description: "Featured speakers are pinned to the top of the grid regardless of order.",
            initialValue: false,
        }),

        // ── Categorization (powers the frontend filters) ──
        defineField({
            name: "speakerType",
            title: "Speaker Type",
            type: "string",
            description: "Badge shown on the card, e.g. SPEAKER or KEYNOTE.",
            options: {
                list: [
                    { title: "Speaker", value: "speaker" },
                    { title: "Keynote", value: "keynote" },
                    { title: "Panelist", value: "panelist" },
                    { title: "Moderator", value: "moderator" },
                ],
                layout: "radio",
            },
            initialValue: "speaker",
        }),
        defineField({
            name: "techPillar",
            title: "Tech Pillar",
            type: "string",
            description: "Used by the Tech Pillar filter on the speakers page.",
            options: {
                list: [
                    { title: "Artificial Intelligence", value: "ai" },
                    { title: "Cybersecurity", value: "cybersecurity" },
                    { title: "Cloud & Data", value: "cloud-data" },
                    { title: "Emerging Tech", value: "emerging-tech" },
                ],
            },
        }),
        defineField({
            name: "sector",
            title: "Sector",
            type: "string",
            description: "Used by the Sector filter and shown as the tag on the card.",
            options: {
                list: [
                    { title: "Healthcare & Life Sci", value: "healthcare-life-sci" },
                    { title: "Manufacturing & Supply", value: "manufacturing-supply" },
                    { title: "Government & Public Sector", value: "government" },
                    { title: "Financial Services", value: "financial-services" },
                    { title: "Energy & Sustainability", value: "energy" },
                    { title: "Media & Entertainment", value: "media" },
                ],
            },
        }),
        defineField({
            name: "events",
            title: "Events",
            type: "array",
            description:
                "Which event(s) this speaker belongs to. Empty = every event (today's behaviour); set it to scope the speaker to specific events.",
            of: [{ type: "reference", to: [{ type: "event" }] }],
        }),

        // ── Optional social links ──
        defineField({
            name: "linkedin",
            title: "LinkedIn URL",
            type: "url",
            description: "Full URL e.g. https://linkedin.com/in/username",
        }),
        defineField({
            name: "twitter",
            title: "X / Twitter URL",
            type: "url",
            description: "Full URL e.g. https://x.com/username",
        }),
        defineField({
            name: "github",
            title: "GitHub URL",
            type: "url",
            description: "Full URL e.g. https://github.com/username",
        }),
        defineField({
            name: "website",
            title: "Personal Website URL",
            type: "url",
            description: "Full URL e.g. https://janedoe.com",
        }),
    ],

    // Preview in Studio list — photo + name + company
    preview: {
        select: {
            title: "name",
            subtitle: "company",
            media: "image",
        },
    },

    orderings: [
        {
            title: "Display Order",
            name: "orderAsc",
            by: [{ field: "order", direction: "asc" }],
        },
        {
            title: "Row Position",
            name: "rowPositionAsc",
            by: [
                { field: "order", direction: "asc" },
                { field: "rowPosition", direction: "asc" },
            ],
        },
        {
            title: "Name A–Z",
            name: "nameAsc",
            by: [{ field: "name", direction: "asc" }],
        },
    ],
});
