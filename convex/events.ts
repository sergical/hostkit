import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Create a mock event
export const createEvent = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    date: v.number(),
    location: v.string(),
  },
  returns: v.id('events'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('events', args)
  },
})

// Add attendee to event
export const addAttendee = mutation({
  args: {
    eventId: v.id('events'),
    phoneNumber: v.string(),
    name: v.string(),
  },
  returns: v.id('attendees'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('attendees', {
      ...args,
      status: 'pending',
    })
  },
})

// Confirm attendee for event (called by Gemini tool)
export const confirmAttendee = mutation({
  args: {
    phoneNumber: v.string(),
    eventId: v.id('events'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const attendee = await ctx.db
      .query('attendees')
      .withIndex('by_phone_and_event', (q) =>
        q.eq('phoneNumber', args.phoneNumber).eq('eventId', args.eventId)
      )
      .first()

    if (!attendee) {
      return {
        success: false,
        message: 'Attendee not found',
      }
    }

    await ctx.db.patch(attendee._id, { status: 'confirmed' })

    return {
      success: true,
      message: 'Attendee confirmed for event',
    }
  },
})

// Remove attendee from event (called by Gemini tool)
export const removeAttendee = mutation({
  args: {
    phoneNumber: v.string(),
    eventId: v.id('events'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const attendee = await ctx.db
      .query('attendees')
      .withIndex('by_phone_and_event', (q) =>
        q.eq('phoneNumber', args.phoneNumber).eq('eventId', args.eventId)
      )
      .first()

    if (!attendee) {
      return {
        success: false,
        message: 'Attendee not found',
      }
    }

    await ctx.db.patch(attendee._id, { status: 'cancelled' })

    return {
      success: true,
      message: 'Attendee removed from event',
    }
  },
})

// Get event with attendees
export const getEventWithAttendees = query({
  args: {
    eventId: v.id('events'),
  },
  returns: v.union(
    v.object({
      event: v.object({
        _id: v.id('events'),
        name: v.string(),
        description: v.string(),
        date: v.number(),
        location: v.string(),
        _creationTime: v.number(),
      }),
      attendees: v.array(
        v.object({
          _id: v.id('attendees'),
          eventId: v.id('events'),
          phoneNumber: v.string(),
          name: v.string(),
          status: v.union(v.literal('confirmed'), v.literal('cancelled'), v.literal('pending')),
          _creationTime: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event) return null

    const attendees = await ctx.db
      .query('attendees')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    return { event, attendees }
  },
})

// List all events
export const listEvents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('events'),
      name: v.string(),
      description: v.string(),
      date: v.number(),
      location: v.string(),
      _creationTime: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query('events').collect()
  },
})

// Get event info for a phone number (for call context)
export const getEventForPhone = query({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.object({
      eventId: v.id('events'),
      eventName: v.string(),
      eventDate: v.number(),
      eventLocation: v.string(),
      attendeeName: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Find pending attendee for this phone number
    const attendee = await ctx.db
      .query('attendees')
      .filter((q) => q.eq(q.field('phoneNumber'), args.phoneNumber))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first()

    if (!attendee) return null

    const event = await ctx.db.get(attendee.eventId)
    if (!event) return null

    return {
      eventId: event._id,
      eventName: event.name,
      eventDate: event.date,
      eventLocation: event.location,
      attendeeName: attendee.name,
    }
  },
})
