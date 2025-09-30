/**
 * Simple Gemini Live API WebSocket Server
 * Bridges browser WebSocket ↔ Gemini Live API
 */

import 'dotenv/config'
import express from 'express'
import { WebSocketServer } from 'ws'
import { GoogleGenAI, Modality } from '@google/genai'

const PORT = process.env.GEMINI_WS_PORT || 8081

// Validate API key
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY or GOOGLE_API_KEY environment variable')
  process.exit(1)
}

console.log('[Gemini Server] Using API key:', API_KEY.substring(0, 20) + '...')

const app = express()
const server = app.listen(PORT, () => {
  console.log(`[Gemini Server] Listening on port ${PORT}`)
  console.log(`[Gemini Server] WebSocket: ws://localhost:${PORT}/gemini`)
})

const wss = new WebSocketServer({ server, path: '/gemini' })

wss.on('connection', async (clientWs) => {
  console.log('[Gemini Server] Browser connected')

  let geminiSession = null
  let isConfigured = false

  clientWs.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString())

      if (data.type === 'config') {
        console.log('[Gemini Server] Initializing session...')

        // Try different initialization approaches
        // The example uses new GoogleGenAI({}) - maybe it auto-reads from env?
        const ai = new GoogleGenAI({ apiKey: API_KEY })

        geminiSession = await ai.live.connect({
          model: 'gemini-2.0-flash-exp',
          config: {
            responseModalities: [Modality.AUDIO, Modality.TEXT],
            systemInstruction: data.systemPrompt || 'You are a helpful AI assistant.',
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck',
                },
              },
            },
          },
          callbacks: {
            onopen: () => {
              console.log('[Gemini Server] Session opened')
              clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }))
              isConfigured = true
            },
            onmessage: (msg) => {
              // Forward all Gemini messages to browser
              clientWs.send(JSON.stringify({ type: 'gemini', data: msg }))
            },
            onerror: (error) => {
              console.error('[Gemini Server] Error:', error)
              clientWs.send(JSON.stringify({ type: 'error', message: error.message }))
            },
            onclose: (event) => {
              console.log('[Gemini Server] Session closed:', event.reason)
              clientWs.send(JSON.stringify({ type: 'status', status: 'disconnected' }))
            },
          },
        })
      } else if (data.type === 'audio' && geminiSession && isConfigured) {
        // Forward audio to Gemini
        geminiSession.sendRealtimeInput({
          audio: {
            data: data.data,
            mimeType: 'audio/pcm;rate=16000',
          },
        })
      }
    } catch (error) {
      console.error('[Gemini Server] Message error:', error)
      clientWs.send(JSON.stringify({ type: 'error', message: error.message }))
    }
  })

  clientWs.on('close', () => {
    console.log('[Gemini Server] Browser disconnected')
    if (geminiSession) {
      geminiSession.close()
    }
  })
})

console.log('[Gemini Server] Ready')
