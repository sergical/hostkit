import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getUser } from './auth'

export const create = mutation({
  args: {
    eventId: v.id('events'),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    ticketType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    const now = Date.now()
    const attendeeId = await ctx.db.insert('attendees', {
      eventId: args.eventId,
      name: args.name,
      phone: args.phone,
      email: args.email,
      ticketType: args.ticketType,
      attendanceStatus: 'PENDING',
      createdAt: now,
      updatedAt: now,
    })

    return attendeeId
  },
})

export const listByEvent = query({
  args: {
    eventId: v.id('events'),
    status: v.optional(
      v.union(
        v.literal('PENDING'),
        v.literal('CONFIRMED'),
        v.literal('CANCELLED'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    if (args.status) {
      return await ctx.db
        .query('attendees')
        .withIndex('eventId_and_attendanceStatus', (q) =>
          q.eq('eventId', args.eventId).eq('attendanceStatus', args.status!),
        )
        .collect()
    }

    return await ctx.db
      .query('attendees')
      .withIndex('eventId', (q) => q.eq('eventId', args.eventId))
      .collect()
  },
})

export const get = query({
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

    return attendee
  },
})

export const updateStatus = mutation({
  args: {
    attendeeId: v.id('attendees'),
    status: v.union(
      v.literal('PENDING'),
      v.literal('CONFIRMED'),
      v.literal('CANCELLED'),
    ),
  },
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

    await ctx.db.patch(args.attendeeId, {
      attendanceStatus: args.status,
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    attendeeId: v.id('attendees'),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    ticketType: v.optional(v.string()),
  },
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

    const updates: {
      name?: string
      phone?: string
      email?: string
      ticketType?: string
      updatedAt: number
    } = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) updates.name = args.name
    if (args.phone !== undefined) updates.phone = args.phone
    if (args.email !== undefined) updates.email = args.email
    if (args.ticketType !== undefined) updates.ticketType = args.ticketType

    await ctx.db.patch(args.attendeeId, updates)
  },
})

export const remove = mutation({
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

    // Delete related calls
    const calls = await ctx.db
      .query('calls')
      .withIndex('attendeeId', (q) => q.eq('attendeeId', args.attendeeId))
      .collect()

    for (const call of calls) {
      await ctx.db.delete(call._id)
    }

    await ctx.db.delete(args.attendeeId)
  },
})

export const bulkCreate = mutation({
  args: {
    eventId: v.id('events'),
    attendees: v.array(
      v.object({
        name: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
        ticketType: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    const now = Date.now()
    const attendeeIds = []

    for (const attendeeData of args.attendees) {
      const attendeeId = await ctx.db.insert('attendees', {
        eventId: args.eventId,
        name: attendeeData.name,
        phone: attendeeData.phone,
        email: attendeeData.email,
        ticketType: attendeeData.ticketType,
        attendanceStatus: 'PENDING',
        createdAt: now,
        updatedAt: now,
      })
      attendeeIds.push(attendeeId)
    }

    return attendeeIds
  },
})
