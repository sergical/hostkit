import { v } from 'convex/values'
import { action } from './_generated/server'

export const initiateCall = action({
  args: {
    to: v.string(),
    eventId: v.optional(v.id('events')),
  },
  returns: v.object({
    success: v.boolean(),
    callSid: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    const streamUrl = process.env.TWILIO_STREAM_URL || 'wss://hostk.it.com/stream'

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        error: 'Twilio credentials not configured',
      }
    }

    const auth = btoa(`${accountSid}:${authToken}`)

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${streamUrl}">
            <Parameter name="phoneNumber" value="${args.to}" />
            ${args.eventId ? `<Parameter name="eventId" value="${args.eventId}" />` : ''}
        </Stream>
    </Connect>
</Response>`

    const params = new URLSearchParams({
      To: args.to,
      From: fromNumber,
      Twiml: twiml,
    })

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Twilio API error: ${errorText}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        callSid: data.sid,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})
