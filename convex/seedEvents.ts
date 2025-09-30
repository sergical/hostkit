import { internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Create mock event
    const eventId = await ctx.db.insert('events', {
      name: 'Tech Meetup 2025',
      description: 'Monthly tech networking event',
      date: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week from now
      location: 'San Francisco, CA',
    })

    // Add mock attendees
    await ctx.db.insert('attendees', {
      eventId,
      phoneNumber: '+16479844940',
      name: 'Test User',
      status: 'pending',
    })

    console.log('Seeded event:', eventId)
    return null
  },
})
