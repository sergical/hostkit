import { internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Remove all existing events and attendees
    const existingEvents = await ctx.db.query('events').collect()
    for (const event of existingEvents) {
      await ctx.db.delete(event._id)
    }

    const existingAttendees = await ctx.db.query('attendees').collect()
    for (const attendee of existingAttendees) {
      await ctx.db.delete(attendee._id)
    }

    // Create mock event
    const eventId = await ctx.db.insert('events', {
      name: 'Google AI Hackathon',
      description: 'Get to hack with Gemini Live',
      date: new Date('2025-09-30').getTime(),
      location: 'San Francisco, CA',
    })

    // Add mock attendees
    await ctx.db.insert('attendees', {
      eventId,
      phoneNumber: '+16479844940',
      name: 'Sergiy',
      status: 'pending',
    })

    await ctx.db.insert('attendees', {
      eventId,
      phoneNumber: '+15142078223',
      name: 'Jen',
      status: 'pending',
    })

    await ctx.db.insert('attendees', {
      eventId,
      phoneNumber: '+16475155899',
      name: 'Alec',
      status: 'pending',
    })

    await ctx.db.insert('attendees', {
      eventId,
      phoneNumber: '+16476752923',
      name: 'Patrick',
      status: 'pending',
    })

    console.log('Seeded event:', eventId)
    return null
  },
})
