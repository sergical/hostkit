import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const createCall = mutation({
  args: {
    callSid: v.string(),
    phoneNumber: v.string(),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    status: v.string(),
    userId: v.optional(v.id('users')),
  },
  returns: v.id('calls'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('calls', {
      callSid: args.callSid,
      phoneNumber: args.phoneNumber,
      direction: args.direction,
      status: args.status,
      userId: args.userId,
    })
  },
})

export const updateCallStatus = mutation({
  args: {
    callSid: v.string(),
    status: v.string(),
    duration: v.optional(v.number()),
    transcript: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query('calls')
      .withIndex('by_callSid', (q) => q.eq('callSid', args.callSid))
      .first()

    if (!call) {
      throw new Error('Call not found')
    }

    await ctx.db.patch(call._id, {
      status: args.status,
      duration: args.duration,
      transcript: args.transcript,
    })
  },
})

export const listCalls = query({
  args: {
    userId: v.optional(v.id('users')),
  },
  returns: v.array(
    v.object({
      _id: v.id('calls'),
      _creationTime: v.number(),
      callSid: v.string(),
      phoneNumber: v.string(),
      direction: v.union(v.literal('inbound'), v.literal('outbound')),
      status: v.string(),
      duration: v.optional(v.number()),
      transcript: v.optional(v.string()),
      userId: v.optional(v.id('users')),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query('calls')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .order('desc')
        .collect()
    }

    return await ctx.db.query('calls').order('desc').take(50)
  },
})
