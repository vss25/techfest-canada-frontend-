import {defineField, defineType} from 'sanity'

/* A YouTube or Vimeo video shown on the website (Nov 18 2026). Edited in the admin panel
   (Content › Videos); mirrors CMS_FIELDS.video in the backend (services/cmsSchema.js). Only the
   link is stored: the provider plays the video, so nothing is hosted here. */
export default defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required().max(160)}),
    defineField({name: 'url', title: 'YouTube or Vimeo link', type: 'url', validation: (Rule) => Rule.required()}),
    defineField({name: 'provider', title: 'Provider', type: 'string', options: {list: ['youtube', 'vimeo']}, readOnly: true}),
    defineField({name: 'videoId', title: 'Video ID', type: 'string', readOnly: true}),
    defineField({name: 'thumbnailUrl', title: 'Picture', type: 'url'}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 2, validation: (Rule) => Rule.max(500)}),
    defineField({name: 'recordedOn', title: 'Recorded on', type: 'date'}),
    defineField({name: 'showOnHome', title: 'Home page', type: 'boolean'}),
    defineField({name: 'showOnMedia', title: 'Media page', type: 'boolean', initialValue: true}),
    defineField({name: 'events', title: 'Event pages', type: 'array', of: [{type: 'reference', to: [{type: 'event'}]}]}),
    defineField({name: 'speakers', title: 'Speakers', type: 'array', of: [{type: 'reference', to: [{type: 'speaker'}]}]}),
    defineField({name: 'order', title: 'Order', type: 'number'}),
    defineField({name: 'active', title: 'Shown on the website', type: 'boolean', initialValue: true}),
  ],
  preview: {select: {title: 'title', subtitle: 'provider'}},
})
