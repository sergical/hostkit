/**
 * Voice Agent WebSocket Server
 * Bridges Twilio Media Streams with Gemini Live API
 */

import 'dotenv/config'
import express from 'express'
import { WebSocketServer } from 'ws'
import { GeminiLiveClient, createSystemInstruction } from './gemini-client-stub.js'
import { TwilioStreamHandler, parseSessionParams } from './twilio-handler.js'
import {
  ConvexClient,
  createFunctionDeclarations,
} from './convex-client.js'

const PORT = process.env.PORT || 8080

// Environment validation
const requiredEnvVars = [
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_CLOUD_LOCATION',
  'CONVEX_URL',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

// Initialize Express app
const app = express()

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-agent' })
})

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Voice Agent server listening on port ${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`)
})

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/media-stream' })

// Handle WebSocket connections
wss.on('connection', async (ws, req) => {
  console.log('[Server] New WebSocket connection')

  // Parse session parameters from URL
  const url = new URL(req.url, `http://${req.headers.host}`)
  const sessionParams = parseSessionParams(url)

  console.log('[Server] Session params:', sessionParams)

  // Initialize Convex client
  const convexClient = new ConvexClient(
    process.env.CONVEX_URL,
    process.env.CONVEX_DEPLOY_KEY
  )

  // Get event information
  let eventInfo = null
  if (sessionParams.eventId) {
    try {
      eventInfo = await convexClient.getEvent(sessionParams.eventId)
      console.log('[Server] Event loaded:', eventInfo.name)
    } catch (error) {
      console.error('[Server] Failed to load event:', error)
    }
  }

  // If inbound call and no attendeeId, try to find attendee by phone
  if (sessionParams.direction === 'INBOUND' && !sessionParams.attendeeId && sessionParams.from) {
    try {
      const attendee = await convexClient.findAttendeeByPhone(
        sessionParams.from,
        sessionParams.eventId
      )
      if (attendee) {
        sessionParams.attendeeId = attendee._id
        console.log('[Server] Found attendee:', attendee.name)
      }
    } catch (error) {
      console.error('[Server] Failed to find attendee:', error)
    }
  }

  // Initialize Gemini client
  const systemInstruction = createSystemInstruction(
    sessionParams.direction,
    eventInfo || { name: 'the event' }
  )

  const geminiClient = new GeminiLiveClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
    modelId: process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash-live-preview-04-09',
    systemInstruction,
    tools: createFunctionDeclarations(),
  })

  // Initialize Twilio handler
  const twilioHandler = new TwilioStreamHandler(
    ws,
    geminiClient,
    convexClient,
    sessionParams
  )

  // Connect to Gemini
  try {
    await geminiClient.connect()
  } catch (error) {
    console.error('[Server] Failed to connect to Gemini:', error)
    ws.close()
    return
  }

  // Set up Gemini event handlers
  geminiClient.onAudio((audioBase64) => {
    // Send audio from Gemini to Twilio
    twilioHandler.sendAudio(audioBase64)
  })

  geminiClient.onText((text) => {
    console.log('[Gemini] Text:', text)
    twilioHandler.addToTranscript('assistant', text)
  })

  geminiClient.onToolCall(async (functionCalls) => {
    console.log('[Gemini] Tool calls:', functionCalls.length)

    // Execute function calls and collect responses
    const responses = []

    for (const call of functionCalls) {
      console.log('[Gemini] Executing:', call.name, call.args)

      try {
        let result

        if (call.name === 'update_attendee_status') {
          result = await convexClient.updateAttendeeStatus(
            call.args.attendeeId || sessionParams.attendeeId,
            call.args.status
          )
        } else if (call.name === 'lookup_event_content') {
          const chunks = await convexClient.lookupEventContent(
            call.args.eventId || sessionParams.eventId,
            call.args.query
          )
          // Format content for Gemini
          result = {
            chunks: chunks.map((c) => ({
              text: c.text,
              source: c.source,
            })),
          }
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            success: true,
            data: result,
          },
        })
      } catch (error) {
        console.error('[Server] Function call error:', error)
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            success: false,
            error: error.message,
          },
        })
      }
    }

    // Send responses back to Gemini
    await geminiClient.sendToolResponse(responses)
  })

  geminiClient.onComplete(() => {
    console.log('[Gemini] Turn complete')
  })

  // Handle incoming messages from Twilio
  ws.on('message', (message) => {
    twilioHandler.handleMessage(message.toString())
  })

  // Handle connection close
  ws.on('close', async () => {
    console.log('[Server] WebSocket closed')
    await geminiClient.disconnect()
  })

  // Handle errors
  ws.on('error', (error) => {
    console.error('[Server] WebSocket error:', error)
  })
})

// Handle server errors
wss.on('error', (error) => {
  console.error('[Server] WebSocket server error:', error)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Server] Shutting down...')
  wss.close(() => {
    server.close(() => {
      console.log('[Server] Server closed')
      process.exit(0)
    })
  })
})

process.on('SIGTERM', () => {
  console.log('[Server] Shutting down...')
  wss.close(() => {
    server.close(() => {
      console.log('[Server] Server closed')
      process.exit(0)
    })
  })
})

console.log('[Server] Voice Agent initialized')
console.log('[Server] Ready to accept connections')
