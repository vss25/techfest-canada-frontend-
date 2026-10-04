import { defineType, defineField } from "sanity";

export default defineType({
  name: "partner",
  title: "Partner",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Partner Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Partner Category",
      type: "string",
      options: {
        list: [
          { title: "Our Partners and Supporters", value: "partnersAndSupporters" },
          { title: "Government Partners", value: "governmentPartners" },
          { title: "Industry Associates", value: "industryAssociates" },
          { title: "Academic and Research Institutions", value: "academicResearchInstitutions" },
          { title: "Corporate and Enterprise Partners", value: "corporateEnterprisePartners" },
          { title: "Startup and Ecosystem Partners", value: "startupEcosystemPartners" },
          { title: "International Trade Bodies", value: "internationalTradeBodies" },
          { title: "Other", value: "other" },
        ],
        layout: "dropdown",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "logo",
      title: "Partner Logo",
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
      name: "logoScale",
      title: "Logo size (%)",
      type: "number",
      description: "How big the logo appears on the website, as a % of the normal size (30–250). 100 = normal. Also adjustable in the TTFC admin panel.",
      initialValue: 100,
      validation: (Rule) => Rule.min(30).max(250),
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
});
