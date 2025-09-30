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
  })
    .index('by_callSid', ['callSid'])
    .index('by_userId', ['userId']),
})
