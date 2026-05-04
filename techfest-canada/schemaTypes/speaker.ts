// schemaTypes/speaker.ts
import { defineField, defineType } from "sanity";
import type { StringRule, NumberRule, ImageRule } from "sanity";

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
        defineField({
            name: "image",
            title: "Profile Photo",
            type: "image",
            options: { hotspot: true },
            validation: (Rule: ImageRule) => Rule.required().error("Profile photo is required."),
        }),
        defineField({
            name: "order",
            title: "Display Order",
            type: "number",
            description: "Controls the order speakers appear. Lower numbers appear first.",
            validation: (Rule: NumberRule) => Rule.required().min(1).error("Display order is required."),
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
            title: "Name A–Z",
            name: "nameAsc",
            by: [{ field: "name", direction: "asc" }],
        },
    ],
});