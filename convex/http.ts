import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'
import { Id } from './_generated/dataModel'
import { authComponent } from './auth'
import { createAuth } from './auth'

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

// Get event info for a phone number
http.route({
  path: '/event-for-phone',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const phoneNumber = url.searchParams.get('phoneNumber')

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Missing phoneNumber' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await ctx.runQuery(api.events.getEventForPhone, { phoneNumber })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

// Webhook for Gemini to call to confirm attendee
http.route({
  path: '/confirm-attendee',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const { phoneNumber, eventId } = await request.json()

    if (!phoneNumber || !eventId) {
      return new Response(JSON.stringify({ error: 'Missing phoneNumber or eventId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await ctx.runMutation(api.events.confirmAttendee, {
      phoneNumber,
      eventId: eventId as Id<'events'>,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

// Webhook for Gemini to call to remove attendee
http.route({
  path: '/remove-attendee',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const { phoneNumber, eventId } = await request.json()

    if (!phoneNumber || !eventId) {
      return new Response(JSON.stringify({ error: 'Missing phoneNumber or eventId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await ctx.runMutation(api.events.removeAttendee, {
      phoneNumber,
      eventId: eventId as Id<'events'>,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

export default http
