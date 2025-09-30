import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getUser } from './auth'

export const create = mutation({
  args: {
    eventId: v.id('events'),
    attendeeId: v.optional(v.id('attendees')),
    direction: v.union(v.literal('INBOUND'), v.literal('OUTBOUND')),
    twilioCallSid: v.optional(v.string()),
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

export const listByEvent = query({
  args: {
    eventId: v.id('events'),
    direction: v.optional(v.union(v.literal('INBOUND'), v.literal('OUTBOUND'))),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    if (args.direction) {
      return await ctx.db
        .query('calls')
        .withIndex('eventId_and_direction', (q) =>
          q.eq('eventId', args.eventId).eq('direction', args.direction!),
        )
        .order('desc')
        .collect()
    }

    return await ctx.db
      .query('calls')
      .withIndex('eventId', (q) => q.eq('eventId', args.eventId))
      .order('desc')
      .collect()
  },
})

export const listByAttendee = query({
  args: { attendeeId: v.id('attendees') },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const attendee = await ctx.db.get(args.attendeeId)

    if (!attendee) {
      throw new Error('Attendee not found')
    }

    const event = await ctx.db.get(attendee.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Unauthorized')
    }

    return await ctx.db
      .query('calls')
      .withIndex('attendeeId', (q) => q.eq('attendeeId', args.attendeeId))
      .order('desc')
      .collect()
  },
})

export const get = query({
  args: { callId: v.id('calls') },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const call = await ctx.db.get(args.callId)

    if (!call) {
      throw new Error('Call not found')
    }

    const event = await ctx.db.get(call.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Unauthorized')
    }

    return call
  },
})

export const updateStatus = mutation({
  args: {
    callId: v.id('calls'),
    status: v.union(
      v.literal('initiated'),
      v.literal('ringing'),
      v.literal('in-progress'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('busy'),
      v.literal('no-answer'),
    ),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)

    if (!call) {
      throw new Error('Call not found')
    }

    const updates: {
      status: string
      durationSeconds?: number
      updatedAt: number
    } = {
      status: args.status,
      updatedAt: Date.now(),
    }

    if (args.durationSeconds !== undefined) {
      updates.durationSeconds = args.durationSeconds
    }

    await ctx.db.patch(args.callId, updates)
  },
})

export const updateTranscript = mutation({
  args: {
    callId: v.id('calls'),
    transcript: v.string(),
    aiSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId)

    if (!call) {
      throw new Error('Call not found')
    }

    const updates: {
      transcript: string
      aiSummary?: string
      updatedAt: number
    } = {
      transcript: args.transcript,
      updatedAt: Date.now(),
    }

    if (args.aiSummary !== undefined) {
      updates.aiSummary = args.aiSummary
    }

    await ctx.db.patch(args.callId, updates)
  },
})

export const findByTwilioSid = query({
  args: { twilioCallSid: v.string() },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query('calls')
      .withIndex('twilioCallSid', (q) =>
        q.eq('twilioCallSid', args.twilioCallSid),
      )
      .collect()

    return calls[0] ?? null
  },
})

export const remove = mutation({
  args: { callId: v.id('calls') },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const call = await ctx.db.get(args.callId)

    if (!call) {
      throw new Error('Call not found')
    }

    const event = await ctx.db.get(call.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Unauthorized')
    }

    await ctx.db.delete(args.callId)
  },
})
