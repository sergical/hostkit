import { createServerFileRoute } from '@tanstack/react-start/server'

export const ServerRoute = createServerFileRoute('/api/voice/$').methods({
  POST: async ({ request }) => {
    const upgradeHeader = request.headers.get('Upgrade')

    // Handle WebSocket upgrade for Twilio MediaStream
    if (upgradeHeader === 'websocket') {
      return handleWebSocket(request)
    }

    // Handle Twilio voice webhook (TwiML response)
    return handleVoiceWebhook(request)
  },
})

// Handle initial Twilio voice webhook - return TwiML to start MediaStream
async function handleVoiceWebhook(request: Request) {
  const url = new URL(request.url)
  const wsUrl = `wss://${url.host}/api/voice/stream`

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${wsUrl}" />
    </Connect>
</Response>`

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

// Handle WebSocket connection for audio streaming
async function handleWebSocket(request: Request) {
  const webSocketPair = new WebSocketPair()
  const [client, server] = Object.values(webSocketPair)

  server.accept()

  // Connect to Gemini Live API
  const geminiWs = await connectToGemini()

  // Proxy messages between Twilio and Gemini
  server.addEventListener('message', async (event) => {
    const data = JSON.parse(event.data as string)

    // Handle Twilio MediaStream events
    switch (data.event) {
      case 'start':
        console.log('Stream started:', data.start.callSid)
        // Store call in Convex
        break

      case 'media':
        // Forward audio to Gemini (Twilio sends base64 μ-law audio)
        const audioPayload = {
          realtimeInput: {
            audio: {
              blob: data.media.payload, // base64 audio from Twilio
            },
          },
        }
        geminiWs.send(JSON.stringify(audioPayload))
        break

      case 'stop':
        console.log('Stream stopped')
        geminiWs.close()
        server.close()
        break
    }
  })

  // Handle Gemini responses and forward to Twilio
  geminiWs.addEventListener('message', (event) => {
    const response = JSON.parse(event.data as string)

    if (response.serverContent?.modelTurn?.parts) {
      for (const part of response.serverContent.modelTurn.parts) {
        if (part.inlineData) {
          // Send audio back to Twilio
          const twilioMessage = {
            event: 'media',
            streamSid: 'stream-sid', // TODO: store from start event
            media: {
              payload: part.inlineData.data,
            },
          }
          server.send(JSON.stringify(twilioMessage))
        }
      }
    }
  })

  return new Response(null, {
    status: 101,
    webSocket: client,
  })
}

// Connect to Gemini Live API
async function connectToGemini(): Promise<WebSocket> {
  const geminiApiKey = process.env.GEMINI_API_KEY
  const model = 'gemini-2.5-flash'

  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`

  const response = await fetch(url, {
    headers: {
      'Upgrade': 'websocket',
    },
  })

  if (!response.webSocket) {
    throw new Error('Failed to connect to Gemini Live API')
  }

  const ws = response.webSocket
  ws.accept()

  // Send initial setup message
  const setupMessage = {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
      },
    },
  }
  ws.send(JSON.stringify(setupMessage))

  return ws
}
