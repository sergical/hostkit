import { createServerFileRoute } from '@tanstack/react-start/server'
import { createWebSocketHandler } from '@/lib/websocket-adapter'
import type { Peer } from 'crossws'

// μ-law to 16-bit PCM conversion
function ulawToPcm(ulaw: number): number {
  const BIAS = 0x84
  const CLIP = 32635

  ulaw = ~ulaw
  const sign = (ulaw & 0x80)
  const exponent = (ulaw >> 4) & 0x07
  const mantissa = ulaw & 0x0f

  let sample = mantissa << (exponent + 3)
  sample += BIAS << exponent
  if (exponent === 0) sample += BIAS >> 1

  sample = sample > CLIP ? CLIP : sample
  return sign ? -sample : sample
}

// Convert Twilio μ-law audio to 16-bit PCM for Gemini
function convertTwilioToGemini(base64Mulaw: string): string {
  const mulawBuffer = Buffer.from(base64Mulaw, 'base64')

  // Convert μ-law (8kHz) to PCM (16-bit)
  const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2)
  for (let i = 0; i < mulawBuffer.length; i++) {
    const pcm16 = ulawToPcm(mulawBuffer[i])
    pcmBuffer.writeInt16LE(pcm16, i * 2)
  }

  // Upsample from 8kHz to 16kHz (simple duplication)
  const upsampledBuffer = Buffer.alloc(pcmBuffer.length * 2)
  for (let i = 0; i < pcmBuffer.length / 2; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2)
    upsampledBuffer.writeInt16LE(sample, i * 4)
    upsampledBuffer.writeInt16LE(sample, i * 4 + 2)
  }

  return upsampledBuffer.toString('base64')
}

// Connect to Gemini Live API via WebSocket
async function connectToGemini(): Promise<WebSocket> {
  const geminiApiKey = process.env.GEMINI_API_KEY
  const model = 'gemini-2.5-flash'

  console.log('[GEMINI] API Key present:', !!geminiApiKey)

  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`

  const response = await fetch(url, {
    headers: {
      'Upgrade': 'websocket',
    },
  })

  if (!response.webSocket) {
    console.error('[GEMINI] Failed to get WebSocket from response')
    throw new Error('Failed to connect to Gemini Live API')
  }

  const ws = response.webSocket
  ws.accept()
  console.log('[GEMINI] WebSocket accepted')

  // Send initial setup message
  const setupMessage = {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
      },
    },
  }
  console.log('[GEMINI] Sending setup message:', JSON.stringify(setupMessage))
  ws.send(JSON.stringify(setupMessage))

  return ws
}

// Store Gemini WebSocket per peer
const geminiConnections = new WeakMap<Peer, WebSocket>()
const streamSids = new WeakMap<Peer, string>()

export const ServerRoute = createServerFileRoute('/api/voice/stream').methods(
  createWebSocketHandler({
    async open(peer) {
      console.log('[WS] WebSocket connection opened')

      try {
        // Connect to Gemini Live API
        console.log('[GEMINI] Connecting to Gemini Live API...')
        const geminiWs = await connectToGemini()
        console.log('[GEMINI] Connected to Gemini')

        // Store connection
        geminiConnections.set(peer, geminiWs)

        // Handle Gemini responses
        geminiWs.addEventListener('message', (event) => {
          const response = JSON.parse(event.data as string)
          console.log('[GEMINI] Response:', JSON.stringify(response).substring(0, 200))

          if (response.serverContent?.modelTurn?.parts) {
            for (const part of response.serverContent.modelTurn.parts) {
              if (part.inlineData) {
                console.log('[GEMINI] Sending audio back to Twilio')
                const streamSid = streamSids.get(peer)
                const twilioMessage = {
                  event: 'media',
                  streamSid: streamSid,
                  media: {
                    payload: part.inlineData.data,
                  },
                }
                peer.send(JSON.stringify(twilioMessage))
              }
            }
          }
        })

        geminiWs.addEventListener('error', (event) => {
          console.error('[GEMINI] Error:', event)
        })

        geminiWs.addEventListener('close', () => {
          console.log('[GEMINI] Connection closed')
        })
      } catch (error) {
        console.error('[WS] Error during open:', error)
        peer.close(1011, 'Gemini connection failed')
      }
    },

    async message(peer, message) {
      const geminiWs = geminiConnections.get(peer)
      if (!geminiWs) {
        console.error('[WS] No Gemini connection found for peer')
        return
      }

      try {
        const data = JSON.parse(message.text())
        console.log('[TWILIO] Event:', data.event)

        switch (data.event) {
          case 'start':
            streamSids.set(peer, data.start.streamSid)
            console.log('[TWILIO] Stream started:', data.start.callSid, 'StreamSid:', data.start.streamSid)
            break

          case 'media':
            // Convert Twilio μ-law 8kHz to Gemini PCM 16kHz
            const pcmBase64 = convertTwilioToGemini(data.media.payload)

            const audioPayload = {
              realtimeInput: {
                audio: {
                  data: pcmBase64,
                  mimeType: 'audio/pcm;rate=16000',
                },
              },
            }
            geminiWs.send(JSON.stringify(audioPayload))
            console.log('[GEMINI] Sent audio chunk')
            break

          case 'stop':
            console.log('[TWILIO] Stream stopped')
            geminiWs.close()
            peer.close()
            break
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error)
      }
    },

    close(peer) {
      console.log('[WS] WebSocket connection closed')
      const geminiWs = geminiConnections.get(peer)
      if (geminiWs) {
        geminiWs.close()
        geminiConnections.delete(peer)
      }
      streamSids.delete(peer)
    },

    error(peer, error) {
      console.error('[WS] WebSocket error:', error)
    },
  })
)
