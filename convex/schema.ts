import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  users: defineTable({
    email: v.string(),
  }).index('email', ['email']),

  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('userId', ['userId']),

  calls: defineTable({
    callSid: v.string(),
    phoneNumber: v.string(),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    status: v.string(),
    duration: v.optional(v.number()),
    transcript: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    eventId: v.optional(v.id('events')),
  })
    .index('by_callSid', ['callSid'])
    .index('by_userId', ['userId']),

  events: defineTable({
    name: v.string(),
    description: v.string(),
    date: v.number(),
    location: v.string(),
  }),

  attendees: defineTable({
    eventId: v.id('events'),
    phoneNumber: v.string(),
    name: v.string(),
    status: v.union(v.literal('confirmed'), v.literal('cancelled'), v.literal('pending')),
  })
    .index('by_event', ['eventId'])
    .index('by_phone_and_event', ['phoneNumber', 'eventId']),
})
