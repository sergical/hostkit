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

  events: defineTable({
    name: v.string(),
    description: v.string(),
    organizerId: v.id('users'),
    inboundPhoneNumber: v.optional(v.string()),
    contentStatus: v.union(
      v.literal('none'),
      v.literal('processing'),
      v.literal('ready'),
      v.literal('error'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('organizerId', ['organizerId'])
    .index('organizerId_and_createdAt', ['organizerId', 'createdAt']),

  attendees: defineTable({
    eventId: v.id('events'),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    ticketType: v.optional(v.string()),
    attendanceStatus: v.union(
      v.literal('PENDING'),
      v.literal('CONFIRMED'),
      v.literal('CANCELLED'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('eventId', ['eventId'])
    .index('eventId_and_attendanceStatus', ['eventId', 'attendanceStatus'])
    .index('phone', ['phone']),

  calls: defineTable({
    eventId: v.id('events'),
    attendeeId: v.optional(v.id('attendees')),
    direction: v.union(v.literal('INBOUND'), v.literal('OUTBOUND')),
    twilioCallSid: v.optional(v.string()),
    status: v.union(
      v.literal('initiated'),
      v.literal('ringing'),
      v.literal('in-progress'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('busy'),
      v.literal('no-answer'),
    ),
    transcript: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('eventId', ['eventId'])
    .index('attendeeId', ['attendeeId'])
    .index('twilioCallSid', ['twilioCallSid'])
    .index('eventId_and_direction', ['eventId', 'direction']),

  contentChunks: defineTable({
    eventId: v.id('events'),
    chunkText: v.string(),
    embedding: v.optional(v.array(v.float64())),
    sourceFileName: v.string(),
    sourceFileType: v.string(),
    chunkIndex: v.number(),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('eventId', ['eventId'])
    .index('eventId_and_chunkIndex', ['eventId', 'chunkIndex'])
    .searchIndex('search_content', {
      searchField: 'chunkText',
      filterFields: ['eventId'],
    }),
})
