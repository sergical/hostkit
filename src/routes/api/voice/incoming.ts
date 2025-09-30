import { createServerFileRoute } from '@tanstack/react-start/server'

export const ServerRoute = createServerFileRoute('/api/voice/incoming').methods({
  POST: async ({ request }) => {
    console.log('[VOICE] Incoming voice webhook')
    const url = new URL(request.url)
    const wsUrl = `wss://${url.host}/api/voice/stream`

    console.log('[VOICE] WebSocket URL:', wsUrl)

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${wsUrl}" />
    </Connect>
</Response>`

    console.log('[VOICE] Returning TwiML')
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  },
})
