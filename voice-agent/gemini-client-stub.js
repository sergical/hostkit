/**
 * Gemini Live API Client - STUB VERSION
 *
 * This is a placeholder implementation. To use the real Gemini Live API:
 * 1. Follow the Gemini Live API documentation
 * 2. Install the correct SDK package
 * 3. Implement proper WebSocket connection
 *
 * Current status: Returns mock responses for testing
 */

export class GeminiLiveClient {
  constructor(config) {
    this.config = config
    this.session = null
    this.onAudioCallback = null
    this.onTextCallback = null
    this.onToolCallCallback = null
    this.onCompleteCallback = null
    console.log('[Gemini STUB] Initialized with config:', config.modelId)
  }

  /**
   * Connect to Gemini Live API (STUB)
   */
  async connect() {
    console.log('[Gemini STUB] Connecting to Live API...')
    console.log('[Gemini STUB] ⚠️  THIS IS A STUB - Real Gemini Live API not implemented')
    console.log('[Gemini STUB] To implement:')
    console.log('[Gemini STUB] 1. Follow: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/live-api')
    console.log('[Gemini STUB] 2. Install correct SDK')
    console.log('[Gemini STUB] 3. Replace this stub with real implementation')

    // Simulate connection
    this.session = { connected: true }
    console.log('[Gemini STUB] Mock session established')

    // Start mock receiver
    this.startMockReceiver()
  }

  /**
   * Mock receiver that generates test responses
   */
  startMockReceiver() {
    // Simulate occasional text responses
    setInterval(() => {
      if (this.onTextCallback && Math.random() > 0.7) {
        this.onTextCallback('This is a mock response from Gemini stub.')
      }
    }, 5000)
  }

  /**
   * Send audio to Gemini (STUB)
   */
  async sendAudio(audioBase64) {
    // console.log('[Gemini STUB] Received audio chunk, size:', audioBase64.length)
    // In real implementation, this would send to Gemini Live API
  }

  /**
   * Send text to Gemini (STUB)
   */
  async sendText(text) {
    console.log('[Gemini STUB] Received text:', text)

    // Mock response
    if (this.onTextCallback) {
      setTimeout(() => {
        this.onTextCallback(`You said: "${text}". This is a stub response.`)
      }, 500)
    }
  }

  /**
   * Send tool/function response (STUB)
   */
  async sendToolResponse(functionResponses) {
    console.log('[Gemini STUB] Received tool responses:', functionResponses.length)
  }

  /**
   * Activity markers (STUB)
   */
  async sendActivityStart() {
    console.log('[Gemini STUB] Activity start')
  }

  async sendActivityEnd() {
    console.log('[Gemini STUB] Activity end')
  }

  /**
   * Callback setters
   */
  onAudio(callback) {
    this.onAudioCallback = callback
  }

  onText(callback) {
    this.onTextCallback = callback
  }

  onToolCall(callback) {
    this.onToolCallCallback = callback
  }

  onComplete(callback) {
    this.onCompleteCallback = callback
  }

  /**
   * Disconnect (STUB)
   */
  async disconnect() {
    console.log('[Gemini STUB] Disconnected')
    this.session = null
  }
}

/**
 * Create system instructions based on call direction
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
