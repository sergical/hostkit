/**
 * Convex Client for Voice Agent
 * Handles communication with Convex backend
 */

import { ConvexHttpClient } from 'convex/browser'
import { api, internal } from '../convex/_generated/api.js'

export class ConvexClient {
  constructor(convexUrl, deployKey) {
    // Use admin client for internal functions
    this.client = new ConvexHttpClient(convexUrl)
    this.deployKey = deployKey
  }

  /**
   * Get event information for a call
   * @param {string} eventId - Event ID
   * @returns {object} - Event information
   */
  async getEvent(eventId) {
    try {
      const event = await this.client.query(internal.twilio.getEventForCall, {
        eventId,
      })
      return event
    } catch (error) {
      console.error('[Convex] Get event error:', error)
      throw error
    }
  }

  /**
   * Find attendee by phone number
   * @param {string} phone - Phone number
   * @param {string} eventId - Optional event ID to filter by
   * @returns {object|null} - Attendee information or null
   */
  async findAttendeeByPhone(phone, eventId) {
    try {
      const attendee = await this.client.query(
        internal.twilio.findAttendeeByPhone,
        {
          phone,
          eventId: eventId || undefined,
        }
      )
      return attendee
    } catch (error) {
      console.error('[Convex] Find attendee error:', error)
      return null
    }
  }

  /**
   * Update attendee status (called by Gemini function calling)
   * @param {string} attendeeId - Attendee ID
   * @param {string} status - New status (PENDING, CONFIRMED, CANCELLED)
   * @returns {object} - Result
   */
  async updateAttendeeStatus(attendeeId, status) {
    try {
      const result = await this.client.mutation(
        internal.twilio.updateAttendeeStatus,
        {
          attendeeId,
          status,
        }
      )
      console.log('[Convex] Updated attendee status:', attendeeId, status)
      return result
    } catch (error) {
      console.error('[Convex] Update attendee status error:', error)
      throw error
    }
  }

  /**
   * Lookup event content (called by Gemini function calling)
   * @param {string} eventId - Event ID
   * @param {string} query - Search query
   * @returns {Array} - Relevant content chunks
   */
  async lookupEventContent(eventId, query) {
    try {
      const results = await this.client.query(
        internal.twilio.lookupEventContent,
        {
          eventId,
          query,
          limit: 3,
        }
      )
      console.log('[Convex] Content lookup results:', results.length)
      return results
    } catch (error) {
      console.error('[Convex] Lookup content error:', error)
      return []
    }
  }

  /**
   * Record call start in database
   * @param {object} params - Call parameters
   */
  async recordCallStart(params) {
    try {
      const callId = await this.client.mutation(
        internal.twilio.createCallRecord,
        {
          eventId: params.eventId,
          attendeeId: params.attendeeId || undefined,
          direction: params.direction,
          twilioCallSid: params.callSid,
        }
      )
      console.log('[Convex] Call record created:', callId)
      return callId
    } catch (error) {
      console.error('[Convex] Record call start error:', error)
    }
  }

  /**
   * Record call end with transcript
   * @param {object} params - Call end parameters
   */
  async recordCallEnd(params) {
    try {
      // Generate AI summary from transcript (simplified - in production use Gemini)
      const aiSummary = this.generateSummary(params.transcript)

      await this.client.mutation(internal.twilio.updateCallRecord, {
        twilioCallSid: params.callSid,
        status: params.status || 'completed',
        transcript: params.transcript,
        aiSummary,
      })
      console.log('[Convex] Call record updated')
    } catch (error) {
      console.error('[Convex] Record call end error:', error)
    }
  }

  /**
   * Generate a simple summary from transcript
   * In production, this should call Gemini API for proper summarization
   * @param {string} transcript - Full transcript
   * @returns {string} - Summary
   */
  generateSummary(transcript) {
    if (!transcript || transcript.length === 0) {
      return 'No conversation recorded'
    }

    // Simple placeholder summary
    const lines = transcript.split('\n').filter((l) => l.trim())
    const duration = lines.length

    // Extract user and assistant turns
    const userLines = lines.filter((l) => l.includes('user:'))
    const assistantLines = lines.filter((l) => l.includes('assistant:'))

    return `Call completed with ${userLines.length} user messages and ${assistantLines.length} assistant responses. Duration: ~${duration} exchanges.`
  }
}

/**
 * Create function declarations for Gemini
 * These define the tools available to the model
 * @returns {Array} - Array of tool declarations
 */
export function createFunctionDeclarations() {
  return [
    {
      functionDeclarations: [
        {
          name: 'update_attendee_status',
          description:
            'Update the attendance status of an attendee. Use this when the user confirms or cancels their attendance.',
          parameters: {
            type: 'object',
            properties: {
              attendeeId: {
                type: 'string',
                description: 'The ID of the attendee to update',
              },
              status: {
                type: 'string',
                enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
                description: 'The new attendance status',
              },
            },
            required: ['attendeeId', 'status'],
          },
        },
        {
          name: 'lookup_event_content',
          description:
            'Search for information about the event. Use this when the user asks questions about event details, schedule, speakers, topics, etc.',
          parameters: {
            type: 'object',
            properties: {
              eventId: {
                type: 'string',
                description: 'The ID of the event',
              },
              query: {
                type: 'string',
                description:
                  'The search query to find relevant event information',
              },
            },
            required: ['eventId', 'query'],
          },
        },
      ],
    },
  ]
}
