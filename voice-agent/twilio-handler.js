/**
 * Twilio Media Streams Handler
 * Processes WebSocket messages from Twilio
 */

import { twilioToGemini, geminiToTwilio } from './audio-utils.js'

export class TwilioStreamHandler {
  constructor(ws, geminiClient, convexClient, sessionParams) {
    this.ws = ws
    this.geminiClient = geminiClient
    this.convexClient = convexClient
    this.sessionParams = sessionParams
    this.streamSid = null
    this.callSid = sessionParams.callSid
    this.transcript = []
    this.isActive = true
  }

  /**
   * Handle incoming messages from Twilio
   */
  async handleMessage(message) {
    try {
      const data = JSON.parse(message)

      switch (data.event) {
        case 'start':
          await this.handleStart(data)
          break
        case 'media':
          await this.handleMedia(data)
          break
        case 'stop':
          await this.handleStop(data)
          break
        case 'mark':
          // Marker event (optional, for tracking)
          console.log('[Twilio] Mark:', data.mark?.name)
          break
        default:
          console.log('[Twilio] Unknown event:', data.event)
      }
    } catch (error) {
      console.error('[Twilio] Message handling error:', error)
    }
  }

  /**
   * Handle stream start event
   */
  async handleStart(data) {
    this.streamSid = data.start.streamSid
    console.log('[Twilio] Stream started:', this.streamSid)
    console.log('[Twilio] Call SID:', this.callSid)
    console.log('[Twilio] Media format:', data.start.mediaFormat)

    // Record call start in Convex
    try {
      await this.convexClient.recordCallStart({
        callSid: this.callSid,
        eventId: this.sessionParams.eventId,
        attendeeId: this.sessionParams.attendeeId,
        direction: this.sessionParams.direction,
      })
    } catch (error) {
      console.error('[Twilio] Failed to record call start:', error)
    }
  }

  /**
   * Handle incoming audio media
   */
  async handleMedia(data) {
    if (!this.isActive) return

    try {
      // Extract audio payload from Twilio (base64 μ-law)
      const twilioAudio = data.media.payload

      // Convert Twilio audio to Gemini format (PCM 16kHz)
      const geminiAudio = twilioToGemini(twilioAudio)

      // Send to Gemini
      await this.geminiClient.sendAudio(geminiAudio)
    } catch (error) {
      console.error('[Twilio] Media handling error:', error)
    }
  }

  /**
   * Handle stream stop event
   */
  async handleStop(data) {
    console.log('[Twilio] Stream stopped:', this.streamSid)
    this.isActive = false

    // Finalize call record in Convex
    try {
      const transcriptText = this.transcript.join('\n')
      await this.convexClient.recordCallEnd({
        callSid: this.callSid,
        transcript: transcriptText,
        status: 'completed',
      })
    } catch (error) {
      console.error('[Twilio] Failed to record call end:', error)
    }

    // Disconnect Gemini
    await this.geminiClient.disconnect()
  }

  /**
   * Send audio to Twilio
   * @param {string} audioBase64 - Base64 encoded audio from Gemini
   */
  async sendAudio(audioBase64) {
    if (!this.isActive || !this.streamSid) return

    try {
      // Convert Gemini audio (PCM 16kHz) to Twilio format (μ-law 8kHz)
      const twilioAudio = geminiToTwilio(audioBase64)

      // Send to Twilio via WebSocket
      const message = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: twilioAudio,
        },
      }

      this.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('[Twilio] Send audio error:', error)
    }
  }

  /**
   * Add text to transcript
   * @param {string} speaker - 'user' or 'assistant'
   * @param {string} text - Transcript text
   */
  addToTranscript(speaker, text) {
    const timestamp = new Date().toISOString()
    this.transcript.push(`[${timestamp}] ${speaker}: ${text}`)
  }

  /**
   * Send a mark event to Twilio (for synchronization)
   * @param {string} name - Mark name
   */
  sendMark(name) {
    if (!this.isActive || !this.streamSid) return

    const message = {
      event: 'mark',
      streamSid: this.streamSid,
      mark: {
        name,
      },
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Clear audio queue (for interruptions)
   */
  clear() {
    if (!this.isActive || !this.streamSid) return

    const message = {
      event: 'clear',
      streamSid: this.streamSid,
    }

    this.ws.send(JSON.stringify(message))
  }
}

/**
 * Parse session parameters from Twilio WebSocket URL
 * @param {URL} url - WebSocket URL
 * @returns {object} - Session parameters
 */
export function parseSessionParams(url) {
  const params = new URLSearchParams(url.search)

  return {
    callSid: params.get('callSid') || params.get('CallSid'),
    from: params.get('from') || params.get('From'),
    to: params.get('to') || params.get('To'),
    direction: params.get('direction') || 'INBOUND',
    eventId: params.get('eventId'),
    attendeeId: params.get('attendeeId'),
  }
}
