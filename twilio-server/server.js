import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import dotenv from 'dotenv'
import { GoogleGenAI, Modality } from '@google/genai'
import alawmulaw from 'alawmulaw'

const { mulaw } = alawmulaw

dotenv.config({ path: '../.env.local' })

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/stream' })

const PORT = 3001

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Use library for μ-law conversion

// Convert Twilio μ-law audio to 16-bit PCM for Gemini
function convertTwilioToGemini(base64Mulaw) {
  const mulawBuffer = Buffer.from(base64Mulaw, 'base64')

  // Convert μ-law to PCM using library (returns Int16Array)
  const pcmArray = mulaw.decode(mulawBuffer)
  const pcmBuffer = Buffer.from(pcmArray.buffer)

  // Upsample from 8kHz to 16kHz (simple duplication)
  const upsampledBuffer = Buffer.alloc(pcmBuffer.length * 2)
  for (let i = 0; i < pcmBuffer.length / 2; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2)
    upsampledBuffer.writeInt16LE(sample, i * 4)
    upsampledBuffer.writeInt16LE(sample, i * 4 + 2)
  }

  return upsampledBuffer.toString('base64')
}

// Convert Gemini 24kHz PCM back to Twilio 8kHz μ-law
function convertGeminiToTwilio(base64Pcm24k) {
  const pcm24kBuffer = Buffer.from(base64Pcm24k, 'base64')
  const numSamples24k = pcm24kBuffer.length / 2
  const numSamples8k = Math.floor(numSamples24k / 3)

  // Downsample from 24kHz to 8kHz with linear interpolation
  const pcm8kBuffer = Buffer.alloc(numSamples8k * 2)

  for (let i = 0; i < numSamples8k; i++) {
    // Calculate the corresponding position in the 24kHz stream
    const pos24k = i * 3.0
    const index = Math.floor(pos24k)
    const fraction = pos24k - index

    // Read samples for interpolation
    const sample1 = index * 2 < pcm24kBuffer.length - 2 ? pcm24kBuffer.readInt16LE(index * 2) : 0
    const sample2 = (index + 1) * 2 < pcm24kBuffer.length - 2 ? pcm24kBuffer.readInt16LE((index + 1) * 2) : sample1

    // Linear interpolation
    const interpolated = Math.round(sample1 + (sample2 - sample1) * fraction)
    pcm8kBuffer.writeInt16LE(interpolated, i * 2)
  }

  // Convert PCM to μ-law using library (takes Int16Array)
  const pcmArray = new Int16Array(pcm8kBuffer.buffer, pcm8kBuffer.byteOffset, pcm8kBuffer.length / 2)
  const mulawArray = mulaw.encode(pcmArray)
  const mulawBuffer = Buffer.from(mulawArray.buffer)

  return mulawBuffer.toString('base64')
}

// Initialize Gemini client
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY)

// Twilio webhook - return TwiML
app.post('/incoming', (req, res) => {
  console.log('[VOICE] Incoming webhook')

  const host = req.headers.host || `localhost:${PORT}`
  const wsUrl = `wss://${host}/stream`
  console.log('[VOICE] WebSocket URL:', wsUrl)

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${wsUrl}" />
    </Connect>
</Response>`

  res.type('text/xml').send(twiml)
})

// WebSocket handler
wss.on('connection', async (ws) => {
  console.log('[WS] Client connected')

  let session
  let streamSid = ''
  let audioChunkCount = 0
  let geminiResponseCount = 0

  // Handle Twilio messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString())

      switch (data.event) {
        case 'start':
          streamSid = data.start.streamSid
          console.log('[TWILIO] ✅ Stream started! CallSid:', data.start.callSid, 'StreamSid:', streamSid)

          // NOW start Gemini session after we have streamSid
          console.log('[GEMINI] Starting live session...')

          // Get event info from Convex
          const phoneNumber = data.start.customParameters?.To || data.start.to
          console.log('[INFO] Fetching event for phone:', phoneNumber)

          const convexUrl = process.env.VITE_CONVEX_URL || 'https://outstanding-bison-162.convex.cloud'
          const eventResponse = await fetch(`${convexUrl}/event-for-phone?phoneNumber=${encodeURIComponent(phoneNumber)}`)
          const eventInfo = await eventResponse.json()

          if (!eventInfo || eventInfo.error) {
            console.log('[ERROR] No event found for phone:', phoneNumber)
            ws.close()
            return
          }

          console.log('[INFO] Event info:', eventInfo)

          const eventDate = new Date(eventInfo.eventDate).toLocaleDateString()

          session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: `You are calling ${eventInfo.attendeeName} to confirm attendance for an event.

Event Details:
- Name: ${eventInfo.eventName}
- Date: ${eventDate}
- Location: ${eventInfo.eventLocation}

Your task:
1. Greet ${eventInfo.attendeeName} warmly by name
2. Ask if they are still interested in attending "${eventInfo.eventName}" on ${eventDate}
3. If they say NO or want to cancel, use the remove_attendee tool with phoneNumber="${phoneNumber}" and eventId="${eventInfo.eventId}"
4. If they say YES, thank them and confirm their attendance
5. Keep the conversation brief and natural (under 30 seconds)

Be conversational, friendly, and understanding.`,
              tools: [
                {
                  functionDeclarations: [
                    {
                      name: 'remove_attendee',
                      description: 'Remove an attendee from the event when they confirm they do not want to attend',
                      parameters: {
                        type: 'object',
                        properties: {
                          phoneNumber: {
                            type: 'string',
                            description: 'The phone number of the attendee to remove',
                          },
                          eventId: {
                            type: 'string',
                            description: 'The ID of the event',
                          },
                        },
                        required: ['phoneNumber', 'eventId'],
                      },
                    },
                  ],
                },
              ],
            },
            callbacks: {
              onopen: () => {
                console.log('[GEMINI] ✅ Live session ready!')
              },
              onmessage: async (message) => {
                // Handle tool calls
                if (message.toolCall) {
                  console.log('[GEMINI] Tool call:', message.toolCall.functionCalls)

                  for (const fnCall of message.toolCall.functionCalls) {
                    if (fnCall.name === 'remove_attendee') {
                      console.log('[TOOL] Removing attendee:', fnCall.args)

                      try {
                        // Call Convex HTTP endpoint
                        const convexUrl = process.env.VITE_CONVEX_URL || 'https://outstanding-bison-162.convex.cloud'
                        const response = await fetch(`${convexUrl}/remove-attendee`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(fnCall.args),
                        })

                        const result = await response.json()
                        console.log('[TOOL] Result:', result)

                        // Send tool response back to Gemini
                        session.send({
                          toolResponse: {
                            functionResponses: [
                              {
                                name: fnCall.name,
                                response: result,
                              },
                            ],
                          },
                        })
                      } catch (error) {
                        console.error('[TOOL] Error:', error)
                      }
                    }
                  }
                }

                // Handle audio data
                if (message.data) {
                  geminiResponseCount++

                  // Get base64 data
                  let pcm24kBase64 = typeof message.data === 'string' ? message.data : Buffer.from(message.data).toString('base64')

                  // Convert to μ-law
                  const mulawBase64 = convertGeminiToTwilio(pcm24kBase64)

                  const twilioMessage = {
                    event: 'media',
                    streamSid: streamSid,
                    media: {
                      payload: mulawBase64,
                    },
                  }

                  if (geminiResponseCount === 1 || geminiResponseCount % 20 === 0) {
                    console.log(`[GEMINI→USER] Sent ${geminiResponseCount} audio chunks (${mulawBase64.length} bytes)`)
                  }

                  ws.send(JSON.stringify(twilioMessage))
                }
              },
              onerror: (error) => {
                console.error('[GEMINI] Error:', error.message)
              },
              onclose: (event) => {
                console.log('[GEMINI] Session closed:', event.reason)
              },
            },
          })
          break

        case 'media':
          // Only process if session is ready
          if (!session) {
            return
          }

          audioChunkCount++

          // Convert audio to 16kHz PCM
          const pcmBase64 = convertTwilioToGemini(data.media.payload)

          // Send to Gemini
          session.sendRealtimeInput({
            audio: {
              data: pcmBase64,
              mimeType: 'audio/pcm;rate=16000',
            },
          })

          if (audioChunkCount % 100 === 0) {
            console.log('[USER→GEMINI] Sent', audioChunkCount, 'audio chunks')
          }
          break

        case 'stop':
          console.log('[TWILIO] Stream stopped')
          if (session) {
            session.close()
          }
          ws.close()
          break

        default:
          console.log('[TWILIO] Unknown event:', data.event, JSON.stringify(data).substring(0, 200))
      }
    } catch (error) {
      console.error('[WS] Error processing message:', error)
    }
  })

  try {

    ws.on('close', () => {
      console.log('[WS] Client disconnected')
      if (session) {
        session.close()
      }
    })

    ws.on('error', (error) => {
      console.error('[WS] Error:', error)
    })
  } catch (error) {
    console.error('[WS] Setup error:', error)
    ws.close()
  }
})

server.listen(PORT, () => {
  console.log(`🎙️  Twilio server running on http://localhost:${PORT}`)
  console.log(`📞 Webhook URL: http://localhost:${PORT}/incoming`)
  console.log(`🔌 WebSocket URL: ws://localhost:${PORT}/stream`)
})
