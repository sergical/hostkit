import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getUser } from './auth'

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    inboundPhoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const now = Date.now()

    const eventId = await ctx.db.insert('events', {
      name: args.name,
      description: args.description,
      organizerId: user._id,
      inboundPhoneNumber: args.inboundPhoneNumber,
      contentStatus: 'none',
      createdAt: now,
      updatedAt: now,
    })

    return eventId
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx)
    return await ctx.db
      .query('events')
      .withIndex('organizerId_and_createdAt', (q) =>
        q.eq('organizerId', user._id),
      )
      .order('desc')
      .collect()
  },
})

export const get = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    return event
  },
})

export const update = mutation({
  args: {
    eventId: v.id('events'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    inboundPhoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    const updates: {
      name?: string
      description?: string
      inboundPhoneNumber?: string
      updatedAt: number
    } = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.inboundPhoneNumber !== undefined)
      updates.inboundPhoneNumber = args.inboundPhoneNumber

    await ctx.db.patch(args.eventId, updates)
  },
})

export const updateContentStatus = mutation({
  args: {
    eventId: v.id('events'),
    contentStatus: v.union(
      v.literal('none'),
      v.literal('processing'),
      v.literal('ready'),
      v.literal('error'),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    await ctx.db.patch(args.eventId, {
      contentStatus: args.contentStatus,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    // Delete all related data
    const attendees = await ctx.db
      .query('attendees')
      .withIndex('eventId', (q) => q.eq('eventId', args.eventId))
      .collect()

    const calls = await ctx.db
      .query('calls')
      .withIndex('eventId', (q) => q.eq('eventId', args.eventId))
      .collect()

    const contentChunks = await ctx.db
      .query('contentChunks')
      .withIndex('eventId', (q) => q.eq('eventId', args.eventId))
      .collect()

    // Delete all related records
    for (const attendee of attendees) {
      await ctx.db.delete(attendee._id)
    }
    for (const call of calls) {
      await ctx.db.delete(call._id)
    }
    for (const chunk of contentChunks) {
      await ctx.db.delete(chunk._id)
    }

    // Finally delete the event
    await ctx.db.delete(args.eventId)
  },
})
