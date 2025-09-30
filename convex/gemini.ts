/**
 * Gemini Live API Integration
 * Server-side token generation for secure client-side usage
 */

import { action } from './_generated/server'
import { v } from 'convex/values'

/**
 * Generate an ephemeral token for Gemini Live API
 * This keeps the API key server-side while allowing browser to connect
 *
 * See: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
 */
export const generateEphemeralToken = action({
  args: {},
  returns: v.object({
    token: v.string(),
    expiresAt: v.number(),
  }),
  handler: async () => {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured in environment')
    }

    try {
      // Call Google's ephemeral token endpoint
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/ephemeralTokens:generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
        },
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to generate token: ${error}`)
      }

      const data = await response.json()

      return {
        token: data.token,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
      }
    } catch (error) {
      console.error('[Gemini] Token generation failed:', error)
      throw error
    }
  },
})
