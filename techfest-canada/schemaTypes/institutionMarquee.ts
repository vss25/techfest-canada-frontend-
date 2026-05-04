import { defineType, defineField } from "sanity";

export default defineType({
  name: "institutionMarquee",
  title: "Institution Marquee",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Institution Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "logo",
      title: "Institution Logo",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "url",
      title: "Website URL",
      type: "url",
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 99,
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
});
