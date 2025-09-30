import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { Id } from './_generated/dataModel'

// Internal function for voice agent to update attendee status
export const updateAttendeeStatus = internalMutation({
  args: {
    attendeeId: v.id('attendees'),
    status: v.union(
      v.literal('PENDING'),
      v.literal('CONFIRMED'),
      v.literal('CANCELLED'),
    ),
  },
  handler: async (ctx, args) => {
    const attendee = await ctx.db.get(args.attendeeId)

    if (!attendee) {
      throw new Error('Attendee not found')
    }

    await ctx.db.patch(args.attendeeId, {
      attendanceStatus: args.status,
      updatedAt: Date.now(),
    })

    return { success: true, attendee }
  },
})

// Internal function for voice agent to lookup event content
export const lookupEventContent = internalQuery({
  args: {
    eventId: v.id('events'),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3

    // Use Convex full-text search to find relevant content
    const results = await ctx.db
      .query('contentChunks')
      .withSearchIndex('search_content', (q) =>
        q.search('chunkText', args.query).eq('eventId', args.eventId),
      )
      .take(limit)

    // Return the most relevant chunks
    return results.map((chunk) => ({
      text: chunk.chunkText,
      source: chunk.sourceFileName,
      chunkIndex: chunk.chunkIndex,
    }))
  },
})

// Internal function to get attendee by phone number for inbound calls
export const findAttendeeByPhone = internalQuery({
  args: {
    phone: v.string(),
    eventId: v.optional(v.id('events')),
  },
  handler: async (ctx, args) => {
    const attendees = await ctx.db
      .query('attendees')
      .withIndex('phone', (q) => q.eq('phone', args.phone))
      .collect()

    // If eventId is provided, filter by it
    if (args.eventId) {
      const attendee = attendees.find((a) => a.eventId === args.eventId)
      return attendee ?? null
    }

    // Otherwise return the first match
    return attendees[0] ?? null
  },
})

// Internal function to create a call record from Twilio webhook
export const createCallRecord = internalMutation({
  args: {
    eventId: v.id('events'),
    attendeeId: v.optional(v.id('attendees')),
    direction: v.union(v.literal('INBOUND'), v.literal('OUTBOUND')),
    twilioCallSid: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const callId = await ctx.db.insert('calls', {
      eventId: args.eventId,
      attendeeId: args.attendeeId,
      direction: args.direction,
      twilioCallSid: args.twilioCallSid,
      status: 'initiated',
      createdAt: now,
      updatedAt: now,
    })

    return callId
  },
})

// Internal function to update call status and details
export const updateCallRecord = internalMutation({
  args: {
    twilioCallSid: v.string(),
    status: v.optional(
      v.union(
        v.literal('initiated'),
        v.literal('ringing'),
        v.literal('in-progress'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('busy'),
        v.literal('no-answer'),
      ),
    ),
    transcript: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query('calls')
      .withIndex('twilioCallSid', (q) =>
        q.eq('twilioCallSid', args.twilioCallSid),
      )
      .collect()

    const call = calls[0]
    if (!call) {
      throw new Error('Call not found')
    }

    const updates: {
      status?: string
      transcript?: string
      aiSummary?: string
      durationSeconds?: number
      updatedAt: number
    } = {
      updatedAt: Date.now(),
    }

    if (args.status !== undefined) updates.status = args.status
    if (args.transcript !== undefined) updates.transcript = args.transcript
    if (args.aiSummary !== undefined) updates.aiSummary = args.aiSummary
    if (args.durationSeconds !== undefined)
      updates.durationSeconds = args.durationSeconds

    await ctx.db.patch(call._id, updates)

    return { success: true, callId: call._id }
  },
})

// Internal function to get event details for voice agent
export const getEventForCall = internalQuery({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)

    if (!event) {
      throw new Error('Event not found')
    }

    return {
      name: event.name,
      description: event.description,
      contentStatus: event.contentStatus,
    }
  },
})
