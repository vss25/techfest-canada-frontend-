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
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
});
