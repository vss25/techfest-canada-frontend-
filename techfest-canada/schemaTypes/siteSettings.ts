// schemaTypes/siteSettings.ts
import { defineField, defineType } from "sanity";

export default defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",

  fields: [
    defineField({
      name: "attendeesCarouselEnabled",
      title: "Attendees Carousel Enabled",
      type: "boolean",
      description:
        'Toggle ON to show the Featured Attendees carousel on the site. ' +
        'Toggle OFF to show a "Coming Soon" message instead.',
      initialValue: false,
    }),
    defineField({
      name: "speakersEnabled",
      title: "Speakers Section Enabled",
      type: "boolean",
      description:
        'Toggle ON to show the Featured Speakers section on the site. ' +
        'Toggle OFF to show a "Coming Soon" message instead.',
      initialValue: false,
    }),
  ],
});