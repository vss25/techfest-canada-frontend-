import {defineField, defineType} from 'sanity'
import type {PreviewValue} from 'sanity'

export default defineType({
  name: 'homeSponsor',
  title: 'Home Sponsor',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Sponsor Name',
      type: 'string',
      validation: (Rule) => Rule.required().min(1).max(100),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      description: "Upload the sponsor's logo (SVG, PNG, or WebP recommended).",
      options: {
        hotspot: false,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Website URL',
      type: 'url',
      description: 'Optional link when the logo is clicked.',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first in the marquee.',
      initialValue: 99,
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Uncheck to hide this sponsor without deleting it.',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc' as const}],
    },
  ],
  preview: {
    select: {
      title: 'name',
      media: 'logo',
      subtitle: 'active',
    },
    prepare({
      title,
      media,
      subtitle,
    }: {
      title: string
      media: PreviewValue['media']
      subtitle: boolean
    }): PreviewValue {
      return {
        title,
        media,
        subtitle: subtitle ? '✅ Active' : '⛔ Hidden',
      }
    },
  },
})
