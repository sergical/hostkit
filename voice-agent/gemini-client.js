/**
 * Gemini Live API Client
 * Handles WebSocket connection to Gemini Live API on Vertex AI
 */

import { genai } from '@google/genai'

export class GeminiLiveClient {
  constructor(config) {
    this.projectId = config.projectId
    this.location = config.location || 'us-central1'
    this.modelId = config.modelId || 'gemini-2.0-flash-live-preview-04-09'
    this.systemInstruction = config.systemInstruction
    this.tools = config.tools || []
    this.session = null
    this.onAudioCallback = null
    this.onTextCallback = null
    this.onToolCallCallback = null
    this.onCompleteCallback = null
  }

  /**
   * Connect to Gemini Live API
   */
  async connect() {
    try {
      // Initialize client with Vertex AI
      const client = new genai.Client({
        project: this.projectId,
        location: this.location,
        apiVersion: 'v1beta1',
      })

      // Configure the session
      const config = {
        responseModalities: ['AUDIO', 'TEXT'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck', // Conversational voice
            },
          },
        },
      }

      if (this.systemInstruction) {
        config.systemInstruction = {
          parts: [{ text: this.systemInstruction }],
        }
      }

      if (this.tools.length > 0) {
        config.tools = this.tools
      }

      // Connect to Live API
      this.session = await client.aio.live.connect({
        model: this.modelId,
        config,
      })

      console.log('[Gemini] Connected to Live API')

      // Start listening for messages
      this.startReceiving()
    } catch (error) {
      console.error('[Gemini] Connection error:', error)
      throw error
    }
  }

  /**
   * Start receiving messages from Gemini
   */
  async startReceiving() {
    try {
      for await (const message of this.session.receive()) {
        // Handle different message types
        if (message.setupComplete) {
          console.log('[Gemini] Setup complete')
        }

        if (message.serverContent) {
          // Model generated content
          const content = message.serverContent

          if (content.modelTurn) {
            for (const part of content.modelTurn.parts) {
              if (part.text && this.onTextCallback) {
                this.onTextCallback(part.text)
              }

              if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                // Audio response from model
                if (this.onAudioCallback) {
                  this.onAudioCallback(part.inlineData.data)
                }
              }
            }
          }

          if (content.turnComplete && this.onCompleteCallback) {
            this.onCompleteCallback()
          }

          if (content.interrupted) {
            console.log('[Gemini] Response interrupted by user')
          }
        }

        if (message.toolCall) {
          // Model is requesting tool/function execution
          if (this.onToolCallCallback) {
            this.onToolCallCallback(message.toolCall.functionCalls)
          }
        }

        if (message.usageMetadata) {
          console.log('[Gemini] Usage:', message.usageMetadata)
        }
      }
    } catch (error) {
      console.error('[Gemini] Receive error:', error)
    }
  }

  /**
   * Send audio to Gemini
   * @param {string} audioBase64 - Base64 encoded PCM audio
   */
  async sendAudio(audioBase64) {
    if (!this.session) {
      throw new Error('Not connected to Gemini')
    }

    try {
      await this.session.send({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: 'audio/pcm',
              data: audioBase64,
            },
          ],
        },
      })
    } catch (error) {
      console.error('[Gemini] Send audio error:', error)
    }
  }

  /**
   * Send text to Gemini
   * @param {string} text - Text message
   */
  async sendText(text) {
    if (!this.session) {
      throw new Error('Not connected to Gemini')
    }

    try {
      await this.session.send({
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        },
      })
    } catch (error) {
      console.error('[Gemini] Send text error:', error)
    }
  }

  /**
   * Send tool/function response back to Gemini
   * @param {Array} functionResponses - Array of function responses with matching IDs
   */
  async sendToolResponse(functionResponses) {
    if (!this.session) {
      throw new Error('Not connected to Gemini')
    }

    try {
      await this.session.send({
        toolResponse: {
          functionResponses,
        },
      })
    } catch (error) {
      console.error('[Gemini] Send tool response error:', error)
    }
  }

  /**
   * Mark start of user activity (if automatic VAD is disabled)
   */
  async sendActivityStart() {
    if (!this.session) return

    try {
      await this.session.send({
        realtimeInput: {
          activityStart: {},
        },
      })
    } catch (error) {
      console.error('[Gemini] Activity start error:', error)
    }
  }

  /**
   * Mark end of user activity (if automatic VAD is disabled)
   */
  async sendActivityEnd() {
    if (!this.session) return

    try {
      await this.session.send({
        realtimeInput: {
          activityEnd: {},
        },
      })
    } catch (error) {
      console.error('[Gemini] Activity end error:', error)
    }
  }

  /**
   * Set callback for when audio is received from Gemini
   * @param {Function} callback - Callback function that receives base64 audio
   */
  onAudio(callback) {
    this.onAudioCallback = callback
  }

  /**
   * Set callback for when text is received from Gemini
   * @param {Function} callback - Callback function that receives text
   */
  onText(callback) {
    this.onTextCallback = callback
  }

  /**
   * Set callback for when tool calls are requested
   * @param {Function} callback - Callback function that receives function calls
   */
  onToolCall(callback) {
    this.onToolCallCallback = callback
  }

  /**
   * Set callback for when turn is complete
   * @param {Function} callback - Callback function
   */
  onComplete(callback) {
    this.onCompleteCallback = callback
  }

  /**
   * Disconnect from Gemini
   */
  async disconnect() {
    if (this.session) {
      try {
        await this.session.close()
        console.log('[Gemini] Disconnected')
      } catch (error) {
        console.error('[Gemini] Disconnect error:', error)
      }
      this.session = null
    }
  }
}

/**
 * Create system instructions based on call direction
 * @param {string} direction - 'INBOUND' or 'OUTBOUND'
 * @param {object} eventInfo - Event information
 * @returns {string} - System instruction
 */
export function createSystemInstruction(direction, eventInfo) {
  if (direction === 'OUTBOUND') {
    return `You are a friendly AI assistant calling on behalf of an event organizer.

Your goal is to confirm whether the person plans to attend the event "${eventInfo.name}".

Keep the conversation natural and brief. Ask if they're still planning to attend.

If they confirm attendance, thank them and let them know you're looking forward to seeing them.

If they want to cancel, acknowledge politely and use the update_attendee_status function to mark them as CANCELLED.

Be conversational, warm, and respectful of their time.`
  } else {
    // INBOUND
    return `You are a helpful AI assistant for the event "${eventInfo.name}".

Your role is to answer questions about the event. You have access to event content and can look up specific information.

When someone asks a question:
1. Use the lookup_event_content function to search for relevant information
2. Provide a clear, spoken answer based on what you find
3. If you can't find specific information, say so politely

Be conversational, friendly, and concise. Remember you're speaking, not writing, so use natural speech patterns.`
  }
}
