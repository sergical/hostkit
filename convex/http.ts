import { httpRouter } from 'convex/server'
import { authComponent } from './auth'
import { createAuth } from './auth'
import { httpAction } from './_generated/server'
import { api, internal } from './_generated/api'
import { Id } from './_generated/dataModel'

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

// Twilio webhook for inbound voice calls
http.route({
  path: '/twilio/voice/inbound',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string

    // TODO: Map the 'To' number to an event
    // For now, we'll need to store event phone numbers and look them up
    // This is a placeholder response that connects to WebSocket

    // Voice agent WebSocket URL (dev: localhost, prod: your deployment)
    const voiceAgentUrl =
      process.env.VOICE_AGENT_URL || 'ws://localhost:8080/media-stream'

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Welcome to the event assistance line. Please wait while we connect you.</Say>
  <Connect>
    <Stream url="${voiceAgentUrl}">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="from" value="${from}" />
      <Parameter name="direction" value="INBOUND" />
    </Stream>
  </Connect>
</Response>`

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }),
})

// Twilio webhook for outbound voice calls
http.route({
  path: '/twilio/voice/outbound',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    const to = formData.get('To') as string
    const from = formData.get('From') as string

    // Extract eventId and attendeeId from custom parameters if passed
    const eventId = formData.get('eventId') as string
    const attendeeId = formData.get('attendeeId') as string

    // Voice agent WebSocket URL (dev: localhost, prod: your deployment)
    const voiceAgentUrl =
      process.env.VOICE_AGENT_URL || 'ws://localhost:8080/media-stream'

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello, this is your event confirmation assistant.</Say>
  <Connect>
    <Stream url="${voiceAgentUrl}">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="to" value="${to}" />
      <Parameter name="direction" value="OUTBOUND" />
      <Parameter name="eventId" value="${eventId || ''}" />
      <Parameter name="attendeeId" value="${attendeeId || ''}" />
    </Stream>
  </Connect>
</Response>`

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }),
})

// Twilio call status callback
http.route({
  path: '/twilio/call-status',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData()
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      initiated: 'initiated',
      ringing: 'ringing',
      'in-progress': 'in-progress',
      completed: 'completed',
      busy: 'busy',
      failed: 'failed',
      'no-answer': 'no-answer',
    }

    const mappedStatus = statusMap[callStatus] || 'failed'

    // Update call record
    await ctx.runMutation(internal.twilio.updateCallRecord, {
      twilioCallSid: callSid,
      status: mappedStatus as any,
      durationSeconds: callDuration ? parseInt(callDuration) : undefined,
    })

    return new Response('OK', { status: 200 })
  }),
})

// Protected endpoint to trigger outbound calls
http.route({
  path: '/api/calls/trigger-outbound',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // TODO: Add authentication check using Better Auth
    // For now, this is a placeholder

    const body = await request.json()
    const { attendeeId, eventId } = body

    // Validate inputs
    if (!attendeeId || !eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing attendeeId or eventId' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // TODO: Use Twilio REST API to initiate call
    // This would require adding Twilio credentials and the Twilio SDK
    // For now, return a placeholder response

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Outbound call triggered',
        attendeeId,
        eventId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }),
})

export default http
