import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'

// Generate a random 6-character game code
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Create a new game
export const createGame = mutation({
  args: {
    quizId: v.id('quizzes'),
  },
  returns: v.object({
    gameId: v.id('games'),
    code: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .unique()

    if (!user) {
      throw new Error('User not found')
    }

    const code = generateGameCode()

    const gameId = await ctx.db.insert('games', {
      quizId: args.quizId,
      hostId: user._id,
      status: 'waiting',
      currentQuestionIndex: 0,
      createdAt: Date.now(),
      code,
    })

    return { gameId, code }
  },
})

// Join a game
export const joinGame = mutation({
  args: {
    code: v.string(),
    nickname: v.string(),
  },
  returns: v.object({
    playerId: v.id('players'),
    gameId: v.id('games'),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('code', args.code.toUpperCase()))
      .unique()

    if (!game) {
      throw new Error('Game not found')
    }

    if (game.status !== 'waiting') {
      throw new Error('Game already started')
    }

    // Check if nickname is already taken
    const existingPlayer = await ctx.db
      .query('players')
      .withIndex('by_game_and_score', (q) => q.eq('gameId', game._id))
      .filter((q) => q.eq(q.field('nickname'), args.nickname))
      .unique()

    if (existingPlayer) {
      throw new Error('Nickname already taken')
    }

    const playerId = await ctx.db.insert('players', {
      gameId: game._id,
      nickname: args.nickname,
      score: 0,
      joinedAt: Date.now(),
    })

    return { playerId, gameId: game._id }
  },
})

// Start a game
export const startGame = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .unique()

    if (!user || game.hostId !== user._id) {
      throw new Error('Only the host can start the game')
    }

    if (game.status !== 'waiting') {
      throw new Error('Game already started')
    }

    await ctx.db.patch(args.gameId, {
      status: 'in_progress',
      startedAt: Date.now(),
    })

    return null
  },
})

// Submit an answer
export const submitAnswer = mutation({
  args: {
    playerId: v.id('players'),
    questionIndex: v.number(),
    answerIndex: v.number(),
    timeToAnswer: v.number(),
  },
  returns: v.object({
    isCorrect: v.boolean(),
    pointsEarned: v.number(),
  }),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player) {
      throw new Error('Player not found')
    }

    const game = await ctx.db.get(player.gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    // Check if already answered this question
    const existingAnswer = await ctx.db
      .query('answers')
      .withIndex('by_player_and_question', (q) =>
        q.eq('playerId', args.playerId).eq('questionIndex', args.questionIndex)
      )
      .unique()

    if (existingAnswer) {
      throw new Error('Already answered this question')
    }

    const question = await ctx.db
      .query('questions')
      .withIndex('by_quiz_and_order', (q) =>
        q.eq('quizId', game.quizId).eq('order', args.questionIndex)
      )
      .unique()

    if (!question) {
      throw new Error('Question not found')
    }

    const isCorrect = question.correctAnswerIndex === args.answerIndex

    // Calculate points based on correctness and speed
    let pointsEarned = 0
    if (isCorrect) {
      const maxPoints = 1000
      const timeBonus = Math.max(0, 1 - args.timeToAnswer / (question.timeLimit * 1000))
      pointsEarned = Math.round(maxPoints * (0.5 + 0.5 * timeBonus))
    }

    // Record the answer
    await ctx.db.insert('answers', {
      gameId: game._id,
      playerId: args.playerId,
      questionIndex: args.questionIndex,
      answerIndex: args.answerIndex,
      isCorrect,
      timeToAnswer: args.timeToAnswer,
      answeredAt: Date.now(),
    })

    // Update player score
    await ctx.db.patch(args.playerId, {
      score: player.score + pointsEarned,
    })

    return { isCorrect, pointsEarned }
  },
})

// Move to next question
export const nextQuestion = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .unique()

    if (!user || game.hostId !== user._id) {
      throw new Error('Only the host can advance questions')
    }

    const totalQuestions = await ctx.db
      .query('questions')
      .withIndex('by_quiz_and_order', (q) => q.eq('quizId', game.quizId))
      .collect()

    const nextIndex = game.currentQuestionIndex + 1

    if (nextIndex >= totalQuestions.length) {
      // Game is finished
      await ctx.db.patch(args.gameId, {
        status: 'finished',
        finishedAt: Date.now(),
      })
    } else {
      await ctx.db.patch(args.gameId, {
        currentQuestionIndex: nextIndex,
      })
    }

    return null
  },
})

// Get game details
export const getGame = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.union(
    v.object({
      game: v.object({
        _id: v.id('games'),
        _creationTime: v.number(),
        quizId: v.id('quizzes'),
        hostId: v.id('users'),
        status: v.union(v.literal('waiting'), v.literal('in_progress'), v.literal('finished')),
        currentQuestionIndex: v.number(),
        createdAt: v.number(),
        startedAt: v.optional(v.number()),
        finishedAt: v.optional(v.number()),
        code: v.string(),
      }),
      quiz: v.object({
        _id: v.id('quizzes'),
        _creationTime: v.number(),
        title: v.string(),
        description: v.string(),
        createdBy: v.id('users'),
        createdAt: v.number(),
      }),
      totalQuestions: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      return null
    }

    const quiz = await ctx.db.get(game.quizId)
    if (!quiz) {
      return null
    }

    const questions = await ctx.db
      .query('questions')
      .withIndex('by_quiz_and_order', (q) => q.eq('quizId', game.quizId))
      .collect()

    return {
      game,
      quiz,
      totalQuestions: questions.length,
    }
  },
})

// Get game by code
export const getGameByCode = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id('games'),
      _creationTime: v.number(),
      quizId: v.id('quizzes'),
      hostId: v.id('users'),
      status: v.union(v.literal('waiting'), v.literal('in_progress'), v.literal('finished')),
      currentQuestionIndex: v.number(),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
      code: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('code', args.code.toUpperCase()))
      .unique()

    return game
  },
})

// Get players in a game
export const getPlayers = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.array(
    v.object({
      _id: v.id('players'),
      _creationTime: v.number(),
      gameId: v.id('games'),
      nickname: v.string(),
      score: v.number(),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query('players')
      .withIndex('by_game_and_score', (q) => q.eq('gameId', args.gameId))
      .order('desc')
      .collect()

    return players
  },
})

// Get current question for a game
export const getCurrentQuestion = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.union(
    v.object({
      _id: v.id('questions'),
      _creationTime: v.number(),
      quizId: v.id('quizzes'),
      questionText: v.string(),
      options: v.array(v.string()),
      order: v.number(),
      timeLimit: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      return null
    }

    const question = await ctx.db
      .query('questions')
      .withIndex('by_quiz_and_order', (q) =>
        q.eq('quizId', game.quizId).eq('order', game.currentQuestionIndex)
      )
      .unique()

    if (!question) {
      return null
    }

    // Don't return the correct answer
    const { correctAnswerIndex, ...safeQuestion } = question
    return safeQuestion
  },
})

// Get all quizzes
export const getAllQuizzes = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('quizzes'),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      createdBy: v.id('users'),
      createdAt: v.number(),
      questionCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const quizzes = await ctx.db.query('quizzes').collect()

    const quizzesWithCount = await Promise.all(
      quizzes.map(async (quiz) => {
        const questions = await ctx.db
          .query('questions')
          .withIndex('by_quiz_and_order', (q) => q.eq('quizId', quiz._id))
          .collect()

        return {
          ...quiz,
          questionCount: questions.length,
        }
      })
    )

    return quizzesWithCount
  },
})

// Get player's answer for a specific question
export const getPlayerAnswer = query({
  args: {
    playerId: v.id('players'),
    questionIndex: v.number(),
  },
  returns: v.union(
    v.object({
      _id: v.id('answers'),
      _creationTime: v.number(),
      gameId: v.id('games'),
      playerId: v.id('players'),
      questionIndex: v.number(),
      answerIndex: v.number(),
      isCorrect: v.boolean(),
      timeToAnswer: v.number(),
      answeredAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const answer = await ctx.db
      .query('answers')
      .withIndex('by_player_and_question', (q) =>
        q.eq('playerId', args.playerId).eq('questionIndex', args.questionIndex)
      )
      .unique()

    return answer
  },
})

