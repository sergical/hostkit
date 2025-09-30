import { v } from 'convex/values'
import { action, mutation, query } from './_generated/server'
import { getUser } from './auth'
import { api } from './_generated/api'

export const listByEvent = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    return await ctx.db
      .query('contentChunks')
      .withIndex('eventId', (q) => q.eq('eventId', args.eventId))
      .collect()
  },
})

export const addChunk = mutation({
  args: {
    eventId: v.id('events'),
    chunkText: v.string(),
    sourceFileName: v.string(),
    sourceFileType: v.string(),
    chunkIndex: v.number(),
    metadata: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const chunkId = await ctx.db.insert('contentChunks', {
      eventId: args.eventId,
      chunkText: args.chunkText,
      sourceFileName: args.sourceFileName,
      sourceFileType: args.sourceFileType,
      chunkIndex: args.chunkIndex,
      metadata: args.metadata,
      embedding: args.embedding,
      createdAt: now,
    })

    return chunkId
  },
})

export const searchContent = query({
  args: {
    eventId: v.id('events'),
    searchQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5

    // Use Convex full-text search
    const results = await ctx.db
      .query('contentChunks')
      .withSearchIndex('search_content', (q) =>
        q.search('chunkText', args.searchQuery).eq('eventId', args.eventId),
      )
      .take(limit)

    return results
  },
})

export const deleteByEvent = mutation({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getUser(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or unauthorized')
    }

    const chunks = await ctx.db
      .query('contentChunks')
      .withIndex('eventId', (q) => q.eq('eventId', args.eventId))
      .collect()

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id)
    }
  },
})

export const processFileUpload = action({
  args: {
    eventId: v.id('events'),
    fileName: v.string(),
    fileType: v.string(),
    fileContent: v.string(), // Base64 encoded or text content
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.auth.getCurrentUser)
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Update event status to processing
    await ctx.runMutation(api.events.updateContentStatus, {
      eventId: args.eventId,
      contentStatus: 'processing',
    })

    try {
      // In a real implementation, this would:
      // 1. Parse the PDF/PPT file (using external services or libraries)
      // 2. Extract text content
      // 3. Split into chunks
      // 4. Generate embeddings (using OpenAI/Gemini)
      // 5. Store chunks with embeddings

      // For now, we'll create a placeholder implementation
      // that stores the content as a single chunk
      const chunks = splitIntoChunks(args.fileContent, 1000)

      for (let i = 0; i < chunks.length; i++) {
        await ctx.runMutation(api.content.addChunk, {
          eventId: args.eventId,
          chunkText: chunks[i],
          sourceFileName: args.fileName,
          sourceFileType: args.fileType,
          chunkIndex: i,
        })
      }

      // Update event status to ready
      await ctx.runMutation(api.events.updateContentStatus, {
        eventId: args.eventId,
        contentStatus: 'ready',
      })

      return { success: true, chunksCreated: chunks.length }
    } catch (error) {
      // Update event status to error
      await ctx.runMutation(api.events.updateContentStatus, {
        eventId: args.eventId,
        contentStatus: 'error',
      })

      throw error
    }
  },
})

// Helper function to split text into chunks
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  const words = text.split(/\s+/)
  let currentChunk = ''

  for (const word of words) {
    if ((currentChunk + word).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = word + ' '
    } else {
      currentChunk += word + ' '
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}
